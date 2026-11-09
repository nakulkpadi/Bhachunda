/* Run with Node.js: node legal-forms/tests/regression.cjs
   These checks use a small DOM harness; live browser checks are also required. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),clauses=JSON.parse(fs.readFileSync(path.join(root,'source-clauses.json'),'utf8'));
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.hidden=false;this.disabled=false;this.style={};this.attributes={};this._text='';}
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
  ctx.window=ctx;vm.createContext(ctx);for(const name of ['model.js','export.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
  return {ctx,ids,store,remoteCalls:()=>remoteCalls};
}
function inputFields(node,key){return descendants(node,c=>c.dataset.field===key);}
async function enter(el,value){el.value=value;await el.fire('input');}
function buttons(node,text){return descendants(node,c=>c.tagName==='button'&&c.textContent===text);}
async function validBase(h,kind){
  const {ids}=h;
  for(const [i,el] of inputFields(ids.owners,'name').entries())await enter(el,`Farmer ${i+1} Example`);
  if(kind==='spa')await enter(inputFields(ids.attorneyFields,'name')[0],'Attorney Example');
  await enter(inputFields(ids.parcels,'survey')[0],'423');
  if(kind==='affidavit')await buttons(ids.parcels,'Set equal rent and bank percentages')[0].click();
}
(async()=>{
  let checks=0;const test=(value,label)=>{assert(value,label);checks++;};
  for(const kind of ['affidavit','spa']){
    const h=boot(kind),{ctx,ids}=h;
    await validBase(h,kind);test(ctx.LegalForms.validate(),'valid initial form');
    await ids.addParcel.click();await enter(inputFields(ids.parcels,'survey')[1],'530');
    await ids.addParcel.click();await enter(inputFields(ids.parcels,'survey')[2],'220/1');await enter(inputFields(ids.parcels,'village')[2],'Bitta');
    if(kind==='affidavit')for(const b of buttons(ids.parcels,'Set equal rent and bank percentages'))await b.click();
    test(ctx.LegalForms.validate(),'three parcels across two villages');
    const state=ctx.LegalForms.getState(),blocks=ctx.LegalModel.build(state,clauses),text=blocks.map(b=>b.text||b.rows.flat().join(' ')).join('\n');
    test(['423','530','220/1'].every(x=>text.includes(x)),'all surveys in export');test(!text.includes('Office form version and page count'),'unwanted table absent');test(!text.includes('all four Owners')&&!text.includes('four recorded names'),'no fixed farmer count in clauses');
    let invalid=structuredClone(state);invalid.parcels[2].village='Bhavanipar';invalid.parcels[2].survey='423';test(!ctx.LegalForms.validate(invalid),'duplicate village/survey rejected');
    invalid=structuredClone(state);invalid.parcels[0].survey='423 & 530';test(!ctx.LegalForms.validate(invalid),'multiple surveys in one row rejected');
    if(kind==='affidavit'){
      const selected=Object.values(state.parcels[0].interests);selected.forEach((a,i)=>a.credit=i===0?'100':'0');
      test(ctx.LegalForms.validate(state),'single account preserves 25% entitlements');
      const model=ctx.LegalModel.build(state,clauses);test(model.filter(b=>b.kind==='table'&&b.headers.includes('Net rent credit %'))[0].rows.length===1,'single account export uses one bank row');
      selected[0].credit='95';test(!ctx.LegalForms.validate(state),'bank percentages below 100 rejected');selected[0].credit='100';
      state.parcels[0].mode='B';test(!ctx.LegalForms.validate(state),'Mode B requires supporting instrument');state.fields.operativeInstrument='Approved lease clause 12';test(ctx.LegalForms.validate(state),'supported Mode B accepted');
      state.parcels[0].mode='A';state.fields.effectiveFrom='2026-12-10';state.fields.effectiveUntil='2026-11-10';test(!ctx.LegalForms.validate(state),'reversed effective dates rejected');
    }
    await ids.saveBtn.click();test(h.store.size===1,'local save succeeds');test(ids.records.textContent.includes('220/1'),'record list includes all surveys');
    await ids.saveBtn.click();test(JSON.parse([...h.store.values()][0]).length===1,'editing save does not create a duplicate');
    const reloaded=boot(kind,h.store);test(reloaded.ids.records.textContent.includes('Bitta 220/1'),'records survive reload');
    await reloaded.ids.newBtn.click();await buttons(reloaded.ids.records,'Open')[0].click();test(reloaded.ctx.LegalForms.getState().parcels.length===3,'saved record reopens all parcels');
    await reloaded.ids.addOwner.click();test(reloaded.ctx.LegalForms.getState().owners.length===(kind==='spa'?4:5),'add farmer');
    await buttons(reloaded.ids.owners,'− Remove').at(-1).click();test(reloaded.ctx.LegalForms.getState().owners.length===(kind==='spa'?3:4),'remove farmer');
    const s=reloaded.ctx.LegalForms.getState();s.owners[0].name='<img src=x onerror=alert(1)>';
    const host=new Element('article');ctx.LegalExport.render(ctx.LegalModel.build(s,clauses),host);
    test(descendants(host,e=>e.tagName==='img').length===0,'user text cannot create HTML nodes');
    test(ids.cloudBtn.disabled&&h.remoteCalls()===0,'pending cloud makes no remote requests');
    const damaged=new Map([[`bhachunda-legal-v1-${kind}`,'{broken']]);const d=boot(kind,damaged);await validBase(d,kind);await d.ids.saveBtn.click();test(damaged.get(`bhachunda-legal-v1-${kind}`)==='{broken','corrupt existing records not overwritten');
  }
  console.log(`${checks} regression checks passed; no Firebase calls made.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
