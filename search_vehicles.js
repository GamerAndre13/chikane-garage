const fs = require('fs');
const path = require('path');
function walk(dir){
  const res=[];
  for(const f of fs.readdirSync(dir)){
    const p=path.join(dir,f);
    const st=fs.statSync(p);
    if(st.isDirectory()) res.push(...walk(p));
    else if(p.endsWith('.ts')||p.endsWith('.tsx')) res.push(p);
  }
  return res;
}
const files=walk('app');
let count=0;
for(const f of files){
  const c=fs.readFileSync(f,'utf8');
  if(c.includes('.from("vehicles")')||c.includes(".from('vehicles')")){
    console.log(f);
    count++;
    if(count>15) break;
  }
}
