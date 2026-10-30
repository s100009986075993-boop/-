"""Apply audited transcription fixes and authored explanation drafts reproducibly."""
from pathlib import Path
import json,re,fitz
ROOT=Path(__file__).resolve().parents[1]
FIXES={
 '104-law-20':{'options':['L1＋L2＋L3＋L4＋L5＋L6＋L7','L2＋L6','L2＋L3＋L4＋L5＋L6','L2＋L4＋L6']},
 '106-construction-26':{'question':'跨距6米長的RC構造梁，梁深60公分，有兩支直徑12公分的管線須穿過此梁，下列何者較恰當（圖中單位為公分）？','options':['圖示 A','圖示 B','圖示 C','圖示 D']},
 '97-structure-04':{'question':'RC結構之混凝土抗壓強度 f′c＝245 kg/cm²，其值轉換成英制單位 psi 時，最接近於何值？','options':['3000 psi','3500 psi','4000 psi','4500 psi']},
 '97-structure-09':{'question':'圓形斷面承受剪力作用時，其最大剪應力 τmax 與平均剪應力 τave 之關係為何？','options':['τmax＝(3/2)τave','τmax＝(4/3)τave','τmax＝(5/4)τave','τmax＝(6/5)τave']},
 '97-structure-15':{'question':'右圖所示，長柱構件上下端皆固定（Fixed），此柱之臨界載重 Pcr＝π²EI/(K·L)²，試問公式中之有效長度係數 K 值為何？','options':['2','1','0.7','0.5']},
 '97-structure-16':{'question':'右圖所示，懸臂梁結構其自由端 a 點受 P 力作用，a 點最大撓度為 δav，若 EI 值不變，將其梁水平長度增加成 2L 時，a 點自由端的撓度變為原有 δav 之多少倍？','options':['2','4','6','8']},
 '97-structure-20':{'question':'下圖之門形構架，當 (EI)beam/(EI)column ≈ ∞ 時，且忽略桿件軸向變形之條件下，B 點產生向右一單位位移時所需施加於 B 點之向右推力為何？','options':['3(EI)column/L³','6(EI)column/L³','12(EI)column/L³','24(EI)column/L³']},
 '97-structure-30':{'question':'若有一支木梁受力分析得知其最大彎矩 Mmax＝4 t·m，而木結構材料之最大容許彎應力 σw＝75 t/m²，在設計木梁斷面時，選用梁寬為50 cm，試問梁之深度至少為何？','options':['50 cm','60 cm','70 cm','80 cm'],'diagrams':[]},
 '97-structure-38':{'question':'有一獨立方型基腳，如右圖所示，當其軸心承受軸向載重45 t，基腳自重12.5 t，而土壤之重為5 t，若基地容許地耐力 qa＝10 t/m²，則方型基腳之尺寸至少應為？','options':['1.5 m × 1.5 m','2.0 m × 2.0 m','2.5 m × 2.5 m','2.2 m × 2.2 m']},
}
curated=json.loads((ROOT/'data/curated-explanations.json').read_text());summary={}
for slug,var in [('structure','officialBank'),('environment','environmentBank'),('law','lawBank'),('construction','constructionBank')]:
 combined=[]
 for year in range(97,115):
  path=ROOT/f'data/{year}-{slug}.json';bank=json.loads(path.read_text())
  for q in bank:
   if q['id'] in FIXES:q.update(FIXES[q['id']]);q['textStatus']='native';q['extractionIssues']=[];q['manualTranscription']=True
   if q['id']=='106-construction-26':
    page=fitz.open(ROOT/q['sourcePdf'])[q['sourcePage']-1]
    page.get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(47,125,581,376)).pil_save(ROOT/q['diagrams'][0]['src'],format='WEBP',lossless=True)
    q['diagrams'][0]['alt']='四個管線穿梁選項的結構示意圖與尺寸'
   if q['id']=='106-construction-08':q['options'][3]='鋼筋標示 Fy＝2800 kg/cm² 所指為鋼筋之降伏強度';q['manualTranscription']=True
   for field in ['question']:
    q[field]=re.sub(r'[\ue000-\uf8ff]', '〔原字見附圖〕', q[field])
   q['options']=[re.sub(r'[\ue000-\uf8ff]', '〔原字見附圖〕', text) for text in q['options']]
   if q['id'] in curated:
    item=curated[q['id']];q['solution']=item['solution'];q['optionExplanations']=item['optionExplanations'];q['explanationStatus']='draft'
    q['explanationSources']=[{'title':f'{year}年{q["subject"]}原題','url':q['sourcePdf'],'page':q['sourcePage'],'version':f'民國{year}年試卷'},{'title':'官方標準答案／更正表','url':q['answerSource'],'version':'使用者上傳答案表'}]+item.get('extraSources',[])
    if q['subject']!='營建法規與實務':q['regulation']='本解析為基本觀念或理想力學模型之整理，非官方解答；未引用特定法規條號，工程設計仍須依適用規範核對。'
   combined.append(q)
  path.write_text(json.dumps(bank,ensure_ascii=False,indent=2))
 (ROOT/f'data/{slug}-bank.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2))
 (ROOT/f'data/{slug}-bank.js').write_text('const '+var+' = '+json.dumps(combined,ensure_ascii=False)+';\n')
 (ROOT/f'data/{slug}-text-review.json').write_text(json.dumps([{'id':q['id'],'issues':q.get('extractionIssues',[])} for q in combined if q.get('textStatus')=='needs-review'],ensure_ascii=False,indent=2))
 summary[slug]={'total':len(combined),'native':sum(q.get('textStatus')=='native' for q in combined),'needsReview':sum(q.get('textStatus')=='needs-review' for q in combined),'withSolution':sum(bool(q.get('solution')) for q in combined),'withDiagram':sum(bool(q.get('diagrams')) for q in combined)}
(ROOT/'data/native-conversion-report.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False))
