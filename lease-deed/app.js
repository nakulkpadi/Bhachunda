/* Bhachunda Lease Deed Generator — client-only DOCX filling.
   Original source legal paragraphs stay in original order; this script fills template tokens only.
*/
'use strict';
const $ = (id) => document.getElementById(id);
const fmt = (x, fraction=2) => Number(x || 0).toLocaleString('en-IN',{minimumFractionDigits:fraction,maximumFractionDigits:fraction});
const rupees = (x) => '₹' + fmt(x);
const GU_DIGITS = '૦૧૨૩૪૫૬૭૮૯';
const toGuDigits = (s) => String(s).replace(/[0-9]/g,(d)=>GU_DIGITS[+d]);
const GU_MONTHS = ['જાન્યુઆરી','ફેબ્રુઆરી','માર્ચ','એપ્રિલ','મે','જૂન','જુલાઈ','ઑગસ્ટ','સપ્ટેમ્બર','ઑક્ટોબર','નવેમ્બર','ડિસેમ્બર'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const villages = { Bhavanipar:'ભવાનીપર', Bitta:'બિટ્ટા' };
function dateText(raw, gu=false){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw || ''))return '';
  const [y,m,d] = raw.split('-').map(Number);
  return gu ? `${toGuDigits(d)} ${GU_MONTHS[m-1]} ${toGuDigits(y)}` : `${d} ${EN_MONTHS[m-1]} ${y}`;
}
function indianWords(input){
 const n = Math.round(Number(input)||0);
 if(n===0)return 'Zero Rupees';
 const units=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
 const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
 const two=(a)=>a<20?units[a]:tens[Math.floor(a/10)]+(a%10?' '+units[a%10]:'');
 const hundred=(a)=>(a>=100?units[Math.floor(a/100)]+' Hundred'+(a%100?' ':''):'')+(a%100?two(a%100):'');
 let rem=n, parts=[];
 for(const [value,name] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']]) {
  if(rem>=value){let v=Math.floor(rem/value);parts.push((v<1000?hundred(v):String(v))+' '+name);rem%=value;}
 }
 if(rem)parts.push(hundred(rem));
 return parts.join(' ')+' Rupees';
}
// Offline assistance: known terms are translated and proper names are transliterated.
// A personal/place name's legal spelling cannot be inferred reliably; user approval is required.
const wordOverride = {
  'parshotam':'પરશોત્તમ','parshottam':'પરશોત્તમ','parshotamji':'પરશોત્તમજી',
  'purushottam':'પુરુષોત્તમ','purshotam':'પુરુષોત્તમ','parsotam':'પરશોત્તમ',
  'devji':'દેવજી','devjibhai':'દેવજીભાઈ','bhanushali':'ભાનુશાળી','bhanusali':'ભાનુશાળી',
  'bhavanipar':'ભવાનીપર','bitta':'બિટ્ટા','abdasa':'અબડાસા','kutch':'કચ્છ',
  'gujarat':'ગુજરાત','gujarati':'ગુજરાતી','ahmedabad':'અમદાવાદ','rajkot':'રાજકોટ','india':'ભારત',
  'maharashtra':'મહારાષ્ટ્ર','mumbai':'મુંબઈ','bombay':'મુંબઈ','govind':'ગોવિંદ',
  'nityshre':'નિત્યશ્રી','nityshree':'નિત્યશ્રી','nitishre':'નિત્યશ્રી','himalaya':'હિમાલય',
  'nagar':'નગર','building':'બિલ્ડિંગ','plot':'પ્લોટ','flat':'ફ્લેટ','society':'સોસાયટી',
  'apartment':'એપાર્ટમેન્ટ','apartments':'એપાર્ટમેન્ટ્સ','residency':'રેસિડેન્સી',
  'road':'રસ્તો','street':'શેરી','lane':'ગલી','near':'પાસે','opposite':'સામે',
  'behind':'પાછળ','beside':'બાજુમાં','adjacent':'લાગુ પડતો','neighbouring':'પડોશી',
  'survey':'સર્વે','number':'નંબર','no':'નં.','block':'બ્લોક','khata':'ખાતા',
  'north':'ઉત્તર','south':'દક્ષિણ','east':'પૂર્વ','west':'પશ્ચિમ',
  'bank':'બેંક','branch':'શાખા','post':'પોસ્ટ','office':'ઓફિસ','district':'જિલ્લો',
  'taluka':'તાલુકો','village':'ગામ','city':'શહેર','state':'રાજ્ય',
  'nakul':'નકુલ','kapdi':'કાપડી','patel':'પટેલ','bhai':'ભાઈ','singh':'સિંહ',
  'ram':'રામ','lal':'લાલ','ben':'બેન','jitendra':'જિતેન્દ્ર','mahesh':'મહેશ',
  'ramesh':'રમેશ','kishor':'કિશોર','dharmendra':'ધર્મેન્દ્ર','narendra':'નરેન્દ્ર',
  'hitesh':'હિતેશ','bhavesh':'ભાવેશ','kumar':'કુમાર','pravinbhai':'પ્રવીણભાઈ',
  'mr':'શ્રી','mrs':'શ્રીમતી','shri':'શ્રી','shree':'શ્રી',
  'acre':'એકર','acres':'એકર','land':'જમીન','landowner':'જમીન માલિક'
};
const cons = {'ksh':'ક્ષ','gy':'જ્ઞ','chh':'છ','sh':'શ','ch':'ચ','kh':'ખ','gh':'ઘ','th':'થ','dh':'ધ','ph':'ફ','bh':'ભ','jh':'ઝ','ny':'ઞ','ng':'ઙ','tr':'ત્ર','k':'ક','g':'ગ','c':'ક','j':'જ','t':'ત','d':'દ','n':'ન','p':'પ','b':'બ','m':'મ','y':'ય','r':'ર','l':'લ','v':'વ','w':'વ','s':'સ','h':'હ','f':'ફ','z':'ઝ','q':'ક','x':'ક્સ'};
const vInd={'aa':'આ','ee':'ઈ','ii':'ઈ','oo':'ઊ','ai':'ઐ','au':'ઔ','a':'અ','e':'એ','i':'ઇ','o':'ઓ','u':'ઉ'};
const vMat={'aa':'ા','ee':'ી','ii':'ી','oo':'ૂ','ai':'ૈ','au':'ૌ','a':'','e':'ે','i':'િ','o':'ો','u':'ુ'};
const ckeys=Object.keys(cons).sort((a,b)=>b.length-a.length);
const vkeys=Object.keys(vInd).sort((a,b)=>b.length-a.length);
function translitWord(word){
 const w=word.toLowerCase();if(wordOverride[w])return wordOverride[w];
 let i=0,out='',isCon=false;
 while(i<w.length){
   if(!/[a-z]/.test(w[i])){out+=word[i];isCon=false;i++;continue;}
   const vowel=vkeys.find(k=>w.startsWith(k,i));
   if(vowel){out+=isCon?vMat[vowel]:vInd[vowel];isCon=false;i+=vowel.length;continue;}
   const consonant=ckeys.find(k=>w.startsWith(k,i));
   if(consonant){if(isCon)out+='્';out+=cons[consonant];isCon=true;i+=consonant.length;continue;}
   i++;isCon=false;
 }
 return out||word;
}
const phraseOverrides = [
  [/\bsurvey\s+(?:no\.?|number)\s*/gi,'સર્વે નં. '],
  [/\b(?:block\s+)?survey\s+number\s*/gi,'સર્વે નં. '],
  [/\bplot\s+(?:no\.?|number)\s*/gi,'પ્લોટ નં. '],
  [/\bflat\s+(?:no\.?|number)\s*/gi,'ફ્લેટ નં. '],
  [/\bmain\s+road\b/gi,'મુખ્ય રસ્તો'],
  [/\b(?:opposite|opp\.?)(?:\s+to)?\b/gi,'સામે'],
  [/\b(?:near|nr\.?)\b/gi,'પાસે'],
  [/\broad\b/gi,'રસ્તો']
];
function autoGujarati(text,kind='general'){
 let source=String(text||'');
 // Phrase substitutions must precede per-word conversion.
 if(kind==='address'||kind==='boundary')for(const [pattern,replacement] of phraseOverrides)source=source.replace(pattern,replacement);
 return source.replace(/[A-Za-z]+/g,translitWord).replace(/[0-9]/g,d=>GU_DIGITS[+d]);
}
const GUJARATI_KEY_ROWS = [
 'અ આ ઇ ઈ ઉ ઊ ઋ એ ઐ ઓ ઔ',
 'ક ખ ગ ઘ ઙ ચ છ જ ઝ ઞ',
 'ટ ઠ ડ ઢ ણ ત થ દ ધ ન',
 'પ ફ બ ભ મ ય ર લ વ',
 'શ ષ સ હ ળ ક્ષ જ્ઞ',
 'ા િ ી ુ ૂ ૃ ે ૈ ો ૌ',
 'ં ઃ ઁ ્ ઽ । ૦ ૧ ૨ ૩ ૪',
 '૫ ૬ ૭ ૮ ૯'
];
let openGujaratiKeyboard=null;
function insertGujarati(target,value){
 const start=target.selectionStart??target.value.length;
 const end=target.selectionEnd??start;
 if(value==='⌫'){
  if(end>start){target.setRangeText('',start,end,'end');}
  else if(start>0){const before=target.value.slice(0,start),chars=Array.from(before),last=chars.pop()||'';target.setRangeText('',start-last.length,start,'end');}
 }else if(value==='Space'){target.setRangeText(' ',start,end,'end');}
 else if(value==='↵'){target.setRangeText(target.tagName==='TEXTAREA'?'\n':' ',start,end,'end');}
 else {target.setRangeText(value,start,end,'end');}
 target.dataset.guEdited='yes';target.dispatchEvent(new Event('input',{bubbles:true}));target.focus();
}
function addGujaratiTools(target,english,kind='name'){
 if(!target||target.dataset.guTools==='yes')return;
 target.dataset.guTools='yes';target.lang='gu';target.setAttribute('spellcheck','false');
 target.addEventListener('input',()=>{if(target.dataset.guAutoWriting!=='yes')target.dataset.guEdited='yes';});
 const tools=document.createElement('div');tools.className='gu-tools';
 const keyboardBtn=document.createElement('button');keyboardBtn.type='button';keyboardBtn.className='gu-tool-btn';keyboardBtn.textContent='⌨ ગુજરાતી કીબોર્ડ';keyboardBtn.setAttribute('aria-expanded','false');
 const convertBtn=document.createElement('button');convertBtn.type='button';convertBtn.className='gu-tool-btn';convertBtn.textContent='↻ ફરી ગુજરાતી બનાવો';convertBtn.title='Use English entry again; will replace Gujarati edits in this field';
 const kb=document.createElement('div');kb.className='gu-keyboard';kb.hidden=true;
 kb.setAttribute('role','group');kb.setAttribute('aria-label','Gujarati on-screen keyboard');
 for(const rowChars of GUJARATI_KEY_ROWS){const line=document.createElement('div');line.className='gu-key-row';
  for(const char of rowChars.split(' ')){const key=document.createElement('button');key.type='button';key.className='gu-key';key.textContent=char;key.setAttribute('aria-label',char);key.addEventListener('mousedown',e=>e.preventDefault());key.addEventListener('click',()=>insertGujarati(target,char));line.append(key);}
  kb.append(line);
 }
 const controls=document.createElement('div');controls.className='gu-key-row';
 for(const k of ['Space','⌫','↵']){const key=document.createElement('button');key.type='button';key.className='gu-key gu-special';key.textContent=k;key.addEventListener('mousedown',e=>e.preventDefault());key.addEventListener('click',()=>insertGujarati(target,k));controls.append(key);}
 kb.append(controls);
 keyboardBtn.addEventListener('click',()=>{if(openGujaratiKeyboard&&openGujaratiKeyboard!==kb){openGujaratiKeyboard.hidden=true;openGujaratiKeyboard.parentElement?.querySelector('.gu-tool-btn')?.setAttribute('aria-expanded','false');}kb.hidden=!kb.hidden;keyboardBtn.setAttribute('aria-expanded',String(!kb.hidden));openGujaratiKeyboard=kb.hidden?null:kb;target.focus();});
 convertBtn.addEventListener('click',()=>{const source=english?.value||'';target.dataset.guEdited='no';target.dataset.guAutoWriting='yes';target.value=autoGujarati(source,kind);target.dispatchEvent(new Event('input',{bubbles:true}));target.dataset.guAutoWriting='no';target.focus();});
 tools.append(keyboardBtn,convertBtn);target.insertAdjacentElement('afterend',tools);tools.insertAdjacentElement('afterend',kb);
}
function bindGujaratiTranslation(english,gujarati,kind){
 if(!english||!gujarati)return;
 let previous='';
 const sync=()=>{
  const suggestion=autoGujarati(english.value,kind);
  if(gujarati.dataset.guEdited!=='yes'&&(!gujarati.value||gujarati.value===previous||gujarati.dataset.guAutoWriting==='yes')){
   gujarati.dataset.guAutoWriting='yes';gujarati.value=suggestion;gujarati.dataset.guAutoWriting='no';
  }
  previous=suggestion;
 };
 english.addEventListener('input',sync);addGujaratiTools(gujarati,english,kind);
}
const makeField=(text,name,required=false,type='text') => `<label>${text}<input type="${type}" data-name="${name}" ${required?'required':''}/></label>`;
let ownerCounter = 0;
function addOwner(data={}){
  const n=ownerCounter++;
  const div=document.createElement('div'); div.className='inner-block owner';div.dataset.owner=n;
  div.innerHTML=`<div class="block-head"><strong>Landowner / જમીન માલિક <span class="ownerNumber"></span></strong><button type="button" class="tiny-button removeOwner">Remove</button></div>
   <div class="fields grid2">
      ${makeField('Full name in English','nameEn',true)}
      ${makeField('નામ ગુજરાતીમાં (auto-filled; verify)','nameGu',true)}
      ${makeField('Age (years)','age',true,'number')}
      <label>PAN number (10 characters — not DOB)<input data-name="pan" required maxlength="10" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="Enter 10-character PAN, such as ABCDE1234F" autocomplete="off" /></label>
      <label>Address in English<textarea data-name="addressEn" rows="2" required></textarea></label>
      <label>સરનામું ગુજરાતીમાં (auto-filled; verify)<textarea data-name="addressGu" rows="2" required></textarea></label>
   </div><div class="translit-note">Gujarati is suggested automatically from English and can be corrected for official spelling.</div>`;
  $('owners').appendChild(div);
  for(const [key,val] of Object.entries(data)){
    const el=div.querySelector(`[data-name="${key}"]`);if(el)el.value=val;
  }
  for(const [from,to,kind] of [['nameEn','nameGu','name'],['addressEn','addressGu','address']]){
    const a=div.querySelector(`[data-name="${from}"]`),b=div.querySelector(`[data-name="${to}"]`);
    bindGujaratiTranslation(a,b,kind);
    a.addEventListener('input',syncShares);
  }
  const panInput=div.querySelector('[data-name="pan"]');
  panInput.addEventListener('input',()=>{panInput.value=panInput.value.toUpperCase().replace(/\s/g,'');});
  div.querySelector('.removeOwner').onclick=()=>{
    if(document.querySelectorAll('.owner').length<=1){notify('At least one landowner is required.',true);return;}
    div.remove();renumber();syncShares();recalc();
  };
  div.addEventListener('input',recalc);
  renumber();syncShares();
  return div;
}
function renumber(){document.querySelectorAll('.owner').forEach((d,i)=>{d.querySelector('.ownerNumber').textContent=i+1;});}
function ownerData(){return Array.from(document.querySelectorAll('.owner')).map(d=>{
   const get=(k)=>d.querySelector(`[data-name="${k}"]`)?.value.trim()||'';
   return Object.fromEntries(['nameEn','nameGu','age','pan','addressEn','addressGu'].map(k=>[k,get(k)]));
 });}
