const gptSelectionSets=typeof module!=='undefined'?require('./study').selectionSets:selectionSets;
const GPT_SOURCE_BASE='https://s100009986075993-boop.github.io/-/';
function gptSourceURL(path,page){
 if(!path)return '';
 try{const url=new URL(path,GPT_SOURCE_BASE);if(!['http:','https:'].includes(url.protocol))return '';if(page&&!url.hash)url.hash='page='+page;return url.href;}catch{return '';}
}
function buildGptPrompt(q,selected){
 const selection=Array.isArray(selected)?selected:[selected];
 const picked=selection.filter(i=>Number.isInteger(i)&&q.options[i]!==undefined).map(i=>String.fromCharCode(65+i)).join('、')||'未作答';
 const rules=q.allAward?'官方更正：本題一律給分，不代表每個選項的觀念皆正確。':gptSelectionSets(q).map(set=>set.map(i=>String.fromCharCode(65+i)).join('＋')).join(' 或 ');
 const lines=[
  '請用繁體中文，協助我理解建築師考試題目。',
  `${q.year?`民國${q.year}年`:'示範題'}｜${q.subject}｜${q.id}${q.chapter?'｜'+q.chapter:''}`,
  '【題幹】',q.question,'【選項】',...q.options.map((text,i)=>`${String.fromCharCode(65+i)}. ${text}`),
  `【官方答案／給分組合】${rules}`,`【我的選擇】${picked}`,
  '請依序說明：①考點與核心觀念；②解題步驟（計算題列公式、單位及適用條件）；③逐一比較各選項，指出我的可能誤解；④一句記憶提示，並出一題相似小測驗，答案放最後。',
  '①②③④若是原題分項編號，請保留其定義與組合，不要誤當可任意複選。官方給分不等於觀念一定正確；若發現矛盾，請明列疑點，不要為配合答案倒推理由。',
  '法規與規範請區分考試當年與現行版本，引用可核實來源及適用日期；無法核實就標示待查，不要編造條號。'
 ];
 if(q.textStatus==='needs-review')lines.push('本題文字／公式已標記待核對，請先核對原卷，不要猜補缺字。');
 const pdf=gptSourceURL(q.sourcePdf,q.sourcePage);if(pdf)lines.push('原始試卷：'+pdf);
 const key=gptSourceURL(q.answerSource);if(key)lines.push('官方答案／更正表：'+key);
 const diagrams=q.diagrams?.length?q.diagrams:q.diagram?[q.diagram]:[];
 for(const diagram of diagrams){const url=gptSourceURL(typeof diagram==='string'?diagram:diagram.src);if(url)lines.push('題目附圖：'+url);}
 if(diagrams.length||q.image)lines.push('若無法讀取附圖或PDF，請先請我上傳截圖，不要臆測圖面。');
 lines.push('網站現有解析可能尚未完成或為草稿；請獨立核對。');
 return lines.join('\n');
}
function gptLaunch(prompt){
 const url='https://chatgpt.com/?q='+encodeURIComponent(prompt);
 const prefill=url.length<=8000;
 return {url:prefill?url:'https://chatgpt.com/',prefill};
}
if(typeof module!=='undefined')module.exports={buildGptPrompt,gptSourceURL,gptLaunch};
