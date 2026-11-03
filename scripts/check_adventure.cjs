const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const width of [1280,390]){
 const p=await browser.newPage({viewport:{width,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:3000');
 await p.locator('#adventure-start').click();assert.equal(await p.locator('.battle').count(),1);assert.equal(await p.locator('.submit-answer').count(),0);
 await p.evaluate(()=>{queue=queue.filter(q=>selectionSets(q).every(s=>s.length===1)&&!q.allAward&&!q.excludeFromAccuracy).slice(0,2);index=0;answers=[];show();});
 const selectCorrect=async()=>{const i=await p.evaluate(()=>queue[index].answer);await p.locator('.option').nth(i).click();};
 await selectCorrect();assert.equal(await p.evaluate(()=>answers.length),1);assert.equal(await p.evaluate(()=>answers[0].confidence),'unsure');assert.ok((await p.locator('#adventure-progress').innerText()).includes('10 XP'));
 assert.equal(await p.locator('.feedback').count(),1);await p.locator('.next-question').click();await selectCorrect();await p.locator('.next-question').click();assert.equal(await p.evaluate(()=>adventureRounds),1);
 await p.evaluate(()=>finish());assert.equal(await p.evaluate(()=>adventureRounds),1);await p.reload();assert.ok((await p.locator('#adventure-progress').innerText()).includes('20 XP'));assert.ok((await p.locator('#adventure-badges').innerText()).includes('初次遠征'));
 await p.locator('#duel-start').click();await p.evaluate(()=>{queue=queue.filter(q=>selectionSets(q).every(s=>s.length===1)&&!q.allAward&&!q.excludeFromAccuracy).slice(0,2);index=0;answers=[];show();});
 assert.ok((await p.locator('.duel-turn').innerText()).includes('玩家 1'));await selectCorrect();await p.locator('.next-question').click();assert.ok((await p.locator('.duel-turn').innerText()).includes('玩家 2'));await selectCorrect();await p.locator('.next-question').click();assert.ok((await p.locator('.completion-card').innerText()).includes('本回平手'));
 await p.evaluate(()=>{playMode='random';exam=false;queue=[bank.find(q=>selectionSets(q).some(s=>s.length>1))];index=0;answers=[];show();});
 const picks=await p.evaluate(()=>selectionSets(queue[0]).find(s=>s.length>1));for(const i of picks)await p.locator('.option').nth(i).click();assert.equal(await p.evaluate(()=>answers.length),0);await p.locator('.submit-answer').click();assert.equal(await p.evaluate(()=>answers[0].correct),true);
 await p.evaluate(()=>{playMode='random';exam=true;deadline=Date.now()+60000;queue=[bank.find(q=>selectionSets(q).every(s=>s.length===1))];index=0;answers=[];show();});await p.locator('.option').first().click();assert.equal(await p.evaluate(()=>answers.length),1);assert.equal(await p.locator('.feedback,.gpt-launch,.option.correct').count(),0);await p.locator('.next-question').click();assert.equal(await p.locator('.exam-review').count(),1);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await p.screenshot({path:`/tmp/adventure-${width}.png`,fullPage:true});console.log('PASS',width,'instant answers, unique XP, persistence, rounds, local duel and multi-select');await p.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
