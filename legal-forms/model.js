/* Shared document model for the preview, native Word and PDF exports. */
(() => {
  'use strict';
  const blank = '________________________';
  const v = x => String(x ?? '').trim() || blank;
  const date = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x.split('-').reverse().join('/') : v(x);
  const p = (text, kind = 'p') => ({kind, text});
  const h = text => p(text, 'h');
  const table = (headers, rows, widths, signature = false) => ({kind:'table', headers, rows, widths, signature});
  const personName = o => v(o?.name);
  const ownersFor = (s, land) => s.owners.filter(o => land.interests[o.id]?.included);
  function person(o, n) {
    return p(`${n}. Shri/Smt. ${personName(o)}, aged ${v(o.age)} years, son/daughter/spouse of ${v(o.parent)}, occupation ${v(o.occupation)}, PAN ${v(o.pan)}${o.identification ? `; Aadhaar no. ${o.identification}` : ''}, residing at ${v(o.address)}.`);
  }
  function landBlocks(s) {
    const out = [];
    s.parcels.forEach((land,i) => {
      const ref = `A${i+1}`;
      out.push(h(`Parcel ${ref}  ${land.village}  Survey ${v(land.survey)}`));
      out.push(p(`Village: ${land.village}; Taluka: Abdasa; District: Kutch; State: Gujarat.\nSurvey / subdivision: ${v(land.survey)}; Khata / account: ${v(land.khata)}${land.tenure?`; Tenure: ${land.tenure}`:''}.\nTotal survey area as entered: ${v(land.totalArea)}.\nArea covered by this power: ${LegalData.areaText(land)}.\nBoundaries: North ${v(land.north)}; South ${v(land.south)}; East ${v(land.east)}; West ${v(land.west)}.`));
      out.push(table(['Owner full legal name','Capacity','Verified ownership interest or share'], ownersFor(s,land).map(o=>[personName(o), s.kind==='spa'?(o.id===s.attorneyOwnerId?'Attorney as co owner':`Principal ${LegalData.spaPrincipals(s).findIndex(x=>x.id===o.id)+1}`):'Owner',v(land.interests[o.id].share)]),[.39,.22,.39]));
    });
    out.push(p('Only the parcels and interests expressly described in this Schedule are covered. An owner is included for a parcel only where named in its ownership table. No equal ownership share is presumed. A reference to the Scheduled Land includes these parcels collectively, without merging their survey identities.'));
    return out;
  }
  function affidavit(s,c) {
    const f=s.fields,company=LegalData.company;
    const blocks=[p('JOINT AFFIDAVIT OF LEASE RENT PAYMENT CONFIRMATION','title'),p(`Date: ${date(f.date)}     Place: ${v(f.place)}`),p(`To: ${company.lessee}\nPAN: ${company.pan}; CIN: ${company.cin}\nRegistered office: ${company.lesseeAddress}`),p('We, the owners listed below, solemnly affirm that the following are our final and correct instructions for credit of lease rent by the Company for the specified land.')];
    blocks.push(h('1. Owners giving this confirmation'));
    s.owners.forEach((o,i)=>blocks.push(p(`${i+1}. ${personName(o)}${o.parent?`; parent/spouse: ${o.parent}`:''}${o.age?`; age: ${o.age}`:''}${o.pan?`; PAN: ${o.pan}`:''}. Address: ${v(o.address)}.`)));
    blocks.push(h('2. Land covered'),p('Taluka: Abdasa; District: Kutch; State: Gujarat. Owner numbers refer to the list above.'));
    blocks.push(table(['Parcel / village','Survey / khata','Leased area','Owner nos.'],s.parcels.map((land,i)=>[`A${i+1} / ${land.village}`,`${v(land.survey)} / ${v(land.khata)}`,LegalData.areaText(land),ownersFor(s,land).map(o=>String(s.owners.indexOf(o)+1)).join(', ')]),[.22,.18,.43,.17]));
    blocks.push(h('3. Final bank payment instructions'));
    const payments=new Map();
    s.parcels.forEach((land,i)=>ownersFor(s,land).filter(o=>Number(land.interests[o.id].credit)>0).forEach(o=>{
      const percent=String(Number(land.interests[o.id].credit)),key=`${o.id}:${percent}`;
      if(!payments.has(key))payments.set(key,{o,percent,refs:[]});payments.get(key).refs.push(`A${i+1}`);
    }));
    blocks.push(table(['Parcel(s)','Account holder / bank','Account number / IFSC','Net rent %'],[...payments.values()].map(({o,percent,refs})=>[refs.join(', '),`${personName(o)}\n${v(o.bank)}${o.branch?' / '+o.branch:''}`,`${v(o.account)}\nIFSC: ${v(o.ifsc)}`,`${percent}%`]),[.12,.35,.37,.16]));
    blocks.push(h('4. Our confirmation'));
    [
      'All owners of each listed parcel voluntarily approve its payment instructions, including 100% credit to one owner where shown. These instructions cover lease rent payable under the applicable lease, including advance rent and increases, after lawful deductions.',
      'The Company may rely on these instructions. Each amount actually credited as directed, together with tax lawfully deducted and remitted, satisfies the corresponding lease rent payment obligation. We will not demand that same amount again. A failed or uncredited payment is not discharged.',
      'We confirm the account particulars and will settle distribution between ourselves. We accept responsibility for the correctness and authority of our instructions and for proven loss caused to the Company by our false particulars or conflicting claims concerning amounts already paid as directed, subject to applicable law.',
      'These are our final instructions as of this affidavit. They continue until the Company receives replacement written instructions signed by all affected owners, subject to applicable law and binding orders. Earlier payments properly made under these instructions remain confirmed.',
      'This confirmation directs bank payment only. It does not transfer land ownership or beneficial entitlement, change lease rent or other lease terms, or excuse rent that remains unpaid.'
    ].forEach((text,i)=>blocks.push(p(`${i+1}. ${text}`)));
    blocks.push(h('Verification and signatures'),p(`We verify that the particulars and statements above are true to our knowledge and that every affected owner has read and approved these payment instructions. Verified at ${v(f.place)} on ${date(f.date)}.`));
    blocks.push(table(['No.','Owner full name','Signature / thumb impression'],s.owners.map((o,i)=>[String(i+1),personName(o),blank]),[.08,.49,.43],true));
    blocks.push(h('Notarial attestation'),p(`Solemnly affirmed and signed before me by the above deponents, whose identities were verified, at ${blank} on ${blank}.\nNotary name / registration no.: ${blank}\nRegister entry / date: ${blank}     Signature and seal: ${blank}`));
    return blocks;
  }
  function spa(s,c) {
    const f={...s.fields,...LegalData.company},a=LegalData.spaAttorney(s),principals=LegalData.spaPrincipals(s);
    if(!a||!principals.length)throw Error('Select a listed owner / co-owner as attorney, with at least one other owner granting the power.');
    const blocks=[p('SPECIAL POWER OF ATTORNEY','title'),p('Lease, registration and related NA formalities','sub')];
    blocks.push(p(`THIS SPECIAL POWER OF ATTORNEY is executed at ${v(f.place)}, ${v(f.executionState)}, on ${date(f.date)}, by the following adult owners (the Principals) in favour of the owner / co-owner identified below as the Constituted Attorney, concerning the land described in Schedule A.`));
    blocks.push(h('1. The Principals granting the power'));
    principals.forEach((o,i)=>blocks.push(person(o,i+1)));
    blocks.push(h('2. The Constituted Attorney'),person(a,1));
    blocks.push(p('The Attorney is selected from the listed farmers and is an owner / co-owner of the parcel or parcels attributed to the Attorney in Schedule A. The Attorney acts in a personal capacity for the Attorney’s own interest and as representative only for the interests of the Principals granting this power. No person grants a power to himself or herself under this document.'));
    blocks.push(h('3. Company and purpose'),p(`This power is given solely for the proposed lease of the Scheduled Land to ${f.lessee} (the Company), PAN ${f.pan}, CIN ${f.cin}, having its registered office at ${f.lesseeAddress}, and for the non-agricultural (NA), registration and related land-document formalities for the Company’s solar project on that land.`));
    blocks.push(p('Each Principal hereby appoints the Constituted Attorney to act for that Principal only to the extent of that Principal’s lawful interest in the relevant parcel. The lease agreement shall record the dates, rent and other commercial terms approved by the affected Principals.'));
    blocks.push(h('4. Powers granted'));
    [
      'Lease agreement. To finalise, sign and execute the lease agreement with the Company for the Scheduled Land on terms approved by the affected Principals, and to sign its schedules and documents necessary to give effect to that lease. The Attorney shall not act for any additional land or any other company under this power.',
      'Registration. To present the lease and authorised related documents before the competent Registrar / Sub-Registrar, admit their execution in a representative capacity, sign the lawful presentation forms and endorsements, attend the necessary proceedings, pay the applicable statutory fees from funds provided for that purpose, and obtain receipts, registered copies and certified records.',
      'NA formalities. To prepare, sign and submit applications, landowner consents, no-objection certificates, undertakings, declarations and supporting papers lawfully required for non-agricultural use and related revenue formalities for the Company’s solar project on the Scheduled Land; to provide records and replies, attend the competent authorities, and receive notices, permissions, orders and certified copies.',
      'Related documents. To sign and submit other applications, consents, correspondence, statements and ancillary documents reasonably necessary for the above lease, registration and NA purposes concerning the Company and the Scheduled Land. A statement, affidavit or verification may be made by the Attorney only where representation is permitted by law and the facts are within the Attorney’s knowledge or supported by the records. Any statement required personally from an owner remains for that owner to sign.',
      'Completion. To sign a possession memorandum only as expressly provided in the executed lease, and to seek entries recording the registered lease or approved NA use where lawfully required. No such act authorises a transfer of land ownership.'
    ].forEach((text,i)=>blocks.push(p(`4.${i+1} ${text}`)));
    blocks.push(h('5. Limits of authority'));
    [
      'This is a special authority for the stated purposes. It does not authorise sale, gift, exchange, release, partition, mortgage, ownership charge, borrowing, guarantee or security over the land, or any document creating such a transaction. It gives no independent power to renew, extend, surrender or materially amend the lease without separate authority from the affected owners.',
      'This power gives no authority to collect rent, operate a Principal’s bank account or change payees, accounts or rent allocation. The Company shall follow the affected owners’ separate signed payment instructions, including any credit independently authorised to the Attorney as an owner. A payment receipt for a Principal requires that Principal’s written confirmation of the particular payment.',
      'The Attorney shall sign in the Attorney’s own name expressly for the named Principal, and separately in a personal capacity where appropriate. There is no authority to use a Principal’s personal signature or biometric, make false statements, delegate this power, or settle litigation or title disputes.'
    ].forEach((text,i)=>blocks.push(p(`5.${i+1} ${text}`)));
    blocks.push(h('6. Duration and accountability'),p('This power operates from its execution until completion of its authorised purposes or earlier lawful revocation or termination. Revocation shall be notified in writing to the Attorney, the Company and the concerned authorities, subject to applicable law. The Attorney shall keep and provide the Principals with copies of documents signed and submitted. The Principals confirm only lawful acts within the authority expressly granted; this appointment creates no beneficial interest in the land in favour of the Attorney.'));
    blocks.push(h('Schedule A — Land covered by this power'),...landBlocks(s));
    blocks.push(h('7. Execution by the Principals'),p(`The Principals have read and understood this power, or had it explained in ${v(f.language)}, and execute it voluntarily at ${v(f.place)}, ${v(f.executionState)}, on ${date(f.date)}.`));
    blocks.push(table(['No.','Principal full name','Signature / thumb impression'],principals.map((o,i)=>[String(i+1),personName(o),blank]),[.08,.49,.43],true));
    blocks.push(h('8. Acceptance by the Constituted Attorney'),p(`I, ${personName(a)}, accept this appointment subject to its purposes and limits, and shall act in the capacities expressly stated above.\nAttorney signature: ${blank}     Date: ${date(f.date)}`));
    blocks.push(h('9. Witnesses'));
    for(let i=1;i<=2;i++)blocks.push(p(`Witness ${i}: ${v(f['witness'+i])}\nIdentification particulars: ${v(f['witnessId'+i])}\nSignature: ${blank}`));
    blocks.push(h('Authentication / registration by the competent officer'),p(`Office / entry number: ${blank}\nRegistration particulars and date: ${blank}\nOfficer signature and official seal: ${blank}`));
    return blocks;
  }
  window.LegalModel={build:(s,c)=>s.kind==='spa'?spa(s,c):affidavit(s,c),value:v,date,ownersFor};
})();
