// Local-only, allowlisted learning-data backup. Room credentials never enter a file.
const StudyBackup = (() => {
  const keys = ['architect-history','architect-question-notes','architect-adventure-rounds','architect-site-records','architect-design-records','architect-bank','architect-practice-settings','architect-answerflow','architect-questioncount','architect-practice-session','architect-room-name'];
  const recoveryKey = 'architect-backup-recovery';
  const object = v => v!==null&&typeof v==='object'&&!Array.isArray(v);
  const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
  const safeId = v => typeof v==='string'&&v.length>0&&v.length<=200&&!['__proto__','constructor','prototype'].includes(v);
  const index = v => Number.isInteger(v)&&v>=0&&v<=100;
  const modes=['random','paper','adventure','duel','exam','wrong','learning','due'];
  const subjects=typeof module!=='undefined'?require('./study').subjects:globalThis.subjects;
  function subjectList(){return subjects||['建築計畫與設計','敷地計畫與都市設計','營建法規與實務','建築結構','建築構造與施工','建築環境控制'];}
  function safeTree(value,depth=0){
    if(depth>15)throw Error('備份巢狀層數過多');
    if(typeof value==='number'&&!Number.isFinite(value))throw Error('備份含無效數字');
    if(value&&typeof value==='object')for(const key of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('備份含不安全的欄位');safeTree(value[key],depth+1);}
  }
  function attempt(a){return object(a)&&safeId(a.id)&&subjectList().includes(a.subject)&&typeof a.correct==='boolean'&&(index(a.selected)||(Array.isArray(a.selected)&&a.selected.length<=10&&(a.selected.length>0||a.allAward===true)&&new Set(a.selected).size===a.selected.length&&a.selected.every(index)))&&(a.at===undefined||(typeof a.at==='string'&&Number.isFinite(Date.parse(a.at))))&&['allAward','excludeFromAccuracy'].every(k=>a[k]===undefined||typeof a[k]==='boolean');}
  let protectedIds;
  function builtIns(){if(protectedIds)return protectedIds;if(typeof module==='undefined')return builtInIds;const study=require('./study');protectedIds=new Set([...study.demo,...['structure','environment','law','construction'].flatMap(s=>require('./data/'+s+'-bank.json')),...require('./data/original-bank.json')].map(q=>q.id));return protectedIds;}
  function checkBank(value){
    if(!Array.isArray(value)||value.length>50000)throw Error('自訂題庫格式不正確');
    if(!value.length)return;
    (typeof module!=='undefined'?require('./study').validateBank:validateBank)(value);
    if(value.some(q=>builtIns().has(q.id)||q.id.startsWith('demo-')||q.id.startsWith('original-')))throw Error('自訂題庫與內建題號衝突，不能覆蓋官方或原創題');
  }
  function checkSession(s){return object(s)&&s.version===1&&Array.isArray(s.ids)&&s.ids.length>0&&s.ids.length<=80&&s.ids.every(safeId)&&new Set(s.ids).size===s.ids.length&&Array.isArray(s.answers)&&s.answers.length<=s.ids.length&&s.answers.every((a,i)=>attempt(a)&&a.id===s.ids[i])&&modes.includes(s.mode)&&typeof s.exam==='boolean'&&(!s.exam||(Number.isFinite(s.deadline)&&s.deadline>0))&&(s.roundNotice===undefined||typeof s.roundNotice==='string');}
  function checkData(data){
    if(!object(data)||Object.keys(data).some(k=>!keys.includes(k)))throw Error('備份包含不支援的資料欄位');safeTree(data);
    for(const [key,value]of Object.entries(data)){
      if(key==='architect-history'){
        if(!Array.isArray(value)||value.length>200000||!value.every(attempt))throw Error('作答紀錄格式不正確');
      }else if(key==='architect-question-notes'){
        if(!object(value)||Object.keys(value).length>50000||Object.entries(value).some(([id,n])=>!safeId(id)||!object(n)||typeof n.text!=='string'||n.text.length>4000||(n.reason!==undefined&&typeof n.reason!=='string')||(n.updatedAt!=null&&(typeof n.updatedAt!=='string'||!Number.isFinite(Date.parse(n.updatedAt))))))throw Error('單題筆記格式不正確');
      }else if(key==='architect-adventure-rounds'){
        if(!Number.isSafeInteger(value)||value<0)throw Error('冒險回合數格式不正確');
      }else if(key==='architect-site-records'||key==='architect-design-records'){
        if(!object(value)||Object.keys(value).length>500||Object.entries(value).some(([id,r])=>!safeId(id)||!object(r)||typeof r.notes!=='string'||r.notes.length>1000000||!Array.isArray(r.checks)||r.checks.some(n=>!Number.isInteger(n)||n<0||n>5)||new Set(r.checks).size!==r.checks.length||!object(r.session)||!['idle','running','paused','finished'].includes(r.session.status)||!Number.isFinite(r.session.remainingMs)||r.session.remainingMs<0||r.session.remainingMs>Number.MAX_SAFE_INTEGER||(r.session.status==='running'?(!Number.isFinite(r.session.deadline)||r.session.deadline<=0):r.session.deadline!==null)))throw Error('敷地／設計練習紀錄或計時格式不正確');
      }else if(key==='architect-bank')checkBank(value);
      else if(key==='architect-practice-settings'){
        const fields=['question-source','subject','year','questioncount','mode','chapter','contentfilter','structurelane','structuretopic'];
        if(!object(value)||Object.entries(value).some(([id,v])=>!fields.includes(id)||typeof v!=='string'||v.length>2000))throw Error('練習偏好設定格式不正確');
        for(const [id,choices]of Object.entries({'question-source':['official','original'],mode:modes,questioncount:['5','10','20','40','80'],contentfilter:['all','detailed','recent','pending','diagram'],structurelane:['all','systems','mechanics','pending']}))if(own(value,id)&&!choices.includes(value[id]))throw Error('練習偏好含不支援的選項');
        if(own(value,'subject')&&value.subject!==''&&!subjectList().includes(value.subject))throw Error('練習科目不正確');
      }else if(key==='architect-answerflow'){
        if(!['instant','confirm'].includes(value))throw Error('作答偏好設定格式不正確');
      }else if(key==='architect-questioncount'){
        if(![5,10,20,40,80].includes(value))throw Error('本回題數設定不正確');
      }else if(key==='architect-practice-session'){
        if(!checkSession(value))throw Error('續練進度格式不正確');
      }else if(key==='architect-room-name'&&(typeof value!=='string'||value.length>20))throw Error('暱稱設定格式不正確');
    }
    return data;
  }
  function read(storage){const data={};for(const key of keys){const raw=storage.getItem(key);if(raw!==null){try{data[key]=key==='architect-room-name'?raw:JSON.parse(raw);}catch{throw Error('目前儲存的 '+key+' 不是有效 JSON；未變更任何紀錄');}}}return checkData(data);}
  function capture(storage){return Object.fromEntries(keys.map(k=>[k,storage.getItem(k)]));}
  function create(storage,at=new Date().toISOString()){return {format:'architect-study-backup',version:2,exportedAt:at,data:read(storage)};}
  function parse(value){
    if(!object(value))throw Error('請選擇有效的 JSON 備份');
    if(own(value,'format')){
      if(value.format!=='architect-study-backup'||![1,2].includes(value.version))throw Error('不支援此備份格式或版本');
      return {kind:'full',version:value.version,data:checkData(value.data)};
    }
    if(Array.isArray(value.history)&&object(value.questionNotes)){
      const data={'architect-history':value.history,'architect-question-notes':value.questionNotes};if(value.adventureRounds!==undefined)data['architect-adventure-rounds']=value.adventureRounds;
      return {kind:'legacy',data:checkData(data)};
    }
    throw Error('不支援此備份格式。請使用完整備份或舊版 architect-progress.json');
  }
  function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
  function attemptKey(a){return canonical({id:a.id,at:a.at??null,selected:Array.isArray(a.selected)?[...a.selected].sort((a,b)=>a-b):[a.selected],correct:a.correct});}
  function plan(storage,parsed,mode='replace'){
    if(!['full','legacy'].includes(parsed?.kind)||!['merge','replace'].includes(mode))throw Error('還原方式不正確');
    const incoming=checkData(parsed.data),current=read(storage),result={};
    for(const [key,value]of Object.entries(incoming)){
      const old=current[key];let next=value;
      if(mode==='merge'&&old!==undefined){
        if(key==='architect-history'){
          const seen=new Set();next=[...old,...value].filter(a=>{const id=canonical(a);if(seen.has(id))return false;seen.add(id);return true;});
          next.sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0));
        }else if(key==='architect-bank'){
          const ids=new Set(old.map(q=>q.id));next=[...old,...value.filter(q=>!ids.has(q.id))];
        }else if(key==='architect-adventure-rounds')next=Math.max(old,value);
        else if(object(old)&&object(value)&&key!=='architect-practice-session')next={...value,...old};
        else next=old;
      }
      result[key]=next;
    }
    checkData(result);
    const combined={...current,...result};
    if(own(result,'architect-practice-session')){
      const s=result['architect-practice-session'],ids=new Set([...builtIns(),...(combined['architect-bank']||[]).map(q=>q.id)]),attempts=new Set((combined['architect-history']||[]).map(attemptKey));
      if(s.ids.some(id=>!ids.has(id))||s.answers.some(a=>!attempts.has(attemptKey(a))))throw Error('續練進度與作答紀錄或自訂題庫不一致，請使用同一份完整備份');
    }
    return Object.fromEntries(Object.entries(result).map(([key,value])=>[key,key==='architect-room-name'?value:JSON.stringify(value)]));
  }
  function checkpoint(storage){
    const raw=storage.getItem(recoveryKey);if(raw===null)return null;let c;try{c=JSON.parse(raw);}catch{throw Error('復原點無法讀取');}
    if(!object(c)||c.format!=='architect-restore-checkpoint'||c.version!==1||typeof c.createdAt!=='string'||!Number.isFinite(Date.parse(c.createdAt))||!object(c.previous)||Object.keys(c.previous).length!==keys.length||keys.some(k=>!own(c.previous,k)||(c.previous[k]!==null&&typeof c.previous[k]!=='string')))throw Error('復原點格式不正確');
    const data={};for(const [k,v]of Object.entries(c.previous)){if(!keys.includes(k))throw Error('復原點含不支援欄位');if(v!==null)data[k]=k==='architect-room-name'?v:JSON.parse(v);}checkData(data);return c;
  }
  function transact(storage,rawPlan,{recordRecovery=true}={}){
    const before=capture(storage),oldCheckpoint=storage.getItem(recoveryKey);
    const changes=Object.entries(rawPlan).filter(([k,v])=>before[k]!==v);
    if(!changes.length)return 0;
    const recovery=JSON.stringify({format:'architect-restore-checkpoint',version:1,createdAt:new Date().toISOString(),previous:before});
    if(recordRecovery)try{storage.setItem(recoveryKey,recovery);}catch{throw Error('無法建立安全復原點，還原未開始，現有資料未變更');}
    const applied=[];
    try{
      for(const [key,value]of changes){if(storage.getItem(key)!==before[key])throw Error('其他頁面已變更資料');if(value===null)storage.removeItem(key);else storage.setItem(key,value);applied.push([key,value]);if(storage.getItem(key)!==value)throw Error('寫入後驗證失敗');}
    }catch(error){
      let failed=false;const rollback=[];
      for(const [key,written]of applied.reverse())try{if(storage.getItem(key)!==written){failed=true;continue;}if(written!==null)storage.removeItem(key);rollback.push(key);}catch{failed=true;}
      for(const key of rollback)try{if(before[key]!==null)storage.setItem(key,before[key]);if(storage.getItem(key)!==before[key])failed=true;}catch{failed=true;}
      if(!failed&&recordRecovery)try{if(oldCheckpoint===null)storage.removeItem(recoveryKey);else storage.setItem(recoveryKey,oldCheckpoint);}catch{}
      const e=Error(failed?'還原未完成，部分項目無法自動回復。請保留頁面，使用復原點或安全備份復原。':'還原未完成，已回復先前資料：'+error.message);e.rollbackComplete=!failed;throw e;
    }
    return changes.length;
  }
  function restore(storage,parsed,{mode='replace'}={}){return transact(storage,plan(storage,parsed,mode));}
  function recover(storage){const c=checkpoint(storage);if(!c)throw Error('目前沒有可用復原點');return transact(storage,c.previous,{recordRecovery:false});}
  function preview(storage,parsed,mode){const raw=plan(storage,parsed,mode);return {keys:Object.keys(raw),changed:Object.keys(raw).filter(k=>storage.getItem(k)!==raw[k]).length,history:parsed.data['architect-history']?.length||0,notes:Object.keys(parsed.data['architect-question-notes']||{}).length,site:Object.keys(parsed.data['architect-site-records']||{}).length,design:Object.keys(parsed.data['architect-design-records']||{}).length,custom:parsed.data['architect-bank']?.length||0};}
  return {keys,recoveryKey,create,parse,restore,recover,checkpoint,capture,preview,attemptKey};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=StudyBackup;

