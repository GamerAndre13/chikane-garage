import fs from 'fs';
const p = 'C:/Users/Public/Documents/chikane-garage-novo/app/conta/perfil/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let _rd = false;
s = s.replace(/async function requestDeletion\s*\([^)]*\)\s*\{[\s\S]*?^  \}/gm, (m) => {
  if (!_rd) { _rd = true; return m; }
  return '';
});
let _cd = false;
s = s.replace(/async function cancelDeletion\s*\([^)]*\)\s*\{[\s\S]*?^  \}/gm, (m) => {
  if (!_cd) { _cd = true; return m; }
  return '';
});
fs.writeFileSync(p, s);
console.log('ok');
