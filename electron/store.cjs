const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const LOCAL_KEYS=['modelCostPolicy','modelCostDaily','researchCredential','credentials','tabs','weixinCredentials','weixinCursor','weixinSeen','weixinAlertContext'];
// Native, file-backed SQLite commits changed pages only. Never export the full database on routine writes.
class Store{
 async init(folder){this.snapshotCache=new Map();this.folder=folder;fs.mkdirSync(folder,{recursive:true});this.file=path.join(folder,'monitor.sqlite3');this.open();this.native.exec(`
CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY,source TEXT,shop TEXT,scope TEXT,at REAL,payload TEXT);
 CREATE INDEX IF NOT EXISTS snap_scope ON snapshots(shop,scope,at);
 CREATE INDEX IF NOT EXISTS snap_shop_at ON snapshots(shop,at);
 CREATE INDEX IF NOT EXISTS snap_at_scope ON snapshots(at DESC,shop,scope);

 CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,scope TEXT,at REAL,role TEXT,content TEXT);
 CREATE TABLE IF NOT EXISTS advice(id INTEGER PRIMARY KEY,scope TEXT,at REAL,payload TEXT,feedback TEXT DEFAULT '',note TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,kind TEXT,scope TEXT,day TEXT,at REAL,content TEXT,status TEXT,version INTEGER,unread INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT,scope TEXT,day TEXT,status TEXT,error TEXT,attempt INTEGER DEFAULT 0,next REAL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,at REAL,kind TEXT,message TEXT);
 CREATE INDEX IF NOT EXISTS messages_scope ON messages(scope,id);
 CREATE INDEX IF NOT EXISTS advice_scope ON advice(scope,at);
 
`);return this;}
 async legacy(){if(!this.SQL)this.SQL=await require('sql.js')({locateFile:f=>require.resolve('sql.js/dist/'+f)});return this.SQL;}
 open(){this.native=new DatabaseSync(this.file,{timeout:1000});this.native.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA cache_size=-8192; PRAGMA temp_store=FILE; PRAGMA trusted_schema=OFF;');this.db={run:(sql,args=[])=>{if(args.length)this.native.prepare(sql).run(...args);else this.native.exec(sql);this.snapshotCache.clear();},close:()=>this.native.close()};}
 rows(sql,args=[]){return this.native.prepare(sql).all(...args).map(r=>({...r}));}
 run(sql,args=[]){const r=this.native.prepare(sql).run(...args);if(/\bsnapshots\b/i.test(sql))this.snapshotCache.clear();this.flush();return Number(r.lastInsertRowid);}
 get(key,fallback=null){const r=this.native.prepare('SELECT value FROM kv WHERE key=?').get(key);return r?JSON.parse(r.value):fallback;}
 set(key,value){const encoded=JSON.stringify(value);if(this.native.prepare('SELECT value FROM kv WHERE key=?').get(key)?.value===encoded)return;this.run('INSERT OR REPLACE INTO kv VALUES(?,?)',[key,encoded]);}
 flush(){/* Each native SQLite transaction is already durable. */}
 event(kind,message){this.run('INSERT INTO events(at,kind,message) VALUES(?,?,?)',[Date.now(),kind,message]);}
 snapshots(shop,scope,limit=1000){return this.readSnapshots(shop,scope,limit,false);}
 windowSnapshots(shop,scope,limit=1000){return this.readSnapshots(shop,scope,limit,true);}
 readSnapshots(shop,scope,limit,light){const key=JSON.stringify([shop,scope,limit,light]);if(this.snapshotCache.has(key))return this.snapshotCache.get(key);const payload=light?"json_remove(payload,'$.diagnostics','$.tables','$.collectedTables','$.headings')":'payload';const rows=this.rows(`SELECT ${payload} AS payload FROM snapshots WHERE shop=? AND scope=? ORDER BY at DESC LIMIT ?`,[shop,scope,limit]).reverse().map(r=>JSON.parse(r.payload));if(limit<=1000){if(this.snapshotCache.size>=4)this.snapshotCache.delete(this.snapshotCache.keys().next().value);this.snapshotCache.set(key,rows);}return rows;}
 reportGroups(shop,{scope,from,to}={}){const args=[shop],where=['shop=?'];if(scope!==undefined){where.push('scope=?');args.push(scope);}if(from!==undefined){where.push('at>=?');args.push(from);}if(to!==undefined){where.push('at<?');args.push(to);}const sql=`WITH selected AS (SELECT shop,scope,source,at,id,LAG(at) OVER(PARTITION BY shop,scope,source ORDER BY at,id) AS previous FROM snapshots WHERE ${where.join(' AND ')}) SELECT shop,scope,source,COUNT(*) AS count,SUM(CASE WHEN at-previous>90000 THEN 1 ELSE 0 END) AS gaps FROM selected GROUP BY shop,scope,source ORDER BY MIN(at),MIN(id) LIMIT 20`;return this.rows(sql,args).map(g=>{const match=[...where,'scope=?','source=?'].join(' AND '),params=[...args,g.scope,g.source];const read=order=>JSON.parse(this.rows(`SELECT json_remove(payload,'$.diagnostics') AS payload FROM snapshots WHERE ${match} ORDER BY at ${order},id ${order} LIMIT 1`,params)[0].payload);return {source:g.shop+'::'+g.scope+'::'+g.source,count:g.count,gaps:g.gaps,first:read('ASC'),last:read('DESC')};});}
 backup(){const file=path.join(this.folder,'backup-'+crypto.randomUUID()+'.sqlite3');let copy;try{this.native.prepare('VACUUM INTO ?').run(file);copy=new DatabaseSync(file);copy.exec('PRAGMA secure_delete=ON');for(const key of LOCAL_KEYS)copy.prepare('DELETE FROM kv WHERE key=?').run(key);copy.exec('VACUUM');copy.close();copy=null;return fs.readFileSync(file);}finally{copy?.close();if(fs.existsSync(file))fs.unlinkSync(file);}}
 restore(bytes){const file=path.join(this.folder,'restore-'+crypto.randomUUID()+'.sqlite3');let candidate;const tables=['kv','snapshots','messages','advice','reports','jobs','events'];try{fs.writeFileSync(file,bytes);candidate=new DatabaseSync(file);if(candidate.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('数据库损坏');for(const table of tables){const expected=this.rows('PRAGMA table_info('+table+')').map(x=>x.name);const actual=candidate.prepare('PRAGMA table_info('+table+')').all().map(x=>x.name);if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('备份结构不兼容');}candidate.close();candidate=null;
 const locals=LOCAL_KEYS.map(key=>[key,this.get(key)]);this.native.prepare('ATTACH DATABASE ? AS restored').run(file);try{this.native.exec('BEGIN IMMEDIATE');for(const table of tables)this.native.exec(`DELETE FROM main.${table}; INSERT INTO main.${table} SELECT * FROM restored.${table};`);for(const [key,value]of locals){this.native.prepare('DELETE FROM kv WHERE key=?').run(key);if(value!==null)this.native.prepare('INSERT INTO kv VALUES(?,?)').run(key,JSON.stringify(value));}this.native.exec("UPDATE jobs SET status='pending' WHERE status='running'; COMMIT");}catch(e){this.native.exec('ROLLBACK');throw e;}finally{this.native.exec('DETACH DATABASE restored');}this.snapshotCache.clear();
 }catch(e){throw Error('恢复失败，原数据保留：'+e.message);}finally{candidate?.close();if(fs.existsSync(file))fs.unlinkSync(file);}}
}
module.exports=Store;
