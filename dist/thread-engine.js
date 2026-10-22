/* Seeded cotton-fiber renderer. Geometry, shading and loose-thread motion share
   the same strand model, so tightening changes the thread instead of revealing a mask. */
window.ThreadStudy = (() => {
  const TAU = Math.PI * 2;
  let cottonSource=null,sourceCore=1;
  const dyed=new Map();
  const imageReady=new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>{
      const scan=document.createElement('canvas');scan.width=image.naturalWidth;scan.height=image.naturalHeight;
      const cx=scan.getContext('2d');cx.drawImage(image,0,0);
      const pixels=cx.getImageData(0,0,scan.width,scan.height),rows=new Float64Array(scan.height);
      let top=scan.height,bottom=0,left=scan.width,right=0;
      for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){
        const a=pixels.data[(y*scan.width+x)*4+3];
        if(a>8){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
        if(x>scan.width*.2&&x<scan.width*.8)rows[y]+=a;
      }
      if(bottom<=top){resolve(false);return;}
      const total=rows.reduce((a,b)=>a+b,0);let sum=0,coreTop=top,coreBottom=bottom;
      for(let y=top;y<=bottom;y++){sum+=rows[y];if(sum<total*.07)coreTop=y;if(sum<total*.93)coreBottom=y;}
      cottonSource=document.createElement('canvas');cottonSource.width=right-left+1;cottonSource.height=bottom-top+1;
      cottonSource.getContext('2d').drawImage(image,left,top,cottonSource.width,cottonSource.height,0,0,cottonSource.width,cottonSource.height);
      sourceCore=Math.max(1,coreBottom-coreTop);resolve(true);
    };
    image.onerror=()=>resolve(false);image.src='assets/cotton-floss.png';
  });
  function dyedCotton(hex){
    if(dyed.has(hex))return dyed.get(hex);
    const c=document.createElement('canvas');c.width=cottonSource.width;c.height=cottonSource.height;
    const cx=c.getContext('2d');cx.drawImage(cottonSource,0,0);
    const pixels=cx.getImageData(0,0,c.width,c.height),n=parseInt(hex.slice(1),16),rgb=[n>>16,(n>>8)&255,n&255];
    for(let i=0;i<pixels.data.length;i+=4){let light=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/207;for(let j=0;j<3;j++)pixels.data[i+j]=Math.min(255,rgb[j]*light);}
    cx.putImageData(pixels,0,0);if(dyed.size>=96)dyed.delete(dyed.keys().next().value);dyed.set(hex,c);return c;
  }
  function photograph(ctx,points,hex,width,seed){
    const texture=dyedCotton(hex),lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    const length=lengths.at(-1),span=Math.min(texture.width*.85,length*sourceCore/width),offset=(seed%91)/91*(texture.width-span),height=width*texture.height/sourceCore;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],segment=lengths[i]-lengths[i-1];if(segment<.03)continue;
      ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));
      const sx=offset+lengths[i-1]/length*span,sw=Math.max(.05,segment/length*span);
      const t=(lengths[i-1]+segment*.5)/length,taper=a.taper!==undefined?(a.taper+b.taper)*.5:endTaper(t),depth=((a.depth||0)+(b.depth||0))*.5,h=height*taper*(1+depth*.55);
      ctx.drawImage(texture,sx,0,sw,texture.height,-.3,-h/2,segment+.65,h);ctx.restore();
    }
  }

  const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
  const endTaper=t=>.04+.96*smooth(Math.min(t,1-t)/.25);
  function rng(seed){ let x=seed|0; return ()=>{x=(Math.imul(1664525,x)+1013904223)|0;return (x>>>0)/4294967296;}; }
  function color(hex, delta=0, alpha=1){
    const n=parseInt(hex.slice(1),16);
    return `rgba(${[n>>16,(n>>8)&255,n&255].map(v=>clamp(Math.round(v+delta),0,255)).join(',')},${alpha})`;
  }
  function stroke(ctx,points,width,paint){
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=paint;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function taperedStroke(ctx,points,width,paint){
    for(let i=1;i<points.length;i++){const t=(i-.5)/(points.length-1);stroke(ctx,[points[i-1],points[i]],width*(points[i].taper!==undefined?(points[i-1].taper+points[i].taper)*.5:endTaper(t)),paint);}
  }
  function cubic(a,c,d,b,n=42){
    const p=[];
    for(let i=0;i<=n;i++){let t=i/n,u=1-t;p.push({x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y});}
    return p;
  }
  function hole(ctx,p,size=1){
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(size,size);
    let g=ctx.createRadialGradient(0,0,.2,0,0,3.6);g.addColorStop(0,'#352b2333');g.addColorStop(.4,'#5f504417');g.addColorStop(1,'#5f504400');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,4,2.4,-.3,0,TAU);ctx.fill();
    stroke(ctx,[{x:-2,y:1.4},{x:1,y:1.8}],.65,'#ffffe77a');ctx.restore();
  }
  function cotton(ctx,points,hex,width,seed,lift=1,fuzz=1,slack=0){
    const random=rng(seed), phase=random()*TAU;
    const dye=Math.round((random()-.5)*4)*4, raw=parseInt(hex.slice(1),16);
    hex='#'+[raw>>16,(raw>>8)&255,raw&255].map(v=>clamp(Math.round(v+dye),0,255).toString(16).padStart(2,'0')).join('');
    const normals=points.map((p,i)=>{let a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:-(b.y-a.y)/d,y:(b.x-a.x)/d};});
    // Blur the cast silhouette itself, so no crisp duplicate strand remains.
    ctx.save();ctx.translate(.25+slack*.9,.4+lift*.3+slack*2.2);
    ctx.filter=`blur(${1.8+lift*.3+slack*1.6}px)`;
    stroke(ctx,points,width*.6,'#62574412');ctx.restore();
    if(cottonSource)photograph(ctx,points,hex,width,seed);
    if(!cottonSource){
    taperedStroke(ctx,points,width*.83,color(hex,-26));
    const strands=11;
    for(let k=0;k<strands;k++){
      let offset=(k/(strands-1)-.5)*width*.87;
      const jitter=random()*TAU, tone=(random()-.5)*22;
      const fiber=points.map((p,i)=>{
        let t=i/(points.length-1), taper=endTaper(t);
        // Twisting plies cross each other, rather than identical parallel outlines.
        let twist=Math.sin(t*TAU*(2.2+seed%3*.3)+phase+k*.67)*width*.12;
        let wander=Math.sin(t*35+jitter)*.19+Math.sin(t*77+k)*.09;
        let o=(offset+twist+wander)*taper;
        return {x:p.x+normals[i].x*o,y:p.y+normals[i].y*o};
      });
      stroke(ctx,fiber,width/(strands*.78)*(1+random()*.38),color(hex,tone+(k<4?20:-4)));
      // Broken glints along one ply: diffuse cotton, not shiny molded plastic.
      if(k%3===0){let start=Math.floor(random()*14),end=Math.min(fiber.length,start+16+Math.floor(random()*10));stroke(ctx,fiber.slice(start,end),.21,color(hex,54,.48));}
    }
    }
    // Fine cotton fuzz: short, unhooked wisps with transparent tips.
    // Seeded placement keeps the fibers steady through the animation.
    const hairs=Math.round(48*fuzz);
    for(let k=0;k<hairs;k++){
      const i=1+Math.floor(random()*(points.length-3)),p=points[i],n=normals[i];
      const taper=endTaper(i/(points.length-1));
      const side=random()>.5?1:-1,o=side*width*(.34+random()*.13)*taper;
      const length=(1.2+random()*3.8)/3*fuzz*taper;
      const lean=(random()-.5)*length*.6;
      const a={x:p.x+n.x*o,y:p.y+n.y*o};
      const b={x:a.x+n.x*side*length-n.y*lean,y:a.y+n.y*side*length+n.x*lean};
      const bend=(random()-.5)*length*.12,tone=12+random()*22;
      const fade=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
      fade.addColorStop(0,color(hex,tone,.15));
      fade.addColorStop(.6,color(hex,tone,.07));
      fade.addColorStop(1,color(hex,tone,0));
      ctx.beginPath();ctx.moveTo(a.x,a.y);
      ctx.quadraticCurveTo(mix(a.x,b.x,.5)-n.y*bend,mix(a.y,b.y,.5)+n.x*bend,b.x,b.y);
      ctx.lineWidth=.075+random()*.075;ctx.strokeStyle=fade;ctx.stroke();
    }
  }
  function leafStitches(index=0){
    const r=rng(1903+index*873), stitches=[];
    for(let row=0;row<23;row++){
      const t=(row+.8)/24,y=-22-t*135,half=Math.sin(Math.PI*t)**.8*(34+index%3*2);
      for(let side of (row%2?[1,-1]:[-1,1])){
        let a={x:(r()-.5)*2+side*.7,y:y+13+r()*3};
        let b={x:side*(half+(r()-.5)*3),y:y-6+(r()-.5)*3};
        let c={x:side*half*.22+(r()-.5)*4,y:a.y-3};
        let d={x:side*half*.77,y:b.y+3+r()*4};
        stitches.push({a,b,c,d,width:8+r()*1.6,seed:1103+row*49+index*1300+(side+1)*117,tone:(r()-.5)*17});
      }
    }
    return stitches;
  }
  function motifStitches(shape='petal'){
    if(shape==='leaf')return leafStitches(2);
    const r=rng(671),list=[];
    const add=(a,b,width)=>list.push({a,b,c:{x:mix(a.x,b.x,.33)+(r()-.5)*2,y:mix(a.y,b.y,.33)-1.7},d:{x:mix(a.x,b.x,.72),y:mix(a.y,b.y,.72)-1},width:width+r()*.7,seed:831+list.length*73});
    if(['spiral','rosette','orbit'].includes(shape)){
      const arms=shape==='spiral'?7:shape==='rosette'?8:10,steps=shape==='spiral'?5:4;
      for(let ring=0;ring<steps;ring++)for(let arm=0;arm<arms;arm++){
        const bend=shape==='orbit'?1.65:shape==='rosette'?.62:.95;
        const base=arm*TAU/arms-Math.PI/2;
        const at=t=>{const radius=6+t*54,angle=base+t*bend;return {x:Math.cos(angle)*radius,y:-88+Math.sin(angle)*radius};};
        const t0=(ring+.07)/steps,t1=(ring+.88)/steps;
        add(at(t0),at(t1),shape==='rosette'?5.7:shape==='orbit'?3.8:4.6);
        const s=list.at(-1);
        s.c=at(mix(t0,t1,.33));s.d=at(mix(t0,t1,.72));
        // Each arm has several individual stitches. Starts rotate clockwise
        // within each ring, then advance outward to the next ring.
        s.start=ring*.28+arm*.038;
      }
      list.sort((a,b)=>a.start-b.start);
    }else if(['sunburst','bloom','fan'].includes(shape)){
      const count=shape==='bloom'?18:shape==='fan'?9:12;
      for(let i=0;i<count;i++){
        let angle,length,width;
        if(shape==='fan'){angle=(-150+i*15)*Math.PI/180;length=53+(r()-.5)*4;width=5.8;}
        else if(shape==='bloom'){angle=Math.floor(i/3)*TAU/6-Math.PI/2+(i%3-1)*.105;length=i%3===1?53:45;width=5.1;}
        else{angle=i*TAU/12-Math.PI/2;length=i%2?38:54;width=5.2;}
        add({x:0,y:-88},{x:Math.cos(angle)*length,y:-88+Math.sin(angle)*length},width);
      }
    }else if(shape==='spark'){
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4+.12,radius=i%2?33:46;
        add({x:Math.cos(angle)*8,y:-88+Math.sin(angle)*8},{x:Math.cos(angle)*radius,y:-88+Math.sin(angle)*radius},7);
      }
    }else{
      const rows=shape==='seed'?8:12,height=shape==='seed'?48:86;
      for(let i=0;i<rows;i++){
        const t=(i+.6)/(rows+.2),half=Math.sin(Math.PI*t)**.65*(shape==='seed'?21:27),y=-88+height/2-t*height;
        // Simple satin stitches span the motif, without a central fishbone seam.
        add({x:-half+(r()-.5)*1.5,y:y+1},{x:half+(r()-.5)*1.5,y:y-1.5},7.7);
      }
    }
    return list;
  }
  function knot(ctx,hex,seed,x=0,y=0,size=1){
    ctx.save();ctx.translate(x,y);ctx.scale(size,size);
    for(let k=0;k<4;k++){
      const pts=[];for(let i=0;i<=32;i++){let t=i/32*TAU;pts.push({x:Math.cos(t)*(3+k*.75),y:Math.sin(t)*2.5-k*.8});}
      cotton(ctx,pts,hex,2.6,seed+k*89,.7,.7);
    }ctx.restore();
  }
  function leaf(ctx,hex,index,lift=1,fuzz=1,limit=46){
    const list=leafStitches(index);
    list.slice(0,limit).forEach(s=>{hole(ctx,s.a,.7);hole(ctx,s.b,.7);cotton(ctx,cubic(s.a,s.c,s.d,s.b),hex,s.width,s.seed,lift,fuzz);});
    return list;
  }
  function scene(ctx,opts){
    const {colors,count=6,lift=1,fuzz=1,kind='flower'}=opts;
    if(kind==='leaf'){ctx.save();ctx.translate(0,65);leaf(ctx,colors[1],2,lift,fuzz);ctx.restore();return;}
    if(kind==='knot'){for(let n=0;n<7;n++){let a=n*2.4,r=Math.sqrt(n)*4;knot(ctx,colors[4],102+n,Math.cos(a)*r,Math.sin(a)*r,1);}return;}
    if(count>3){ctx.save();ctx.setLineDash([4,8]);stroke(ctx,cubic({x:-9,y:26},{x:-95,y:55},{x:-37,y:101},{x:-67,y:147}),1,color(colors[1],-8,.48));ctx.restore();}
    const turns=[6,68,125,187,247,307],sizes=[1.03,.94,1.04,.97,.91,1.01];
    for(let i=0;i<count;i++){ctx.save();ctx.rotate(turns[i]*Math.PI/180);ctx.scale(sizes[i],sizes[i]);leaf(ctx,colors[i],i,lift,fuzz);ctx.restore();}
    for(let n=0;n<8;n++){let a=n*2.4,r=Math.sqrt(n)*2.7;knot(ctx,colors[5],905+n*67,Math.cos(a)*r,Math.sin(a)*r,.84);}
  }
  function setup(canvas,w=480,h=430){
    const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=w*ratio;canvas.height=h*ratio;
    const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);return {ctx,ratio,w,h};
  }
  function draw(canvas,opts){
    const {ctx}=setup(canvas);ctx.translate(240,215);
    if(opts.kind==='knot')ctx.scale(6,6);
    if(opts.kind==='leaf')ctx.scale(1.65,1.65);
    scene(ctx,opts);
  }
  function movingStitch(ctx,s,hex,progress,opts){
    const p=clamp(progress),rise=opts.rise??1;
    // A depth lift toward the viewer. The thread stays above its final stitch
    // path instead of sweeping an elevated loop sideways across the cloth.
    const reach=smooth((p-.09)/.46);
    const lift=smooth(p/.16)*(1-smooth((p-.54)/.37))*rise;
    const whole=cubic(s.a,s.c,s.d,s.b,100),points=[];
    const center={x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2};
    const samples=opts.samples||64;
    for(let i=0;i<=samples;i++){
      const u=i/samples,t=u*reach,index=t*100,j=Math.min(99,Math.floor(index)),f=index-j;
      const base={x:mix(whole[j].x,whole[j+1].x,f),y:mix(whole[j].y,whole[j+1].y,f)};
      // The emerging end rolls gently out of the hole. The returning end
      // bends into a much shorter section as it meets the next puncture.
      const entry=smooth((p-.36)/.22);
      const profile=smooth(u/.27)*(1-entry*smooth((u-.84)/.16));
      const depth=profile*lift;
      const perspective=1+depth*.16;
      // A loose strand keeps its thickness; taper is confined to the holes.
      const looseTaper=(.12+.88*smooth(u/.09))*(1-entry*.96*(1-smooth((1-u)/.09)));
      const taper=mix(endTaper(u),looseTaper,smooth(lift/Math.max(.001,rise)));
      points.push({x:center.x+(base.x-center.x)*perspective,y:center.y+(base.y-center.y)*perspective,depth,taper});
    }
    // Both ends meet the cloth; only the middle has depth once the far end enters.
    points[0]={...points[0],...s.a,depth:0};
    if(p>=.55)points[points.length-1]={...points[points.length-1],...s.b,depth:0};
    if(opts.surface)clothResponse(ctx,s,p,.55);
    if(opts.punctures!==false){hole(ctx,s.a,1);hole(ctx,s.b,1);}
    if(reach>.004)cotton(ctx,points,hex,s.width,s.seed,opts.lift,opts.fuzz,lift*.55);
  }
  function pencilGuide(ctx,shape='petal'){
    const stitches=motifStitches(shape),random=rng(529),traces=[];
    if(['spark','sunburst','bloom','fan','spiral','rosette','orbit'].includes(shape)){
      stitches.forEach(s=>traces.push(cubic(s.a,s.c,s.d,s.b,12)));
    }else{
      const left=stitches.flatMap(s=>[s.a,s.b]).filter(p=>p.x<0).sort((a,b)=>b.y-a.y);
      const right=stitches.flatMap(s=>[s.a,s.b]).filter(p=>p.x>=0).sort((a,b)=>a.y-b.y);
      // The traced silhouette is independent of yarn width, like a transfer on cloth.
      const bottom=Math.max(...stitches.map(s=>Math.max(s.a.y,s.b.y)))+3;
      const top=Math.min(...stitches.map(s=>Math.min(s.a.y,s.b.y)))-3;
      if(shape==='leaf'){
        const outerLeft=left.filter(p=>p.x<-4),outerRight=right.filter(p=>p.x>4);
        traces.push([{x:0,y:bottom},...outerLeft,{x:0,y:top},...outerRight,{x:0,y:bottom}]);
      }else traces.push([{x:0,y:bottom},...left,{x:0,y:top},...right,{x:0,y:bottom}]);
    }
    const dark=document.body.dataset.fabric==='dusk';
    ctx.save();
    for(const trace of traces){
      const points=[];
      for(let i=1;i<trace.length;i++){
        const a=trace[i-1],b=trace[i],steps=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
        for(let j=0;j<steps;j++){let t=j/steps;points.push({x:mix(a.x,b.x,t)+(random()-.5)*.8,y:mix(a.y,b.y,t)+(random()-.5)*.65});}
      }
      points.push(trace.at(-1));
      stroke(ctx,points,.65,dark?'#d4c9b080':'#786e5d72');
      // A broken second pencil pass gives pressure changes and an imperfect retrace.
      for(let i=3;i<points.length-4;i+=13){
        const segment=points.slice(i,i+8).map(p=>({x:p.x+.55,y:p.y-.35}));
        stroke(ctx,segment,.32,dark?'#e3dac359':'#776b5340');
      }
    }
    ctx.restore();
  }
  function macro(canvas,opts,p){
    const key=JSON.stringify([opts.colors,opts.lift,opts.fuzz,opts.shape,opts.yarnWidth,Boolean(cottonSource)]);
    const threadHex=opts.colors[['sunburst','spiral'].includes(opts.shape)?0:['bloom','rosette'].includes(opts.shape)?3:opts.shape==='orbit'?2:1];
    const list=motifStitches(opts.shape).map(s=>({...s,width:s.width*(opts.yarnWidth??1)}));
    // Every bundle starts as a loose thread. Overlapping starts let the leaf
    // gather in a wave, with each strand passing through its own two holes.
    const winding=['spiral','rosette','orbit'].includes(opts.shape);
    const radial=winding||['sunburst','bloom','fan'].includes(opts.shape);
    const starts=list.map((s,i)=>winding?s.start:radial?0:i*.18);
    const stitchTime=.72,total=Math.max(...starts)+stitchTime;
    // A short tracing-only beat is included in the existing total duration.
    const clock=clamp((p-.085)/.915)*total;
    const complete=list.filter((_,i)=>clock>=starts[i]+stitchTime).length;
    if(canvas._macroKey!==key || complete<(canvas._macroFinished||0)){
      const back=document.createElement('canvas'),{ctx}=setup(back,640,460);
      if(opts.shape==='leaf'){ctx.translate(270,420);ctx.scale(1.58,1.58);ctx.rotate(-.22);}else{ctx.translate(300,410);ctx.scale(2.25,2.25);}
      canvas._macroKey=key;canvas._macroBackground=back;canvas._macroContext=ctx;canvas._macroFinished=0;
    }
    while(canvas._macroFinished<complete){
      const s=list[canvas._macroFinished++],ctx=canvas._macroContext;
      clothResponse(ctx,s,1,.5);hole(ctx,s.a,.7);hole(ctx,s.b,.7);
      cotton(ctx,cubic(s.a,s.c,s.d,s.b),threadHex,s.width,s.seed,opts.lift,opts.fuzz);
    }
    const {ctx}=setup(canvas,640,460);
    if(opts.guide!==false){
      ctx.save();
      if(opts.shape==='leaf'){ctx.translate(270,420);ctx.scale(1.58,1.58);ctx.rotate(-.22);}else{ctx.translate(300,410);ctx.scale(2.25,2.25);}
      pencilGuide(ctx,opts.shape);ctx.restore();
    }
    ctx.drawImage(canvas._macroBackground,0,0,640,460);
    if(opts.shape==='leaf'){ctx.translate(270,420);ctx.scale(1.58,1.58);ctx.rotate(-.22);}else{ctx.translate(300,410);ctx.scale(2.25,2.25);}
    list.forEach((s,i)=>{
      const local=(clock-starts[i])/stitchTime;
      if(local>0 && local<1)movingStitch(ctx,s,threadHex,local,{...opts,macro:true,radial,surface:true});
    });
    return p<.085 ? `${opts.guide!==false?'Pencil tracing':'Bare cloth'} · 0 / ${list.length} stitches` : p>=1 ? `${list.length} / ${list.length} stitches · Pulled snug` : winding ? `${complete} / ${list.length} stitches · Circling outward` : radial ? `${list.length} threads · ${p>.9?'Settling snug':'Stitching outward'}` : `${complete} / ${list.length} stitches · ${p>.9?'Settling snug':'Taking shape'}`;
  }
  function play(canvas,opts){
    stop(canvas);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){draw(canvas,opts);return;}
    const all=[];
    for(let row=0;row<23;row++)for(let petal=0;petal<opts.count;petal++){
      const pair=leafStitches(petal).slice(row*2,row*2+2);
      pair.forEach(s=>all.push({s,i:petal,start:row*.026}));
    }
    // All petals share the same center-out timing. Matching stitch rows form
    // together instead of completing one petal before starting the next.
    const stitchTime=.16,total=22*.026+stitchTime,duration=1800;
    const back=document.createElement('canvas'),layer=setup(back),main=setup(canvas);layer.ctx.translate(240,215);
    const knotCanvas=document.createElement('canvas'),knotLayer=setup(knotCanvas);knotLayer.ctx.translate(240,215);
    for(let n=0;n<8;n++){const angle=n*2.4,radius=Math.sqrt(n)*2.7;knot(knotLayer.ctx,opts.colors[5],905+n*67,Math.cos(angle)*radius,Math.sin(angle)*radius,.84);}
    const start=performance.now();let finished=0;
    function transform(ctx,i){ctx.rotate([6,68,125,187,247,307][i]*Math.PI/180);const size=[1.03,.94,1.04,.97,.91,1.01][i];ctx.scale(size,size);}
    function put(ctx,item,p){
      const {s,i}=item;ctx.save();transform(ctx,i);
      if(p>=1){hole(ctx,s.a,.7);hole(ctx,s.b,.7);cotton(ctx,cubic(s.a,s.c,s.d,s.b),opts.colors[i],s.width,s.seed,opts.lift,opts.fuzz);}
      // Quadratic ease-in: each flower strand starts gently, then pulls snug faster.
      else movingStitch(ctx,s,opts.colors[i],p*p,{...opts,rise:.25});
      ctx.restore();
    }
    function frame(now){
      if(!canvas.isConnected)return;
      const progress=clamp((now-start)/duration),clock=clamp((progress-.06)/.94)*total;
      if(canvas.parentElement?.id==='flower-stage'){const percent=Math.floor(progress*10)*10;if(canvas._announcedProgress!==percent){canvas.parentElement.setAttribute('aria-label',progress<1?`All six petals stitching outward together from the center, ${percent} percent formed`:'Completed embroidered flower with six colored petals');canvas._announcedProgress=percent;}}
      while(finished<all.length&&clock>=all[finished].start+stitchTime){put(layer.ctx,all[finished],1);finished++;}
      main.ctx.clearRect(0,0,480,430);main.ctx.save();main.ctx.translate(240,215);
      for(let i=0;i<opts.count;i++){main.ctx.save();transform(main.ctx,i);pencilGuide(main.ctx,'leaf');main.ctx.restore();}
      main.ctx.restore();main.ctx.drawImage(back,0,0,480,430);
      main.ctx.save();main.ctx.translate(240,215);
      all.forEach(item=>{const local=(clock-item.start)/stitchTime;if(local>0&&local<1)put(main.ctx,item,local);});
      // The small center knot anchors the bloom from its first emerging stitches.
      if(progress>.06){main.ctx.save();const size=smooth((progress-.06)/.14);main.ctx.scale(size,size);main.ctx.drawImage(knotCanvas,-240,-215,480,430);main.ctx.restore();}
      main.ctx.restore();
      if(progress<1)canvas._threadFrame=requestAnimationFrame(frame);
      else{canvas._threadFrame=0;draw(canvas,opts);}
    }
    canvas._threadFrame=requestAnimationFrame(frame);
  }
  function clothResponse(ctx,s,p,amount=1){
    // Tension builds only after the far end enters, then eases without going flat.
    const tension=smooth((p-.48)/.4)*(1-.28*smooth((p-.88)/.12))*amount;
    if(tension<.001)return;
    const dark=document.body.dataset.fabric==='dusk';
    [s.a,s.b].forEach((point,end)=>{
      const random=rng(s.seed+end*73);
      ctx.save();ctx.translate(point.x,point.y);
      for(let n=0;n<5;n++){
        const angle=n*TAU/5+random()*.35,reach=3.5+random()*2;
        ctx.save();ctx.rotate(angle);ctx.scale(reach, .4+random()*.3);
        const shade=ctx.createRadialGradient(.45,0,0,.45,0,1);
        shade.addColorStop(0,dark?`rgba(0,0,0,${.12*tension})`:`rgba(92,74,49,${.11*tension})`);shade.addColorStop(1,'transparent');
        ctx.fillStyle=shade;ctx.fillRect(-1,-1,3,2);
        ctx.translate(0,.7);const light=ctx.createRadialGradient(.45,0,0,.45,0,1);light.addColorStop(0,`rgba(255,250,226,${.19*tension})`);light.addColorStop(1,'transparent');ctx.fillStyle=light;ctx.fillRect(-1,-1,3,2);ctx.restore();
      }
      ctx.restore();
    });
  }
  function wovenSurface(ctx,s,opts,p){
    const dark=document.body.dataset.fabric==='dusk',paper=document.body.dataset.fabric==='paper';
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--ground').trim()||'#f3efe6';ctx.fillRect(0,0,640,360);
    const tension=smooth((p-.48)/.4)*(1-.28*smooth((p-.88)/.12))*(opts.tension??.55);
    const ends=[s.a,s.b].map(q=>({x:320+q.x*opts.zoom,y:180+q.y*opts.zoom}));
    function warp(x,y){
      let dx=0,dy=0;
      for(const q of ends){
        const xx=x-q.x,yy=y-q.y,r=Math.hypot(xx,yy),fall=Math.exp(-(r*r)/2300);
        dx-=xx*.075*fall*tension;
        dy-=yy*.075*fall*tension;
        // Short, uneven folds across the grain, strongest beside the punctures.
        dy+=Math.sin(xx*.09+yy*.025)*Math.exp(-(xx*xx/4800+yy*yy/850))*2.4*tension;
      }
      return {x:x+dx,y:y+dy};
    }
    if(!paper){
      for(let axis=0;axis<2;axis++)for(let v=-6;v<(axis?360:640)+6;v+=3.4){
        const points=[];for(let u=-6;u<=(axis?640:360)+6;u+=5)points.push(axis?warp(u,v):warp(v,u));
        stroke(ctx,points,.65,dark?'#ffffff12':'#8e7e5d16');
        stroke(ctx,points.map(q=>({x:q.x+.8,y:q.y+.8})),.8,dark?'#00000016':'#fffdf765');
      }
    }
    ctx.save();ctx.translate(320,180);ctx.scale(opts.zoom,opts.zoom);clothResponse(ctx,s,p,(opts.tension??.55)*1.5);ctx.restore();
  }
  function single(canvas,opts,p){
    // Use an actual Orbit stitch, rotated horizontally for a readable close-up.
    const source=motifStitches('orbit')[24],angle=-Math.atan2(source.b.y-source.a.y,source.b.x-source.a.x);
    const center={x:(source.a.x+source.b.x)/2,y:(source.a.y+source.b.y)/2};
    const local=point=>({x:(point.x-center.x)*Math.cos(angle)-(point.y-center.y)*Math.sin(angle),y:(point.x-center.x)*Math.sin(angle)+(point.y-center.y)*Math.cos(angle)});
    const s={...source,a:local(source.a),b:local(source.b),c:local(source.c),d:local(source.d),width:source.width*opts.yarnWidth};
    const {ctx}=setup(canvas,640,360);wovenSurface(ctx,s,opts,p);ctx.translate(320,180);ctx.scale(opts.zoom,opts.zoom);
    if(opts.guide){
      const random=rng(591),guide=cubic(s.a,s.c,s.d,s.b,28).map(q=>({x:q.x+(random()-.5)*.14,y:q.y+(random()-.5)*.12}));
      stroke(ctx,guide,.17,document.body.dataset.fabric==='dusk'?'#d4c9b080':'#786e5d65');
    }
    if(p>=1){hole(ctx,s.a,1);hole(ctx,s.b,1);cotton(ctx,cubic(s.a,s.c,s.d,s.b),opts.colors[2],s.width,s.seed,opts.lift,opts.fuzz);}
    else if(p>0)movingStitch(ctx,s,opts.colors[2],p,opts);
    return p===0?'Pencil guide':p<.2?'Thread emerges':p<.55?'Lifts toward you':p<.91?'Pulls into place':'Seated in the cloth';
  }
  function stop(canvas){if(canvas?._threadFrame){cancelAnimationFrame(canvas._threadFrame);canvas._threadFrame=0;}}
  function needle(ctx,s,progress){
    const p=clamp(progress),reveal=smooth(p/.13)*(1-smooth((p-.82)/.18));
    if(reveal<.02)return;
    const t=smooth(p),points=cubic(s.a,s.c,s.d,s.b,60),index=t*60,j=Math.min(59,Math.floor(index)),f=index-j;
    const head={x:mix(points[j].x,points[j+1].x,f),y:mix(points[j].y,points[j+1].y,f)};
    const angle=Math.atan2(points[j+1].y-points[j].y,points[j+1].x-points[j].x)-.38*(1-smooth(p/.65))+.24*smooth((p-.7)/.3);
    const length=24*reveal,width=1.3;
    ctx.save();ctx.translate(head.x,head.y);ctx.rotate(angle);ctx.globalAlpha=.95;
    ctx.save();ctx.translate(.4,1.2);ctx.beginPath();ctx.moveTo(-3,-width);ctx.lineTo(length,0);ctx.lineTo(-3,width);ctx.closePath();ctx.fillStyle='#5b594021';ctx.fill();ctx.restore();
    const silver=ctx.createLinearGradient(0,-width,0,width);silver.addColorStop(0,'#f9fbf7');silver.addColorStop(.42,'#b6bdbb');silver.addColorStop(.58,'#e4e9e6');silver.addColorStop(1,'#858e8b');
    ctx.fillStyle=silver;ctx.strokeStyle='#818b875c';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(-3,-width);ctx.quadraticCurveTo(length*.45,-width*.75,length,0);ctx.quadraticCurveTo(length*.45,width*.75,-3,width);ctx.quadraticCurveTo(-5,0,-3,-width);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(-1.8,0,1.3,.48,0,0,TAU);ctx.fillStyle='#686e60';ctx.fill();
    // One small colored turn connects the strand to the eye.
    ctx.beginPath();ctx.moveTo(-5,1);ctx.quadraticCurveTo(-3,-1,-1.8,0);ctx.lineWidth=Math.min(.8,s.width*.5);ctx.strokeStyle=s.color;ctx.stroke();ctx.restore();
  }
  function fieldStitch(ctx,s,p=1){
    if(s.lightweight){
      // Image fields can contain thousands of strands. Layered plies retain
      // cotton detail without a filtered photograph and dozens of hairs per frame.
      const reach=smooth(clamp(p)),points=cubic(s.a,s.c,s.d,s.b,16),n=Math.max(1,Math.ceil(reach*16)),visible=points.slice(0,n+1);
      if(p<=0)return;
      const width=s.width;
      ctx.save();ctx.translate(.25,.5);stroke(ctx,visible,width*.7,'#62574416');ctx.restore();
      taperedStroke(ctx,visible,width,color(s.color,-12));
      for(let ply=0;ply<3;ply++){
        const fiber=visible.map((q,i)=>({x:q.x+Math.sin(i*.7+ply*2+s.seed)*width*.06,y:q.y+(ply-1)*width*.19+Math.sin(i*.65+s.seed)*width*.045}));
        stroke(ctx,fiber,width*.13,color(s.color,ply===0?30:ply===1?9:-16,.72));
      }
      return;
    }
    if(p>=1)cotton(ctx,cubic(s.a,s.c,s.d,s.b,8),s.color,s.width,s.seed,.35,.32);
    else if(p>0)movingStitch(ctx,s,s.color,p,{lift:.35,fuzz:.32,rise:.18,samples:12,punctures:false});
  }
  function looseThread(ctx,points,hex,width,seed,slack=0){
    cotton(ctx,points,hex,width,seed,.45,.75,slack*.25);
  }
  function tugStitch(ctx,s,tension){
    const slack=1-tension,points=[];
    for(let i=0;i<=32;i++){
      const t=i/32,u=1-t;
      const base={x:u*u*u*s.a.x+3*u*u*t*s.c.x+3*u*t*t*s.d.x+t*t*t*s.b.x,y:u*u*u*s.a.y+3*u*u*t*s.c.y+3*u*t*t*s.d.y+t*t*t*s.b.y};
      const bow=Math.sin(Math.PI*t),wander=Math.sin(t*TAU)*slack*(s.seed%2?1:-1);
      points.push({x:base.x+bow*slack*(s.seed%9-4)*3+wander*7,y:base.y-bow*slack*(34+s.seed%23),depth:bow*slack*.65});
    }
    clothResponse(ctx,s,tension,.35);hole(ctx,s.a,.65);hole(ctx,s.b,.65);
    cotton(ctx,points,s.color,s.width,s.seed,.5,.8,slack*.3);
  }
  return {draw,macro,single,play,stop,imageReady,fieldStitch,looseThread,tugStitch,needle};
})();
