// Restore one renderer at a time. Pending entries stay available to persistence.
class StartupTabs{
 constructor(entries,add,{pause=ms=>new Promise(r=>setTimeout(r,ms)),gap=2000}={}){this.pending=[...entries];this.add=add;this.pause=pause;this.gap=gap;this.stopped=false;this.running=false;}
 async start(){if(this.running)return;this.running=true;let first=true;try{while(this.pending.length&&!this.stopped){const entry=this.pending.shift();try{await this.add(entry,!first);}catch{/* A failing page must not lose the other saved tabs. */}first=false;if(this.pending.length&&!this.stopped)await this.pause(this.gap);}}finally{this.running=false;}}
 stop(){this.stopped=true;}
}
module.exports={StartupTabs};