// Each registered owner appears automatically in the payment-allocation table;
// a zero share retains the owner's legal status but excludes payment receipt.
function shareData(){
 return Array.from(document.querySelectorAll('.owner')).map(owner=>{
   const row=$('recipients').querySelector(`.share-row[data-owner="${owner.dataset.owner}"]`);
   return {share:row?.querySelector('[data-field="share"]')?.value||'0',utr:row?.querySelector('[data-field="utr"]')?.value.trim()||'',bank:row?.querySelector('[data-field="bank"]')?.value.trim()||''};
 });
}
function receiverAllocations(d){
 return (d.rentShares||[]).map((item,index)=>({index,owner:d.owners[index],share:Number(item.share),utr:item.utr||'',bank:item.bank||''})).filter(x=>x.share>0);
}
function allocateAmount(total,recipients){
 const cents=Math.round(Number(total)*100);let allocated=0;
 return recipients.map((r,i)=>{
  const current=i===recipients.length-1?cents-allocated:Math.round(cents*r.share/100);
  allocated+=current;return current/100;
 });
}
function syncShares(){
 const owners=Array.from(document.querySelectorAll('.owner'));
 const existing=new Map(Array.from($('recipients').querySelectorAll('.share-row')).map(r=>[r.dataset.owner,r]));
 $('recipients').replaceChildren();
 owners.forEach((owner,i)=>{
  const id=owner.dataset.owner;
  let row=existing.get(id);
  if(!row){
   row=document.createElement('div');row.className='inner-block share-row';row.dataset.owner=id;
   row.innerHTML=`<div class="block-head"><strong class="shareOwnerName"></strong><span class="shareOrdinal"></span></div>
     <div class="fields grid2"><label>Rent share (%) / ભાડાનો હિસ્સો (%)<input type="number" min="0" max="100" step="0.01" data-field="share" value="${i===0?'100.00':'0.00'}" required></label>
     <div class="share-amounts"><div><small>Annual rent (Year 1)</small><strong data-amount="year1">—</strong></div><div><small>Two-year advance (gross)</small><strong data-amount="advance">—</strong></div></div>
     <label>Advance payment UTR / Cheque No.<input data-field="utr" placeholder="Required if this owner receives advance"></label>
     <label>Advance paying bank name<input data-field="bank" placeholder="Required if this owner receives advance"></label></div>
     <p class="hint shareState"></p>`;
   row.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',updateShareSummary));
  }
  const en=owner.querySelector('[data-name="nameEn"]')?.value.trim()||`Owner ${i+1}`;
  const gu=owner.querySelector('[data-name="nameGu"]')?.value.trim()||'જમીન માલિક';
  row.querySelector('.shareOwnerName').textContent=`${i+1}. ${en} / ${gu}`;
  row.querySelector('.shareOrdinal').textContent=`Registered owner ${i+1}`;
  $('recipients').appendChild(row);
 });
 updateShareSummary();
}
function updateShareSummary(){
 const shares=shareData();
 const total=Math.round(shares.reduce((n,x)=>n+Number(x.share||0),0)*100)/100;
 const valid=shares.every(x=>Number(x.share)>=0&&Number(x.share)<=100&&Number.isInteger(Math.round(Number(x.share)*100)))&&Math.abs(total-100)<0.001;
 const receivers=shares.filter(x=>Number(x.share)>0);
 const box=$('shareTotal');
 box.textContent=`Total rent allocation: ${fmt(total)}% of 100.00% · ${receivers.length} rent-receiving landowner(s)`+(valid?' ✓':' — adjust shares to total 100.00%');
 box.classList.toggle('allocation-error',!valid);
 const calc=calcRent(Number($('acre').value)||0);
 const values=receivers.map((x,i)=>({share:Number(x.share),index:shares.indexOf(x)}));
 const amountsYr=allocateAmount(calc.rows[0].gross,values);
 const amountsAdv=allocateAmount(calc.advance,values);
 document.querySelectorAll('.share-row').forEach((row,i)=>{
  const x=shares[i],at=values.findIndex(y=>y.index===i);
  row.querySelector('[data-amount="year1"]').textContent=rupees(at>=0?amountsYr[at]:0);
  row.querySelector('[data-amount="advance"]').textContent=rupees(at>=0?amountsAdv[at]:0);
  row.querySelector('.shareState').textContent=Number(x.share)>0?'Receiving Lessor / ભાડું પ્રાપ્ત કરનાર':'0% — Owner is listed in the deed but is not a rent recipient';
 });
 const names=Array.from(document.querySelectorAll('.owner')).map((owner,i)=>Number(shares[i]?.share)>0?owner.querySelector('[data-name="nameEn"]')?.value.trim():'').filter(Boolean);
 $('advancePayee').value=names.join('; ');
}
function splitEqually(){
 const rows=Array.from(document.querySelectorAll('.share-row'));
 if(!rows.length)return;
 const each=Math.floor(10000/rows.length);
 rows.forEach((row,i)=>{row.querySelector('[data-field="share"]').value=((i===rows.length-1?10000-each*(rows.length-1):each)/100).toFixed(2);});
 updateShareSummary();
}

