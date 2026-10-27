const fs = require('fs');
const s = fs.readFileSync('supabase/setup.sql','utf8');

// Extract all CREATE TABLE statements with their content
const tables = [];
const re = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gm;
let m;
while((m = re.exec(s)) !== null){
  const fullName = (m[1]||'') + m[2];
  const body = m[3];
  tables.push({name: m[2], fullName, body, start: m.index});
}
console.log('Total tables:', tables.length);
for(const t of tables){
  console.log('  ', t.name);
}
