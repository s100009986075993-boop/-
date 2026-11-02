const structureGuides={
 '形態、跨距與傳力':['先辨認外形與支承，再判斷主要傳力方式。','分清以拉力、壓力、彎曲或組合作用為主；不要只背建築名稱。','留意載重分布與邊界條件，條件變了，結構行為也可能改變。'],
 '高層與管式系統':['分別追蹤水平力與垂直載重的傳遞路徑。','比較外周構架、核心與內部構件的角色。','原題可能採簡化系統模型，不把題目敘述擴大成所有建築都適用。'],
 '耐震配置與韌性':['先找配置、傳力連續性與預期破壞位置。','分清強度、勁度與韌性，三者不是同一件事。','涉及規範係數或門檻時，核對當年規範與原始答案。'],
 '隔震與消能':['分清隔震、消能與一般耐震設計的目標。','比較元件位置、預期變形位置與能量處理方式。','避免把某一反應降低，誤讀為所有位移與作用力都降低。'],
 '材料與構件觀念':['分開材料性質、斷面特性與構件行為。','找出題目比較的條件，避免只靠材料名稱猜答案。','將容易混淆的名詞並列，寫下各自的差異。'],
 '系統規劃與構件行為':['先辨認系統、構件與支承各扮演什麼角色。','沿著載重到基礎的路徑，檢查敘述是否連貫。','比較選項成立的條件，而不是只記答案字母。']
};
function structureCategory(q,topics){return q.subject==='建築結構'?(topics[q.id]||{lane:'pending',topic:''}):null;}
function matchesStructure(q,topics,lane='all',topic=''){
 const category=structureCategory(q,topics);
 return !!category&&(lane==='all'||category.lane===lane)&&(!topic||category.topic===topic);
}
if(typeof module!=='undefined')module.exports={structureGuides,structureCategory,matchesStructure};