const simpleInputs=['executionDate','effectiveDate','village','survey','khata','has','acre','northEn','northGu','southEn','southGu','eastEn','eastGu','westEn','westGu','signEn','signGu','signAge','signAadhaar','signAddressEn','signAddressGu','advanceTds','advancePayee','advanceUtr','advanceBank','witness1','witness2','witness1Gu','witness2Gu','advanceVerified'];
function formData(){
 const d={}; for(const k of simpleInputs) d[k]=$(k)?.type==='checkbox'?$(k).checked:($(k)?.value||'');
 d.owners=ownerData();d.rentShares=shareData();return d;
}
function setFormData(d){
 for(const k of simpleInputs)if(k in d && $(k)){
   if($(k).type==='checkbox')$(k).checked=!!d[k];else $(k).value=d[k];
 }
 $('owners').replaceChildren();$('recipients').replaceChildren();
 (d.owners?.length?d.owners:[{}]).forEach(addOwner);
 syncShares();
 let shares=d.rentShares;
 // Read previously exported v1 JSON without silently changing old equal-ratio intent.
 if(!shares && Array.isArray(d.recipients)){
  const selected=new Set(d.recipients);const count=selected.size;
  shares=d.owners.map((_,i)=>({share:selected.has(i)?(Math.floor(10000/count)/100).toFixed(2):'0',utr:d.advanceUtr||'',bank:d.advanceBank||''}));
  const last=d.recipients[d.recipients.length-1];if(shares[last])shares[last].share=(100-shares.reduce((n,x)=>n+Number(x.share),0)+Number(shares[last].share)).toFixed(2);
 }
 (shares||[]).forEach((x,i)=>{
  const row=$('recipients').querySelectorAll('.share-row')[i];if(!row)return;
  for(const key of ['share','utr','bank'])if(x[key]!==undefined)row.querySelector(`[data-field="${key}"]`).value=x[key];
 });
 calcArea();recalc();
}
function calcArea(){
 const raw=$('has').value.trim();
 const m=raw.match(/^(\d{1,5})[.:-](\d{1,2})[.:-](\d{1,2}(?:\.\d+)?)$/);
 if(!m){$('sqm').value='';$('guntha').value='';return;}
 const h=+m[1],a=+m[2],sq=+m[3];
 if(a>=100||sq>=100){$('sqm').value='Invalid H.A.S.';$('acre').value='';return;}
 const sqm=h*10000+a*100+sq, acre=sqm/4046.8564224;
 $('sqm').value=String(sqm);$('acre').value=acre.toFixed(5);$('guntha').value=(acre*40).toFixed(3);
}
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
function calcRent(acres){
 let rows=[],grand=0,advanceRemaining=round2(acres*55000*2);
 for(let year=1;year<=30;year++){
   const rate=round2(55000*Math.pow(1.05,Math.floor((year-1)/3)));
   const months=year===30?11:12;
   const gross=round2(acres*rate*months/12);
   const adjust=round2(Math.min(advanceRemaining,gross));
   advanceRemaining=round2(advanceRemaining-adjust);
   const net=round2(gross-adjust);
   grand=round2(grand+gross);
   rows.push({year,months,rate,gross,adjust,net});
 }
 return {rows,grand,advance:round2(acres*55000*2),advanceUnallocated:advanceRemaining};
}
function recalc(){
 const a=Number($('acre').value),r=calcRent(Number.isFinite(a)&&a>0?a:0);
 $('advance').value=r.advance.toFixed(2);
 if($('advanceTds').dataset.manual!=='true')$('advanceTds').value=round2(r.advance*.10).toFixed(2);
 $('year1Val').textContent=rupees(r.rows[0].gross);
 $('grossVal').textContent=rupees(r.grand);
 $('advanceVal').textContent=rupees(r.advance);
 syncShares();
}
function escapeXml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function buildMapping(d){
 const acre=+d.acre, calc=calcRent(acre),advance=calc.advance,
 owners=d.owners;
 const guNames=owners.map((o,i)=>`${toGuDigits(i+1)}) ${o.nameGu}`).join('  ');
 const enNames=owners.map((o,i)=>`${i+1}) ${o.nameEn}`).join('  ');
 const primary=owners[0];
 const gDate=dateText(d.executionDate,true), eDate=dateText(d.executionDate,false);
 const gui=guNames;
 const rateWordGu='પંચાવન હજાર રૂપિયા';
 const m={
  DATE_EN:eDate,DATE_GU:gDate,EFFECTIVE_DATE_EN:dateText(d.effectiveDate),EFFECTIVE_DATE_GU:dateText(d.effectiveDate,true),
  VILLAGE_EN:d.village,VILLAGE_GU:villages[d.village],TALUKA_EN:'ABDASA',TALUKA_GU:'અબડાસા',DISTRICT_EN:'KUTCH',DISTRICT_GU:'કચ્છ',
  SURVEY_NO:d.survey,KHATA_NO:d.khata,AREA_HAS:d.has,AREA_SQM:$('sqm').value,AREA_ACRE:d.acre,
  OWNERS_EN:primary.nameEn,OWNERS_GU:primary.nameGu,
  ADDITIONAL_OWNERS_EN:owners.slice(1).map((o,i)=>`${i+2}) ${o.nameEn}, Age: ${o.age} Years, PAN No.: ${o.pan}, Address: ${o.addressEn}`).join('  ;  '),
  ADDITIONAL_OWNERS_GU:owners.slice(1).map((o,i)=>`${toGuDigits(i+2)}) ${o.nameGu}, ઉંમર: ${toGuDigits(o.age)} વર્ષ, પાન નં.: ${o.pan}, સરનામું: ${o.addressGu}`).join('  ;  '),
  OWNER_NAMES_EN:owners.map(o=>o.nameEn).join(', '), OWNER_NAMES_GU:owners.map(o=>o.nameGu).join(', '),
  PRIMARY_OWNER_EN:primary.nameEn,PRIMARY_AGE:primary.age,PRIMARY_AGE_GU:toGuDigits(primary.age),PRIMARY_PAN:primary.pan,
  PRIMARY_ADDRESS_EN:primary.addressEn,PRIMARY_ADDRESS_GU:primary.addressGu,
  SIGN_EN:d.signEn,SIGN_GU:d.signGu,SIGN_AGE:d.signAge,SIGN_AGE_GU:toGuDigits(d.signAge),SIGN_AADHAAR:d.signAadhaar||'____________',
  SIGN_ADDRESS_EN:d.signAddressEn,SIGN_ADDRESS_GU:d.signAddressGu,
  ADVANCE_INR:fmt(advance),ADVANCE_WORDS_EN:indianWords(advance),ADVANCE_WORDS_GU:'રૂપિયા '+toGuDigits(fmt(advance)),
  ADVANCE_TDS:fmt(+d.advanceTds),ADVANCE_NET:fmt(advance-(+d.advanceTds)),
  ADVANCE_UTR:d.advanceUtr,ADVANCE_BANK:d.advanceBank,ADV_PAYEE:d.advancePayee,
  AREA_SUMMARY:$('sqm').value+' Sq. Mtr.; '+d.acre+' Acres',
  RENT_RATE:'55,000',RENT_RATE_WORDS_EN:'Fifty Five Thousand',RENT_RATE_WORDS_GU:rateWordGu,
  SIGNATURES_EN:owners.map((o,i)=>`${i+1}. ${o.nameEn} __________`).join(' ; '),
  WITNESS_1_EN:d.witness1?(d.witness1Gu?`${d.witness1} (${d.witness1Gu})`:d.witness1):'___________________',
  WITNESS_2_EN:d.witness2?(d.witness2Gu?`${d.witness2} (${d.witness2Gu})`:d.witness2):'___________________',
  RENT_TOTAL:fmt(calc.grand),ANNUAL_AVG:fmt(calc.grand/29.94),CONSIDERATION:fmt((calc.grand/29.94)*2),
  STAMP_NOTICE:'To be confirmed by Sub-Registrar',REG_NOTICE:'To be confirmed by Sub-Registrar'
 };
 for(const side of ['north','south','east','west']){
   m['BOUND_'+side.toUpperCase()+'_EN']=d[side+'En']||'________________';
   m['BOUND_'+side.toUpperCase()+'_GU']=d[side+'Gu']||autoGujarati(d[side+'En'])||'________________';
 }

 for(const item of calc.rows){
   const k='Y'+item.year+'_';
   m[k+'AREA']=d.acre;m[k+'RATE']=fmt(item.rate);m[k+'GROSS']=fmt(item.gross);
   m[k+'ADJ']=item.adjust>0?fmt(item.adjust):'0.00';m[k+'NET']=fmt(item.net);
 }
 return m;
}
function verify(d){
 const fail=(t)=>{notify(t,true);throw Error(t);};
 const form=$('leaseForm');
 if(!form.checkValidity()) {const bad=form.querySelector(':invalid');bad?.scrollIntoView({behavior:'smooth',block:'center'});bad?.reportValidity();fail('Complete the required fields before generating the deed.');}
 if(!d.village||!villages[d.village])fail('Select Bhavanipar or Bitta.');
 if(!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(d.has)||!+($('sqm').value))fail('Enter H.A.S. as e.g. 1.60.57.');
 if(!(Number(d.acre)>0))fail('The land must have a positive acreage.');
 if(!d.owners?.length||d.owners.some(o=>!o.nameEn||!o.nameGu||!o.age||!o.pan))fail('Each listed owner must have complete names, age and PAN.');
 if(d.owners.some(o=>! /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(o.pan.toUpperCase())))fail('Enter a valid ten-character PAN for each owner. A date of birth is not a PAN.');
 if(!d.rentShares||d.rentShares.length!==d.owners.length)fail('Rent allocation must list every registered landowner.');
 const vals=d.rentShares.map(x=>Number(x.share));
 if(vals.some(x=>!Number.isFinite(x)||x<0||x>100||Math.abs(Math.round(x*100)-x*100)>0.00001)||Math.round(vals.reduce((a,b)=>a+b,0)*100)!==10000)fail('Rent payment percentages must be between 0 and 100 and total exactly 100.00%.');
 const receivers=receiverAllocations(d);
 if(!receivers.length)fail('At least one landowner must receive rent.');
 for(const r of receivers){
  if(receivers.length>1 && (!r.utr.trim()||!r.bank.trim()))fail('For multiple receiving landowners, enter a separate advance payment UTR and bank for each receiving owner.');
 }
 if(!d.advanceVerified)fail('The original legal clause says the advance has ALREADY been paid. Confirm actual two-year advance payment before generating this execution draft.');
 if(receivers.length===1 && !(receivers[0].utr.trim()||d.advanceUtr.trim()))fail('Enter the advance payment UTR/cheque number for the receiving landowner.');
 if(receivers.length===1 && !(receivers[0].bank.trim()||d.advanceBank.trim()))fail('Enter the advance paying bank for the receiving landowner.');
 if(Number(d.advanceTds)<0||Number(d.advanceTds)>calcRent(Number(d.acre)).advance)fail('Check the advance TDS amount.');
 if(!d.signEn.trim()||!d.signGu.trim())fail('Enter the authorized signatory name in English and Gujarati.');
}
function notify(message,error=false){
 const box=$('message');box.textContent=message;box.className='message '+(error?'error':'success');
}
async function getTemplate(){
 const local=$('templateFile').files[0];if(local)return await local.arrayBuffer();
 try{
   const resp=await fetch('lease_deed_template.docx',{cache:'no-store'});
   if(!resp.ok)throw Error('HTTP '+resp.status);
   return await resp.arrayBuffer();
 }catch(e){throw Error('Template could not be read. If opening index.html directly, choose "Select lease_deed_template.docx" in the right panel or run from GitHub Pages/local HTTP server.');}
}
function expandPaymentRows(xml,d){
 const rent=calcRent(Number(d.acre));
 const selected=receiverAllocations(d);
 const adjsGross=allocateAmount(rent.advance,selected);
 const adjsTds=allocateAmount(Number(d.advanceTds),selected);
 return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>{
  if(row.includes('{{ALLOC_ROW_NO}}'))return selected.map((r,i)=>{
   const map={ALLOC_ROW_NO:`${i+1}. / ${toGuDigits(i+1)}.`,ALLOC_ROW_NAME:`${r.owner.nameEn} / ${r.owner.nameGu}`,ALLOC_ROW_PERCENT:`${fmt(r.share)}% / ${toGuDigits(fmt(r.share))}%`};
   return row.replace(/\{\{(ALLOC_ROW_NO|ALLOC_ROW_NAME|ALLOC_ROW_PERCENT)\}\}/g,(_,key)=>escapeXml(map[key]));
  }).join('');
  if(row.includes('{{ADV_ROW_NAME}}'))return selected.map((r,i)=>{
   const gross=adjsGross[i],tax=adjsTds[i];
   const map={ADV_ROW_NAME:`${r.owner.nameEn} / ${r.owner.nameGu}`,ADV_ROW_AREA:`${d.acre} acres (entire leased parcel)`,ADV_ROW_GROSS:fmt(gross),ADV_ROW_TDS:fmt(tax),ADV_ROW_UTR:r.utr||d.advanceUtr,ADV_ROW_NET:fmt(gross-tax),ADV_ROW_BANK:r.bank||d.advanceBank};
   return row.replace(/\{\{(ADV_ROW_NAME|ADV_ROW_AREA|ADV_ROW_GROSS|ADV_ROW_TDS|ADV_ROW_UTR|ADV_ROW_NET|ADV_ROW_BANK)\}\}/g,(_,key)=>escapeXml(map[key]));
  }).join('');
  return row;
 });
}

