/* A hand-built interpretation of the supplied textile, composed of individual
   stitches. The reference photograph is shown only in the comparison view. */
const W=942,H=768,ratio=Math.min(devicePixelRatio||1,2);
const canvas=document.querySelector('#garden-canvas');canvas.width=W*ratio;canvas.height=H*ratio;
const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mix=(a,b,t)=>a+(b-a)*t;
const zones=[];
let frame=0,ready=false,uploadedImage=null,uploadedURL=null,conversion=0,loadGeneration=0;
const guideCanvas=document.createElement('canvas');guideCanvas.width=W*ratio;guideCanvas.height=H*ratio;
const gx=guideCanvas.getContext('2d');gx.scale(ratio,ratio);gx.lineCap='round';
function ensureLayer(zone,layer){
  if(zone.layers[layer])return zone.layers[layer];
  const c=document.createElement('canvas'),b=zone.bounds;c.width=Math.ceil(b.w*ratio);c.height=Math.ceil(b.h*ratio);
  const context=c.getContext('2d');context.scale(ratio,ratio);context.translate(-b.x,-b.y);
  return zone.layers[layer]={canvas:c,ctx:context};
}
const stitches=zones.flatMap(zone=>zone.stitches.map(s=>{s.zone=zone;s.state='waiting';return s;}));
const pending=new Set();
const spatial=new Map();
function indexStitches(){
  spatial.clear();for(const s of stitches){const keys=new Set([s.a,s.b,{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2}].map(p=>Math.floor(p.x/64)+','+Math.floor(p.y/64)));for(const key of keys){if(!spatial.has(key))spatial.set(key,[]);spatial.get(key).push(s);}}
}
indexStitches();
const hoverRadius=64;
function status(){
  const done=stitches.filter(s=>s.state==='done').length;
  document.querySelector('#garden-count').textContent=`${done.toLocaleString()} / ${stitches.length.toLocaleString()} stitches`;
  document.querySelector('#garden-status').textContent=stitches.length>0&&done===stitches.length?(uploadedImage?'Your image, made of thread.':'A garden, made by your hand.'):pending.size?'Following your hand · stitching':done?'There’s a little more to discover.':'The first stitch is yours.';
  if(stitches.length>0&&done===stitches.length)document.querySelector('#frame-label').textContent='A LITTLE SOMETHING, MADE BY YOU';
  const hint=document.querySelector('#canvas-hint');if(hint)hint.hidden=done>0||pending.size>0;
  document.querySelectorAll('.progress-stitches i').forEach((el,i)=>el.style.opacity=(done/stitches.length*6>i?1:.2));
  window.updateEmbroideryCompletion?.(done,stitches.length);
}
function beginStitch(s,x,y,now,delay=0){
  if(s.state!=='waiting')return;
  // Start at whichever puncture faces the cursor; reverse the cubic as a whole.
  s.oriented=Math.hypot(s.b.x-x,s.b.y-y)<Math.hypot(s.a.x-x,s.a.y-y)?{...s,a:s.b,b:s.a,c:s.d,d:s.c}:s;
  s.state='moving';s.animationStart=undefined;s.start=now+delay;pending.add(s);
}
function activateAt(x,y){
  if(!ready)return;
  const now=performance.now();
  const nearby=new Set();for(let row=Math.floor((y-hoverRadius)/64);row<=Math.floor((y+hoverRadius)/64);row++)for(let col=Math.floor((x-hoverRadius)/64);col<=Math.floor((x+hoverRadius)/64);col++)for(const s of spatial.get(col+','+row)||[])nearby.add(s);
  nearby.forEach(s=>{
    const distance=Math.min(Math.hypot(s.a.x-x,s.a.y-y),Math.hypot(s.b.x-x,s.b.y-y),Math.hypot((s.a.x+s.b.x)/2-x,(s.a.y+s.b.y)/2-y));
    // Radius follows r = R * t², so its arrival time is sqrt(r / R).
    if(distance<hoverRadius)beginStitch(s,x,y,now,Math.sqrt(distance/hoverRadius)*500);
  });
  if(pending.size&&!frame){status();frame=requestAnimationFrame(tick);}
}
function render(live=[]){
  ctx.clearRect(0,0,W,H);if(document.querySelector('#guides').checked)ctx.drawImage(guideCanvas,0,0,W,H);
  for(let layer=0;layer<2;layer++){
    zones.forEach(z=>{const item=z.layers[layer];if(item)ctx.drawImage(item.canvas,z.bounds.x,z.bounds.y,z.bounds.w,z.bounds.h);});
    live.filter(item=>item.s.layer===layer).forEach(item=>ThreadStudy.fieldStitch(ctx,item.s,item.p));
  }
}
function tick(now){
  frame=0;const live=[],deadline=performance.now()+7;
  let active=0;pending.forEach(s=>{if(s.animationStart!==undefined)active++;});
  const limit=uploadedImage?72:10;
  pending.forEach(s=>{
    const instant=s.instant||reduced.matches;
    if(!instant&&s.animationStart===undefined){
      if(now<s.start||active>=limit)return;
      s.animationStart=now;active++;
    }
    const progress=instant?1:Math.max(0,Math.min(1,(now-s.animationStart)/(uploadedImage?340:480)));
    if(progress>=1&&performance.now()<deadline){
      ThreadStudy.fieldStitch(ensureLayer(s.zone,s.layer).ctx,s.oriented);
      s.state='done';pending.delete(s);
    }else if(!instant&&progress>0){
      // Keep a finished strand visible until it is committed to the cached layer.
      live.push({s:s.oriented,p:Math.min(progress,.9999)});
    }
  });
  render(live);status();if(pending.size)frame=requestAnimationFrame(tick);
}
const frameEl=document.querySelector('#art-frame'),ring=document.querySelector('#cursor-ring');
frameEl.onpointermove=e=>{
  if(!document.querySelector('#reference-view').hidden)return;
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W,y=(e.clientY-rect.top)/rect.height*H;
  const clothRect=frameEl.getBoundingClientRect();ring.style.left=(e.clientX-clothRect.left)/clothRect.width*100+'%';ring.style.top=(e.clientY-clothRect.top)/clothRect.height*100+'%';ring.style.display=e.pointerType==='touch'?'none':'block';
  activateAt(x,y);
};
frameEl.onpointerleave=()=>{ring.style.display='none';};
frameEl.onpointerdown=e=>{if(e.pointerType==='touch'){const r=canvas.getBoundingClientRect();activateAt((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H);}};
document.querySelector('#guides').onchange=()=>render();
document.querySelector('#reveal-all').onclick=()=>{if(!ready)return;const now=performance.now();stitches.forEach(s=>{beginStitch(s,0,H,now);s.instant=true;});status();if(!frame)frame=requestAnimationFrame(tick);};
document.querySelector('#reset').onclick=()=>{
  cancelAnimationFrame(frame);frame=0;pending.clear();stitches.forEach(s=>{s.state='waiting';s.oriented=null;s.instant=false;s.animationStart=undefined;});
  zones.forEach(z=>{z.active=false;z.complete=false;z.done=0;z.progress=0;z.layers=[];});
  document.querySelector('#frame-label').textContent='FOLLOW YOUR CURIOSITY';status();render();
};
document.querySelector('#reference-toggle').onclick=e=>{
  const view=document.querySelector('#reference-view');view.hidden=!view.hidden;e.currentTarget.setAttribute('aria-pressed',String(!view.hidden));e.currentTarget.textContent=view.hidden?(uploadedImage?'View original ↗':'View reference ↗'):'Back to the stitches ↙';
  document.querySelector('#sections').inert=!view.hidden;
};
ThreadStudy.imageReady.then(()=>{ready=true;status();render();document.querySelector('#art-frame').dataset.ready='true';reconvert();});
render();

// Local image conversion. Pixels become colored, directional stitches; the
// source image is used only for sampling and the optional reference view.
const upload=document.querySelector('#image-upload'),message=document.querySelector('#upload-message');
const hex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function paletteFor(samples){
  const bins=new Map();
  for(const q of samples){const key=q.rgb.map(v=>v>>4).join(',');const bin=bins.get(key)||{rgb:[0,0,0],count:0};bin.rgb=bin.rgb.map((v,i)=>v+q.rgb[i]);bin.count++;bins.set(key,bin);}
  const colors=[...bins.values()].map(q=>({rgb:q.rgb.map(v=>v/q.count),count:q.count})).sort((a,b)=>b.count-a.count);
  const distance=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
  const centers=[colors[0].rgb];
  while(centers.length<Math.min(12,colors.length)){
    const candidate=colors.reduce((best,q)=>{const score=Math.min(...centers.map(c=>distance(c,q.rgb)))*Math.sqrt(q.count);return score>best.score?{rgb:q.rgb,score}:best;},{rgb:null,score:-1});
    if(candidate.score<1)break;centers.push(candidate.rgb);
  }
  for(let iteration=0;iteration<5;iteration++){
    const sums=centers.map(()=>({rgb:[0,0,0],count:0}));
    for(const q of colors){let best=0,min=Infinity;centers.forEach((c,i)=>{const d=distance(c,q.rgb);if(d<min){best=i;min=d;}});sums[best].count+=q.count;q.rgb.forEach((v,i)=>sums[best].rgb[i]+=v*q.count);}
    sums.forEach((q,i)=>{if(q.count)centers[i]=q.rgb.map(v=>v/q.count);});
  }
  return centers;
}
function outlineSamples(source,step,detailed){
  // Blur before Sobel detection so fabric grain / photographic noise do not
  // become thousands of tiny disconnected stitches.
  const unit=2.5,w=Math.ceil(W/unit),h=Math.ceil(H/unit),small=document.createElement('canvas');small.width=w;small.height=h;
  const cx=small.getContext('2d',{willReadFrequently:true});cx.fillStyle='#eee7d7';cx.fillRect(0,0,w,h);cx.drawImage(source.canvas,0,0,w,h);
  const data=cx.getImageData(0,0,w,h).data;let gray=new Float32Array(w*h);
  for(let i=0;i<gray.length;i++)gray[i]=data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722;
  for(let pass=0;pass<2;pass++){const blurred=gray.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=gray[(y+dy)*w+x+dx];blurred[y*w+x]=sum/9;}gray=blurred;}
  const magnitude=new Float32Array(w*h),direction=new Float32Array(w*h),strengths=[];
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const i=y*w+x,gx=-gray[i-w-1]+gray[i-w+1]-2*gray[i-1]+2*gray[i+1]-gray[i+w-1]+gray[i+w+1],gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];
    magnitude[i]=Math.hypot(gx,gy);direction[i]=Math.atan2(gy,gx);if(magnitude[i]>8)strengths.push(magnitude[i]);
  }
  strengths.sort((a,b)=>a-b);const threshold=Math.max(detailed?15:24,strengths[Math.floor(strengths.length*(detailed?.36:.64))]||24),edges=new Uint8Array(w*h),visited=new Uint8Array(w*h);
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const i=y*w+x;if(magnitude[i]<threshold)continue;
    const angle=(direction[i]*180/Math.PI+180)%180;
    const delta=angle<22.5||angle>=157.5?1:angle<67.5?w+1:angle<112.5?w:w-1;
    if(magnitude[i]>=magnitude[i-delta]&&magnitude[i]>=magnitude[i+delta])edges[i]=1;
  }
  const neighbors=i=>{const result=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=i+dy*w+dx;if((dx||dy)&&j>=0&&j<edges.length&&edges[j]&&!visited[j])result.push(j);}return result;};
  const seeds=[];for(let i=0;i<edges.length;i++)if(edges[i]&&neighbors(i).length<=1)seeds.push(i);
  for(let i=0;i<edges.length;i++)if(edges[i])seeds.push(i);
  const result=[];
  for(const first of seeds){
    if(visited[first])continue;const path=[];let current=first,previous=-1;
    while(current!==undefined){
      visited[current]=1;path.push({x:(current%w)*unit,y:Math.floor(current/w)*unit});
      const options=neighbors(current);let next;
      if(previous<0)next=options[0];else{const dx=current%w-previous%w,dy=Math.floor(current/w)-Math.floor(previous/w);options.sort((a,b)=>{const score=j=>(dx*(j%w-current%w)+dy*(Math.floor(j/w)-Math.floor(current/w)))/Math.hypot(j%w-current%w,Math.floor(j/w)-Math.floor(current/w));return score(b)-score(a);});next=options[0];}
      previous=current;current=next;
    }
    if(path.length<(detailed?4:7))continue;
    const lengths=[0];for(let n=1;n<path.length;n++)lengths.push(lengths[n-1]+Math.hypot(path[n].x-path[n-1].x,path[n].y-path[n-1].y));
    const total=lengths.at(-1);if(total<step)continue;
    function at(distance){let n=1;while(n<lengths.length-1&&lengths[n]<distance)n++;const t=(distance-lengths[n-1])/(lengths[n]-lengths[n-1]||1);return{x:mix(path[n-1].x,path[n].x,t),y:mix(path[n-1].y,path[n].y,t)};}
    const count=Math.ceil(total/step),span=total/count;
    for(let n=0;n<count;n++){
      const start=n*span,a=at(start),b=at(start+span*.9),mid=at(start+span*.45),c=at(start+span*.3),d=at(start+span*.6);
      // Choose the darker side of the edge, rather than the pale background.
      let rgb=null,darkest=Infinity;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=Math.max(0,Math.min(w-1,Math.round(mid.x/unit)+dx)),y=Math.max(0,Math.min(h-1,Math.round(mid.y/unit)+dy)),i=(y*w+x)*4,q=[data[i],data[i+1],data[i+2]],l=q[0]+q[1]+q[2];if(l<darkest){darkest=l;rgb=q;}}
      result.push({x:mid.x,y:mid.y,a,b,c,d,rgb,edge:100,angle:Math.atan2(b.y-a.y,b.x-a.x)});
    }
  }
  return result;
}

