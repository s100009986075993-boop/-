"""Retain whole site-planning papers, with source hashes and exact original page images."""
from pathlib import Path
import json,fitz,subprocess,re,unicodedata,hashlib,shutil
root=Path(__file__).resolve().parents[1];papers=[]
for year in range(97,115):
 files=list(Path('/workspace/attachments').rglob(f'{year}年_敷地計畫與都市設計_試題.pdf'));assert len(files)==1
 source=files[0];text=unicodedata.normalize('NFKC',subprocess.check_output(['pdftotext','-layout',str(source),'-']).decode())
 assert re.search(r'考試時間\s*:\s*4\s*小時',text),year
 title=re.search(r'(?:題目|主題):([^\n]+)',text)
 name=title.group(1).strip() if title else '敷地計畫與都市設計整卷'
 if year==100:name='停車場及公園立體化規劃（整理摘要）'
 if year==105:name='多題配置與剖面規劃（整卷）'
 if year==114:name='停車場立體多目標使用複合休閒運動設施大樓'
 dest=root/f'assets/{year}-site';dest.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest/'questions.pdf')
 doc=fitz.open(source);images=[]
 for n,page in enumerate(doc,1):
  page.get_pixmap(matrix=fitz.Matrix(2,2)).pil_save(dest/f'page-{n}.webp',format='WEBP',lossless=True)
  images.append(f'assets/{year}-site/page-{n}.webp')
 (dest/'extracted-text.txt').write_text(text)
 paper=dict(id=f'{year}-site',year=year,subject='敷地計畫與都市設計',title=name,examMinutes=240,calculator='可使用（細節依原卷）' if '可以使用電子計算器' in text else '禁止使用',pages=len(doc),images=images,sourcePdf=f'assets/{year}-site/questions.pdf',sourceText=f'assets/{year}-site/extracted-text.txt',sourceFilename=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),status='原卷閱讀、計時與自評；未提供官方答案或評分標準')
 papers.append(paper);print(year,len(doc),name)
(root/'data/site-papers.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
(root/'data/site-papers.js').write_text('const sitePapers = '+json.dumps(papers,ensure_ascii=False)+';\n')
