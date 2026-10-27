const fs = require('fs');
const s = fs.readFileSync('supabase/setup.sql','utf8');
const re = /^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([^\s(]+)/gm;
let m, arr=[];
while((m = re.exec(s)) !== null){
  arr.push(m[1]);
}
console.log(arr.length);
console.log(arr.join('\n'));
