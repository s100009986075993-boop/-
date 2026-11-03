const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [1280,390]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:3000');
  for(const count of [5,10,20,40,80]){
   await p.locator('#questioncount').selectOption(String(count));await p.locator('#start').click();
   const ids=await p.evaluate(()=>queue.map(q=>q.id));assert.equal(ids.length,count);assert.equal(new Set(ids).size,count);assert.equal(await p.locator('.question-count').innerText(),`1 / ${count}`);
   await p.locator('.lobby-button').click();
  }
  await p.reload();assert.equal(await p.locator('#questioncount').inputValue(),'80');
  await p.locator('#subject').selectOption('建築結構');await p.locator('#year').selectOption('114');await p.locator('#start').click();assert.equal(await p.evaluate(()=>queue.length),40);assert.ok((await p.locator('.round-notice').innerText()).includes('不重複補題'));await p.locator('.lobby-button').click();
  await p.locator('#subject').selectOption('');await p.locator('#year').selectOption('');await p.locator('#mode').selectOption('paper');await p.locator('#start').click();assert.equal(await p.locator('#practice-error').isVisible(),true);assert.equal(await p.locator('.question-card').count(),0);
  // Whole papers include every question even when the previous chapter/solution filter was narrower.
  await p.locator('#mode').selectOption('random');await p.locator('#contentfilter').selectOption('detailed');
  await p.locator('#subject').selectOption('建築構造與施工');await p.locator('#year').selectOption('114');await p.locator('#mode').selectOption('paper');assert.equal(await p.locator('#questioncount').inputValue(),'80');assert.equal(await p.locator('#contentfilter').isDisabled(),true);await p.locator('#start').click();
  const paper=await p.evaluate(()=>queue.map(q=>q.id));assert.equal(paper.length,80);assert.deepEqual(paper,Array.from({length:80},(_,i)=>`114-construction-${String(i+1).padStart(2,'0')}`));
  if(width===1280){
   // Complete all 80 questions through the real controls, including multi-selection and special grading.
   for(let i=0;i<80;i++){
    const selection=await p.evaluate(()=>selectionSets(queue[index])[0]||[0]);for(const j of selection)await p.locator('.option').nth(j).click();
    if(await p.locator('.submit-answer').count())await p.locator('.submit-answer').click();
    await p.locator('.next-question').click();
   }
   assert.ok((await p.locator('.completion-card').innerText()).includes('共 80 題，已答 80 題'));assert.equal(await p.evaluate(()=>history.length),80);await p.getByRole('button',{name:'回到選題大廳'}).click();
  }else await p.locator('.lobby-button').click();
  for(const subject of ['營建法規與實務','建築結構','建築環境控制']){
   await p.locator('#subject').selectOption(subject);await p.locator('#year').selectOption('113');await p.locator('#start').click();
   const result=await p.evaluate(()=>({count:queue.length,subjects:[...new Set(queue.map(q=>q.subject))],years:[...new Set(queue.map(q=>q.year))],numbers:queue.map(q=>questionNumber(q))}));const count=subject==='營建法規與實務'?80:40;
   assert.equal(result.count,count);assert.deepEqual(result.subjects,[subject]);assert.deepEqual(result.years,[113]);assert.deepEqual(result.numbers,Array.from({length:count},(_,i)=>i+1));await p.locator('.lobby-button').click();
  }
  await p.locator('#mode').selectOption('random');assert.equal(await p.locator('#questioncount').isEnabled(),true);assert.equal(await p.locator('#contentfilter').isEnabled(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS',width,'5/10/20/40/80, count persistence, no repetition, whole 80/40-question papers, validation and restored filters');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
