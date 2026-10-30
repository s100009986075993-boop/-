"""Convert PDF-backed historical MC banks to native text, preserving answer metadata.
Geometry, not PDF drawing order, assigns options. Source images stay for audit.
"""
from pathlib import Path
import re, json, unicodedata, collections
import fitz
ROOT=Path(__file__).resolve().parents[1]
MARKERS='\ue18c\ue18d\ue18e\ue18f'
SYMBOLS={chr(0xf000+ord(a)):b for a,b in {'=':'=', '(':'(', ')':')', '-':'−', '+':'+', 't':'τ', 'l':'λ', 'p':'π', 'd':'δ', 's':'σ'}.items()}
SYMBOLS.update({'\uf0b4':'×','\uf0d7':'×','\uf0a2':'′','\uf0b1':'±','\uf0bb':'≈','\uf0a5':'∞','\ue063':'①','\ue064':'②','\ue0c6':'①','\ue0c7':'②','\ue0c8':'③','\ue0c9':'④'})
SUBITEMS={chr(0xe000+i):chr(0x2460+i) for i in range(20)}
def clean(s):
 s=unicodedata.normalize('NFKC',s)
 for a,b in {**SUBITEMS,**SYMBOLS}.items():s=s.replace(a,b)
 s=re.sub(r'\b(cm|mm|m)([23])\b',lambda m:m[1]+{'2':'²','3':'³'}[m[2]],s)
 s=re.sub(r'\s+',' ',s).strip()
 return re.sub(r'(?<=[\u3400-\u9fff]) +(?=[\u3400-\u9fff])','',s)
def chars_for(page):
 chars=[];seen=set()
 for block in page.get_text('rawdict')['blocks']:
  if block['type']!=0:continue
  for line in block['lines']:
   for span in line['spans']:
    for c in span['chars']:
     box=fitz.Rect(c['bbox']);key=(c['c'],round(box.x0,1),round(box.y0,1))
     if key in seen:continue
     seen.add(key);chars.append((c['c'],box))
 return chars
def rect_text(chars,rect):
 selected=[(c,b) for c,b in chars if rect.x0<=(b.x0+b.x1)/2<rect.x1 and rect.y0<=(b.y0+b.y1)/2<rect.y1]
 lines=[]
 for c,b in sorted(selected,key=lambda v:((v[1].y0+v[1].y1)/2,v[1].x0)):
  y=(b.y0+b.y1)/2
  if not lines or abs(lines[-1][0]-y)>6:lines.append((y,[]))
  lines[-1][1].append((c,b))
 output=[]
 for _,line in lines:
  ordered=sorted(line,key=lambda v:v[1].x0);text='';previous=None
  for c,b in ordered:
   if previous is not None and b.x0-previous.x1>3:text+=' '
   text+=c;previous=b
  output.append(text)
 return clean(' '.join(output))
