/* Native OOXML and text-based PDF exports. No HTML disguised as a .doc file. */
(() => {
  'use strict';
  const esc=x=>String(x??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
  const ascii=x=>String(x??'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—‑]/g,'-').replace(/₹/g,'Rs ').replace(/\u00a0/g,' ').replace(/\t/g,'  ');
  const save=(data,type,name)=>{const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  function render(blocks,host){
    host.replaceChildren();
    blocks.forEach(b=>{
      if(b.kind==='table'){
        const t=document.createElement('table'),cols=document.createElement('colgroup');
        b.widths.forEach(w=>{const col=document.createElement('col');col.style.width=`${w*100}%`;cols.append(col);});
        const head=document.createElement('thead'),hr=document.createElement('tr');
        b.headers.forEach(s=>{const th=document.createElement('th');th.scope='col';th.textContent=s;hr.append(th);});head.append(hr);
        const body=document.createElement('tbody');
        b.rows.forEach(row=>{const tr=document.createElement('tr');if(b.signature)tr.className='signature';row.forEach(s=>{const td=document.createElement('td');td.textContent=s;tr.append(td);});body.append(tr);});
        t.append(cols,head,body);host.append(t);
      }else{const el=document.createElement(b.kind==='title'?'h1':b.kind==='h'?'h2':'p');if(b.kind==='sub')el.className='sub';el.textContent=b.text;host.append(el);}
    });
  }
  function runXml(text,bold=false,size=23){return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:color w:val="000000"/><w:sz w:val="${size}"/>${bold?'<w:b/>':''}</w:rPr>${String(text).split('\n').map((s,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${esc(s)}</w:t>`).join('')}</w:r>`;}
  function paragraph(text,kind='p',keep=false){
    const heading=kind==='h',title=kind==='title',sub=kind==='sub';
    return `<w:p><w:pPr>${title?'<w:pStyle w:val="Title"/>':heading?'<w:pStyle w:val="Heading1"/>':''}<w:jc w:val="${title||sub?'center':heading||text.includes('\n')||text.includes('________')?'left':'both'}"/><w:spacing w:before="${heading?220:0}" w:after="${title?200:140}" w:line="280" w:lineRule="auto"/>${heading||title||sub||keep?'<w:keepNext/>':''}<w:widowControl/></w:pPr>${runXml(text,heading||title,title?30:heading?25:23)}</w:p>`;
  }
  function tableXml(b){
    const width=9792, widths=b.widths.map(w=>Math.round(w*width));
    const rowXml=(row,header,index)=>`<w:tr><w:trPr>${header?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>${row.map((s,i)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/><w:vAlign w:val="center"/>${header?'<w:shd w:fill="EEEEEE"/>':''}</w:tcPr><w:p><w:pPr>${b.rows.length<=6&&(header||index<b.rows.length-1)?'<w:keepNext/>':''}<w:spacing w:after="${b.signature?360:0}" w:line="250" w:lineRule="auto"/></w:pPr>${runXml(s,header,20)}</w:p></w:tc>`).join('')}</w:tr>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(x=>`<w:${x} w:val="single" w:sz="4" w:color="777777"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rowXml(b.headers,true)}${b.rows.map((r,i)=>rowXml(r,false,i)).join('')}</w:tbl><w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>`;
  }
  async function word(blocks){
    if(!window.JSZip)throw Error('The Word export library could not load. Reload this page and try again.');
    const zip=new JSZip();
    zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
    zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');
    zip.file('word/styles.xml','<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:color w:val="000000"/><w:sz w:val="23"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="25"/></w:rPr></w:style></w:styles>');
    zip.file('word/footer1.xml','<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Page </w:t></w:r><w:fldSimple w:instr="PAGE"/><w:r><w:t xml:space="preserve"> of </w:t></w:r><w:fldSimple w:instr="NUMPAGES"/></w:p></w:ftr>');
    zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${blocks.map((b,i)=>b.kind==='table'?tableXml(b):paragraph(b.text,b.kind,blocks[i+1]?.kind==='table'&&blocks[i+1].rows.length<=6)).join('')}<w:sectPr><w:footerReference w:type="default" r:id="rFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1008" w:right="1152" w:bottom="1008" w:left="1296" w:header="400" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`);
    return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  }
  async function pdf(blocks){
    if(!window.PDFLib)throw Error('The PDF export library could not load. Reload this page and try again.');
    const {PDFDocument,StandardFonts,rgb}=PDFLib;
    const doc=await PDFDocument.create(),normal=await doc.embedFont(StandardFonts.TimesRoman),bold=await doc.embedFont(StandardFonts.TimesRomanBold);
    let page,y; const left=64.8,right=57.6,top=50.4,bottom=50.4,w=612-left-right;
    const glyphWidths=new Map();
    function textWidth(text,font,size){let width=0;for(const char of text){const key=font.name+':'+size+':'+char;if(!glyphWidths.has(key))glyphWidths.set(key,font.widthOfTextAtSize(char,size));width+=glyphWidths.get(key);}return width;}
    function newPage(){page=doc.addPage([612,792]);y=792-top;}
    function need(height){if(y-height<bottom)newPage();}
    function lines(text,font,size,width){
      const output=[];
      for(const para of ascii(text).split('\n')){
        let line='';
        for(const word of para.split(/\s+/)){
          if(!word)continue;
          const trial=line?`${line} ${word}`:word;
          if(textWidth(trial,font,size)<=width){line=trial;continue;}
          if(line){output.push(line);line='';}
          if(textWidth(word,font,size)<=width){line=word;continue;}
          for(const char of word){if(textWidth(line+char,font,size)>width){output.push(line);line='';}line+=char;}
        }
        output.push(line);
      }
      return output;
    }
    function textLine(text,x,size,font){page.drawText(text,{x,y:y-size,size,font,color:rgb(0,0,0)});}
    function para(b){
      const title=b.kind==='title',heading=b.kind==='h',sub=b.kind==='sub',size=title?15:heading?12.5:11.5,font=title||heading?bold:normal,lh=size*1.3;
      const ls=lines(b.text,font,size,w);
      if(heading){need(Math.min(ls.length*lh+40,150));y-=10;}
      if(title||sub)need(ls.length*lh+30);
      ls.forEach((line,i)=>{need(lh+(i===ls.length-2?lh:0));textLine(line,title||sub?left+(w-textWidth(line,font,size))/2:left,size,font);y-=lh;});
      y-=8;
    }
    function drawTable(b){
      const size=10,lh=12.5,pad=5,widths=b.widths.map(t=>t*w);
      const headerLines=b.headers.map((s,i)=>lines(s,bold,size,widths[i]-pad*2));
      const headerHeight=Math.max(...headerLines.map(a=>a.length))*lh+2*pad;
      function row(ls,isHead,start=0,count=Infinity,minHeight=0){
        const max=Math.max(...ls.map(a=>Math.min(count,Math.max(0,a.length-start))));
        const height=Math.max(max*lh+pad*2,minHeight);let x=left;
        ls.forEach((col,i)=>{
          page.drawRectangle({x,y:y-height,width:widths[i],height,borderColor:rgb(.45,.45,.45),borderWidth:.5,...(isHead?{color:rgb(.93,.93,.93)}:{})});
          const base=y-pad;col.slice(start,start+count).forEach((line,j)=>page.drawText(line,{x:x+pad,y:base-size-j*lh,font:isHead?bold:normal,size,color:rgb(0,0,0)}));x+=widths[i];
        });y-=height;
      }
      need(headerHeight+42);row(headerLines,true);
      for(const values of b.rows){
        const ls=values.map((s,i)=>lines(s,normal,size,widths[i]-pad*2));let start=0;const max=Math.max(...ls.map(a=>a.length));
        const fullHeight=Math.max(max*lh+pad*2,b.signature?54:0);
        if(fullHeight<=792-top-bottom-headerHeight&&y-fullHeight<bottom){newPage();row(headerLines,true);}
        while(start<max){
          let count=Math.min(max-start,Math.floor((y-bottom-pad*2)/lh));
          if(count<1){newPage();row(headerLines,true);continue;}
          row(ls,false,start,count,b.signature?Math.min(54,y-bottom):0);start+=count;
          if(start<max){newPage();row(headerLines,true);}
        }
      }y-=10;
    }
    newPage();
    try{for(const b of blocks)b.kind==='table'?drawTable(b):para(b);}catch(error){if(/encode|WinAnsi/.test(error.message))throw Error('PDF export needs English text. Replace unsupported characters, or download the editable Word file.');throw error;}
    const pages=doc.getPages();pages.forEach((pg,i)=>{const text=`Page ${i+1} of ${pages.length}`;pg.drawText(text,{x:(612-normal.widthOfTextAtSize(text,9))/2,y:24,size:9,font:normal});});
    doc.setTitle(blocks[0].text);doc.setCreator('Bhachunda Land Document Generator');
    return doc.save();
  }
  window.LegalExport={render,word,pdf,save};
})();
