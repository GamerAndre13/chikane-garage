const fs = require('fs');
const files=fs.readdirSync('.');
for(const f of files){
  if(f.endsWith('.js')||f.endsWith('.ts')||f.endsWith('.tsx')||f.endsWith('.sql')){
    try{
      const c=fs.readFileSync(f,'utf8');
      if(c.includes('vehicle_requests')) console.log(f);
    }catch(e){}
  }
}
