import fs from 'fs';
const p = 'C:/Users/Public/Documents/chikane-garage-novo/app/admin/contas/page.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/\r\n/g, '\n');
const lines = s.split('\n');
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
lines.push('}\n');
fs.writeFileSync(p, lines.join('\n'));
console.log(lines.length);
