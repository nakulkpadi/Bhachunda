/* Run with Node.js: node legal-forms/tests/regression.cjs
   These checks use a small DOM harness; live browser checks are also required. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),clauses=JSON.parse(fs.readFileSync(path.join(root,'source-clauses.json'),'utf8'));
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.hidden=false;this.disabled=false;this.style={};this.attributes={};this._text='';}
  get lastElementChild(){return this.children.filter(c=>typeof c!=='string').at(-1);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this._text='';}
  set textContent(x){this._text=String(x);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  setAttribute(k,v){this.attributes[k]=String(v);}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  async fire(type){for(const fn of this.listeners[type]||[])await fn({preventDefault(){}});}
  reportValidity(){return true;}
  showModal(){this.open=true;}
  close(){this.open=false;return this.fire('close');}
  remove(){}
  click(){return this.fire('click');}
}
function descendants(node,match){return node.children.flatMap(c=>typeof c==='string'?[]:[...(match(c)?[c]:[]),...descendants(c,match)]);}
function boot(kind,store=new Map()){
  const html=fs.readFileSync(path.join(root,kind==='spa'?'special-power-of-attorney.html':'affidavit.html'),'utf8');
  const ids=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element('div')]));ids.recordSearch.value='';
  let remoteCalls=0;
  const doc={body:{dataset:{kind}},getElementById:id=>{assert(ids[id],`Missing #${id}`);return ids[id];},createElement:tag=>new Element(tag),createTextNode:text=>String(text),querySelectorAll:selector=>selector==='.toolbar button'?['previewBtn','saveBtn','newBtn','wordBtn','pdfBtn'].map(k=>ids[k]):[]};
  const ctx={document:doc,crypto:webcrypto,structuredClone,Date,AbortSignal,JSON,URL,Blob,setTimeout,clearTimeout,console,confirm:()=>true,prompt:()=> 'Signed',localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async url=>{if(url==='source-clauses.json')return {ok:true,json:async()=>clauses};remoteCalls++;throw Error('Unexpected remote request in offline test');},addEventListener(){},scrollTo(){}};
  ctx.window=ctx;vm.createContext(ctx);for(const name of ['shared.js','model.js','export.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
  return {ctx,ids,store,remoteCalls:()=>remoteCalls};
}
function inputFields(node,key){return descendants(node,c=>c.dataset.field===key);}
async function enter(el,value){el.value=value;await el.fire(el.tagName==='select'?'change':'input');}
function buttons(node,text){return descendants(node,c=>c.tagName==='button'&&c.textContent===text);}
async function validBase(h,kind){
  const {ids}=h;
  for(const [i,el] of inputFields(ids.owners,'name').entries())await enter(el,`Farmer ${i+1} Example`);
  if(kind==='spa')await enter(inputFields(ids.attorneyFields,'name')[0],'Attorney Example');
  await enter(inputFields(ids.parcels,'survey')[0],'423');
  await enter(inputFields(ids.parcels,'totalArea')[0],'2.29.10');
  if(kind==='affidavit'){await enter(inputFields(ids.owners,'bank')[0],'Example Bank');await enter(inputFields(ids.owners,'account')[0],'000123456789');await enter(inputFields(ids.owners,'ifsc')[0],'TEST0001234');}
}
(async()=>{
  let checks=0;const test=(value,label)=>{assert(value,label);checks++;};
  for(const kind of ['affidavit','spa']){
    const h=boot(kind),{ctx,ids}=h;
    await validBase(h,kind);test(ctx.LegalForms.validate(),'valid initial form');
    await ids.addParcel.click();await enter(inputFields(ids.parcels,'survey')[1],'530');
    await ids.addParcel.click();await enter(inputFields(ids.parcels,'survey')[2],'220/1');await enter(inputFields(ids.parcels,'village')[2],'Bitta');
    for(const el of inputFields(ids.parcels,'totalArea'))await enter(el,'2.29.10');
    test(ctx.LegalForms.validate(),'three parcels across two villages');
    const state=ctx.LegalForms.getState(),blocks=ctx.LegalModel.build(state,clauses),text=blocks.map(b=>b.text||b.rows.flat().join(' ')).join('\n');
    test(['423','530','220/1'].every(x=>text.includes(x)),'all surveys in export');test(!text.includes('Office form version and page count'),'unwanted table absent');test(!text.includes('all four Owners')&&!text.includes('four recorded names'),'no fixed farmer count in clauses');
    let invalid=structuredClone(state);invalid.parcels[2].village='Bhavanipar';invalid.parcels[2].survey='423';test(!ctx.LegalForms.validate(invalid),'duplicate village/survey rejected');
    invalid=structuredClone(state);invalid.parcels[0].survey='423 & 530';test(!ctx.LegalForms.validate(invalid),'multiple surveys in one row rejected');
    test(ctx.LegalData.convert('2.29.10').acres===5&&ctx.LegalData.convert('2.29.10').guntha===26,'user formula produces 5 acres 26 guntha');
    test(ctx.LegalData.convert('22910').guntha===26,'direct square metres accepted');
    test(!ctx.LegalData.convert('2.100.10')&&!ctx.LegalData.convert('2.29.100')&&!ctx.LegalData.convert('-1.20.00'),'invalid area components rejected');
    test(ctx.LegalData.convert('4046').acres===1&&ctx.LegalData.convert('4046').guntha===0,'rounded 40 guntha carries to next acre');
    invalid=structuredClone(state);invalid.parcels[0].areaScope='part';invalid.parcels[0].leasedHas='3.00.00';test(!ctx.LegalForms.validate(invalid),'leased part cannot exceed survey area');
    test(state.fields.pan==='AANCB6972G'&&text.includes('U42201GJ2025PTC164508'),'fixed company particulars in both outputs');
    if(kind==='affidavit'){
      test(ctx.LegalForms.validate(state),'100 percent payment valid without entitlement modes');
      test(!text.includes('Mode A')&&!text.includes('Operative Lease Deed')&&!text.includes('Schedule B  Agreed entitlement'),'removed long affidavit sections');
      test(ids.specialSection.hidden&&ids.executionSection.hidden,'irrelevant affidavit fields hidden');
      invalid=structuredClone(state);invalid.owners[0].account='';test(!ctx.LegalForms.validate(invalid),'payee bank details required');
      invalid=structuredClone(state);invalid.parcels[0].payeeId='missing';test(!ctx.LegalForms.validate(invalid),'non owner cannot be a payee');
      invalid=structuredClone(state);invalid.parcels[0].paymentType='split';invalid.parcels[0].interests[state.owners[0].id].credit='95';test(!ctx.LegalForms.validate(invalid),'split credits must total 100');
      const old=structuredClone(state);old.fields.lessee='Old company';old.fields.cin='';old.fields.pan='';old.parcels[0].leasedArea='5.26';delete old.parcels[0].areaScope;delete old.parcels[0].paymentType;delete old.parcels[0].payeeId;
      const migrated=ctx.LegalForms.normalise(old);test(migrated.parcels[0].payeeId===state.owners[0].id,'legacy 100 percent payee preserved');test(migrated.parcels[0].leasedArea==='5.26'&&migrated.parcels[0].areaScope==='','ambiguous legacy area retained and requires confirmation');test(migrated.fields.lessee==='BALARAMA NOVAGRID PRIVATE LIMITED','old records get fixed company particulars');
      const oldThree=structuredClone(state);oldThree.owners=[0,1,2].map((i)=>({...state.owners[0],id:'legacy-owner-'+i,name:'Legacy Owner '+(i+1),account:i===0?'000123456789':'',bank:i===0?'Example Bank':'',ifsc:i===0?'TEST0001234':''}));
      oldThree.parcels.forEach(l=>{l.mode='A';delete l.paymentType;delete l.payeeId;l.interests=Object.fromEntries(oldThree.owners.map((o,i)=>[o.id,{included:true,share:'33.33',rent:i===0?'100':'0',credit:i===0?'100':'0'}]));});
      const restored=ctx.LegalForms.normalise(oldThree);test(restored.parcels.every(l=>l.paymentType==='single'&&l.payeeId==='legacy-owner-0'),'three-owner legacy direction keeps sole payment recipient');test(ctx.LegalForms.validate(restored),'three-owner 100/0/0 bank direction needs bank details only for recipient');test(restored.owners.every((o,i)=>o.id===oldThree.owners[i].id),'migration retains farmer IDs');

    }
    await ids.saveBtn.click();test(h.store.size===1,'local save succeeds');test(ids.records.textContent.includes('220/1'),'record list includes all surveys');
    await ids.saveBtn.click();test(JSON.parse([...h.store.values()][0]).length===1,'editing save does not create a duplicate');
    const reloaded=boot(kind,h.store);test(reloaded.ids.records.textContent.includes('Bitta 220/1'),'records survive reload');
    await reloaded.ids.newBtn.click();await buttons(reloaded.ids.records,'Edit')[0].click();test(reloaded.ctx.LegalForms.getState().parcels.length===3,'saved record reopens all parcels');
    await reloaded.ids.addOwner.click();test(reloaded.ctx.LegalForms.getState().owners.length===(kind==='spa'?4:2),'add farmer');
    await buttons(reloaded.ids.owners,'− Remove').at(-1).click();test(reloaded.ctx.LegalForms.getState().owners.length===(kind==='spa'?3:1),'remove farmer');
    test(reloaded.ids.saveBtn.textContent==='Update record','saved record has clear update action');
    if(kind==='affidavit'){
      await reloaded.ids.addOwner.click();await enter(inputFields(reloaded.ids.owners,'name')[1],'Second Owner Example');
      // With multiple parcels the new owner is linked explicitly to the first one.
      const newId=reloaded.ctx.LegalForms.getState().owners[1].id;
      const pick=descendants(reloaded.ids.parcels,e=>e.dataset.ownerId===newId)[0];pick.checked=true;await pick.fire('change');
      await enter(inputFields(reloaded.ids.parcels,'payeeId')[0],newId);
      test(inputFields(reloaded.ids.parcels,'payeeId')[0].value===newId,'chosen farmer remains visible after rerender');
      await enter(inputFields(reloaded.ids.owners,'name')[1],'Second Owner Renamed');
      test(inputFields(reloaded.ids.parcels,'payeeId')[0].value===newId,'payee survives farmer name edits');
      await enter(inputFields(reloaded.ids.owners,'bank')[1],'Example Bank');await enter(inputFields(reloaded.ids.owners,'account')[1],'000987654321');await enter(inputFields(reloaded.ids.owners,'ifsc')[1],'TEST0001234');
      await reloaded.ids.saveBtn.click();test(JSON.parse([...reloaded.store.values()][0]).length===1,'Edit updates existing ID');
      const again=boot(kind,reloaded.store);await buttons(again.ids.records,'Edit')[0].click();test(inputFields(again.ids.parcels,'payeeId')[0].value===newId,'payee survives save and reload');
      test(again.ctx.LegalForms.getState().owners[0].account==='000123456789','bank leading zeros retained through edit');
      const first=again.ctx.LegalForms.getState().parcels[0];await enter(inputFields(again.ids.parcels,'paymentType')[0],'split');await buttons(again.ids.parcels,'Split equally')[0].click();
      test(Object.values(again.ctx.LegalForms.getState().parcels[0].interests).filter(a=>a.included).every(a=>a.credit==='50'),'equal split assigns 50/50');
    }
    const s=reloaded.ctx.LegalForms.getState();s.owners[0].name='<img src=x onerror=alert(1)>';
    const host=new Element('article');ctx.LegalExport.render(ctx.LegalModel.build(s,clauses),host);
    test(descendants(host,e=>e.tagName==='img').length===0,'user text cannot create HTML nodes');
    test(ids.cloudBtn.disabled&&h.remoteCalls()===0,'pending cloud makes no remote requests');
    const damaged=new Map([[`bhachunda-legal-v1-${kind}`,'{broken']]);const d=boot(kind,damaged);await validBase(d,kind);await d.ids.saveBtn.click();test(damaged.get(`bhachunda-legal-v1-${kind}`)==='{broken','corrupt existing records not overwritten');
  }
  console.log(`${checks} regression checks passed; no Firebase calls made.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
