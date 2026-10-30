const subjects = ['建築計畫與設計','敷地計畫與都市設計','營建法規與實務','建築結構','建築構造與施工','建築環境控制'];
const demo = [
 {id:'demo-1',subject:subjects[2],year:0,chapter:'法規閱讀',question:'【示範題】查閱建築法規時，哪個做法最適當？',options:['只看網路摘要','核對官方條文與適用日期','只看題庫答案','忽略修法日期'],answer:1,explanation:'應核對官方條文、施行日期及題目適用時點。此題為操作示範，並非歷屆考題。',regulation:'尚未附入法規原文，請查核官方來源。'},
 {id:'demo-2',subject:subjects[3],year:0,chapter:'結構基本觀念',question:'【示範題】在材料、截面及支承條件相同時，細長柱的長度增加，一般如何影響其歐拉臨界挫屈載重？',options:['增加','不變','降低','與長度無關'],answer:2,explanation:'理想歐拉柱的臨界載重 Pcr = π²EI / (KL)²；其他條件相同時，長度增加會降低臨界載重。此題不是官方試題。',regulation:'基本力學觀念；未引用法規。'},
 {id:'demo-3',subject:subjects[5],year:0,chapter:'熱傳基本觀念',question:'【示範題】其他條件相同時，提高外殼熱阻通常會如何影響穩態傳導熱量？',options:['降低','增加','必定為零','不受影響'],answer:0,explanation:'穩態傳導熱量與總熱阻成反比。此題為簡化觀念示範，不是官方試題。',regulation:'基本熱傳觀念；未引用法規。'}
];
function validateBank(value) {
 if (!Array.isArray(value) || !value.length) throw new Error('請提供非空白的題目陣列');
 const ids=new Set();
 for(const q of value){
  if(!q || typeof q.id!=='string'||!q.id.trim()||ids.has(q.id)||!subjects.includes(q.subject)||!Number.isInteger(q.year)||q.year<1||!Array.isArray(q.options)||q.options.length<2||q.options.some(v=>typeof v!=='string'||!v.trim())||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||['chapter','question','explanation','regulation'].some(k=>typeof q[k]!=='string'||!q[k].trim())) throw new Error('題目格式不完整、答案索引錯誤或 ID 重複');
  ids.add(q.id);
 }
 for(const q of value){if(q.acceptedAnswers!==undefined && (!Array.isArray(q.acceptedAnswers)||!q.acceptedAnswers.length||!q.acceptedAnswers.includes(q.answer)||q.acceptedAnswers.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length)))throw new Error('複數給分答案格式錯誤');}
 for(const q of value){if(q.acceptedSelections!==undefined&&(!Array.isArray(q.acceptedSelections)||!q.acceptedSelections.length||q.acceptedSelections.some(s=>!Array.isArray(s)||!s.length||new Set(s).size!==s.length||s.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))))throw new Error('給分組合格式錯誤');if(q.allAward!==undefined&&typeof q.allAward!=='boolean')throw new Error('一律給分格式錯誤');}
 return value;
}
function acceptedAnswers(q){return q.acceptedAnswers || [q.answer];}
function selectionSets(q){return q.acceptedSelections || acceptedAnswers(q).map(i=>[i]);}
function isCorrect(q, selected){if(q.allAward)return true;const choice=Array.isArray(selected)?selected:[selected];if(new Set(choice).size!==choice.length)return false;return selectionSets(q).some(set=>set.length===choice.length&&set.every(i=>choice.includes(i)));}
function selectionText(q, selected){return (Array.isArray(selected)?selected:[selected]).map(i=>q.options[i]).join(' ＋ ')||'未作答';}
function answerText(q){return q.allAward?'本題一律給分（非所有選項皆為正確觀念）':selectionSets(q).map(set=>selectionText(q,set)).join(' 或 ');}
function stats(history){const records=history.filter(a=>!a.allAward&&!a.excludeFromAccuracy);const total=records.length,correct=records.filter(a=>a.correct).length;return {total,correct,accuracy:total?Math.round(correct/total*100):0};}
if(typeof module!=='undefined') module.exports={subjects,demo,validateBank,stats,acceptedAnswers,isCorrect,answerText,selectionSets,selectionText};
