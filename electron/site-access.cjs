function publicOrigin(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const h=u.hostname;if(!h.includes('.')||/^[\d.]+$/.test(h)||h.includes(':')||/localhost|\.local$|\.internal$|\.lan$/.test(h))return null;return u.origin;}catch{return null;}}
module.exports={publicOrigin};
