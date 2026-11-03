// npm start, then node scripts/check_compact_results.cjs [base URL].
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1280,390]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.argv[2]||'http://127.0.0.1:3000');
  for(const kind of ['draft','pending','multi','allAward']){
   const expected=await p.evaluate(kind=>{
    const q=bank.find(q=>kind==='draft'?q.solution:kind==='pending'?q.year>0&&!q.solution:kind==='multi'?selectionSets(q).some(s=>s.length>1):q.allAward);
    queue=[q,{...q,id:q.id+'-next'}];index=0;answers=[];history=[];exam=false;setTab('practice');show();
    return {id:q.id,question:q.question,answer:answerText(q),prompt:buildGptPrompt(q,kind==='multi'?selectionSets(q).find(s=>s.length>1):selectionSets(q)[0]),selection:kind==='multi'?selectionSets(q).find(s=>s.length>1):selectionSets(q)[0]};
   },kind);
   assert.equal(await p.locator('.gpt-launch').count(),0);
   for(const i of expected.selection)await p.locator('.option').nth(i).click();await p.locator('[data-confidence="sure"]').click();await p.locator('.submit-answer').click();
   assert.ok((await p.locator('.answer-rule').innerText()).includes(expected.answer));
   assert.equal(await p.locator('.question-explanation,.option-explanations,.memory-tip,.explanation-sources,.pending-note').count(),0);
   assert.equal(await p.locator('.gpt-launch').count(),1);assert.equal(await p.locator('.gpt-preview').getAttribute('open'),null);assert.equal(await p.locator('.question-note').getAttribute('open'),null);
   const prompt=await p.locator('.gpt-preview textarea').inputValue();assert.ok(prompt.includes(expected.question));assert.equal(prompt,expected.prompt);
   assert.equal(await p.evaluate(()=>{const s=document.querySelector('.feedback');return s.querySelector('.next-question').compareDocumentPosition(s.querySelector('.gpt-help'))&Node.DOCUMENT_POSITION_FOLLOWING?true:false;}),true);
   // Force clipboard fallback without opening an external tab; the full prompt remains available.
   await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard unavailable');}}}));
   await p.getByRole('button',{name:'只複製提問',exact:true}).click();assert.notEqual(await p.locator('.gpt-preview').getAttribute('open'),null);assert.equal(await p.locator('.gpt-preview textarea').inputValue(),prompt);
   await p.locator('.next-question').click();assert.equal(await p.locator('.feedback').count(),0);
  }
  // The reported question must show all numbered statements before an answer is chosen.
  await p.evaluate(()=>{queue=[bank.find(q=>q.id==='106-law-41'),bank.find(q=>q.id==='106-law-42')];index=0;answers=[];history=[];exam=false;show();});
  const parts=['①都市土地','②非都市土地','③國家公園土地'];for(const part of parts)assert.ok((await p.locator('.question-stem').innerText()).includes(part));
  assert.deepEqual(await p.locator('.option-text').allTextContents(),['①③','①②','②③','①②③']);
  if(width===390)await p.screenshot({path:'/tmp/architect-design/repaired-combination-mobile.png',fullPage:true});
  await p.locator('.option').nth(1).click();await p.locator('[data-confidence="sure"]').click();await p.locator('.submit-answer').click();
  assert.equal(await p.evaluate(()=>answers[0].correct),true);for(const part of parts)assert.ok((await p.locator('.gpt-preview textarea').inputValue()).includes(part));
  assert.equal(await p.locator('.option-explanations').count(),0);
  if(width===390)await p.screenshot({path:'/tmp/architect-design/compact-result-mobile.png',fullPage:true});
  // Exam answer and GPT controls stay hidden until the completion review.
  await p.evaluate(()=>{queue=[bank.find(q=>q.solution)];index=0;answers=[];history=[];exam=true;deadline=Date.now()+60000;show();});
  await p.locator('.option').first().click();await p.locator('[data-confidence="guess"]').click();await p.locator('.submit-answer').click();assert.equal(await p.locator('.feedback,.gpt-launch').count(),0);await p.locator('.next-question').click();
  await p.locator('.exam-review summary').first().click();assert.equal(await p.locator('.gpt-launch').count(),1);assert.equal(await p.locator('.question-explanation,.option-explanations,.memory-tip').count(),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS',width,'compact results, next action, draft/pending/multiple/all-award, full GPT prompt, clipboard fallback and exam review');await p.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
