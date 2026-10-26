// History previews only. Model requests still load original images from storage.
class PreviewCache{
 constructor(render,limit=80){this.render=render;this.limit=limit;this.cache=new Map();this.pending=new Map();this.inFlight=new Set();this.working=false;this.generation=0;}
 get(id,load){if(this.cache.has(id))return this.cache.get(id);const previews=load().map(image=>{try{return {name:image.name,data:this.render(image.data)};}catch{return {name:image.name,data:''};}});this.cache.set(id,previews);while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);return previews;}
 getDeferred(id,load,changed=()=>{}){if(this.cache.has(id))return this.cache.get(id);if(!this.pending.has(id)&&!this.inFlight.has(id)){this.pending.set(id,{load,changed});void this.drain();}return [];}
 async drain(){if(this.working)return;this.working=true;try{await new Promise(r=>setTimeout(r,500));while(this.pending.size){const [id,job]=this.pending.entries().next().value;this.pending.delete(id);this.inFlight.add(id);const generation=this.generation;const previews=[];try{for(const image of job.load()){await new Promise(r=>setTimeout(r,60));if(generation!==this.generation)break;previews.push({name:image.name,data:this.render(image.data)});}}catch{}this.inFlight.delete(id);if(generation!==this.generation)continue;this.cache.set(id,previews);while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);job.changed();}}finally{this.working=false;}}
 clear(){this.generation++;this.pending.clear();this.cache.clear();}
}
module.exports={PreviewCache};
