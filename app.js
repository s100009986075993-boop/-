const $=id=>document.getElementById(id);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const allOfficialBank=[...officialBank,...environmentBank,...lawBank,...constructionBank];
const latestExplanationBatch=allOfficialBank.map(q=>q.explanationBatch||'').sort().at(-1)||'';
const builtInBank=[...demo,...allOfficialBank];
const builtInIds=new Set(builtInBank.map(q=>q.id));
const mergedBank=new Map(builtInBank.map(q=>[q.id,q]));
for(const q of read('architect-bank',[]))if(!builtInIds.has(q.id))mergedBank.set(q.id,q);
let bank=[...mergedBank.values()],history=read('architect-history',[]),queue=[],index=0,answers=[],timer=null,deadline=0,exam=false;
let playMode='random',roundSaved=false;
let adventureRounds=read('architect-adventure-rounds',0);
if(!Number.isSafeInteger(adventureRounds)||adventureRounds<0)adventureRounds=0;
let questionNotes=read('architect-question-notes',{});
if(!questionNotes||Array.isArray(questionNotes)||typeof questionNotes!=='object')questionNotes={};
function persist(){try{localStorage.setItem('architect-bank',JSON.stringify(bank.filter(q=>!builtInIds.has(q.id))));localStorage.setItem('architect-history',JSON.stringify(history));}catch{alert('瀏覽器無法儲存資料，請匯出紀錄備份。');}}
function element(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function safeLink(text,href,className){const a=element('a',text,className);try{const url=new URL(href,location.href);if(['http:','https:','file:'].includes(url.protocol))a.href=url.href;}catch{}a.target='_blank';a.rel='noopener';return a;}
function setTab(id){document.querySelectorAll('[data-tab]').forEach(x=>{const active=x.dataset.tab===id;x.classList.toggle('active',active);x.setAttribute('aria-current',active?'page':'false');});for(const tab of ['practice','site','design','progress','references','import'])$(tab).hidden=tab!==id;document.body.classList.toggle('quiz-mode',id==='practice'&&!!$('quiz').children.length);renderStats();}
function renderStats(){renderAdventure();const s=stats(history);$('total').textContent=s.total;$('accuracy').textContent=s.accuracy+'%';const last=new Map(history.map(a=>[a.id,a]));$('wrong').textContent=[...last.values()].filter(a=>!a.correct).length;$('breakdown').replaceChildren();for(const subject of subjects){const s=stats(history.filter(a=>a.subject===subject));const row=element('div','','subject-row');row.append(element('span',subject),element('span',s.total?`${s.total} 次作答 · ${s.accuracy}% 正確`:'尚無作答'));$('breakdown').append(row);}renderReviewDesk();renderNoteList();}
function filters(){for(const [id,key]of [['year','year'],['chapter','chapter']]){const value=$(id).value;$(id).replaceChildren(new Option(id==='year'?'全部年度':'全部章節',''));for(const item of [...new Set(bank.map(q=>q[key]))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b),'zh-Hant')))$(id).add(new Option(item===0?'示範題':String(item),String(item)));$(id).value=value;}}
subjects.forEach(s=>$('subject').add(new Option(s,s)));filters();renderStats();
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function endPractice(){playMode='random';clearInterval(timer);timer=null;queue=[];answers=[];index=0;$('quiz').replaceChildren();document.body.classList.remove('quiz-mode');$('practice').scrollIntoView({behavior:'smooth',block:'start'});}
function questionNumber(q){return q.questionNo??Number(q.id.split('-').pop());}
function addProvenance(root,q){if(!q.image&&!q.sourcePdf)return;const details=element('details','','provenance');details.append(element('summary',q.textStatus==='needs-review'?'核對原題 · 本題文字待核對':'核對原題與答案來源'));const content=element('div','','provenance-content');content.append(element('p',`文字與圖表依原卷整理。${q.sourcePage?'PDF 第 '+q.sourcePage+' 頁。':''}如發現辨識差異，請以原始試卷核對。`,'muted'));if(q.sourcePdf)content.append(safeLink('開啟原始試卷 PDF',q.sourcePdf+(q.sourcePage?'#page='+q.sourcePage:''),'source-link'));if(q.image){const link=safeLink('',q.image);const img=document.createElement('img');img.src=q.image;img.alt=`${q.year} 年 ${q.subject} 第 ${questionNumber(q)} 題原始頁面`;img.loading='lazy';img.className='source-image';link.append(img);content.append(link);}if(q.answerSource)content.append(safeLink('查看官方答案／更正表',q.answerSource,'source-link'));details.append(content);root.append(details);}
function addDiagrams(root,q){const diagrams=q.diagrams?.length?q.diagrams:q.diagram?[q.diagram]:[];if(!diagrams.length)return;const region=element('div','','question-diagrams');for(const [i,d]of diagrams.entries()){const src=typeof d==='string'?d:d.src;if(!src)continue;const figure=element('figure','','question-diagram');const link=safeLink('',src);const img=document.createElement('img');img.src=src;img.alt=(typeof d==='object'&&d.alt)||`本題附圖 ${i+1}`;img.className='diagram-image';link.append(img);figure.append(link,element('figcaption','題目附圖 · 點擊放大'));region.append(figure);}root.append(region);}
function feedback(root,q,answer){
 const section=element('section','','feedback');section.setAttribute('aria-label','作答結果與 GPT 提問');
 const heading=q.allAward||q.excludeFromAccuracy?'本題依更正公告給分':answer.correct?'答對了，留住這個觀念。':'把這一題，留給下一次的你。';
 section.append(element('h3',heading),element('p',`你的答案：${selectionText(q,answer.selected)}`,'your-answer'),element('p',`官方答案／給分規則：${answerText(q)}`,'answer-rule'));
 appendGptHelp(section,q,answer.selected);appendQuestionNote(section,q);
 if(q.answerSource)section.append(safeLink('官方答案來源',q.answerSource,'source-link'));
 root.append(section);
}
function finish(){if(!roundSaved&&playMode==='adventure'&&answers.length===queue.length&&queue.length){adventureRounds++;roundSaved=true;try{localStorage.setItem('architect-adventure-rounds',JSON.stringify(adventureRounds));}catch{}}clearInterval(timer);timer=null;const root=$('quiz');root.replaceChildren();const card=element('section','','completion-card');card.append(element('p','TODAY’S STAY · 本次練習','eyebrow'),element('h2',exam?'模擬練習完成':'今天又累積了一點。'),element('p',`共 ${queue.length} 題，已答 ${answers.length} 題。`));const metrics=element('div','','completion-metrics');metrics.append(element('strong',`${answers.filter(a=>a.correct).length}`),element('span','題依官方規則得分'));if(playMode==='duel'){const scores=[0,0];answers.forEach((a,i)=>{if(a.correct&&!a.allAward&&!a.excludeFromAccuracy)scores[i%2]++;});card.append(element('h3',scores[0]===scores[1]?'本回平手！':`玩家 ${scores[0]>scores[1]?'1':'2'} 獲勝！`),element('p',`玩家 1：${scores[0]} 分 · 玩家 2：${scores[1]} 分。同機輪流作答，每人題數相同；題目難度可能不同。`));}if(playMode==='adventure')card.append(element('p',`冒險完成！累計完成 ${adventureRounds} 回。回到選題可查看等級與成就。`));card.append(metrics,element('p',`其中一律給分 ${answers.filter(a=>a.allAward).length} 題。學習正確率排除一律給分及任一單選給分題。`,'muted'));if(exam){const reviews=element('div','','exam-reviews');for(const a of answers){const q=queue.find(q=>q.id===a.id);const review=element('details','','exam-review');review.append(element('summary',`${q.year||'示範'} 年 · ${q.subject} · 第 ${questionNumber(q)} 題`),element('p',q.question,'question-stem'));addDiagrams(review,q);feedback(review,q,a);addProvenance(review,q);reviews.append(review);}card.append(reviews);}const back=element('button','回到選題大廳','primary');back.onclick=endPractice;card.append(back);root.append(card);renderStats();}
function show(){
 if(index>=queue.length){finish();return;}
 const root=$('quiz'),q=queue[index];root.replaceChildren();document.body.classList.add('quiz-mode');
 const shell=element('article','','question-card');if(playMode==='adventure')appendBattle(shell);if(playMode==='duel')shell.append(element('p',`⚔ 同機 PK · 請交給玩家 ${index%2+1} 作答`,'duel-turn'));const progress=element('div','','quiz-progress');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','本回進度');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(queue.length));progress.setAttribute('aria-valuenow',String(index));const fill=element('span','');fill.style.width=`${index/queue.length*100}%`;progress.append(fill);shell.append(progress);
 const top=element('div','','question-topline'),brand=element('div','','question-brand');brand.append(element('span','築','brand-seal'),element('div','築考練習室','brand-name'));const meta=element('div','','question-meta');meta.append(element('span',`${index+1} / ${queue.length}`,'question-count'),element('span',q.year?`${q.year} 年 · 第 ${questionNumber(q)} 題`:'示範練習'));top.append(brand,meta);shell.append(top,element('p',q.subject+' · '+q.chapter,'question-subject'));
 if(exam)shell.append(element('p','','clock'));
 shell.append(element('h3',q.question,'question-stem'));
 if(q.textStatus==='needs-review')shell.append(element('p','本題文字或公式尚待核對。請展開「核對原題」確認後作答；不確定的內容未以猜測補齊。','notice review-notice'));
 if(q.subject==='營建法規與實務'&&q.year>0)shell.append(element('p',`歷年法規題 · 依民國 ${q.year} 年答案表；現行條文與修法差異待核對。`,'historical-note'));
 addDiagrams(shell,q);
 const multi=selectionSets(q).some(set=>set.length>1),concept=structureCategory(q,structureTopics)?.lane==='systems',confirmChoice=multi||$('answerflow').value==='confirm',selected=new Set(),eliminated=new Set();let confidence='unsure';
 if(concept){const category=structureCategory(q,structureTopics);const guide=element('details','','concept-guide');guide.append(element('summary','觀念讀題提示 · '+category.topic));const list=element('ul');for(const text of structureGuides[category.topic]||[])list.append(element('li',text));guide.append(list,element('p','這是學習提示，逐項詳解是否已完成請看作答後標示。','muted'));shell.append(guide);shell.append(element('p','觀念練習：先辨認觀念與傳力，再選擇答案。','selection-hint'));}
 if(q.options.some(option=>combinationStatements(q,option).length)&&!multi)shell.append(element('p','①②③④為原題敘述編號；請選擇一個符合的 A～D 組合。','selection-hint'));
 if(multi)shell.append(element('p','依本題更正規則，可選一個或多個選項後提交。','selection-hint'));
 if(q.excludeFromAccuracy&&!q.allAward)shell.append(element('p','官方更正：本題所有單選選項均可給分；多選組合依公告，不包含未作答。本題不列入學習正確率。','notice'));
 if(q.allAward)shell.append(element('p','官方更正：本題一律給分，不列入學習正確率。給分不代表各選項觀念皆正確。','notice'));
 const options=element('div','','question-options');options.setAttribute('aria-label','作答選項');
 const submit=element('button',multi?'提交答案':'確認答案','primary submit-answer');submit.disabled=confirmChoice;
 const eliminationTools=element('div','','elimination-tools');
 eliminationTools.append(element('p','先選答案，或按右側「排除」劃掉不考慮的選項；可隨時恢復。','muted'));
 const eliminationStatus=element('span','','elimination-status');eliminationStatus.setAttribute('role','status');
 const clearEliminations=element('button','清除排除','clear-eliminations');clearEliminations.type='button';clearEliminations.hidden=true;
 eliminationTools.append(eliminationStatus,clearEliminations);shell.append(eliminationTools);
 function refreshOptions(){
  const answered=!!options.dataset.answered;
  options.querySelectorAll('.option').forEach((button,i)=>{
   const excluded=eliminated.has(i);button.disabled=answered||excluded;button.classList.toggle('eliminated',excluded);
   button.classList.toggle('selected',selected.has(i));button.setAttribute('aria-pressed',String(selected.has(i)));
   const toggle=options.querySelectorAll('.exclude-option')[i];toggle.disabled=answered;toggle.textContent=excluded?'恢復':'排除';
   toggle.setAttribute('aria-pressed',String(excluded));toggle.setAttribute('aria-label',`${excluded?'恢復':'排除'}選項 ${String.fromCharCode(65+i)}`);
   button.parentElement.classList.toggle('has-elimination',excluded);
  });
  eliminationStatus.textContent=eliminated.size?`已排除 ${eliminated.size} 個選項`:'';
  clearEliminations.hidden=!eliminated.size;eliminationTools.hidden=answered;
  submit.disabled=answered||!selected.size||!confidence;
 }
 clearEliminations.onclick=()=>{if(options.dataset.answered)return;eliminated.clear();refreshOptions();};
 function record(choice){
  if(exam&&Date.now()>=deadline){finish();return;}
  if(options.dataset.answered||!selected.size||!confidence)return;options.dataset.answered='true';eliminated.clear();refreshOptions();confidenceBox.querySelectorAll('button').forEach(x=>x.disabled=true);submit.disabled=true;
  const a={id:q.id,subject:q.subject,chapter:q.chapter,selected:choice,correct:isCorrect(q,choice),allAward:!!q.allAward,excludeFromAccuracy:!!q.excludeFromAccuracy,confidence,at:new Date().toISOString()};
  a.playMode=playMode;answers.push(a);history.push(a);persist();renderStats();if(playMode==='adventure'){const battle=shell.querySelector('.battle');if(battle)battle.remove();appendBattle(shell);}
  const picked=Array.isArray(choice)?choice:[choice];for(const i of picked){const button=options.querySelectorAll('.option')[i];button.classList.add('selected');button.querySelector('.option-indicator').textContent='你的選擇';}
  if(!exam){if(!q.allAward&&!q.excludeFromAccuracy){acceptedAnswers(q).forEach(i=>{const b=options.querySelectorAll('.option')[i];b.classList.add('correct');b.querySelector('.option-indicator').textContent=picked.includes(i)?'你的選擇 · 給分':'給分選項';});if(!a.correct)picked.forEach(i=>options.querySelectorAll('.option')[i].classList.add('incorrect'));}feedback(shell,q,a);}
  const next=element('button',index===queue.length-1?'完成這回練習':'下一題 →','primary next-question');next.onclick=()=>{index++;show();$('quiz').scrollIntoView({behavior:'smooth',block:'start'});};const result=shell.querySelector('.feedback');if(result)result.insertBefore(next,result.querySelector('.gpt-help'));else shell.append(next);
 }
 q.options.forEach((opt,i)=>{
  const row=element('div','','option-row'),button=element('button','','option');button.type='button';
  button.setAttribute('aria-label',`${String.fromCharCode(65+i)}. ${opt}`);
  button.append(element('span',String.fromCharCode(65+i),'option-letter'),element('span',opt,'option-text'),element('span','','option-indicator'));
  button.setAttribute('aria-pressed','false');
  button.onclick=()=>{
   if(options.dataset.answered||eliminated.has(i))return;
   if(!multi){selected.clear();selected.add(i);}else if(selected.has(i))selected.delete(i);else selected.add(i);
   refreshOptions();if(!confirmChoice)record(i);
  };
  const exclude=element('button','排除','exclude-option');exclude.type='button';exclude.setAttribute('aria-pressed','false');exclude.setAttribute('aria-label',`排除選項 ${String.fromCharCode(65+i)}`);
  exclude.onclick=()=>{
   if(options.dataset.answered)return;
   if(eliminated.has(i))eliminated.delete(i);else{eliminated.add(i);selected.delete(i);}
   refreshOptions();
  };
  row.append(button,exclude);options.append(row);
 });
 shell.append(options);const confidenceBox=element('fieldset','','confidence-choice');confidenceBox.append(element('legend','把握程度（可先選；未選按不確定記錄）'));for(const [value,label] of [['sure','有把握'],['guess','猜的'],['unsure','不會／不確定']]){const button=element('button',label);button.type='button';button.dataset.confidence=value;button.setAttribute('aria-pressed',String(value===confidence));button.classList.toggle('selected',value===confidence);button.onclick=()=>{if(options.dataset.answered)return;confidence=value;confidenceBox.querySelectorAll('button').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});submit.disabled=!selected.size;};confidenceBox.append(button);}shell.insertBefore(confidenceBox,options);if(confirmChoice){submit.onclick=()=>record(multi?[...selected].sort():[...selected][0]);shell.append(submit);}addProvenance(shell,q);root.append(shell);const leave=element('button','結束這回 · 返回選題','lobby-button');leave.onclick=endPractice;root.append(leave);
}
$('start').onclick=()=>{
 if($('subject').value==='建築計畫與設計'){setTab('design');if(designPapers.some(p=>String(p.year)===$('year').value)){$('designyear').value=$('year').value;designOpen();}return;}
 if($('subject').value==='敷地計畫與都市設計'){setTab('site');if(sitePapers.some(p=>String(p.year)===$('year').value)){$('siteyear').value=$('year').value;siteOpen();}return;}
 if(timer&&!confirm('要結束目前的模擬練習並重新開始嗎？'))return;clearInterval(timer);timer=null;const last=new Map(history.map(a=>[a.id,a])),reviews=reviewState(history),now=Date.now();queue=bank.filter(q=>($('subject').value!=='建築結構'||matchesStructure(q,structureTopics,$('structurelane').value,$('structuretopic').value))&&($('contentfilter').value!=='detailed'||!!q.solution)&&($('contentfilter').value!=='recent'||(!!q.solution&&!!latestExplanationBatch&&q.explanationBatch===latestExplanationBatch))&&($('contentfilter').value!=='pending'||(q.year>0&&!q.solution))&&($('contentfilter').value!=='diagram'||!!q.diagrams?.length)&&(!$('subject').value||q.subject===$('subject').value)&&(!$('year').value||String(q.year)===$('year').value)&&(!$('chapter').value||q.chapter===$('chapter').value)&&($('mode').value!=='wrong'||last.get(q.id)?.correct===false)&&(!['learning','due'].includes($('mode').value)||reviewMatch(reviews.get(q.id),$('mode').value,now)));for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}if($('mode').value==='due')queue.sort((a,b)=>reviews.get(a.id).dueAt-reviews.get(b.id).dueAt);queue=queue.slice(0,20);playMode=$('mode').value;roundSaved=false;if(playMode==='duel')queue=queue.slice(0,queue.length-queue.length%2);index=0;answers=[];exam=$('mode').value==='exam';if(!queue.length){$('quiz').replaceChildren(element('p','目前範圍沒有可練習的題目，請調整篩選或匯入題庫。','empty-state'));document.body.classList.remove('quiz-mode');return;}show();$('quiz').scrollIntoView({behavior:'smooth',block:'start'});if(exam){deadline=Date.now()+20*60*1000;const tick=()=>{const secs=Math.max(0,Math.ceil((deadline-Date.now())/1000));document.querySelectorAll('.clock').forEach(el=>el.textContent=`剩餘 ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')} · 重新整理會結束本回計時`);if(!secs)finish();};timer=setInterval(tick,1000);tick();}
};
$('bankfile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('請使用小於 5 MB 的 JSON 檔案');const incoming=validateBank(JSON.parse(await file.text()));if(incoming.some(q=>builtInIds.has(q.id)))throw new Error('內建題庫請透過版本更新，避免覆蓋更正答案');if(incoming.some(q=>q.id.startsWith('demo-')))throw new Error('demo- 為保留的示範題 ID');if(!confirm(`將匯入 ${incoming.length} 題。同 ID 題目將更新並清除該題舊作答紀錄，是否繼續？`))return;clearInterval(timer);timer=null;$('quiz').replaceChildren();document.body.classList.remove('quiz-mode');const ids=new Set(incoming.map(q=>q.id));bank=[...bank.filter(q=>!ids.has(q.id)),...incoming];history=history.filter(a=>!ids.has(a.id));for(const id of ids)delete questionNotes[id];try{localStorage.setItem('architect-question-notes',JSON.stringify(questionNotes));}catch{}persist();filters();renderStats();$('importstatus').textContent=`已匯入 ${incoming.length} 題；目前共有 ${bank.length} 題（含示範題）。`;}catch(err){$('importstatus').textContent='匯入失敗：'+err.message;}finally{e.target.value='';}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),history,questionNotes,adventureRounds},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='architect-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const subject of subjects){const subset=allOfficialBank.filter(q=>q.subject===subject);if(!subset.length)continue;for(const year of [...new Set(subset.map(q=>q.year))].sort((a,b)=>b-a)){const questions=subset.filter(q=>q.year===year),card=element('article','','source-card');card.append(element('strong',`${subject} · ${year} 年 · ${questions.length} 題`));const slug=questions[0].id.split('-').slice(0,2).join('-');for(const [text,url]of [['試題原卷',questions[0].sourcePdf],['答案來源',questions[0].answerSource],['題庫 JSON',`data/${slug}.json`]])card.append(element('br',''),safeLink(text,url));const corrected=questions.filter(q=>q.allAward||q.acceptedAnswers?.length>1||q.originalAnswer&&q.originalAnswer!==String.fromCharCode(65+q.answer));if(corrected.length)card.append(element('p','更正題號：'+corrected.map(q=>questionNumber(q)).join('、')));$('sourcecatalog').append(card);}}

