const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildGptPrompt,gptLaunch,gptSourceURL}=require('../gpt-helper');
const bank=require('../data/structure-bank.json');
test('GPT提問完整保留組合定義、原題年份、本人選答與官方給分',()=>{
 const q=bank.find(q=>q.id==='97-structure-11');const prompt=buildGptPrompt(q,2);
 assert.ok(prompt.includes(q.question));q.options.forEach((text,i)=>assert.ok(prompt.includes(String.fromCharCode(65+i)+'. '+text)));
 assert.match(prompt,/民國97年/);assert.match(prompt,/【我的選擇】C/);assert.match(prompt,/【官方答案／給分組合】B/);
 assert.ok(prompt.includes('https://s100009986075993-boop.github.io/-/'+q.sourcePdf+'#page='+q.sourcePage));
 assert.match(prompt,/不要為配合答案倒推理由/);assert.match(prompt,/不要編造條號/);
});
test('區分指定組合與一律給分，附圖不明時要求上傳',()=>{
 const q={...bank[0],acceptedSelections:[[0],[1],[0,1]],diagrams:[{src:'assets/test.webp'}],textStatus:'needs-review'};
 const prompt=buildGptPrompt(q,[0,1]);assert.match(prompt,/A 或 B 或 A＋B/);assert.match(prompt,/【我的選擇】A、B/);assert.match(prompt,/請先請我上傳截圖/);assert.match(prompt,/不要猜補缺字/);
 assert.match(buildGptPrompt({...q,allAward:true},0),/一律給分，不代表每個選項的觀念皆正確/);
 assert.equal(gptSourceURL('javascript:alert(1)'), '');assert.equal(gptSourceURL('data:image/webp;base64,x'),'');
});
test('短提問可帶入URL，過長提問改用複製貼上，無API金鑰',()=>{
 const prompt='請解釋 A＋B 與①②';const link=gptLaunch(prompt);assert.equal(link.prefill,true);assert.equal(new URL(link.url).searchParams.get('q'),prompt);
 assert.deepEqual(gptLaunch('題'.repeat(3000)),{url:'https://chatgpt.com/',prefill:false});
});
