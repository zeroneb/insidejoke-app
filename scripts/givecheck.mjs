import { chromium } from 'playwright';
const B='http://localhost:3800';
const br=await chromium.launch(); const p=await (await br.newContext({viewport:{width:390,height:844}})).newPage();
for (const [who,phone] of [['friend','+15550000002'],['owner','+15550000001']]) {
  await p.goto(B+'/dev/login'); await p.click(`form:has-text("${phone}") button`); await p.waitForURL('**/home');
  await p.goto(B+'/l/maya-birthday',{waitUntil:'networkidle'});
  const ids=await p.evaluate(()=>[...new Set([...document.querySelectorAll('a[href*="/i/"]')].map(a=>a.getAttribute('href').split('/i/')[1].split('/')[0]))]);
  let done=false;
  for (const id of ids) {
    await p.goto(B+`/l/maya-birthday/i/${id}`,{waitUntil:'networkidle'});
    const c=await p.$('a:text-is("Contribute")'); if(!c) continue;
    await c.click(); await p.waitForURL('**/give');
    await p.click('button:has-text("Pay"), button:has-text("Give"), button[type=submit]');
    await p.waitForTimeout(2500);
    console.log(who,'contributed →',p.url().split('3800')[1]); done=true; break;
  }
  if(!done) console.log(who,'NO Contribute button on any item');
}
await br.close();
