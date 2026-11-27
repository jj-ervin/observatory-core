// Optional scholarly metadata extension to gc.discovery/1.
const str=(v,max=4000)=>typeof v==='string'?(v.trim().slice(0,max)||undefined):undefined;
export function canonicalDoi(v){
  let s=str(v,2048); if(!s)return undefined;
  s=s.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');
  try{s=decodeURIComponent(s);}catch{return undefined;}
  return /^10\.\d{4,9}\/[^\s?#]+$/i.test(s)?s.toLowerCase():undefined;
}
const boolean=v=>typeof v==='boolean'?v:undefined;
function date(v){
  if(typeof v!=='string'||!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(v))return undefined;
  const full=v.length===4?v+'-01-01':v.length===7?v+'-01':v;
  const d=new Date(full+'T00:00:00Z');
  return Number.isFinite(+d)&&d.toISOString().slice(0,10)===full?v:undefined;
}
const precision=v=>v.length===4?'year':v.length===7?'month':'day';
export function normalizeScholarly(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return undefined;
  const out={};
  const put=(k,v)=>{if(v!==undefined)out[k]=v;};
  put('doi',canonicalDoi(input.doi));
  put('openAlexId',str(input.openAlexId,200));
  const publicationDate=date(input.publicationDate);
  if(publicationDate){put('publicationDate',publicationDate);put('publicationDatePrecision',precision(publicationDate));}
  for(const k of ['venue','publicationType','openAccessStatus'])put(k,str(input[k],400));
  put('abstract',str(input.abstract,100000));
  put('isOpenAccess',boolean(input.isOpenAccess));
  put('isRetracted',boolean(input.isRetracted));
  if(Array.isArray(input.authors)&&input.authors.length){
    const authors=input.authors.slice(0,10000).map(a=>{
      const row={};
      for(const k of ['name','openAlexId','orcid']){const v=str(a?.[k],500);if(v!==undefined)row[k]=v;}
      return row;
    });
    if(authors.some(a=>Object.keys(a).length))put('authors',authors);
  }
  return Object.keys(out).length?out:undefined;
}
// Reject malformed/sparse inverted indexes rather than invent missing words.
export function decodeAbstract(index){
  if(!index||typeof index!=='object'||Array.isArray(index))return undefined;
  const words=[];
  for(const [word,positions] of Object.entries(index)){
    if(!word||!Array.isArray(positions))return undefined;
    for(const p of positions){
      if(!Number.isInteger(p)||p<0||p>=20000||words[p]!==undefined)return undefined;
      words[p]=word;
    }
  }
  if(!words.length||Array.from(words).some(v=>v===undefined))return undefined;
  return words.join(' ').slice(0,100000);
}
export function fromOpenAlex(work){
  return normalizeScholarly({
    doi:work.doi,openAlexId:work.id,
    publicationDate:date(work.publication_date)??(Number.isInteger(work.publication_year)?String(work.publication_year):undefined),
    venue:work.primary_location?.source?.display_name,
    publicationType:work.type,abstract:decodeAbstract(work.abstract_inverted_index),
    isOpenAccess:work.open_access?.is_oa,openAccessStatus:work.open_access?.oa_status,
    isRetracted:work.is_retracted,
    authors:Array.isArray(work.authorships)?work.authorships.map(a=>({name:a?.author?.display_name,openAlexId:a?.author?.id,orcid:a?.author?.orcid})):undefined
  });
}
// First known value wins; a later observation fills unknowns, not conflicting facts.
// Author lists are atomic: never combine potentially different author orderings.
export function mergeScholarly(existing,incoming){
  if(!incoming)return existing;
  const out={...incoming,...existing};
  if(existing?.publicationDate&&incoming.publicationDate&&incoming.publicationDate.startsWith(existing.publicationDate)&&incoming.publicationDate.length>existing.publicationDate.length){
    out.publicationDate=incoming.publicationDate;out.publicationDatePrecision=incoming.publicationDatePrecision;
  }
  return out;
}
