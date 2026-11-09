(() => {
  'use strict';
  const $=id=>document.getElementById(id), kind=document.body.dataset.kind;
  const villages=['Bhavanipar','Bitta','Vandh Timbo'];
  // Enable only after the project's staff authentication and database rules are verified.
  const CLOUD_READY=false;
  const storageKey=`bhachunda-legal-v1-${kind}`;
  const dbURL='https://bhachunda-solar-default-rtdb.asia-southeast1.firebasedatabase.app';
  // Firebase web API keys identify a project; authorisation is enforced by Database rules.
  const webKey='AIzaSyAPHjoSFl3eytfcRJdoZRteD-mqoHCK6vg';
  const uid=()=>crypto.randomUUID();
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const owner=()=>({id:uid(),name:'',parent:'',age:'',occupation:'Agriculture',address:'',pan:'',identification:'',relationship:'',bank:'',branch:'',account:'',ifsc:'',affirmDate:'',affirmPlace:''});
  const interest=()=>({included:true,share:'',rent:'',credit:''});
  const parcel=people=>({id:uid(),village:'Bhavanipar',survey:'',khata:'',tenure:'',totalArea:'',leasedArea:'',north:'',south:'',east:'',west:'',plan:'',mode:'A',interests:Object.fromEntries(people.map(o=>[o.id,interest()]))});
  function fresh(){const owners=Array.from({length:kind==='spa'?3:4},owner);return {schemaVersion:1,kind,id:uid(),status:'Draft',owners,attorney:{...owner(),id:'attorney',coowner:true},parcels:[parcel(kind==='spa'?[...owners,{id:'attorney'}]:owners)],fields:{date:today(),place:kind==='spa'?'Mumbai':'',executionState:'Maharashtra',lessee:'Balarama Novagrid Private Limited',rate:'55000',advance:'First two years in advance, subject to the approved Lease Deed',subRegistrar:'Naliya',language:'English',naDocuments:''},createdAt:new Date().toISOString(),updatedAt:''};}
  let state=fresh(),records=[],cloudSession=null,dirty=false,storageHealthy=true;
  let clausesPromise=fetch('source-clauses.json').then(r=>{if(!r.ok)throw Error('Document clauses could not load. Please reload this page.');return r.json();});
  clausesPromise.catch(()=>message('Document clauses could not load. Please reload this page.','error'));
  function message(text,type='success'){ $('formStatus').textContent=text;$('formStatus').className=`status ${type}`; }
  function dirtyState(){dirty=true;$('editState').textContent=`${state.updatedAt?'Editing saved':'New'} document · unsaved changes`;}
  function field(label,key,obj,options={}){
    const wrap=document.createElement('label');wrap.className=`field${options.full?' full':''}`;wrap.append(document.createTextNode(label));
    const el=document.createElement(options.options?'select':options.area?'textarea':'input');
    if(options.options){options.options.forEach(value=>{const op=document.createElement('option');op.value=value;op.textContent=value;el.append(op);});}
    else if(!options.area)el.type=options.type||'text';
    el.value=obj[key]??'';el.dataset.field=key;el.maxLength=options.area?1800:220;
    if(options.required)el.required=true;if(options.placeholder)el.placeholder=options.placeholder;
    if(options.type==='number'){el.min=options.min??0;el.max=options.max??100;el.step=options.step||'any';}
    if(options.pattern)el.pattern=options.pattern;
    if(options.readonly)el.readOnly=true;
    if(options.autocomplete)el.autocomplete=options.autocomplete;
    el.addEventListener('input',()=>{obj[key]=el.value;dirtyState();if(options.change)options.change();});
    wrap.append(el);return wrap;
  }
  function fields(host,obj,list){host.replaceChildren(...list.map(([label,key,options])=>field(label,key,obj,options||{})));}
  const commonPerson=[['Full legal name *','name',{required:true}],['Parent or spouse name','parent'],['Age in years','age',{type:'number',min:18,max:120,step:1}],['Occupation','occupation'],['PAN','pan',{pattern:'[A-Za-z]{5}[0-9]{4}[A-Za-z]',placeholder:'Optional; 10 characters'}],['Identification document particulars','identification'],['Residential address','address',{area:true,full:true}]];
  const people=()=>[...state.owners,...(kind==='spa'&&state.attorney.coowner?[state.attorney]:[])];
  function renderOwners(){
    $('owners').replaceChildren();
    state.owners.forEach((o,i)=>{
      const card=document.createElement('section');card.className='person';card.dataset.owner=o.id;
      const head=document.createElement('div');head.className='section-head';const title=document.createElement('h3');title.textContent=`${kind==='spa'?'Principal':'Farmer'} ${i+1}${o.name?' — '+o.name:''}`;
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='− Remove';remove.disabled=state.owners.length===1;remove.setAttribute('aria-label',`Remove ${kind==='spa'?'principal':'farmer'} ${i+1}`);
      remove.addEventListener('click',()=>{if(!confirm(`Remove ${o.name||'this farmer'} and their parcel allocations?`))return;state.owners=state.owners.filter(x=>x.id!==o.id);state.parcels.forEach(l=>delete l.interests[o.id]);dirtyState();renderOwners();renderParcels();});
      head.append(title,remove);const grid=document.createElement('div');grid.className='grid';
      const defs=commonPerson.map(row=>[...row]);
      defs[0]=['Full legal name *','name',{required:true,change:()=>{title.textContent=`${kind==='spa'?'Principal':'Farmer'} ${i+1}${o.name?' — '+o.name:''}`;renderParcels();}}];
      if(kind==='spa')defs.push(['Relationship to attorney','relationship']);
      else defs.push(['Bank name','bank'],['Branch','branch'],['Account number','account',{placeholder:'Stored as text; leading zeros retained'}],['IFSC','ifsc',{pattern:'[A-Za-z]{4}0[A-Za-z0-9]{6}'}],['Date of affirmation if different','affirmDate',{type:'date'}],['Place of affirmation if different','affirmPlace']);
      fields(grid,o,defs);card.append(head,grid);$('owners').append(card);
    });
  }
  function renderAttorney(){
    if(kind!=='spa')return;$('attorneySection').hidden=false;
    const defs=commonPerson.map(row=>[...row]);defs[0]=['Attorney full legal name *','name',{required:true,change:renderParcels}];fields($('attorneyFields'),state.attorney,defs);
    const label=document.createElement('label');label.className='owner-pick full';const cb=document.createElement('input');cb.type='checkbox';cb.checked=state.attorney.coowner;
    cb.addEventListener('change',()=>{state.attorney.coowner=cb.checked;state.parcels.forEach(l=>{if(cb.checked)l.interests.attorney ||= interest();else delete l.interests.attorney;});dirtyState();renderParcels();});
    label.append(cb,document.createTextNode('The attorney is also a co owner of one or more parcels'));$('attorneyFields').append(label);
  }
  function renderParcels(){
    $('parcels').replaceChildren();
    state.parcels.forEach((land,i)=>{
      const card=document.createElement('section');card.className='parcel';card.dataset.parcel=land.id;
      const head=document.createElement('div');head.className='section-head';const title=document.createElement('h3');title.textContent=`Parcel A${i+1}`;
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='− Remove parcel';remove.disabled=state.parcels.length===1;
      remove.addEventListener('click',()=>{if(!confirm('Remove this land parcel and its allocations?'))return;state.parcels=state.parcels.filter(l=>l.id!==land.id);dirtyState();renderParcels();});head.append(title,remove);
      const grid=document.createElement('div');grid.className='grid';fields(grid,land,[['Village *','village',{options:villages}],['Survey number / subdivision *','survey',{required:true,placeholder:'One survey per parcel, e.g. 220/1'}],['Khata or account number','khata'],['Tenure','tenure'],['Total survey area','totalArea',{placeholder:'e.g. 2 hectare 10 are 50 sq m'}],['Exact area proposed for lease','leasedArea',{placeholder:'e.g. 5 acre 8 guntha'}]]);
      if(kind==='spa'){
        ['north','south','east','west'].forEach(key=>grid.append(field(`${key[0].toUpperCase()+key.slice(1)} boundary`,key,land)));
        grid.append(field('Verified plan / annexure reference','plan',land,{full:true,placeholder:`e.g. Annexure A${i+1} plan`}));
      }
      const fixed=document.createElement('p');fixed.className='hint';fixed.textContent='Taluka: Abdasa · District: Kutch · State: Gujarat';
      const ownerTitle=document.createElement('h3');ownerTitle.textContent=kind==='spa'?'Owners and verified interests for this parcel':'Owners and rent directions for this parcel';
      card.append(head,grid,fixed,ownerTitle);
      if(kind==='affidavit'){
        const modeField=field('Entitlement mode','mode',land,{options:['A','B']});card.append(modeField);
        const info=document.createElement('p');info.className='hint';info.textContent='Mode A retains existing lawful rent entitlement. Mode B records an express allocation supported by the operative instrument below. Bank credit percentages are separate.';card.append(info);
      }
      const totals=document.createElement('div');totals.className='totals';
      function updateTotals(){let rent=0,credit=0;Object.values(land.interests).filter(x=>x.included).forEach(x=>{rent+=Number(x.rent)||0;credit+=Number(x.credit)||0;});totals.textContent=`Rent entitlement: ${Number(rent.toFixed(4))}% / 100% · Bank credits: ${Number(credit.toFixed(4))}% / 100%`;}
      people().forEach((o,j)=>{
        land.interests[o.id] ||= {...interest(),included:false};const allocation=land.interests[o.id];
        const row=document.createElement('div');row.className='ownership-row';const checkLabel=document.createElement('label');checkLabel.className='owner-pick';const cb=document.createElement('input');cb.type='checkbox';cb.checked=allocation.included;cb.dataset.ownerId=o.id;
        const name=o.name||(o.id==='attorney'?'Attorney':`${kind==='spa'?'Principal':'Farmer'} ${j+1}`);checkLabel.append(cb,document.createTextNode(name));
        const allocationGrid=document.createElement('div');allocationGrid.className=kind==='affidavit'?'grid three':'grid';allocationGrid.hidden=!allocation.included;
        allocationGrid.append(field('Verified ownership share','share',allocation,{placeholder:'e.g. 1/4 as per title'}));
        if(kind==='affidavit'){
          allocationGrid.append(field('Rent entitlement %','rent',allocation,{type:'number',min:0,max:100,change:updateTotals}),field('Bank credit %','credit',allocation,{type:'number',min:0,max:100,change:updateTotals}));
        }
        cb.addEventListener('change',()=>{allocation.included=cb.checked;dirtyState();renderParcels();});row.append(checkLabel,allocationGrid);card.append(row);
      });
      if(kind==='affidavit'){
        const buttons=document.createElement('div');buttons.className='actions';
        const equal=document.createElement('button');equal.type='button';equal.textContent='Set equal rent and bank percentages';equal.addEventListener('click',()=>{const selected=people().filter(o=>land.interests[o.id].included);if(!selected.length)return;const each=Math.floor(10000/selected.length)/100;selected.forEach((o,j)=>{const amount=j===selected.length-1?Number((100-each*(selected.length-1)).toFixed(2)):each;land.interests[o.id].rent=String(amount);land.interests[o.id].credit=String(amount);});dirtyState();renderParcels();});
        buttons.append(equal);
        const pay=document.createElement('select');pay.setAttribute('aria-label',`Pay all bank credits for parcel A${i+1} to one owner`);const ph=document.createElement('option');ph.value='';ph.textContent='Credit 100% to one owner…';pay.append(ph);
        people().filter(o=>land.interests[o.id].included).forEach((o,j)=>{const op=document.createElement('option');op.value=o.id;op.textContent=o.name||`Farmer ${j+1}`;pay.append(op);});
        pay.addEventListener('change',()=>{if(!pay.value)return;Object.entries(land.interests).forEach(([id,x])=>{if(x.included)x.credit=id===pay.value?'100':'0';});dirtyState();renderParcels();});
        card.append(totals,buttons,pay);updateTotals();
      }
      $('parcels').append(card);
    });
  }
  function renderFields(){
    fields($('generalFields'),state.fields,[['Document date','date',{type:'date'}],['Place of execution / affirmation','place'],...(kind==='spa'?[['State of execution','executionState']]:[])]);
    const defs=[['Lessee full legal name','lessee'],['Lessee CIN','cin'],['Lease Deed date or proposed date','leaseDate',{type:'date'}],['Initial annual rent total (Rs)','totalRent']];
    if(kind==='affidavit')defs.push(['Registration number and Sub Registrar','registration'],['Lease rent clause','rentClause'],['Directions effective from','effectiveFrom',{type:'date'}],['Directions effective until','effectiveUntil',{type:'date'}],['Earlier rent or arrears included, if any','arrears',{full:true}],['Bank proof annexure references','bankProof',{full:true}]);
    else defs.push(['Lessee registered office','lesseeAddress',{area:true,full:true}],['Project name','project'],['Lease commencement','leaseStart',{type:'date'}],['Lease expiry','leaseEnd',{type:'date'}],['Annual rent per acre (Rs)','rate'],['Annual rate in words','rateWords'],['Escalation and intervals','escalation'],['Advance rent and adjustment','advance'],['Deposit and approved treatment','deposit'],['Rent due dates and payment method','paymentMethod'],['Tax allocation and TDS','tax'],['Stamp duty and registration fees paid by','stampParty'],['NA charges and lawful premium paid by','naCharges'],['Conditions before possession','possession',{area:true,full:true}],['Competent Sub Registrar','subRegistrar'],['Annexure B1 date and version','b1Version'],['Annexure B1 total pages','b1Pages'],['Annexure B2 date and total pages','b2Reference']);
    fields($('leaseFields'),state.fields,defs);
    if(kind==='affidavit'){
      $('specialTitle').textContent='5. Instrument supporting any changed rent entitlement';$('specialHelp').textContent='Required for Mode B. For an existing entitlement under Mode A, these particulars can remain blank.';
      fields($('specialFields'),state.fields,[['Operative Lease Deed or other legal instrument','operativeInstrument',{area:true,full:true}],['Instrument date','instrumentDate',{type:'date'}],['Clause','instrumentClause'],['Annexure reference','instrumentAnnexure']]);
      fields($('executionFields'),state.fields,[['Lessee authorised signatory and designation','signatory']]);
    }else{
      $('peopleTitle').textContent='2. Farmers granting the power';$('peopleHelp').textContent='Add the farmers who grant authority as Principals. Enter the person receiving the power separately as the constituted attorney.';$('landTitle').textContent='4. Land parcels';$('leaseTitle').textContent='5. Approved lease details';$('specialTitle').textContent='6. Approved NA documents';$('specialHelp').textContent='Enter the approved documents and annexure references as plain text. The office / version / page-count table has been removed.';
      fields($('specialFields'),state.fields,[['NA file or project reference','naReference'],['Competent revenue authority and office','naOffice'],['Applicable NA route confirmed by counsel','naRoute',{full:true}],['Approved NA documents and annexure references','naDocuments',{area:true,full:true,placeholder:'List the exact approved applications, consents or declarations and attached final texts.'}]]);
      fields($('executionFields'),state.fields,[['Language understood by the Principals','language'],['Witness 1 full name and address','witness1',{area:true}],['Witness 1 identification','witnessId1'],['Witness 2 full name and address','witness2',{area:true}],['Witness 2 identification','witnessId2']]);
    }
  }
  function renderForm(){renderFields();renderOwners();renderAttorney();renderParcels();$('editState').textContent=state.updatedAt?`Editing saved document · ${state.status}`:'New document · not saved';}
  function validate(s=state){
    if(s===state&&!$('legalForm').reportValidity())return false;
    let error='';
    if(!s.owners.length||!s.parcels.length)error='Add at least one farmer and one land parcel.';
    if(s.owners.some(o=>!o.name.trim()))error='Enter the full name of every farmer.';
    if(kind==='spa'&&!s.attorney.name.trim())error='Enter the constituted attorney’s full name.';
    const checkedPeople=[...s.owners,...(kind==='spa'?[s.attorney]:[])];
    if(checkedPeople.some(o=>o.age!==''&&o.age!=null&&(!Number.isInteger(Number(o.age))||Number(o.age)<18||Number(o.age)>120)))error='Any age entered must be a whole number between 18 and 120.';
    if(checkedPeople.some(o=>o.pan&&!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(o.pan)))error='Check the PAN format: five letters, four digits and one letter.';
    if(kind==='affidavit'&&s.owners.some(o=>o.ifsc&&!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(o.ifsc)))error='Check the IFSC format: four letters, zero, then six letters or digits.';
    if(kind==='spa'&&s.owners.some(o=>o.name.trim().toLowerCase()===s.attorney.name.trim().toLowerCase()))error='The attorney must be entered separately from the Principals granting the power.';
    const seen=new Set(),linked=new Set();
    s.parcels.forEach((land,i)=>{
      const ref=`Parcel A${i+1}`;
      if(!villages.includes(land.village)||!land.survey.trim())error=`${ref}: choose a village and enter one survey number.`;
      if(/[,;&\n]|\s(?:and|&)\s/i.test(land.survey))error=`${ref}: enter one survey number per parcel. Use + Add land parcel for another survey.`;
      const identity=`${land.village}:${land.survey.trim().toLowerCase().replace(/\s/g,'')}`;if(seen.has(identity))error=`${ref}: this village and survey already exists. Use one row per survey.`;seen.add(identity);
      const selected=LegalModel.ownersFor(s,land);if(!selected.length)error=`${ref}: select the owners of this parcel.`;
      selected.forEach(o=>linked.add(o.id));
      if(kind==='spa'&&!selected.some(o=>o.id!=='attorney'))error=`${ref}: select at least one Principal granting authority for this parcel.`;
      if(kind==='affidavit'){
        for(const key of ['rent','credit']){
          const values=selected.map(o=>land.interests[o.id][key]);
          if(values.some(x=>x===''||!Number.isFinite(Number(x))||Number(x)<0||Number(x)>100)||Math.abs(values.reduce((sum,x)=>sum+Number(x),0)-100)>.0001)error=`${ref}: ${key==='rent'?'rent entitlement':'bank credit'} percentages must be completed and total 100%.`;
        }
        if(land.mode==='B'&&!s.fields.operativeInstrument?.trim())error=`${ref}: identify the operative instrument for Mode B.`;
      }
    });
    if(s.owners.some(o=>!linked.has(o.id)))error='Link every listed farmer to at least one land parcel, or remove the unused farmer.';
    if(kind==='affidavit'&&s.fields.effectiveFrom&&s.fields.effectiveUntil&&s.fields.effectiveFrom>s.fields.effectiveUntil)error='The effective end date must be on or after the start date.';
    if(error){message(error,'error');return false;}return true;
  }
  function normalise(s){
    if(!s||s.schemaVersion!==1||s.kind!==kind||typeof s.id!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(s.id)||!Array.isArray(s.owners)||!s.owners.length||s.owners.length>100||!Array.isArray(s.parcels)||!s.parcels.length||s.parcels.length>200||!s.fields||!s.attorney)throw Error('A saved record has an unsupported format.');
    if(s.owners.some(o=>!o||typeof o.id!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(o.id)||typeof o.name!=='string')||new Set(s.owners.map(o=>o.id)).size!==s.owners.length)throw Error('A saved record has invalid farmer data.');
    if(s.parcels.some(l=>!l||!villages.includes(l.village)||typeof l.survey!=='string'||!l.interests))throw Error('A saved record has invalid parcel data.');
    s.owners=s.owners.map(o=>Object.fromEntries(Object.keys(owner()).map(k=>[k,typeof o[k]==='string'?o[k].slice(0,1800):''])));
    s.attorney={...Object.fromEntries(Object.keys(owner()).map(k=>[k,typeof s.attorney[k]==='string'?s.attorney[k].slice(0,1800):''])),id:'attorney',coowner:s.attorney.coowner===true};
    s.fields=Object.fromEntries(Object.entries(s.fields).filter(([k,v])=>/^[A-Za-z][A-Za-z0-9]{0,50}$/.test(k)&&typeof v==='string').map(([k,v])=>[k,v.slice(0,1800)]));
    const ids=[...s.owners.map(o=>o.id),...(kind==='spa'&&s.attorney.coowner?['attorney']:[])];
    s.parcels=s.parcels.map(l=>({...Object.fromEntries(Object.keys(parcel([])).filter(k=>k!=='interests').map(k=>[k,typeof l[k]==='string'?l[k].slice(0,1800):''])),mode:l.mode==='B'?'B':'A',interests:Object.fromEntries(ids.map(id=>{const a=l.interests[id]||{};return [id,{included:a.included===true,share:String(a.share??'').slice(0,220),rent:String(a.rent??'').slice(0,20),credit:String(a.credit??'').slice(0,20)}];}))}));
    s.status=['Draft','Signed','Registered'].includes(s.status)?s.status:'Draft';return s;
  }
  function readRecords(){try{const raw=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(raw))throw Error();return raw.map(normalise);}catch{storageHealthy=false;message('Device records could not be read. Existing stored data has been left untouched. Download Word or PDF to keep a copy of new entries.','error');return [];}}
  function writeRecords(next){if(!storageHealthy){message('Existing device records could not be read and will not be overwritten. Download Word or PDF to keep your current entries.','error');return false;}try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;return true;}catch{message('The browser could not save this record. Download Word or PDF to keep a copy.','error');return false;}}
  function upsert(record){return writeRecords([record,...records.filter(r=>r.id!==record.id)]);}
  function filename(s,ext){const survey=s.parcels.map(l=>`${l.village}-${l.survey}`).join('_').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,110);return `${kind==='spa'?'Special-Power-of-Attorney':'Rent-Affidavit'}_${survey||'Draft'}_${s.fields.date||today()}.${ext}`;}
  async function exportRecord(s,format){
    if(!validate(s))return;
    const blocks=LegalModel.build(s,await clausesPromise);
    const bytes=await LegalExport[format](blocks);
    LegalExport.save(bytes,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',filename(s,format==='pdf'?'pdf':'docx'));
    message(`${format==='pdf'?'PDF':'Editable Word file'} downloaded. ${dirty?'Use Save record to keep these changes in the list.':''}`);
  }
  async function requestCloud(path,options={}){
    if(!cloudSession||Date.now()>=cloudSession.expires){signOut();throw Error('Your Firebase session expired. Sign in again.');}
    const response=await fetch(`${dbURL}/legal-documents-v1/${kind}${path}.json?auth=${encodeURIComponent(cloudSession.token)}`,{...options,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    if(!response.ok){if(response.status===401||response.status===403)throw Error('Firebase access denied. The administrator must authorise this staff account for legal document records. Your device copy is available.');if(response.status===412)throw Error('This cloud record changed on another device. Refresh the cloud records and open the latest version before saving.');throw Error('Firebase could not complete the request. Your device copy is available.');}
    return response;
  }
  async function cloudSave(s){
    const current=await requestCloud('/'+s.id,{headers:{'X-Firebase-ETag':'true'}}),existing=await current.json();
    if(existing&&existing.updatedAt!==s.cloudRevision)throw Error('This cloud record changed on another device. Refresh cloud records and open the latest version before saving. Your current changes remain on this device.');
    const next={...s};delete next.savedTo;delete next.cloudRevision;
    await requestCloud('/'+s.id,{method:'PUT',headers:{'Content-Type':'application/json','if-match':current.headers.get('ETag')||'null_etag'},body:JSON.stringify(next)});s.cloudRevision=s.updatedAt;
  }
  async function saveRecord(){
    if(!validate())return;const saved=structuredClone(state);saved.updatedAt=new Date().toISOString();saved.savedTo='Device';
    if(!upsert(saved))return;state=saved;dirty=false;renderRecords();$('editState').textContent=`Saved on this device · ${state.status}`;message('Record saved on this device.');
    if(cloudSession){await cloudSave(saved);saved.savedTo='Device + Firebase';upsert(saved);state=structuredClone(saved);renderRecords();$('editState').textContent=`Saved on device and Firebase · ${state.status}`;message('Record saved on this device and Firebase.');}
  }
  function renderRecords(){
    const q=$('recordSearch').value.toLowerCase().trim();$('records').replaceChildren();
    const filtered=records.filter(r=>[r.fields.date,...r.owners.map(o=>o.name),...r.parcels.map(l=>l.village+' '+l.survey)].join(' ').toLowerCase().includes(q));
    if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent=q?'No matching records.':'No records yet. Save a completed form to add it to this list.';tr.append(td);$('records').append(tr);return;}
    filtered.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).forEach(r=>{
      const tr=document.createElement('tr');[LegalModel.date(r.fields.date),r.owners.map(o=>o.name).join(', '),r.parcels.map(l=>`${l.village} ${l.survey}`).join('; '),r.status,r.savedTo||'Device'].forEach(s=>{const td=document.createElement('td');td.textContent=s;tr.append(td);});
      const td=document.createElement('td'),actions=document.createElement('div');actions.className='actions';
      [['Open',()=>{if(dirty&&!confirm('Open this record and discard unsaved changes?'))return;state=structuredClone(r);dirty=false;renderForm();window.scrollTo({top:0,behavior:'smooth'});message('Saved record opened. Changes are saved only when you choose Save record.');}],['PDF',()=>busy(()=>exportRecord(r,'pdf'))],['Word',()=>busy(()=>exportRecord(r,'word'))],['Status',()=>{const nextStatus=prompt('Enter Draft, Signed or Registered',r.status);if(nextStatus===null)return;if(!['Draft','Signed','Registered'].includes(nextStatus)){message('Use Draft, Signed or Registered.','error');return;}busy(async()=>{const updated={...r,status:nextStatus,updatedAt:new Date().toISOString(),savedTo:'Device'};if(!upsert(updated))return;if(state.id===r.id)state.status=nextStatus;renderRecords();if(cloudSession){await cloudSave(updated);updated.savedTo='Device + Firebase';upsert(updated);renderRecords();}message('Record status updated.');});}]].forEach(([label,handler])=>{const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.addEventListener('click',handler);actions.append(btn);});
      td.append(actions);tr.append(td);$('records').append(tr);
    });
  }
  async function refreshCloud(){
    const response=await requestCloud(''),data=await response.json();const cloud=Object.entries(data||{}).map(([id,s])=>{if(id!==s.id)throw Error('A cloud record has a mismatched identifier.');return normalise({...s,savedTo:'Device + Firebase',cloudRevision:s.updatedAt});});
    const merged=new Map(records.map(r=>[r.id,r]));let kept=0;
    for(const r of cloud){const local=merged.get(r.id);if(!local||r.updatedAt>=local.updatedAt)merged.set(r.id,r);else kept++;}
    if(writeRecords([...merged.values()]))renderRecords();
    $('cloudStatus').textContent=`Firebase connected · ${cloud.length} cloud record${cloud.length===1?'':'s'} loaded.${kept?' Newer device changes were kept; open the cloud version before overwriting a conflict.':''}`;
    $('refreshCloud').hidden=false;$('signOut').hidden=false;$('cloudBtn').hidden=true;
    return cloud.length;
  }
  function signOut(){cloudSession=null;$('cloudPassword').value='';$('cloudStatus').textContent='Signed out of Firebase. Device records remain available in this browser.';$('refreshCloud').hidden=true;$('signOut').hidden=true;$('cloudBtn').hidden=false;}
  async function busy(action){const buttons=[...document.querySelectorAll('.toolbar button')];buttons.forEach(b=>b.disabled=true);try{await action();}catch(e){message(e.name==='TimeoutError'?'The connection timed out. Your device records remain available.':e.message||'The action could not complete.','error');}finally{buttons.forEach(b=>b.disabled=false);}}
  $('addOwner').addEventListener('click',()=>{if(state.owners.length>=100)return;const o=owner();state.owners.push(o);state.parcels.forEach(l=>l.interests[o.id]={...interest(),included:false});dirtyState();renderOwners();renderParcels();});
  $('addParcel').addEventListener('click',()=>{if(state.parcels.length>=200)return;state.parcels.push(parcel(people()));dirtyState();renderParcels();});
  $('previewBtn').addEventListener('click',()=>busy(async()=>{if(!validate())return;LegalExport.render(LegalModel.build(state,await clausesPromise),$('preview'));$('previewDialog').showModal();}));
  $('closePreview').addEventListener('click',()=>$('previewDialog').close());
  $('saveBtn').addEventListener('click',()=>busy(saveRecord));$('wordBtn').addEventListener('click',()=>busy(()=>exportRecord(state,'word')));$('pdfBtn').addEventListener('click',()=>busy(()=>exportRecord(state,'pdf')));
  $('newBtn').addEventListener('click',()=>{if(dirty&&!confirm('Start a new document and discard unsaved changes?'))return;state=fresh();dirty=false;renderForm();message('New document ready. Saved records remain in the list.');window.scrollTo({top:0,behavior:'smooth'});});
  $('recordSearch').addEventListener('input',renderRecords);
  $('cloudBtn').addEventListener('click',()=>{if(!CLOUD_READY)return;$('cloudError').textContent='';$('cloudDialog').showModal();});$('closeCloud').addEventListener('click',()=>$('cloudDialog').close());$('cloudDialog').addEventListener('close',()=>{$('cloudPassword').value='';});
  $('signOut').addEventListener('click',signOut);$('refreshCloud').addEventListener('click',()=>busy(refreshCloud));
  $('cloudForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!CLOUD_READY)return;$('cloudSubmit').disabled=true;$('cloudError').textContent='Signing in…';
    try{
      const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webKey}`,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value,returnSecureToken:true})});
      const data=await r.json();$('cloudPassword').value='';if(!r.ok)throw Error('Sign-in failed. Check the staff account and confirm Email/Password sign-in is enabled for this Firebase project.');
      cloudSession={token:data.idToken,expires:Date.now()+Number(data.expiresIn)*1000};await refreshCloud();$('cloudDialog').close();message('Firebase shared records connected.');
    }catch(e){signOut();$('cloudError').textContent=e.name==='TimeoutError'?'The sign-in request timed out. Try again.':e.message;}finally{$('cloudSubmit').disabled=false;}
  });
  $('legalForm').addEventListener('submit',e=>e.preventDefault());
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  records=readRecords();renderForm();renderRecords();
  if(!CLOUD_READY){$('cloudBtn').disabled=true;$('cloudBtn').textContent='Firebase setup pending';$('cloudStatus').textContent='Records are saved in this browser. Shared Firebase records will be enabled after the connection and access settings are verified.';}
  // Read-only diagnostics for automated regression checks; no authentication material.
  window.LegalForms={getState:()=>structuredClone(state),validate,normalise};
})();
