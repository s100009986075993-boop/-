"""Package the current static study site for opening locally without installation."""
from pathlib import Path
import argparse,zipfile
ROOT=Path(__file__).resolve().parents[1]
GUIDE='''築考練習室｜更新版（2026-11-02）

使用方式
1. 將整個 ZIP 解壓縮到固定資料夾。
2. 用 Chrome 或 Edge 開啟資料夾內的 index.html，不要在 ZIP 預覽中直接開啟。
3. 不需要安裝 Node.js、Python 或註冊帳號；題庫、圖片與 PDF 均在資料夾內。
4. 保留 assets/、data/ 與所有 JS/CSS，請勿只搬走 index.html。

你的練習入口
首頁「今天先練這一科」提供：法規、環控、結構系統、結構力學。
結構系統109題、力學22題已初步分流，另589題待分類。
點結構後可自行選主題、年度、錯題複習或已有詳解草稿。
系統觀念題需先選選項，再按確認答案。

每天2～3小時
20分鐘：重做先前錯題。
35～45分鐘：當日主科（法規→環控→結構輪流）。
35～50分鐘：核對答案、已有詳解與原卷，記下錯因。
30～60分鐘：另做敷地／設計審題或圖面專項練習。
結構日可先做10題系統觀念，再做3～5題力學。
目前一般練習每回最多20題，可隨時結束返回。

更新內容與限制
- 22題補回問號後遺漏的①②③④分項，作答後顯示組合對照。
- 結構系統與力學分流，系統題附主題讀題提示。
- 詳解仍只有23題草稿；待補充會明確標示，對照及提示不是完整詳解。
- 分類尚未經專家覆核；法規與規範須注意原題年份和現行版本的差異。
- 題庫共4320道歷屆選擇題，另外包含敷地／設計原卷及參考資料。

紀錄保存
此版沿用瀏覽器本機儲存。換瀏覽器、搬動檔案、私人瀏覽或清除資料可能影響保存。
先做一題並重新開啟確認紀錄有保留。每次結束到「弱點分析」匯出學習紀錄，
敷地與設計筆記分別匯出。匯出目前僅供備份查看，尚不支援還原匯入或跨裝置同步。
此離線版不會自動讀取公開網站的既有紀錄。
'''
QUICK='''<section class="portable-start" aria-label="今日快速練習"><p class="eyebrow">YOUR DAILY PRACTICE · 每天 2～3 小時</p><h2>今天先練這一科</h2><p>先做一回，再回顧錯因。法規、環控、結構輪流主攻。</p><div class="portable-actions"><button data-portable-subject="營建法規與實務">法規觀念 →</button><button data-portable-subject="建築環境控制">環控練習 →</button><button data-portable-subject="建築結構" data-portable-lane="systems">結構系統觀念 →</button><button data-portable-subject="建築結構" data-portable-lane="mechanics">結構力學 →</button></div><p class="muted">系統109題／力學22題先行分類，另589題待分類。詳解草稿23題，其餘待補；觀念提示不代替詳解。紀錄只存在此瀏覽器，請定期匯出備份。</p></section>'''
BOOT='''<script>
document.querySelectorAll('[data-portable-subject]').forEach(button=>button.onclick=()=>{
 setTab('practice');$('subject').value=button.dataset.portableSubject;
 $('year').value='';$('chapter').value='';$('mode').value='random';$('contentfilter').value='all';
 $('structurelane').value=button.dataset.portableLane||'all';$('structuretopic').value='';syncSubjectShortcuts();
 $('practice').scrollIntoView({behavior:'smooth',block:'start'});
});
</script>'''
CSS='''<style>.portable-start{padding:24px;margin:0 0 24px;border:1px solid var(--teal);background:#eef0e1}.portable-start h2{margin:0;color:var(--teal)}.portable-start>p{font-size:13px}.portable-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.portable-actions button{color:var(--teal);min-height:50px;padding:10px}.quiz-mode .portable-start{display:none}@media(max-width:700px){.portable-start{padding:18px 14px}.portable-actions{grid-template-columns:1fr 1fr}.portable-actions button{font-size:13px}}</style>'''
def export(target):
 html=(ROOT/'index.html').read_text()
 if 'data-portable-subject' not in html:
  html=html.replace('</head>',CSS+'</head>',1).replace('<details class="library-note">',QUICK+'<details class="library-note">',1).replace('</body>',BOOT+'</body>',1)
 target.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  archive.writestr('architect-study/index.html',html)
  archive.writestr('architect-study/使用說明.txt',GUIDE)
  for path in sorted(ROOT.iterdir()):
   if path.is_file() and path.suffix in {'.js','.css'}:archive.write(path,'architect-study/'+path.name)
  for directory in ['data','assets']:
   for path in sorted((ROOT/directory).rglob('*')):
    if path.is_file():archive.write(path,'architect-study/'+str(path.relative_to(ROOT)))
 print(target,round(target.stat().st_size/1024/1024,1),'MiB')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args();export(args.output)
