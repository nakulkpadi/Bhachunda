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
  const ownersFor = (s, land) => [...s.owners, ...(s.kind === 'spa' && s.attorney.coowner ? [{...s.attorney,id:'attorney'}] : [])].filter(o => land.interests[o.id]?.included);
  function person(o, n) {
    return p(`${n}. Shri/Smt. ${personName(o)}, aged ${v(o.age)} years, son/daughter/spouse of ${v(o.parent)}, occupation ${v(o.occupation)}, PAN ${v(o.pan)}${o.identification ? `; identification ${o.identification}` : ''}, residing at ${v(o.address)}.`);
  }
  function landBlocks(s) {
    const out = [];
    s.parcels.forEach((land,i) => {
      const ref = `A${i+1}`;
      out.push(h(`Parcel ${ref}  ${land.village}  Survey ${v(land.survey)}`));
      out.push(p(`Village: ${land.village}; Taluka: Abdasa; District: Kutch; State: Gujarat.\nSurvey or block number and subdivision: ${v(land.survey)}; Khata or account number: ${v(land.khata)}; Tenure: ${v(land.tenure)}.\nTotal survey area: ${v(land.totalArea)}.\nExact area proposed for lease: ${LegalData.areaText(land)}.`));
      if(s.kind==='spa') out.push(p(`Boundaries of leased area: North ${v(land.north)}; South ${v(land.south)}; East ${v(land.east)}; West ${v(land.west)}.\nVerified plan or annexure reference, where applicable: ${v(land.plan)}.`));
      out.push(table(['Owner full legal name','Capacity','Verified ownership interest or share'], ownersFor(s,land).map(o=>[personName(o), o.id==='attorney'?'Attorney as co owner':s.kind==='spa'?`Principal ${s.owners.indexOf(o)+1}`:'Owner',v(land.interests[o.id].share)]),[.39,.22,.39]));
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
    const f={...s.fields,...LegalData.company}, a=s.attorney;
    const blocks=[p('SPECIAL POWER OF ATTORNEY','title'),p('For one lease deed and specified non agricultural documents','sub')];
    blocks.push(p(`THIS DEED OF SPECIAL POWER OF ATTORNEY is made and executed at ${v(f.place)}, in the State of ${v(f.executionState)}, on ${date(f.date)}, BY the ${s.owners.length} adult person${s.owners.length===1?'':'s'} whose particulars are set out hereunder, each acting in respect of his or her own lawful right, title and interest in the immovable property more particularly described in Schedule A hereto.`));
    blocks.push(h('1  The Principals'));
    s.owners.forEach((o,i)=>{blocks.push(h(`Principal ${i+1}`),person(o,i+1),p(`Relationship to Attorney: ${v(o.relationship)}.`));});
    blocks.push(p('The aforesaid executants are hereinafter collectively referred to as the Principals and individually as a Principal. Their respective interests in each parcel shall be as specified in Schedule A. The inclusion of multiple names in a revenue record shall not, by itself, be construed as an admission that their shares are equal.'));
    blocks.push(h('2  The Constituted Attorney'),person(a,1),p(`Status in relation to the Scheduled Land: ${a.coowner?'co owner in the parcels expressly identified in Schedule A':'not stated to hold any ownership interest by this Deed'}.`));
    blocks.push(p('The person identified above is hereinafter referred to as the Attorney. The appointment is personal to the Attorney, is made without consideration and confers no beneficial interest, proprietary right or entitlement in the Scheduled Land by virtue of this Deed.'));
    blocks.push(h('3  Recitals'),p('WHEREAS the Principals hold their respective interests in the property described in Schedule A, hereinafter referred to as the Scheduled Land, and their names appear in the relevant Village Form 7 or 7/12 and connected revenue records; any interest held by the Attorney is separately identified in that Schedule. This recital shall neither determine a disputed title or share nor dispense with the joinder of any other person whose consent or execution is required by law;'));
    blocks.push(p(`AND WHEREAS the Principals are unable conveniently to attend in Gujarat for the execution and registration of the proposed lease and for signing the specified documents concerning non agricultural use of the Scheduled Land for the approved solar project;`));
    blocks.push(p('AND WHEREAS the Principals have determined to confer a special and strictly limited authority upon the Attorney for those purposes alone; NOW THIS DEED WITNESSES that, upon completion of Schedules A, B and C and attachment of the exact documents approved and initialled by every affected Principal, the Principals hereby constitute and appoint the Attorney to exercise only the following powers. An unsigned reference draft shall not constitute such approval.'));
    blocks.push(h('4  Powers concerning the Lease Deed'));
    c.spa.leasePowers.forEach(text=>blocks.push(p(text.replace('the office of the Sub Registrar at Naliya, District Kutch, Gujarat',`the office of the Sub Registrar at ${v(f.subRegistrar)}, District Kutch, Gujarat`))));
    blocks.push(h('5  Powers concerning non agricultural documents'));
    c.spa.naPowers.forEach(text=>blocks.push(p(text)));
    blocks.push(h('6  Express limitations'));
    c.spa.limits.forEach(text=>blocks.push(p(text)));
    blocks.push(h('7  Duration revocation and conditions'));
    c.spa.duration.forEach(text=>blocks.push(p(text)));
    blocks.push(h('Schedule A  Description of the Scheduled Land'),...landBlocks(s));
    blocks.push(p('Where the lease concerns part of a survey number, the verified plan identifying the leased area and access shall be annexed using the reference shown against that parcel. Every continuation sheet shall identify this Deed and be initialled by every affected Principal.'));
    blocks.push(h('Schedule B  Particulars of the approved Lease Deed'),p('This Schedule shall be completed before execution. The Lease Deed shall conform in every respect to clause 6. Correspondence merely in respect of the term or rent shall not amount to approval of any other provision.'));
    blocks.push(p(`Exact legal name of lessee: ${v(f.lessee)}.\nLessee PAN: ${v(f.pan)}.\nLessee CIN and registered office: ${v(f.cin)}; ${v(f.lesseeAddress)}.\nLease Deed date or proposed date: ${date(f.leaseDate)}.\nProject and permitted use: Solar power project named ${v(f.project)}.\nLease term: 29 years and 11 months only; no authority for renewal or extension.\nCommencement and expiry dates: ${date(f.leaseStart)} to ${date(f.leaseEnd)}.\nInitial annual rent per acre: Rs ${v(f.rate)}; in words ${v(f.rateWords)}.\nTotal initial annual rent: Rs ${v(f.totalRent)}.\nEscalation and intervals: ${v(f.escalation)}.\nAdvance rent and adjustment period: ${v(f.advance)}.\nDeposit if any and approved treatment: ${v(f.deposit)}.\nRent due dates and method: ${v(f.paymentMethod)}.\nTax allocation and TDS treatment: ${v(f.tax)}.\nParty paying stamp duty and registration fees: ${v(f.stampParty)}.\nParty paying NA charges and any lawful premium: ${v(f.naCharges)}.\nConditions before possession: ${v(f.possession)}.\nCompetent Sub Registrar confirmed for the land: ${v(f.subRegistrar)}.`));
    blocks.push(h('Documents incorporated in Schedule B'),p('Annexure B1 shall comprise the exact final Lease Deed together with all schedules, plans and any possession memorandum. Every page thereof shall be initialled by all affected Principals before execution of this Deed. An unapproved reference draft shall not suffice.'),p(`Annexure B1 date and version: ${v(f.b1Version)}.\nAnnexure B1 total pages including attachments: ${v(f.b1Pages)}.`));
    blocks.push(p('Annexure B2 shall contain the owners’ personally signed payment directions identifying each entitled payee, entitlement and bank account. It must require direct payment to those accounts. The Attorney cannot sign a pooled rent receiving mandate for any Principal or change those directions.'),p(`Annexure B2 date and total pages: ${v(f.b2Reference)}.`));
    blocks.push(p('The Attorney shall not execute any Lease Deed conferring an excluded authority, requiring a further power of attorney, creating an ownership charge, or binding the Principals to renewal, additional financing consents or any further excluded instrument. Every inconsistent provision shall be resolved in the Lease Deed before approval by the Principals.'));
    blocks.push(h('Approval of Schedule B and the identified Annexures'));
    s.owners.forEach((o,i)=>blocks.push(p(`Principal ${i+1} ${personName(o)}; signature ${blank}; approval date ${blank}.`)));
    blocks.push(h('Schedule C  Approved non agricultural documents'));
    blocks.push(p('The authority under clause 5 extends only to the following documents and their final texts separately annexed, approved and initialled by every affected Principal. A revised form or additional document requires separate lawful authorisation. This Schedule confers no general authority for project approvals or any separate tenancy or tenure conversion proceeding.'));
    blocks.push(p(`NA file or project reference if allotted: ${v(f.naReference)}.\nCompetent revenue authority and office: ${v(f.naOffice)}.\nApplicable NA route confirmed by local counsel: ${v(f.naRoute)}.`));
    blocks.push(p(`Approved documents and annexure references:\n${v(f.naDocuments)}`));
    blocks.push(p('The authorised use is confined to the solar project specified in Schedule B and the exact parcels and areas described in Schedule A. Each approved annexed document shall identify the relevant parcel and disclose the Attorney’s limited representative capacity. No such document shall contain an excluded transaction, conveyance of ownership, general delegation, financial security or unrestricted indemnity. Any statement requiring the owner personally shall be reserved for execution by that owner.'));
    blocks.push(p('No statutory condition or liability imposed by law is excluded by this Deed. If a form requires a fresh commercial undertaking, surrender, charge, premium agreement or other act beyond the authority herein granted, the Attorney shall refer it to the Principals for separate lawful authorisation.'));
    blocks.push(p('We have read and approved the completed particulars and initialled every page of the attached final texts. Our approval does not override clause 6.'));
    s.owners.forEach((o,i)=>blocks.push(p(`Principal ${i+1} ${personName(o)}; signature ${blank}; approval date ${blank}.`)));
    blocks.push(h('8  Execution of this Deed'),p(`IN WITNESS WHEREOF the Principals have executed this Deed voluntarily at ${v(f.place)}, ${v(f.executionState)}, on ${date(f.date)}, after reading its contents and the approved annexures or having the same read over and explained in ${v(f.language)}, a language understood by them. The completed Schedules and annexed documents have been approved and initialled, all corrections authenticated, and all material blanks completed before execution.`));
    s.owners.forEach((o,i)=>blocks.push(p(`Principal ${i+1} full name ${personName(o)}.\nSignature or thumb impression ${blank}; Date ${blank}.`)));
    blocks.push(h('9  Acceptance by the Attorney'),p('I accept the appointment subject to all its limits. I shall sign in my own name expressly as Attorney for each named Principal and separately, if applicable, in my own capacity as co owner. I shall not delegate, exceed the authority or use a Principal’s personal signature or biometric.'),p(`Attorney full name: ${personName(a)}.\nSignature ${blank}; Place ${v(f.place)}; Date ${date(f.date)}.`));
    blocks.push(h('10  Attesting witnesses'),p('The Principals signed or affixed their thumb impressions in our presence. We attest their execution and shall provide identification as required by the registering officer.'));
    for(let i=1;i<=2;i++) blocks.push(h(`Witness ${i}`),p(`Full name and address: ${v(f['witness'+i])}.\nIdentification particulars: ${v(f['witnessId'+i])}.\nSignature ${blank}; Date ${blank}.`));
    blocks.push(h('Authentication and registration by the competent officer'),p('The competent Registrar or Sub Registrar shall affix the prescribed execution authentication under section 33 of the Registration Act, 1908 and the applicable registration endorsements. This space does not replace the officer’s prescribed certificate.'),p(`Office and authentication entry number: ${blank}.\nRegistration number book and date: ${blank}.\nOfficer signature and official seal: ${blank}.`));
    return blocks;
  }
  window.LegalModel={build:(s,c)=>s.kind==='spa'?spa(s,c):affidavit(s,c),value:v,date,ownersFor};
})();
