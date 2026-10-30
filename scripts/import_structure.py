"""Rebuild 98–114 structure bank from supplied attachments; fail closed on ambiguity."""
import pathlib,re,unicodedata,json,hashlib,shutil,subprocess
import fitz
ROOT=pathlib.Path(__file__).resolve().parents[1]
ATTACHMENTS=pathlib.Path('/workspace/attachments')
def save(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2))
def parse_answers(pdf):
 text=unicodedata.normalize('NFKC',subprocess.check_output(['pdftotext','-layout',str(pdf),'-']).decode())
 rows=sum([re.findall('[ABCD#]',line.split('答案',1)[1]) for line in text.splitlines() if re.match(r'^\s*答案\s',line)],[])
 assert len(rows)==40,(pdf,len(rows))
 notes=re.split(r'備\s*註:',text)[-1].strip()
 corrections={}
 for number,rule in re.findall(r'第\s*(\d+)\s*題([^,。\n]+)',notes):
  n=int(number)
  if '一律給分' in rule:corrections[n]={'allAward':True,'sets':[[0],[1],[2],[3]],'note':'第'+number+'題'+rule}
  else:
   choices=re.findall('[ABCD]+',rule)
   assert choices,(pdf,rule)
   corrections[n]={'allAward':False,'sets':[[ord(c)-65 for c in choice] for choice in choices],'note':'第'+number+'題'+rule}
 assert {i+1 for i,a in enumerate(rows) if a=='#'}==set(corrections),(pdf,corrections)
 return rows,corrections,notes
all_questions=json.loads((ROOT/'data/97-structure.json').read_text());reports=[]
for year in range(98,115):
 files=list(ATTACHMENTS.rglob(f'{year}年_建築結構_*.pdf'))
 assert len({p.name for p in files})==len(files)
 paper=next(p for p in files if p.name.endswith('_試題.pdf'))
 corrected=next((p for p in files if p.name.endswith('_更正答案.pdf')),None)
 original=next((p for p in files if p.name.endswith('_答案.pdf')),None)
 source=corrected or original;assert source
 rows,rules,notes=parse_answers(source)
 original_rows=parse_answers(original)[0] if original else None
 dest=ROOT/f'assets/{year}-structure';dest.mkdir(parents=True,exist_ok=True)
 for p in files:shutil.copyfile(p,dest/('questions.pdf' if p==paper else 'corrected-answers.pdf' if p==corrected else 'answers-upload.pdf'))
 doc=fitz.open(paper);found={};page_info=[]
 for pi,page in enumerate(doc):
  marks=[w for w in page.get_text('words') if re.match(r'^\d{1,2}[.．、]?$',w[4]) and 1<=int(w[4].rstrip('.．、'))<=40 and 25<w[0]<60]
  for w in marks:
   n=int(w[4].rstrip('.．、'));assert n not in found,(year,n)
   found[n]=pi+1
  page.get_pixmap(matrix=fitz.Matrix(2,2)).pil_save(dest/f'page-{pi+1}.webp',format='WEBP',lossless=True)
 assert list(found)==list(range(1,41)),(year,found)
 questions=[]
 for n,letter in enumerate(rows,1):
  rule=rules.get(n);sets=rule['sets'] if rule else [[ord(letter)-65]]
  singles=[s[0] for s in sets if len(s)==1];assert singles
  q=dict(id=f'{year}-structure-{n:02}',year=year,subject='建築結構',chapter='未分類（待章節核對）',question=f'{year} 年建築結構｜測驗第 {n} 題',options=['原題選項 A（）','原題選項 B（）','原題選項 C（）','原題選項 D（）'],answer=singles[0],acceptedAnswers=singles,acceptedSelections=sets,allAward=bool(rule and rule['allAward']),explanation=(rule['note']+'。' if rule else '')+'答案依上傳的'+('更正答案表' if corrected else '答案表')+'；觀念解析尚待核對。',regulation=f'民國 {year} 年歷屆試題；當年適用規範與現行法規尚未核對。',image=f'assets/{year}-structure/page-{found[n]}.webp',imageIsFullPage=True,sourcePage=found[n],sourcePdf=f'assets/{year}-structure/questions.pdf',answerSource=f'assets/{year}-structure/'+('corrected-answers.pdf' if corrected else 'answers-upload.pdf'))
  if original_rows:q['originalAnswer']=original_rows[n-1]
  questions.append(q)
 changes=[{'number':i+1,'original':original_rows[i] if original_rows else None,'current':a,'rule':rules.get(i+1)} for i,a in enumerate(rows) if a=='#' or original_rows and original_rows[i]!=a]
 report=dict(year=year,subject='建築結構',multipleChoice=40,pages=len(doc),answerRows=rows,correctionNotes=notes,corrections=changes,originalAnswerUnavailable=original is None,chapterStatus='未分類，待人工核對',explanationStatus='待核對',files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files})
 save(ROOT/f'data/{year}-structure.json',questions);save(ROOT/f'data/{year}-structure-manifest.json',report)
 all_questions.extend(questions);reports.append(report)
 print(year,len(questions),'corrections',len(changes),'pages',len(doc))
save(ROOT/'data/structure-bank.json',all_questions)
(ROOT/'data/structure-bank.js').write_text('const officialBank = '+json.dumps(all_questions,ensure_ascii=False)+';\n')
save(ROOT/'data/structure-catalog.json',[dict(year=r['year'],count=40,corrections=r['corrections'],notes=r['correctionNotes']) for r in reports])
print('TOTAL',len(all_questions))