const detailedCount=allOfficialBank.filter(q=>q.solution).length;
$('quick-detailed-count').textContent=detailedCount;
const reviewCount=allOfficialBank.filter(q=>q.textStatus==='needs-review').length;
$('nativecoverage').textContent=`已轉錄 ${allOfficialBank.length} 題；${reviewCount} 題含需對照原圖的特殊字元或數學排版。作答後可直接詢問 GPT，頁面不顯示內建詳解；題庫保留 ${detailedCount} 題草稿資料。`;
$('trydetails').onclick=()=>{$('subject').value='';$('year').value='';$('chapter').value='';$('mode').value='random';$('contentfilter').value='detailed';$('structurelane').value='all';$('structuretopic').value='';$('start').click();};

// Subject shortcuts share the existing filters and practice flow.
const shortcutMeta={
 '建築結構':['01','720 題 · 選擇題'],
 '建築環境控制':['02','720 題 · 選擇題'],
 '營建法規與實務':['03','1,440 題 · 選擇題'],
 '建築構造與施工':['04','1,440 題 · 選擇題'],
 '敷地計畫與都市設計':['05','18 份原卷 · 計時與筆記'],
 '建築計畫與設計':['06','18 份原卷 · 計時與筆記']
};
function syncSubjectShortcuts(){
 syncStructureStudy();
 document.querySelectorAll('[data-subject]').forEach(button=>{
  const selected=button.dataset.subject===$('subject').value;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
}
for(const [subject,[number,description]] of Object.entries(shortcutMeta)){
 const button=element('button','','subject-shortcut');button.type='button';button.dataset.subject=subject;
 button.append(element('span',number,'shortcut-number'),element('strong',subject),element('span',description,'shortcut-description'),element('span','↗','shortcut-arrow'));
 button.onclick=()=>{$('subject').value=$('subject').value===subject?'':subject;syncSubjectShortcuts();};
 $('subject-shortcuts').append(button);
}
$('subject').addEventListener('change',syncSubjectShortcuts);
$('hero-details').onclick=()=>{$('trydetails').click();syncSubjectShortcuts();};
$('trydetails').addEventListener('click',syncSubjectShortcuts);
syncSubjectShortcuts();

function syncStructureStudy(){
 const visible=$('subject').value==='建築結構';$('structure-study').hidden=!visible;
 if(!visible)return;
 const lane=$('structurelane').value;
 const previous=$('structuretopic').value;
 $('structuretopic').replaceChildren(new Option('全部主題',''));
 for(const topic of [...new Set(officialBank.filter(q=>matchesStructure(q,structureTopics,lane)).map(q=>structureCategory(q,structureTopics).topic).filter(Boolean))])$('structuretopic').add(new Option(topic,topic));
 if([...$('structuretopic').options].some(option=>option.value===previous))$('structuretopic').value=previous;
 const count=officialBank.filter(q=>matchesStructure(q,structureTopics,lane,$('structuretopic').value)).length;
 const counts=['systems','mechanics','pending'].map(value=>officialBank.filter(q=>matchesStructure(q,structureTopics,value)).length);
 $('structurecoverage').textContent=`目前分流：系統與觀念 ${counts[0]} 題 · 力學與計算 ${counts[1]} 題 · 待分類 ${counts[2]} 題。本次結構範圍 ${count} 題；年度、章節及其他篩選仍會進一步限制題目。`;
 document.querySelectorAll('[data-structure-lane]').forEach(button=>{const active=button.dataset.structureLane===lane;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
}
$('structurelane').addEventListener('change',()=>{$('structuretopic').value='';syncStructureStudy();});
$('structuretopic').addEventListener('change',syncStructureStudy);
document.querySelectorAll('[data-structure-lane]').forEach(button=>button.onclick=()=>{$('structurelane').value=button.dataset.structureLane;$('structuretopic').value='';syncStructureStudy();});

function appendGptHelp(root,q,selected){
 const panel=element('section','','gpt-help');panel.setAttribute('aria-label','詢問 GPT 詳解');
 panel.append(element('h4','詢問 GPT 詳解','solution-title'));
 const prompt=buildGptPrompt(q,selected),launch=gptLaunch(prompt);
 const actions=element('div','','gpt-actions');
 const open=safeLink('複製提問並開啟 ChatGPT ↗',launch.url,'gpt-launch');
 const copy=element('button','只複製提問');copy.type='button';
 const preview=element('details','','gpt-preview');preview.append(element('summary','查看／手動複製提問內容'));
 const text=document.createElement('textarea');text.value=prompt;text.readOnly=true;text.rows=8;text.setAttribute('aria-label','傳給 ChatGPT 的提問內容');preview.append(text);
 const status=element('p','','muted');status.setAttribute('role','status');
 async function copyPrompt(){
  try{await navigator.clipboard.writeText(prompt);status.textContent='已複製。若 ChatGPT 沒有帶入內容，請貼上後自行送出。';}
  catch{preview.open=true;text.focus();text.select();status.textContent='無法自動複製，請複製下方已選取的提問，再貼到 ChatGPT。';}
 }
 copy.onclick=copyPrompt;open.addEventListener('click',()=>{void copyPrompt();});
 actions.append(open,copy);panel.append(actions,element('p',launch.prefill?'開啟後會嘗試帶入提問；可能需要登入 ChatGPT。請確認內容並自行送出。':'本題內容較長：開啟 ChatGPT 後，請貼上已複製的提問並自行送出。','muted'),preview,status);root.append(panel);
}

function renderReviewDesk(){
 const states=reviewState(history),ids=new Set(bank.map(q=>q.id));
 const current=[...states.values()].filter(state=>ids.has(state.id));
 const due=current.filter(state=>reviewMatch(state,'due')).length;
 const learning=current.filter(state=>reviewMatch(state,'learning')).length;
 $('review-summary').textContent=`到期複習 ${due} 題 · 錯題或不確定 ${learning} 題。答錯或不確定隔 1 天再練；有把握答對依連續表現間隔 1、3、7、14 天。`;
 $('review-due').disabled=!due;$('review-learning').disabled=!learning;
}
function startReviewMode(mode){
 setTab('practice');$('subject').value='';$('year').value='';$('chapter').value='';$('contentfilter').value='all';$('structurelane').value='all';$('structuretopic').value='';$('mode').value=mode;syncSubjectShortcuts();$('start').click();
}
$('review-due').onclick=()=>startReviewMode('due');$('review-learning').onclick=()=>startReviewMode('learning');
function appendQuestionNote(root,q){
 const panel=element('details','','question-note');panel.append(element('summary','記下錯因／單題筆記（可貼上 GPT 重點）'));
 const labels=['尚未標記','觀念不清','公式或模型用錯','單位／計算錯誤','看漏題意','法規版本待查','其他'];
 const reasonLabel=element('label','這題卡在哪裡？');const reason=document.createElement('select');reason.setAttribute('aria-label','單題錯因');for(const label of labels)reason.add(new Option(label,label==='尚未標記'?'':label));reason.value=questionNotes[q.id]?.reason||'';reasonLabel.append(reason);
 const noteLabel=element('label','給下次自己的提醒');const text=document.createElement('textarea');text.rows=4;text.maxLength=4000;text.placeholder='用自己的話記一句重點；貼上 GPT 回覆時請自行核對。';text.setAttribute('aria-label','單題筆記');text.value=questionNotes[q.id]?.text||'';noteLabel.append(text);
 const status=element('p','只保存在此瀏覽器，建議定期匯出學習紀錄。','muted');status.setAttribute('role','status');
 function save(){const value=text.value;if(value.trim()||reason.value)questionNotes[q.id]={text:value,reason:reason.value,updatedAt:new Date().toISOString()};else delete questionNotes[q.id];try{localStorage.setItem('architect-question-notes',JSON.stringify(questionNotes));status.textContent='已自動儲存於此瀏覽器。';}catch{status.textContent='儲存失敗，請立即複製筆記或匯出備份，重新整理前不要離開。';}renderNoteList();}
 text.oninput=save;reason.onchange=save;panel.append(reasonLabel,noteLabel,status);root.append(panel);
}
function renderNoteList(){
 const root=$('question-notes-list');root.replaceChildren();
 const lookup=new Map(bank.map(q=>[q.id,q]));const entries=Object.entries(questionNotes).filter(([id,note])=>lookup.has(id)&&note&&typeof note==='object').sort((a,b)=>String(b[1].updatedAt||'').localeCompare(String(a[1].updatedAt||'')));
 if(!entries.length){root.append(element('p','作答後可記錄錯因與筆記；儲存後會列在這裡。','muted'));return;}
 for(const [id,note] of entries){const q=lookup.get(id);const card=element('article','','saved-note');card.append(element('strong',`${q.year||'示範'} 年 · ${q.subject} · 第 ${questionNumber(q)} 題`));if(note.reason)card.append(element('p','錯因：'+note.reason,'muted'));if(note.text)card.append(element('p',note.text,'saved-note-text'));const button=element('button','重練這一題');button.onclick=()=>{if(timer&&!confirm('要結束目前模擬練習並重練這題嗎？'))return;clearInterval(timer);timer=null;queue=[q];index=0;answers=[];exam=false;setTab('practice');show();$('quiz').scrollIntoView({behavior:'smooth',block:'start'});};card.append(button);root.append(card);}
}

$('answerflow').value=read('architect-answerflow','instant')==='confirm'?'confirm':'instant';
$('answerflow').onchange=()=>{try{localStorage.setItem('architect-answerflow',JSON.stringify($('answerflow').value));}catch{}};

function renderAdventure(){
 const root=$('adventure-progress');if(!root)return;
 const progress=adventureProgress(history,adventureRounds);
 root.textContent=`Lv.${progress.level} · ${progress.xp} XP · 已探索 ${progress.seen} 題 · 首次答對 ${progress.correct} 題 · 完成 ${adventureRounds} 回`;
 $('adventure-xp').max=100;$('adventure-xp').value=progress.xp%100;
 $('adventure-badges').textContent=progress.badges.length?'已獲成就：'+progress.badges.join(' ／ '):'下一個成就：完成第一回冒險';
}
function appendBattle(shell){
 const damage=answers.filter(a=>a.correct&&!a.allAward&&!a.excludeFromAccuracy).length;
 const battle=element('section','','battle');battle.setAttribute('aria-label','像素冒險戰況');
 const scene=element('div','','battle-scene');scene.append(element('span','⚔','pixel-knight'),element('span','','pixel-monster'));
 const status=element('div');status.append(element('strong',`知識史萊姆 · 第 ${Math.floor(damage/5)+1} 關`),element('p',`本回命中 ${damage} 次 · 每答對一題造成 1 點傷害`));
 const hp=document.createElement('progress');hp.max=5;hp.value=5-damage%5;hp.setAttribute('aria-label','怪物剩餘生命');status.append(hp,element('p',damage&&damage%5===0?'擊敗怪物！下一隻已登場。':'答錯可看結果、記筆記，再繼續挑戰。','muted'));battle.append(scene,status);shell.prepend(battle);
}
