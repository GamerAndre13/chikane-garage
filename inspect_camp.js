const fs = require('fs');
const s = fs.readFileSync('C:/Users/Public/Documents/chikane-garage-novo/supabase/setup.sql','utf8');
const start = s.indexOf('CREATE TABLE IF NOT EXISTS public.campaigns');
if (start === -1) { console.log('not found'); process.exit(0); }
let end = s.indexOf('ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY', start);
if (end === -1) end = s.indexOf('CREATE INDEX', start);
if (end === -1) end = start + 2000;
console.log(s.slice(start, end).trim());
