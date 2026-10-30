const ReferenceSearch={
 normalize(value){return value.normalize('NFKC').replace(/\s+/g,'').toLowerCase();},
 search(library,query,documentId=''){
  const prepared=query.normalize('NFKC').replace(/第\s*([0-9]+(?:\s*[-之]\s*[0-9]+)?)\s*條/g,(_,number)=>'第'+number.replace(/\s+/g,'')+'條');
  const terms=prepared.trim().split(/\s+/).filter(Boolean).map(v=>this.normalize(v));
  if(!terms.length)return [];
  const hits=[];
  for(const doc of library){if(documentId&&doc.id!==documentId)continue;
   for(const page of doc.pages){const text=this.normalize(page.text);if(!terms.every(term=>text.includes(term)))continue;
    const index=text.indexOf(terms[0]);
    hits.push({documentId:doc.id,title:doc.title,page:page.page,articles:page.articles,snippet:text.slice(Math.max(0,index-50),index+180),pdf:doc.sourcePdf,version:doc.version});
   }
  }
  return hits;
 }
};
if(typeof module!=='undefined')module.exports=ReferenceSearch;
