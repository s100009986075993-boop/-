// Browser regression: npm start, then node scripts/check_option_elimination.cjs [base URL].
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(process.argv[2]||'http://127.0.0.1:3000');await page.evaluate(()=>document.getElementById('answerflow').value='confirm');
  async function load(multi=false,isExam=false){await page.evaluate(({multi,isExam})=>{
   const q={id:'test-elimination',subject:'建築結構',chapter:'操作測試',year:0,question:'請選出題目的正確選項，並利用排除按鈕整理判斷。',options:['選項一：可恢復的長文字選項，確認手機上完整顯示且不會橫向溢出。','選項二','選項三','選項四'],answer:2};
   if(multi)q.acceptedSelections=[[0,3]];
   queue=[q,{...q,id:'test-elimination-next'}];index=0;answers=[];history=[];exam=isExam;deadline=Date.now()+60000;setTab('practice');show();
  },{multi,isExam});}
  const option=i=>page.locator('.option').nth(i),toggle=i=>page.locator('.exclude-option').nth(i),submit=page.locator('.submit-answer');
  const count=()=>page.evaluate(()=>history.length);
  await load();assert.equal(await page.locator('.exclude-option').count(),4);
  await toggle(1).click();assert.equal(await option(1).isDisabled(),true);assert.equal(await toggle(1).getAttribute('aria-pressed'),'true');assert.equal(await toggle(1).innerText(),'恢復');assert.equal(await count(),0);
  await toggle(1).focus();await page.keyboard.press('Enter');assert.equal(await option(1).isEnabled(),true);
  await option(2).click();await page.locator('[data-confidence="sure"]').click();assert.equal(await submit.isEnabled(),true);
  await toggle(2).click();assert.equal(await option(2).getAttribute('aria-pressed'),'false');assert.equal(await submit.isDisabled(),true);
  for(const i of [0,1,3])await toggle(i).click();assert.equal(await page.locator('.option:disabled').count(),4);assert.equal(await count(),0);assert.equal(await submit.isDisabled(),true);
  await page.locator('.clear-eliminations').click();assert.equal(await page.locator('.option:disabled').count(),0);assert.equal(await page.locator('.option.selected').count(),0);assert.equal(await submit.isDisabled(),true);
  // Restoring never selects an answer. A retained selection survives clearing other exclusions.
  await option(2).click();await toggle(0).click();await page.locator('.clear-eliminations').click();assert.equal(await option(2).getAttribute('aria-pressed'),'true');
  await toggle(2).click();await toggle(2).click();assert.equal(await submit.isDisabled(),true);await option(2).click();await toggle(1).click();await submit.click();
  assert.equal(await count(),1);assert.equal(await page.evaluate(()=>answers[0].correct),true);assert.equal(await page.locator('.option.eliminated').count(),0);assert.equal(await page.locator('.exclude-option:visible').count(),0);assert.equal(await page.locator('.feedback').count(),1);
  await page.locator('.next-question').click();assert.equal(await page.locator('.option.eliminated').count(),0);assert.equal(await page.locator('.option:disabled').count(),0);
  // Exclusion cannot turn a wrong answer into credit.
  await toggle(2).click();await option(0).click();await page.locator('[data-confidence="guess"]').click();await submit.click();assert.equal(await page.evaluate(()=>answers.at(-1).correct),false);
  await load(true);await option(0).click();await option(3).click();await page.locator('[data-confidence="sure"]').click();await toggle(0).click();assert.equal(await option(3).getAttribute('aria-pressed'),'true');assert.equal(await option(0).getAttribute('aria-pressed'),'false');await toggle(0).click();assert.equal(await option(0).getAttribute('aria-pressed'),'false');await option(0).click();await submit.click();assert.deepEqual(await page.evaluate(()=>answers[0].selected),[0,3]);assert.equal(await page.evaluate(()=>answers[0].correct),true);
  // Exam mode offers the same aid without leaking the correct answer before completion.
  await load(false,true);await toggle(2).click();assert.equal(await page.locator('.feedback').count(),0);assert.equal(await page.locator('.option.correct').count(),0);await toggle(2).click();await option(2).click();await page.locator('[data-confidence="sure"]').click();await submit.click();assert.equal(await page.locator('.feedback').count(),0);
  await load();await toggle(0).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const rect=await toggle(0).boundingBox();assert.ok(rect.width>=44&&rect.height>=44);
  assert.deepEqual(errors,[]);console.log('PASS',width,'exclude/restore/clear, selection, keyboard, single/multiple scoring, exam privacy, next question and layout');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
