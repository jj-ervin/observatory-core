/**
 * OC-AI-03: fail-closed, dynamically authorized research access.
 * The host owns the authorization decision, identity, revocation and audit sink.
 * No decision is cached; the authorizer is consulted on every document access.
 */
const idPattern=/^doc-[a-f0-9]{64}$/;
export function createGovernedResearchTools(archive,{candidateDocumentIds,authorize,audit}={}){
 if(!archive||typeof archive.get!=="function"||typeof archive.resolveCitation!=="function")throw new TypeError("research archive required");
 if(!Array.isArray(candidateDocumentIds)||candidateDocumentIds.length>100||candidateDocumentIds.some(id=>typeof id!=="string"||!idPattern.test(id))||new Set(candidateDocumentIds).size!==candidateDocumentIds.length)throw new TypeError("bounded document candidates required");
 if(typeof authorize!=="function"||typeof audit!=="function")throw new TypeError("authorization and audit callbacks required");
 const candidates=new Set(candidateDocumentIds);
 function check(id,action,{skipDenied=false}={}){
  if(typeof id!=="string"||!idPattern.test(id))throw new TypeError("invalid documentId");
  let allowed=false;
  try{
   if(candidates.has(id)){
    const decision=authorize(Object.freeze({documentId:id,action}));
    if(decision&&typeof decision.then==="function")Promise.resolve(decision).catch(()=>{});
    allowed=decision===true;
   }
  }catch{allowed=false;}
  // A failed audit must fail closed before any protected archive read.
  const receipt=audit(Object.freeze({documentId:id,action,allowed}));
  if(receipt&&typeof receipt.then==="function"){
   Promise.resolve(receipt).catch(()=>{});
   throw new TypeError("synchronous audit callback required");
  }
  if(receipt===false)throw new Error("audit rejected decision");
  if(!allowed){if(skipDenied)return false;throw new Error("research document unavailable");}
  return true;
 }
 return Object.freeze({
  searchEvidence({query,limit=10}={}){
   if(typeof query!=="string"||!query.trim()||query.length>256||!Number.isSafeInteger(limit)||limit<1||limit>20)throw new TypeError("invalid search arguments");
   const results=[];
   for(const id of candidates){
    if(!check(id,"search",{skipDenied:true}))continue;
    const stored=archive.get(id);
    if(!stored)continue;
    const start=stored.content.indexOf(query);
    if(start<0)continue;
    const item=archive.resolveCitation({documentId:id,start,end:start+query.length,quotedText:query});
    results.push(Object.freeze({document:item.document,passage:item.passage,citation:item.citation}));
    if(results.length===limit)break;
   }
   return Object.freeze({results});
  },
  getDocument({documentId}={}){
   check(documentId,"read");
   const stored=archive.get(documentId);
   return stored?Object.freeze({document:stored.document}):null;
  },
  verifyCitation({documentId,start,end,quotedText}={}){
   if(typeof quotedText!=="string"||quotedText.length>10000)throw new TypeError("invalid citation arguments");
   check(documentId,"verify");
   return archive.resolveCitation({documentId,start,end,quotedText});
  }
 });
}
