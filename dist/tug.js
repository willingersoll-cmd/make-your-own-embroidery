const canvas=document.querySelector('#tug-canvas'),ctx=canvas.getContext('2d'),cloth=document.querySelector('#cloth'),handle=document.querySelector('#thread-end');
const ratio=Math.min(devicePixelRatio||1,2);canvas.width=1100*ratio;canvas.height=620*ratio;ctx.scale(ratio,ratio);
const stitches=[],colors=['#ae5944','#bc7051','#a95240','#c18a64','#a85b49','#b47751'];
for(let petal=0;petal<6;petal++){
  const angle=petal*Math.PI/3-.25,at=(x,y)=>({x:420+x*Math.cos(angle)-y*Math.sin(angle),y:325+x*Math.sin(angle)+y*Math.cos(angle)});
  for(let n=0;n<4;n++){
    const offset=(n-1.5)*7.5,a=at(14,offset*.25),b=at(115-Math.abs(offset)*.55,offset);
    stitches.push({a,b,c:at(47,offset*.9),d:at(88,offset*1.3),width:4.8+(n%2)*.4,seed:709+petal*197+n*31,color:colors[petal]});
  }
}
let tension=0,drag=null,frame=0,ready=false;
function end(){return{x:760+tension*220,y:400-tension*44};}
function curve(a,c,d,b,n=40){const points=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;points.push({x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y});}return points;}
function draw(){
  frame=0;ctx.clearRect(0,0,1100,620);
  // Faint transfer lines remain under the loops, like a pattern on linen.
  ctx.save();ctx.strokeStyle='#8c866044';ctx.lineWidth=.8;ctx.setLineDash([2,4]);
  for(const s of stitches){ctx.beginPath();ctx.moveTo(s.a.x,s.a.y);ctx.bezierCurveTo(s.c.x,s.c.y,s.d.x,s.d.y,s.b.x,s.b.y);ctx.stroke();}ctx.restore();
  if(!ready)return;
  stitches.forEach(s=>ThreadStudy.tugStitch(ctx,s,tension));
  // Small linking stitches make the six petals feel like one continuous thread.
  for(let n=0;n<6;n++){const a=n*Math.PI/3;ThreadStudy.looseThread(ctx,curve({x:420+Math.cos(a)*12,y:325+Math.sin(a)*12},{x:425,y:317},{x:431,y:326},{x:420+Math.cos(a+1)*12,y:325+Math.sin(a+1)*12},12),'#b88b3e',3,220+n);}
  const tip=end(),slack=1-tension;
  const root={x:438,y:334},blend=(loose,taut)=>loose*slack+taut*tension;
  const tail=curve(root,{x:blend(515,root.x+(tip.x-root.x)/3),y:blend(420+slack*120,root.y+(tip.y-root.y)/3)},{x:blend(690,root.x+(tip.x-root.x)*2/3),y:blend(200-slack*80,root.y+(tip.y-root.y)*2/3)},tip,64);
  ThreadStudy.looseThread(ctx,tail,'#a85c46',4.4,1234,slack);
}
function update(value){
  tension=Math.max(0,Math.min(1,value));const p=end(),percent=Math.round(tension*100);
  handle.style.left=p.x/11+'%';handle.style.top=p.y/6.2+'%';handle.setAttribute('aria-valuenow',percent);handle.setAttribute('aria-valuetext',percent===100?'All stitches pulled snug':percent+' percent tightened');
  document.querySelector('#tension').value=percent;document.querySelector('#amount').textContent=percent+'%';
  document.querySelector('#status').textContent=percent===100?'Every loop, pulled into place.':percent===0?'A little slack, waiting for your hand.':'The loops are gathering. Keep pulling.';
  document.querySelector('#end-label').textContent=percent===100?'Pulled snug':percent===0?'Take the loose end':'A little more';document.querySelector('#end-label').style.left=p.x/11+'%';document.querySelector('#end-label').style.top=(p.y/620*100+9)+'%';
  cloth.classList.toggle('snug',percent===100);if(!frame)frame=requestAnimationFrame(draw);
}
handle.onpointerdown=e=>{e.preventDefault();const r=cloth.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:tension,sx:1100/r.width,sy:620/r.height};handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');};
handle.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const dx=(e.clientX-drag.x)*drag.sx,dy=(e.clientY-drag.y)*drag.sy;update(Math.max(drag.start,drag.start+(dx-dy*.2)/228.8));};
function release(e){if(drag&&e.pointerId===drag.id){drag=null;handle.classList.remove('dragging');}}
handle.onpointerup=release;handle.onpointercancel=release;handle.onlostpointercapture=()=>{drag=null;handle.classList.remove('dragging');};
handle.onkeydown=e=>{if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();update(e.key==='Home'?0:e.key==='End'?1:tension+(['ArrowRight','ArrowUp'].includes(e.key)?.05:-.05));}};
document.querySelector('#tension').oninput=e=>update(Number(e.target.value)/100);document.querySelector('#reset').onclick=()=>update(0);
ThreadStudy.imageReady.then(()=>{ready=true;update(0);});