async function convertImage(image,filename){
  const token=++conversion,bar=document.querySelector('.upload-bar');bar.classList.add('busy');message.textContent='Finding thread colors and laying out stitches…';
  await new Promise(resolve=>setTimeout(resolve,30));
  try{
    const sample=document.createElement('canvas');sample.width=W;sample.height=H;const sx=sample.getContext('2d',{willReadFrequently:true});
    const scale=Math.min((W-110)/image.naturalWidth,(H-110)/image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale,left=(W-width)/2,top=(H-height)/2;
    sx.drawImage(image,left,top,width,height);const pixels=sx.getImageData(0,0,W,H).data,step=Number(document.querySelector('#stitch-size').value),lineMode=document.querySelector('#embroidery-style').value==='line';let samples=[];
    const pixel=(x,y)=>{const i=(Math.max(0,Math.min(H-1,Math.round(y)))*W+Math.max(0,Math.min(W-1,Math.round(x))))*4;return [pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]];};
    const luminance=q=>q[0]*.2126+q[1]*.7152+q[2]*.0722;
    let row=0;
    for(let y=top+step/2;y<top+height;y+=step*.78,row++)for(let x=left+step/2+(row%2)*step*.5;x<left+width;x+=step){
      const q=pixel(x,y);if(q[3]<70)continue;
      const gx=luminance(pixel(x+3,y))-luminance(pixel(x-3,y)),gy=luminance(pixel(x,y+3))-luminance(pixel(x,y-3));
      samples.push({x,y,rgb:q.slice(0,3),edge:Math.hypot(gx,gy),angle:Math.hypot(gx,gy)>16?Math.atan2(gy,gx)+Math.PI/2:-.48});
    }
    if(lineMode)samples=outlineSamples(sx,step,document.querySelector('#line-detail').value==='detailed');
    if(!samples.length)throw new Error(lineMode?'No clear outlines found. Try Detailed outlines or Filled embroidery.':'This image is transparent or too small. Try another image.');
    const palette=paletteFor(samples),nextZones=[];
    for(let row=0;row<3;row++)for(let col=0;col<4;col++)nextZones.push({name:`Image area ${row*4+col+1}`,x:(col+.5)*W/4,y:(row+.5)*H/3,stitches:[],layers:[],bounds:{x:Math.max(0,col*W/4-20),y:Math.max(0,row*H/3-20),w:Math.min(W-col*W/4+20,W/4+40),h:Math.min(H-row*H/3+20,H/3+40)}});
    const colorCache=new Map();
    samples.forEach((q,i)=>{
      const key=q.rgb.map(v=>v>>4).join(',');let color=colorCache.get(key);
      if(!color){let best=palette[0],min=Infinity;palette.forEach(c=>{const d=c.reduce((sum,v,k)=>sum+(v-q.rgb[k])**2,0);if(d<min){min=d;best=c;}});color=hex(best);colorCache.set(key,color);}
      const angle=q.angle+Math.sin(i*7.13)*.12,length=step*(1.15+Math.sin(i*3.17)*.1),dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2;
      const a=q.a||{x:q.x-dx,y:q.y-dy},b=q.b||{x:q.x+dx,y:q.y+dy},zone=nextZones[Math.min(2,Math.floor(q.y/(H/3)))*4+Math.min(3,Math.floor(q.x/(W/4)))];
      const s={a,b,c:q.c||{x:mix(a.x,b.x,.33)-dy*.07,y:mix(a.y,b.y,.33)+dx*.07},d:q.d||{x:mix(a.x,b.x,.72)-dy*.07,y:mix(a.y,b.y,.72)+dx*.07},width:lineMode?Math.max(1.3,step*.22):step*.60,lightweight:true,color,seed:790+i*37,layer:0,state:'waiting',zone,edge:q.edge};zone.stitches.push(s);
    });
    if(token!==conversion)return;
    cancelAnimationFrame(frame);frame=0;pending.clear();zones.splice(0,zones.length,...nextZones);stitches.splice(0,stitches.length,...nextZones.flatMap(z=>z.stitches));indexStitches();
    gx.clearRect(0,0,W,H);gx.save();gx.lineCap='round';gx.strokeStyle='#81755d35';gx.lineWidth=.65;
    stitches.forEach((s,i)=>{if(!lineMode&&s.edge<18&&i%7!==0)return;gx.beginPath();gx.moveTo(s.a.x,s.a.y);gx.lineTo(s.b.x,s.b.y);gx.stroke();});gx.restore();
    const sections=document.querySelector('#sections');sections.replaceChildren();
    zones.filter(z=>z.stitches.length).forEach(z=>{const anchor=z.stitches[Math.floor(z.stitches.length/2)];z.x=(anchor.a.x+anchor.b.x)/2;z.y=(anchor.a.y+anchor.b.y)/2;const b=document.createElement('button');b.className='section-trigger';b.style.left=z.x/W*100+'%';b.style.top=z.y/H*100+'%';b.setAttribute('aria-label','Embroider '+z.name.toLowerCase());b.dataset.name=z.name;b.onfocus=()=>activateAt(z.x,z.y);b.onclick=()=>activateAt(z.x,z.y);sections.append(b);});
    uploadedImage=image;document.querySelector('#reference-view img').src=uploadedURL;document.querySelector('#reference-view img').alt='Your uploaded source image';
    document.querySelector('#reference-view').hidden=true;sections.inert=false;const ref=document.querySelector('#reference-toggle');ref.setAttribute('aria-pressed','false');ref.textContent='View original ↗';
    canvas.setAttribute('aria-label','Your uploaded image converted into individual cotton stitches. Move over the cloth to reveal the embroidery.');
    document.querySelector('#frame-label').textContent='FOLLOW YOUR CURIOSITY';document.querySelector('#artwork-caption').textContent=filename+' · '+(lineMode?'Line':'Filled')+' embroidery · '+palette.length+' thread colors';
    message.textContent=`Ready · ${stitches.length.toLocaleString()} stitches, ${palette.length} thread colors · ${lineMode?'outlines':'filled'}. Hover over the cloth to begin.`;status();render();
  }catch(error){message.textContent=error.message||'Could not convert this image. Try a different file.';}finally{if(token===conversion)bar.classList.remove('busy');}
}
upload.onchange=async()=>{
  const file=upload.files[0];if(!file)return;const generation=++loadGeneration;
  if(file.size>25*1024*1024){message.textContent='Choose an image smaller than 25 MB.';upload.value='';return;}
  const url=URL.createObjectURL(file),image=new Image();
  image.onload=async()=>{if(generation!==loadGeneration){URL.revokeObjectURL(url);return;}const previous=uploadedURL;uploadedURL=url;await convertImage(image,file.name);if(uploadedImage===image){if(previous)URL.revokeObjectURL(previous);}else{uploadedURL=previous;URL.revokeObjectURL(url);}upload.value='';};
  image.onerror=()=>{URL.revokeObjectURL(url);message.textContent='That file could not be read as an image. Try PNG, JPEG, WebP, or another browser-supported image.';upload.value='';};image.src=url;
};
function reconvert(){
  document.querySelector('#line-detail-label').hidden=document.querySelector('#embroidery-style').value!=='line';
  if(uploadedImage)convertImage(uploadedImage,document.querySelector('#artwork-caption').textContent.split(' · ')[0]);
  else{const image=new Image();image.onload=()=>{uploadedURL='assets/sample-bouquet.svg';convertImage(image,'Sample bouquet');};image.src='assets/sample-bouquet.svg';}
}
document.querySelector('#stitch-size').onchange=reconvert;
document.querySelector('#embroidery-style').onchange=reconvert;
document.querySelector('#line-detail').onchange=reconvert;
document.querySelector('#sample-garden').onclick=()=>location.reload();