async function generate(){
 const button=$('generate');button.disabled=true;button.textContent='Preparing full Word document…';
 try{
  const data=formData();verify(data);const tokens=buildMapping(data);
  const zip=await JSZip.loadAsync(await getTemplate());
  let seen=new Set(), fileCount=0;
  for(const path of Object.keys(zip.files).filter(x=>/^word\/(?:document|header\d*|footer\d*)\.xml$/.test(x))){
    let xml=await zip.file(path).async('string');
    if(!xml.includes('{{'))continue;
    const original=xml;
    if(path==='word/document.xml')xml=expandPaymentRows(xml,data);
    xml=xml.replace(/\{\{([A-Z0-9_]+)\}\}/g,(whole,key)=>{
      if(!(key in tokens))throw Error('Template has an unmapped placeholder: '+key);
      seen.add(key);return escapeXml(tokens[key]);
    });
    if(/\{\{[A-Z0-9_]+\}\}/.test(xml))throw Error('Unfilled template placeholder remained in '+path);
    if(xml!==original){zip.file(path,xml);fileCount++;}
  }
  if(!seen.has('Y30_NET')||!seen.has('RENT_RATE')||!seen.has('OWNERS_EN')||!seen.has('ADVANCE_INR'))throw Error('Wrong or incomplete template was selected: rent chart or required sections missing.');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`Lease_Deed_${data.village}_Survey_${String(data.survey).replace(/[^\w-]/g,'_')}_${data.executionDate}.docx`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify('Bilingual Word deed generated with all registered lessors, customized rent shares, and individual advance payment rows. All unrelated clauses remain unchanged. Verify owner consent, Gujarati spelling, tax and payment records with your advocate.');
 }catch(err){console.error(err);notify(err.message||String(err),true);}finally{button.disabled=false;button.innerHTML='Generate .DOCX <span>↓</span>';}
}
function init(){
 const today=new Date();const local=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
 $('executionDate').value=local;$('effectiveDate').value=local;
 addOwner();
 $('addOwner').onclick=()=>addOwner();$('splitEqually').onclick=splitEqually;
 $('has').addEventListener('input',()=>{calcArea();recalc();});
 $('acre').addEventListener('input',recalc);
 $('advanceTds').addEventListener('input',()=>{$('advanceTds').dataset.manual='true';recalc();});
 for(const [en,gu,kind] of [
  ['signEn','signGu','name'],['signAddressEn','signAddressGu','address'],
  ['northEn','northGu','boundary'],['southEn','southGu','boundary'],
  ['eastEn','eastGu','boundary'],['westEn','westGu','boundary'],
  ['witness1','witness1Gu','name'],['witness2','witness2Gu','name']
 ])bindGujaratiTranslation($(en),$(gu),kind);
 $('generate').onclick=generate;
 $('exportJson').onclick=()=>{
  const d=formData();
  const blob=new Blob([JSON.stringify({schema:'bhachunda-lease-v2',...d},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Lease_Input_${d.village||'Draft'}_${d.survey||'Survey'}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  notify('Saved form data as JSON on your device. Keep it private: names, PAN and Aadhaar can be sensitive.');
 };
 $('importJson').onchange=async(e)=>{
  try{const file=e.target.files[0];if(!file)return;const d=JSON.parse(await file.text());if(!['bhachunda-lease-v1','bhachunda-lease-v2'].includes(d.schema))throw Error('Unknown input format.');setFormData(d);notify('Saved input loaded. Verify the details and payment before generating.');}
  catch(err){notify('Import failed: '+err.message,true);}
 };
 recalc();
}
document.addEventListener('DOMContentLoaded',init);
