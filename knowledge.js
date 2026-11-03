(()=>{
 const root=$('knowledge-results'),subject=$('knowledge-subject'),kind=$('knowledge-kind'),query=$('knowledge-query');let page=0;const size=12;
 const sourceMap=new Map(studyLibraryData.sources.map(s=>[s.source_id,s]));
 const lists={cards:studyLibraryData.cards,sources:studyLibraryData.sources,exercises:studyLibraryData.exercises,chapters:studyLibraryData.chapters};
 for(const s of subjects)subject.add(new Option(s,s));
 function addSource(parent,id){const s=sourceMap.get(id);if(s)parent.append(safeLink(s.source_id+' · '+s.title,s.url,'source-link'));}
 function render(){
  const terms=query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const rows=lists[kind.value].filter(r=>(!subject.value||r.subject===subject.value||r.subject==='全部')&&terms.every(t=>JSON.stringify(r).toLocaleLowerCase().includes(t)));
  const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages-1);root.replaceChildren();$('knowledge-status').textContent=`找到 ${rows.length} 筆 · 第 ${page+1} / ${pages} 頁 · 每頁最多 ${size} 筆`;
  for(const r of rows.slice(page*size,(page+1)*size)){
   const card=element('article','','knowledge-card');card.append(element('p',(r.subject||'全部')+' · 附件整理／待核對','eyebrow'));
   if(kind.value==='cards'){
    card.append(element('h3',r.title),element('p',r.core_concept),element('p','常見誤解：'+r.common_mistake,'knowledge-mistake'));if(r.formula_or_rule)card.append(element('p','公式／規則：'+r.formula_or_rule));card.append(element('p',r.exam_year_context,'muted'));for(const id of r.source_ids)addSource(card,id);
   }else if(kind.value==='sources'){
    card.append(element('h3',r.title),element('p',r.notes),element('p',`${r.source_id} · ${r.type} · ${r.stored_fulltext?'附件聲稱有全文，仍需核對':'僅來源索引，未收錄全文'}`,'muted'),safeLink('前往來源入口（未由本站核驗）',r.url,'source-link'));
   }else if(kind.value==='chapters'){
    card.append(element('h3',r.subject+'章節地圖'));const text=element('pre',r.text,'knowledge-markdown');card.append(text);
   }else{
    card.append(element('h3',r.question),element('p','附件自編練習，草稿答案未覆核；不計入考古題或原創40題統計。','muted'));const options=element('div','','knowledge-options'),answer=element('div','','knowledge-answer');answer.hidden=true;
    r.options.forEach((text,i)=>{const b=element('button',`${String.fromCharCode(65+i)}. ${text}`);b.type='button';b.onclick=()=>{options.querySelectorAll('button').forEach(b=>b.disabled=true);answer.replaceChildren(element('strong',`你的選擇：${String.fromCharCode(65+i)} · 草稿參考答案：${String.fromCharCode(65+r.answer)}`),element('p',r.explanation));answer.hidden=false;};options.append(b);});card.append(options,answer);
   }
   root.append(card);
  }
  if(!rows.length)root.append(element('p','沒有相符資料，請改用較短關鍵字或選擇全部科目。','empty-state'));
  $('knowledge-prev').disabled=page===0;$('knowledge-next').disabled=page>=pages-1;
 }
 $('knowledge-form').onsubmit=e=>{e.preventDefault();page=0;render();};subject.onchange=kind.onchange=()=>{page=0;render();};
 $('knowledge-prev').onclick=()=>{page--;render();root.scrollIntoView({block:'start'});};$('knowledge-next').onclick=()=>{page++;render();root.scrollIntoView({block:'start'});};
 $('knowledge-clear').onclick=()=>{query.value='';subject.value='';page=0;render();};render();
})();
