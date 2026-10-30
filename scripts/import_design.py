"""Retain whole architectural design papers, with source hashes and exact original page images."""
from pathlib import Path
import json,fitz,subprocess,re,unicodedata,hashlib,shutil
root=Path(__file__).resolve().parents[1];papers=[]
for year in range(97,115):
 files=list(Path('/workspace/attachments').rglob(f'{year}年_建築計畫與設計_試題.pdf'));assert len(files)==1
 source=files[0];text=unicodedata.normalize('NFKC',subprocess.check_output(['pdftotext','-layout',str(source),'-']).decode())
 assert re.search(r'考試時間\s*:\s*8\s*小時',text),year
 title=re.search(r'(?:題目|主題):([^\n]+)',text)
 name=title.group(1).strip() if title else '建築計畫與設計整卷'
 if year==97:name='員工渡假中心（整理摘要）'
 if year==106:name='老街活動中心'
 if year==107:name='國民運動中心'
 if year==110:name='建築計畫與設計整卷（依原卷需求）'
 dest=root/f'assets/{year}-design';dest.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest/'questions.pdf')
 doc=fitz.open(source);images=[]
 for n,page in enumerate(doc,1):
  page.get_pixmap(matrix=fitz.Matrix(2,2)).pil_save(dest/f'page-{n}.webp',format='WEBP',lossless=True)
  images.append(f'assets/{year}-design/page-{n}.webp')
 (dest/'extracted-text.txt').write_text(text)
 paper=dict(id=f'{year}-design',year=year,subject='建築計畫與設計',title=name,examMinutes=480,calculator='可使用（細節依原卷）' if '可以使用電子計算器' in text else '禁止使用',pages=len(doc),images=images,sourcePdf=f'assets/{year}-design/questions.pdf',sourceText=f'assets/{year}-design/extracted-text.txt',sourceFilename=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),status='原卷閱讀、計時與自評；未提供官方答案或評分標準')
 papers.append(paper);print(year,len(doc),name)
(root/'data/design-papers.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
(root/'data/design-papers.js').write_text('const designPapers = '+json.dumps(papers,ensure_ascii=False)+';\n')
