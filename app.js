const $=id=>document.getElementById(id);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const allOfficialBank=[...officialBank,...environmentBank,...lawBank,...constructionBank];
const builtInBank=[...demo,...allOfficialBank];
const mergedBank=new Map(builtInBank.map(q=>[q.id,q]));
for(const q of read('architect-bank',[]))if(!allOfficialBank.some(item=>item.id===q.id))mergedBank.set(q.id,q);
let bank=[...mergedBank.values()],history=read('architect-history',[]),queue=[],index=0,answers=[],timer=null,deadline=0,exam=false;
function persist(){try{localStorage.setItem('architect-bank',JSON.stringify(bank.filter(q=>!builtInBank.some(item=>item.id===q.id))));localStorage.setItem('architect-history',JSON.stringify(history));}catch{alert('瀏覽器無法儲存資料，請匯出紀錄備份。');}}
function element(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function renderStats(){const s=stats(history);$('total').textContent=s.total;$('accuracy').textContent=s.accuracy+'%';const last=new Map(history.map(a=>[a.id,a]));$('wrong').textContent=[...last.values()].filter(a=>!a.correct).length;$('breakdown').replaceChildren();for(const subject of subjects){const s=stats(history.filter(a=>a.subject===subject));const row=element('div','','subject-row');row.append(element('span',subject),element('span',s.total?`${s.total} 次作答 · ${s.accuracy}% 正確`:'尚無作答'));$('breakdown').append(row);}}
function filters(){for(const [id,key]of [['year','year'],['chapter','chapter']]){const value=$(id).value;$(id).replaceChildren(new Option(id==='year'?'全部年度':'全部章節',''));for(const item of [...new Set(bank.map(q=>q[key]))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b),'zh-Hant')))$(id).add(new Option(item===0?'示範題':String(item),String(item)));$(id).value=value;}}
subjects.forEach(s=>$('subject').add(new Option(s,s)));filters();renderStats();
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));for(const id of ['practice','site','design','progress','references','import'])$(id).hidden=id!==b.dataset.tab;renderStats();});
function finish(){clearInterval(timer);timer=null;const root=$('quiz');root.replaceChildren(element('h2',exam?'模擬練習結束':'本次練習完成'),element('p',`共 ${queue.length} 題，已答 ${answers.length} 題，依給分規則得分 ${answers.filter(a=>a.correct).length} 題（含一律給分 ${answers.filter(a=>a.allAward).length} 題）；學習正確率排除一律給分及任一單選給分題。`));if(exam){for(const a of answers){const q=queue.find(q=>q.id===a.id);root.append(element('div',`${q.question}\n你的答案：${selectionText(q,a.selected)}\n正確答案：${answerText(q)}\n${q.explanation}\n${q.regulation}`,'result'));}}renderStats();}
function show(){
 if(index>=queue.length){finish();return;}
 const root=$('quiz'),q=queue[index];root.replaceChildren();
 root.append(element('p',`${index+1} / ${queue.length} · ${q.subject} · ${q.chapter}`));
 if(exam)root.append(element('p','','clock'));
 root.append(element('h3',q.question));
 if(q.subject==='營建法規與實務'&&q.year>0)root.append(element('p',`歷年法規題：答案依民國 ${q.year} 年答案表，現行條文、施行日與修法差異尚未核對。`,'notice'));
 if(q.image){
  if(q.imageIsFullPage)root.append(element('p',`以下為原卷第 ${q.sourcePage} 頁，請找到測驗第 ${Number(q.id.split('-').pop())} 題。點擊題圖可放大；不使用文字辨識取代公式與圖表。`,'muted'));
  const imageLink=document.createElement('a');imageLink.href=q.image;imageLink.target='_blank';imageLink.rel='noopener';
  const img=document.createElement('img');img.src=q.image;img.alt=q.question+' 原始題目與圖表';img.className='question-image';imageLink.append(img);root.append(imageLink);
  const link=element('a','開啟原始試卷第 '+q.sourcePage+' 頁');link.href=q.sourcePdf+'#page='+q.sourcePage;link.target='_blank';link.rel='noopener';root.append(link);
 }
 const multi=selectionSets(q).some(set=>set.length>1),selected=new Set();
 if(multi)root.append(element('p','可勾選一個或多個選項，再提交答案。'));
 if(q.excludeFromAccuracy&&!q.allAward)root.append(element('p','官方更正：本題所有單選選項均可給分；允許的多選組合依公告，不包含未作答。給分不代表各選項觀念皆正確，本題不列入學習正確率。','notice'));
 if(q.allAward)root.append(element('p','官方更正：本題一律給分，不列入學習正確率。','notice'));
 const submit=element('button','提交答案','primary');submit.disabled=multi;
 function record(choice){
  if(exam&&Date.now()>=deadline){finish();return;}
  root.querySelectorAll('.option').forEach(x=>x.disabled=true);submit.disabled=true;
  const a={id:q.id,subject:q.subject,chapter:q.chapter,selected:choice,correct:isCorrect(q,choice),allAward:!!q.allAward,excludeFromAccuracy:!!q.excludeFromAccuracy,at:new Date().toISOString()};
  answers.push(a);history.push(a);persist();renderStats();
  if(!exam){
   if(!q.allAward&&!q.excludeFromAccuracy)acceptedAnswers(q).forEach(i=>root.querySelectorAll('.option')[i].classList.add('correct'));
   root.append(element('div',`${q.allAward?'本題依公告給分':a.correct?'答對了':'再複習一次'}\n正確答案／給分規則：${answerText(q)}\n${q.explanation}\n相關法規／來源：${q.regulation}`,'result'));
   const lookup=element('button','查閱參考資料（適用版本待核對）');lookup.onclick=()=>document.querySelector('[data-tab="references"]').click();root.append(lookup);
   if(q.answerSource){const source=element('a','查看官方答案來源');source.href=q.answerSource;source.target='_blank';source.rel='noopener';root.append(source);}
  }
  const next=element('button',index===queue.length-1?'完成練習':'下一題 →','primary');next.onclick=()=>{index++;show();};root.append(next);
 }
 q.options.forEach((opt,i)=>{const button=element('button',`${String.fromCharCode(65+i)}. ${opt}`,'option');if(multi)button.setAttribute('aria-pressed','false');button.onclick=()=>{if(!multi){record(i);return;}if(selected.has(i))selected.delete(i);else selected.add(i);button.setAttribute('aria-pressed',String(selected.has(i)));button.classList.toggle('selected',selected.has(i));submit.disabled=!selected.size;};root.append(button);});
 if(multi){submit.onclick=()=>record([...selected].sort());root.append(submit);}
}
$('start').onclick=()=>{if($('subject').value==='建築計畫與設計'){document.querySelector('[data-tab="design"]').click();if(designPapers.some(p=>String(p.year)===$('year').value)){document.getElementById('designyear').value=$('year').value;designOpen();}return;}if($('subject').value==='敷地計畫與都市設計'){document.querySelector('[data-tab="site"]').click();if(sitePapers.some(p=>String(p.year)===$('year').value)){document.getElementById('siteyear').value=$('year').value;siteOpen();}return;}if(timer&&!confirm('要結束目前的模擬練習並重新開始嗎？'))return;clearInterval(timer);timer=null;const last=new Map(history.map(a=>[a.id,a]));queue=bank.filter(q=>(!$('subject').value||q.subject===$('subject').value)&&(!$('year').value||String(q.year)===$('year').value)&&(!$('chapter').value||q.chapter===$('chapter').value)&&($('mode').value!=='wrong'||last.get(q.id)?.correct===false));for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}queue=queue.slice(0,20);index=0;answers=[];exam=$('mode').value==='exam';if(!queue.length){$('quiz').replaceChildren(element('p','目前範圍沒有可練習的題目，請調整篩選或匯入題庫。'));return;}show();if(exam){deadline=Date.now()+20*60*1000;const tick=()=>{const secs=Math.max(0,Math.ceil((deadline-Date.now())/1000));document.querySelectorAll('.clock').forEach(el=>el.textContent=`剩餘 ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')} · 本次倒數不會在重新整理後恢復`);if(!secs)finish();};timer=setInterval(tick,1000);tick();}};
$('bankfile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('請使用小於 5 MB 的 JSON 檔案');const incoming=validateBank(JSON.parse(await file.text()));if(incoming.some(q=>allOfficialBank.some(item=>item.id===q.id)))throw new Error('內建官方題庫請透過版本更新，避免覆蓋更正答案');if(incoming.some(q=>q.id.startsWith('demo-')))throw new Error('demo- 為保留的示範題 ID');if(!confirm(`將匯入 ${incoming.length} 題。同 ID 題目將更新並清除該題舊作答紀錄，是否繼續？`))return;clearInterval(timer);timer=null;$('quiz').replaceChildren();const ids=new Set(incoming.map(q=>q.id));bank=[...bank.filter(q=>!ids.has(q.id)),...incoming];history=history.filter(a=>!ids.has(a.id));persist();filters();renderStats();$('importstatus').textContent=`已匯入 ${incoming.length} 題；目前共有 ${bank.length} 題（含示範題）。`;}catch(err){$('importstatus').textContent='匯入失敗：'+err.message;}finally{e.target.value='';}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),history},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='architect-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

for(const subject of subjects){
 const subset=allOfficialBank.filter(q=>q.subject===subject);if(!subset.length)continue;
 for(const year of [...new Set(subset.map(q=>q.year))].sort((a,b)=>b-a)){
  const questions=subset.filter(q=>q.year===year),card=element('article','','source-card');
  card.append(element('strong',`${subject} · ${year} 年 · ${questions.length} 題`));
  const slug=questions[0].id.split('-').slice(0,2).join('-');
  for(const [text,url] of [['試題原卷',questions[0].sourcePdf],['答案來源',questions[0].answerSource],['題庫 JSON',`data/${slug}.json`]]){const link=element('a',text);link.href=url;link.target='_blank';link.rel='noopener';card.append(element('br',''),link);}
  const corrected=questions.filter(q=>q.allAward||q.acceptedAnswers.length>1||q.originalAnswer&&q.originalAnswer!==String.fromCharCode(65+q.answer));
  if(corrected.length)card.append(element('p','更正題號：'+corrected.map(q=>Number(q.id.split('-').pop())).join('、')));
  $('sourcecatalog').append(card);
 }
}
