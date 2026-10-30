"""Index supplied references with page provenance; do not infer current legal validity."""
from pathlib import Path
import subprocess,re,json,unicodedata,hashlib,shutil,fitz
root=Path(__file__).resolve().parents[1]
items=[
 ('accessibility','e9abb44ff171074d23a7d1d5ee35b4a4.pdf','建築物無障礙設施設計規範','規範','封面列示修正至民國108年1月4日，自108年7月1日施行；是否有後續修正待核對。'),
 ('eewh-bc-2026','2026年版綠建築評估手冊-基本型(EEWH-BC).pdf','2026年版綠建築評估手冊－基本型（EEWH-BC）','評估手冊','文件標示2026 EDITION；適用案件及過渡規定尚待核對。'),
 ('condominium-rules','公寓大廈管理條例施行細則.pdf','公寓大廈管理條例施行細則','法規',None),
 ('condominium-act','公寓大廈管理條例.pdf','公寓大廈管理條例','法規',None),
 ('building-design-code','建築技術規則建築設計施工編.pdf','建築技術規則建築設計施工編','法規',None),
 ('building-act','建築法.pdf','建築法','法規',None),
 ('building-equipment-code','建築技術規則建築設備編.pdf','建築技術規則建築設備編','法規',None),
 ('building-structure-code','建築技術規則建築構造編.pdf','建築技術規則建築構造編','法規',None),
 ('exam-outline-114','建築師（自114年專技高考建築師考試開始實施）.pdf','建築師考試命題大綱（自114年實施）','命題大綱','文件列示114年4月2日公告修正；附件名稱標示自114年考試開始實施，不回溯舊年度。'),
 ('urban-planning-act','都市計畫法.pdf','都市計畫法','法規',None)]
refs=[]
for slug,name,title,kind,note in items:
 paths=list(Path('/workspace/attachments').rglob(name));assert len(paths)==1
 source=paths[0];doc=fitz.open(source)
 result=subprocess.run(['pdftotext','-layout',str(source),'-'],capture_output=True,check=True)
 text=result.stdout.decode();pages=text.split('\f');
 if not pages[-1].strip():pages.pop()
 assert len(pages)==len(doc),(name,len(pages),len(doc))
 date=re.search(r'修正日期[：:]\s*([^\n]+)',text[:1000]);version=date.group(1).strip() if date else '依文件標示，見版本說明'
 version={'accessibility':'文件列示108年1月4日修正','eewh-bc-2026':'2026年版','exam-outline-114':'114年4月2日修正／自114年實施'}.get(slug,version)
 warning='上傳參考版本，尚未與官方現行版本比對；引用時須核對試題年度、條文及施行日。'
 if slug=='building-design-code':note='文件載明部分或全部條文尚未生效：第301條施行日期另定；115年2月23日修正第140～142、144條等，自115年7月1日施行。這是上傳檔註記，尚未比對後續官方公告。'
 target=root/f'assets/references/{slug}.pdf';shutil.copyfile(source,target)
 (root/f'assets/references/{slug}.txt').write_text(text)
 records=[]
 for i,page in enumerate(pages,1):
  articles=re.findall(r'^\s*第\s*([0-9]+(?:\s*[-之]\s*[0-9]+)?)\s*條\s*$',page,re.M)
  records.append(dict(page=i,text=page.strip(),articles=[re.sub(r'\s+','',a) for a in articles]))
 ref=dict(id=slug,title=title,filename=name,kind=kind,version=version,versionNote=note or '修正日期依上傳PDF首頁擷取；是否為最新有效版本尚待核對。',warning=warning,sourcePdf=f'assets/references/{slug}.pdf',sourceText=f'assets/references/{slug}.txt',sha256=hashlib.sha256(source.read_bytes()).hexdigest(),pageCount=len(pages),pages=records,extractionWarnings=len(result.stderr.decode().splitlines()),verifiedCurrent=False)
 refs.append(ref);print(slug,len(pages),version)
(root/'data/references.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2))
(root/'data/references.js').write_text('const referenceLibrary = '+json.dumps(refs,ensure_ascii=False)+';\n')
print('Documents',len(refs),'pages',sum(r['pageCount'] for r in refs))
