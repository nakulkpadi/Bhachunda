/* Fixed company particulars and the owner's 4047 sq m / whole-guntha convention. */
(() => {
  'use strict';
  const company=Object.freeze({lessee:'BALARAMA NOVAGRID PRIVATE LIMITED',pan:'AANCB6972G',cin:'U42201GJ2025PTC164508',lesseeAddress:'401, 501, 601, MZ Corporate, Ambliiscon Road, Ahmedabad - 380058, Gujarat, India'});
  function parseHas(text){
    const raw=String(text||'').trim();
    const m=raw.match(/^(\d+)\s*[.]\s*(\d{1,2})\s*[.]\s*(\d{1,2})$/)||raw.match(/^(\d+)\s*hectare[s]?\s*(\d{1,2})\s*are[s]?\s*(\d{1,2})\s*sq\s*m$/i);
    if(!m){
      if(!/^\d+$/.test(raw))return null;
      const total=Number(raw);if(!Number.isSafeInteger(total)||total<=0)return null;
      const hectare=Math.floor(total/10000),are=Math.floor(total%10000/100),sqm=total%100;
      return {hectare,are,sqm,total,has:`${hectare}.${String(are).padStart(2,'0')}.${String(sqm).padStart(2,'0')}`};
    }
    const [hectare,are,sqm]=m.slice(1).map(Number);
    const total=hectare*10000+are*100+sqm;
    return Number.isSafeInteger(total)&&total>0&&are<100&&sqm<100?{hectare,are,sqm,total,has:`${hectare}.${String(are).padStart(2,'0')}.${String(sqm).padStart(2,'0')}`} : null;
  }
  function convert(text){
    const metric=parseHas(text);if(!metric)return null;
    const decimalAcres=metric.total/4047;
    let acres=Math.floor(decimalAcres),guntha=Math.round((decimalAcres-acres)*40);
    if(guntha===40){acres++;guntha=0;}
    return {...metric,acres,guntha,decimalAcres};
  }
  const area=land=>convert(land.areaScope==='part'?land.leasedHas:land.areaScope==='whole'?land.totalArea:'');
  const areaText=land=>{const a=area(land);return a?`${a.has} ha.are.sq m (${a.total} sq m; approximately ${a.acres} Acres and ${a.guntha} Guntha)`:'________________________';};
  function migrateParcel(land,kind){
    if(!['whole','part'].includes(land.areaScope))land.areaScope=land.leasedArea?'':'whole';
    if(kind==='affidavit'){
      const selected=Object.entries(land.interests).filter(([,a])=>a.included);
      const payees=selected.filter(([,a])=>Number(a.credit)>0);
      if(!['single','split'].includes(land.paymentType))land.paymentType=payees.length===1&&Number(payees[0][1].credit)===100?'single':selected.length===1?'single':'split';
      if(!selected.some(([id])=>id===land.payeeId))land.payeeId=land.paymentType==='single'?(payees.length===1?payees[0][0]:selected.length===1?selected[0][0]:''):'';
      if(land.paymentType==='single'&&land.payeeId)selected.forEach(([id,a])=>a.credit=id===land.payeeId?'100':'0');
    }
    return land;
  }
  const spaAttorney=s=>s.owners.find(o=>o.id===s.attorneyOwnerId)||null;
  const spaPrincipals=s=>s.owners.filter(o=>o.id!==s.attorneyOwnerId);
  function migrateSpa(s){
    if(s.kind!=='spa')return s;
    // Earlier forms stored a co-owner attorney separately. Retain that person and
    // their parcel interests when moving them into the common farmer list.
    if(!Object.prototype.hasOwnProperty.call(s,'attorneyOwnerId')){
      s.attorneyOwnerId='';const a=s.attorney;
      if(a?.coowner&&a.name?.trim()){
        const same=s.owners.find(o=>o.name.trim().toLowerCase()===a.name.trim().toLowerCase()&&String(o.parent||'').trim().toLowerCase()===String(a.parent||'').trim().toLowerCase()&&(!o.pan||!a.pan||o.pan.toUpperCase()===a.pan.toUpperCase()));
        let id=same?.id;
        if(!id){id='attorney';let suffix=1;while(s.owners.some(o=>o.id===id))id=`attorney-${suffix++}`;s.owners.push({...a,id});}
        s.attorneyOwnerId=id;
        s.parcels.forEach(l=>{const previous=l.interests.attorney;if(!previous)return;const current=l.interests[id];l.interests[id]=current?{...previous,...current,included:previous.included||current.included,share:current.share||previous.share}: {...previous};if(id!=='attorney')delete l.interests.attorney;});
      }
    }
    if(typeof s.attorneyOwnerId!=='string'||!s.owners.some(o=>o.id===s.attorneyOwnerId))s.attorneyOwnerId='';
    return s;
  }
  window.LegalData={company,parseHas,convert,area,areaText,migrateParcel,spaAttorney,spaPrincipals,migrateSpa};
})();
