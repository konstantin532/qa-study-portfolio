const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const failures=[];
const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
if(dup.length) failures.push(`Duplicate IDs: ${dup.join(', ')}`);
for(const m of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
  const ref=m[1]; if(/^(?:https?:|data:|mailto:|tel:)/.test(ref)) continue;
  if(!fs.existsSync(path.join(__dirname,'..',ref))) failures.push(`Missing resource: ${ref}`);
}
if(failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Static checks passed: unique IDs and local resources are valid.');
