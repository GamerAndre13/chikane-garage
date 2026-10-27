const fs=require('fs');
const s=fs.readFileSync('supabase/setup.sql','utf8');
if(s.includes('vehicle_requests')) console.log('found');
else console.log('not found');
