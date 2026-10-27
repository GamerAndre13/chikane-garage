const fs = require('fs');
const s = fs.readFileSync('supabase/setup.sql','utf8');
const idx = s.indexOf('CREATE TABLE IF NOT EXISTS public.vehicle_images');
if(idx>=0){
  let end = s.indexOf('\n\n', idx);
  if(end==-1) end = idx+600;
  console.log(s.slice(idx, end));
}