def convert(slug,var):
 combined=[];report=[]
 for year in range(97,115):
  bankpath=ROOT/f'data/{year}-{slug}.json';bank=json.loads(bankpath.read_text());doc=fitz.open(ROOT/bank[0]['sourcePdf'])
  pages={};anchors={}
  for pi,page in enumerate(doc):
   chars=chars_for(page);pages[pi]=(page,chars)
   for w in page.get_text('words'):
    if re.fullmatch(r'[0-9]{1,2}[.．、]?',w[4]) and 25<w[0]<60:
     n=int(w[4].rstrip('.．、'))
     if 1<=n<=len(bank):
      if n in anchors:raise ValueError((year,slug,'duplicate number',n))
      anchors[n]=(pi,fitz.Rect(w[:4]))
  assert sorted(anchors)==list(range(1,len(bank)+1)),(slug,year,anchors.keys())
  for q in bank:
   n=int(q['id'].split('-')[-1]);pi,numberbox=anchors[n];page,chars=pages[pi]
   next_anchor=anchors.get(n+1);bottom=next_anchor[1].y0-1 if next_anchor and next_anchor[0]==pi else page.rect.height-12
   top=numberbox.y0-3
   if slug=='structure' and year==97 and n in {15,20,30}:top={15:608,20:409,30:220}[n]
   region=fitz.Rect(numberbox.x0,top,page.rect.width-14,bottom)
   marks={}
   for c,b in chars:
    if c in MARKERS and b.y0>numberbox.y0+3 and region.contains(fitz.Point((b.x0+b.x1)/2,(b.y0+b.y1)/2)):marks.setdefault(MARKERS.index(c),b)
   q['questionNo']=n;q['originalQuestionLabel']=f'{year} 年{q["subject"]}｜測驗第 {n} 題'
   issues=[]
   if len(marks)!=4:
    issues.append('選項標記未完整辨識')
    q['question']=q['originalQuestionLabel']+'（文字辨識待核對，請展開原題）'
    q['textStatus']='needs-review';q['extractionIssues']=issues;combined.append(q);report.append({'id':q['id'],'issues':issues});continue
   option_top=min(b.y0 for b in marks.values())
   stem=rect_text(chars,fitz.Rect(numberbox.x1+2,top,page.rect.width-14,option_top-1))
   options=[]
   for i in range(4):
    anchor=marks[i];cy=(anchor.y0+anchor.y1)/2
    same=[b for j,b in marks.items() if j!=i and abs((b.y0+b.y1)/2-cy)<8 and b.x0>anchor.x0+10]
    below=[b for j,b in marks.items() if (b.y0+b.y1)/2>cy+8]
    right=min(b.x0 for b in same)-1 if same else page.rect.width-14
    end=min(b.y0 for b in below)-1 if below else bottom
    text=rect_text(chars,fitz.Rect(anchor.x1+0.1,anchor.y0-3,right,end))
    for marker in MARKERS:text=text.split(marker)[0]
    options.append(text)
   # Attach only a single-question supplement where the source requires figures,
   # contains mathematical glyphs, or an option has no selectable text.
   raw=rect_text(chars,region)
   diagram=bool(re.search(r'(?:下圖|右圖|左圖|附圖|圖示|如圖|圖中|圖所示|圖形|見圖)',stem))
   raster=any(fitz.Rect(info['bbox']).intersects(region) and fitz.Rect(info['bbox']).get_area()>100 for info in page.get_image_info())
   math=any(0xe000<=ord(c)<=0xf8ff and c not in MARKERS and c not in SUBITEMS for c,b in chars if region.contains(fitz.Point((b.x0+b.x1)/2,(b.y0+b.y1)/2)))
   for i,text in enumerate(options):
    if not text:options[i]=text or '圖示 '+chr(65+i);diagram=True
   if not stem:stem=q['originalQuestionLabel']+'（請參閱題目附圖）';issues.append('題幹需對照附圖')
   if any(re.search(r'[\ue000-\uf8ff\ufffd]',s) for s in [stem,*options]):issues.append('公式或特殊字元需對照附圖');diagram=True
   if '?' in stem:stem=stem[:stem.rfind('?')+1]
   if diagram or raster:
    graphic=all(len(re.findall(r'[0-9]+',text))>=4 and len(re.findall(r'[\u3400-\u9fff]',text))<3 for text in options) or len(set(options))==1
    if graphic:options=['圖示 '+chr(65+i) for i in range(4)]
   if re.search(r'有效長度係數|多少倍|幾倍',stem):
    for i,text in enumerate(options):
     numbers=re.findall(r'(?<![0-9])[0-9]+(?:\.[0-9]+)?',text)
     if len(numbers)==1 and len(text)<20:options[i]=numbers[0]
   if math:issues.append('數學排版需對照附圖')
   q['question']=stem;q['options']=options;q['textStatus']='needs-review' if issues else 'native';q['extractionIssues']=issues
   q['explanationStatus']=q.get('explanationStatus','pending')
   q['diagrams']=[]
   if diagram or raster or math:
    target=ROOT/f'assets/native-{slug}/{year}-{n:02}.webp';target.parent.mkdir(exist_ok=True,parents=True)
    page.get_pixmap(matrix=fitz.Matrix(2,2),clip=region).pil_save(target,format='WEBP',lossless=True)
    q['diagrams']=[{'src':str(target.relative_to(ROOT)),'alt':f'第{n}題必要圖表與公式原件','kind':'question-supplement'}]
   q['nativeProvenance']={'method':'PDF character geometry','page':pi+1,'review':'原文轉錄；公式與圖表請對照附圖'}
   combined.append(q)
   if issues:report.append({'id':q['id'],'issues':issues})
  for j,item in enumerate(bank):
   if j and re.search(r'承上題|承前題|依上題',item['question']):
    item['question']='【前題條件】'+bank[j-1]['question']+'\n【本題】'+item['question']
  bankpath.write_text(json.dumps(bank,ensure_ascii=False,indent=2))
  print(slug,year,'native',sum(q.get('textStatus')=='native' for q in bank),'supplements',sum(bool(q.get('diagrams')) for q in bank),flush=True)
 (ROOT/f'data/{slug}-bank.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2))
 (ROOT/f'data/{slug}-bank.js').write_text('const '+var+' = '+json.dumps(combined,ensure_ascii=False)+';\n')
 (ROOT/f'data/{slug}-text-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 return combined
if __name__=='__main__':
 import sys
 for slug,var in [('law','lawBank'),('construction','constructionBank'),('environment','environmentBank'),('structure','officialBank')]:
  if len(sys.argv)==1 or slug in sys.argv[1:]:convert(slug,var)
