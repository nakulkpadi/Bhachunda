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
      out.push(p(`Village: ${land.village}; Taluka: Abdasa; District: Kutch; State: Gujarat.\nSurvey or block number and subdivision: ${v(land.survey)}; Khata or account number: ${v(land.khata)}; Tenure: ${v(land.tenure)}.\nTotal survey area: ${v(land.totalArea)}.\nExact area proposed for lease: ${v(land.leasedArea)}.`));
      if(s.kind==='spa') out.push(p(`Boundaries of leased area: North ${v(land.north)}; South ${v(land.south)}; East ${v(land.east)}; West ${v(land.west)}.\nVerified plan or annexure reference, where applicable: ${v(land.plan)}.`));
      out.push(table(['Owner full legal name','Capacity','Verified ownership interest or share'], ownersFor(s,land).map(o=>[personName(o), o.id==='attorney'?'Attorney as co owner':s.kind==='spa'?`Principal ${s.owners.indexOf(o)+1}`:'Owner',v(land.interests[o.id].share)]),[.39,.22,.39]));
    });
    out.push(p('Only the parcels and interests expressly described in this Schedule are covered. An owner is included for a parcel only where named in its ownership table. No equal ownership share is presumed. A reference to the Scheduled Land includes these parcels collectively, without merging their survey identities.'));
    return out;
  }
  function affidavit(s,c) {
    const f=s.fields;
    const blocks=[p('JOINT AFFIDAVIT OF RENT ALLOCATION AND BANK PAYMENT CONSENT','title'),p('We, the following adult deponents, do hereby solemnly affirm and declare as follows:')];
    s.owners.forEach((o,i)=>blocks.push(person(o,i+1)));
    blocks.push(p('The above persons are hereinafter referred to collectively as the Owners and individually as an Owner. This affidavit concerns only rent under the lease identified below and the manner in which that rent is to be paid. Each Owner gives directions only for the parcels and interests attributed to that Owner in Schedule A.'));
    blocks.push(h('Schedule A  Land lease and effective period'),...landBlocks(s));
    blocks.push(p(`Lessee full legal name: ${v(f.lessee)}.\nLessee CIN if applicable: ${v(f.cin)}.\nLease Deed date or proposed date: ${date(f.leaseDate)}.\nRegistration number and Sub Registrar if registered: ${v(f.registration)}.\nLease rent clause and initial annual rent: Clause ${v(f.rentClause)}; Rs ${v(f.totalRent)}.\nDirections effective from and until: ${date(f.effectiveFrom)} to ${date(f.effectiveUntil)}.\nInstrument giving effect to any changed rent entitlement: ${v(f.operativeInstrument)}.\nDocument date ${date(f.instrumentDate)}; Clause ${v(f.instrumentClause)}; Annexure ${v(f.instrumentAnnexure)}.`));
    blocks.push(h('Declaration on oath'));
    c.affidavit.declarations.forEach((text,i)=>{
      if(i===0) text=text.replace('from four recorded names','from the number of recorded names');
      if(i===1) text=text.replace('all four Owners','all Owners named for the affected parcel');
      if(i===5) text=text.replace('______________________________',v(f.arrears));
      blocks.push(p(text));
    });
    blocks.push(h('Schedule B  Agreed entitlement to rent'),p(c.affidavit.modeA),p(c.affidavit.modeB));
    s.parcels.forEach((land,i)=>{
      blocks.push(h(`Parcel A${i+1}  ${land.village}  Survey ${v(land.survey)}  Mode ${land.mode}`));
      blocks.push(table(['No','Owner full legal name','Ownership share as per title','Agreed rent entitlement %','Owner initials'],ownersFor(s,land).map((o,j)=>[String(j+1),personName(o),v(land.interests[o.id].share),`${v(land.interests[o.id].rent)}%`,'____________']),[.06,.29,.25,.22,.18]));
    });
    blocks.push(p('For every parcel, the total agreed rent entitlement is 100%. Every Owner must personally approve the completed entries applicable to that Owner. A different allocation for a different parcel is effective only for that parcel. Under Mode B, an allocation differing from existing legal entitlement is subject to clause 10 and the operative instrument identified in Schedule A.'));
    blocks.push(h('Schedule C  Bank payment directions'),p('For each parcel, the following percentages apply to net rent after lawful deductions. An account holder must be an Owner of that parcel. A 100% credit to one account is a collection direction and does not by itself alter Schedule B. Account particulars must match the supporting bank proof.'));
    s.parcels.forEach((land,i)=>{
      blocks.push(h(`Parcel A${i+1}  ${land.village}  Survey ${v(land.survey)}`));
      blocks.push(table(['No','Account holder bank and branch','Account number and IFSC','Net rent credit %'],ownersFor(s,land).filter(o=>Number(land.interests[o.id].credit)>0).map((o,j)=>[String(j+1),`${personName(o)}\nBank ${v(o.bank)}\nBranch ${v(o.branch)}`,`Account No ${v(o.account)}\nIFSC ${v(o.ifsc)}`,`${v(land.interests[o.id].credit)}%`]),[.06,.36,.39,.19]));
    });
    blocks.push(p(`Total bank credit percentages equal 100% for each parcel.\nBank proof annexure references: ${v(f.bankProof)}.\nWe approve the selected modes, both completed Schedules and the supporting account particulars.`));
    blocks.push(h('Verification and signatures of the deponents'),p(c.affidavit.verification),p('Verified by each deponent at the place and on the date recorded against that deponent’s signature below.'));
    blocks.push(table(['No','Full legal name','Signature or thumb impression','Date and place of affirmation'],s.owners.map((o,i)=>[String(i+1),personName(o),blank,`${date(o.affirmDate || f.date)}\n${v(o.affirmPlace || f.place)}`]),[.06,.3,.34,.3],true));
    blocks.push(h('Notarial attestation'),p(`Solemnly affirmed and signed before me at ${blank}, State ${blank}, on this ${blank}, by the deponent or deponents bearing serial number(s) ${blank} above, namely ${blank}, whose identity I verified from ${blank} and who signed or affixed the thumb impression in my presence.\nIdentified by if required: ${blank}.\nNotarial register entry number and date: ${blank}.\nNotary name and registration particulars: ${blank}.\nSignature and official seal of the Notary: ${blank}.`));
    blocks.push(p('The notarial endorsement shall identify only the deponents who actually appeared before that Notary. Where deponents affirm at different places or on different dates, additional notarial endorsement sheets shall identify the relevant deponent and this identical completed affidavit and its Schedules.'));
    blocks.push(h('Acknowledgment by the Lessee'),p(c.affidavit.acknowledgment),p(`Lessee legal name: ${v(f.lessee)}.\nAuthorised signatory and designation: ${v(f.signatory)}.\nSignature and seal ${blank}; Date ${blank}.`));
    return blocks;
  }
  function spa(s,c) {
    const f=s.fields, a=s.attorney;
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
    blocks.push(p(`Exact legal name of lessee: ${v(f.lessee)}.\nLessee CIN and registered office: ${v(f.cin)}; ${v(f.lesseeAddress)}.\nLease Deed date or proposed date: ${date(f.leaseDate)}.\nProject and permitted use: Solar power project named ${v(f.project)}.\nLease term: 29 years and 11 months only; no authority for renewal or extension.\nCommencement and expiry dates: ${date(f.leaseStart)} to ${date(f.leaseEnd)}.\nInitial annual rent per acre: Rs ${v(f.rate)}; in words ${v(f.rateWords)}.\nTotal initial annual rent: Rs ${v(f.totalRent)}.\nEscalation and intervals: ${v(f.escalation)}.\nAdvance rent and adjustment period: ${v(f.advance)}.\nDeposit if any and approved treatment: ${v(f.deposit)}.\nRent due dates and method: ${v(f.paymentMethod)}.\nTax allocation and TDS treatment: ${v(f.tax)}.\nParty paying stamp duty and registration fees: ${v(f.stampParty)}.\nParty paying NA charges and any lawful premium: ${v(f.naCharges)}.\nConditions before possession: ${v(f.possession)}.\nCompetent Sub Registrar confirmed for the land: ${v(f.subRegistrar)}.`));
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