if(typeof document!=='undefined')(()=>{
  const exportButton=document.getElementById('full-backup-export'),importInput=document.getElementById('full-backup-import'),status=document.getElementById('full-backup-status');
  if(!exportButton||!importInput||!status)return;
  const dialog=document.getElementById('backup-preview'),mode=document.getElementById('backup-mode'),summary=document.getElementById('backup-summary'),ack=document.getElementById('backup-ack'),apply=document.getElementById('backup-apply'),undo=document.getElementById('backup-undo');
  let pending=null,safety=null,busy=false;
  function message(text,error=false){status.textContent=text;status.classList.toggle('backup-error',error);}
  function filename(prefix){const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/[^0-9]/g,'');return prefix+'-'+stamp+'.json';}
  function download(data,prefix){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));link.href=url;link.download=filename(prefix);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function updateUndo(){try{undo.disabled=!StudyBackup.checkpoint(localStorage);}catch{undo.disabled=false;}}
  function describe(){
    safety=null;ack.checked=false;apply.disabled=true;document.getElementById('backup-safety-status').textContent='尚未下載目前資料的安全備份。';
    if(pending.kind==='recovery'){mode.value='replace';mode.disabled=true;summary.textContent='將復原到 '+new Date(pending.point.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})+' 還原操作之前。這會取代之後新增的資料；請先下載目前資料備份。';apply.textContent='確認復原先前資料';return;}
    mode.disabled=false;const p=StudyBackup.preview(localStorage,pending.parsed,mode.value);
    summary.textContent=`檔案含 ${p.history} 筆作答、${p.notes} 則筆記、${p.site} 份敷地、${p.design} 份設計紀錄及 ${p.custom} 題自訂題。預計更新 ${p.changed} 項資料。`+(mode.value==='merge'?' 合併：完全相同的作答不重複；相同筆記、自訂題號與偏好保留本機內容。':' 覆蓋：只取代檔案明確包含的欄位；未包含的欄位保留。');
    apply.textContent=mode.value==='merge'?'確認合併還原':'確認覆蓋還原';
  }
  function showPreview(value){pending=value;mode.value='merge';describe();dialog.showModal();}
  exportButton.onclick=()=>{try{download(StudyBackup.create(localStorage),'architect-study-full-backup');message('已送出備份檔下載，請到瀏覽器的下載項目確認保存。');}catch(e){message('備份失敗：'+e.message,true);}};
  importInput.onchange=async()=>{
    const file=importInput.files?.[0];if(!file)return;
    try{if(file.size>30*1024*1024)throw Error('備份檔不可超過30 MB');const parsed=StudyBackup.parse(JSON.parse(await file.text()));StudyBackup.preview(localStorage,parsed,'merge');showPreview({kind:'file',parsed});message('已驗證備份，尚未變更任何資料。');}catch(e){message('無法還原：'+e.message,true);}finally{importInput.value='';}
  };
  mode.onchange=()=>{try{describe();}catch(e){message(e.message,true);dialog.close();}};
  document.getElementById('backup-safety-download').onclick=()=>{
    try{const raw=StudyBackup.capture(localStorage);download(StudyBackup.create(localStorage),'architect-study-before-restore');safety=raw;ack.checked=false;apply.disabled=true;document.getElementById('backup-safety-status').textContent='已送出安全備份下載。請確認檔案已保存，再勾選下方確認。';}catch(e){safety=null;apply.disabled=true;message('安全備份失敗：'+e.message,true);}
  };
  ack.onchange=()=>{apply.disabled=!ack.checked||!safety;};
  document.getElementById('backup-cancel').onclick=()=>{dialog.close();pending=null;safety=null;message('已取消還原，目前資料未變更。');};
  dialog.addEventListener('cancel',()=>{pending=null;safety=null;message('已取消還原，目前資料未變更。');});
  apply.onclick=()=>{
    if(busy||!pending||!safety||!ack.checked)return;
    if(JSON.stringify(StudyBackup.capture(localStorage))!==JSON.stringify(safety)){describe();message('目前資料已變更，請重新下載安全備份並確認；尚未還原。',true);return;}
    if((pending.kind==='recovery'||mode.value==='replace')&&!confirm('確認覆蓋／復原目前資料？\n已下載安全備份；操作成功後可用復原點回復最近一次還原前的資料。')){message('已取消覆蓋確認，目前資料未變更。');return;}
    busy=true;apply.disabled=true;
    try{
      const count=pending.kind==='recovery'?StudyBackup.recover(localStorage):StudyBackup.restore(localStorage,pending.parsed,{mode:mode.value});
      if(!count){dialog.close();message('資料已相同，沒有更新或清除任何項目。');updateUndo();return;}
      const text=pending.kind==='recovery'?'已復原上次還原前的資料。':'還原成功，已重新載入學習紀錄。';
      try{sessionStorage.setItem('architect-backup-result',text);}catch{}
      location.hash='progress';location.reload();
    }catch(e){message(e.message,true);dialog.close();updateUndo();}finally{busy=false;apply.disabled=false;}
  };
  undo.onclick=()=>{try{const point=StudyBackup.checkpoint(localStorage);if(!point)throw Error('目前沒有復原點');showPreview({kind:'recovery',point});}catch(e){message(e.message,true);}};
  let result;try{result=sessionStorage.getItem('architect-backup-result');sessionStorage.removeItem('architect-backup-result');}catch{}
  if(location.hash==='#progress'||result){setTab('progress');if(result)message(result);document.querySelector('.full-backup').scrollIntoView({block:'start'});}
  updateUndo();
})();
