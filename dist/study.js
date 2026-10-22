/* Local cotton texture and procedural motion. No external libraries or services. */
const palettes = {
  meadow: ['#d49a28','#738759','#567d93','#be7881','#b96438','#b74630'],
  rose: ['#cb8d87','#8b946e','#a85e6c','#c99069','#d2b097','#9c5665'],
  cocoa: ['#ac8a5e','#796d4e','#94715a','#c0a47e','#755344','#a88668']
};
const state = {palette:'meadow', lift:65, step:0, answers:Array(6).fill(null), complete:false,fuzz:1.25};
const questions = [
  ['How are you<br>arriving today?', 'There’s no right way to feel.', ['A little tired','Somewhere between','Feeling good']],
  ['What do you<br>need more of?', 'A small need is still worth noticing.', ['Rest','Connection','Space']],
  ['Where did you find<br>a little ease?', 'Ordinary moments count, too.', ['Outside','With someone','On my own']],
  ['What would feel<br>good right now?', 'Something small, just for you.', ['A slow walk','A quiet moment','A conversation']],
  ['What can you<br>let be for today?', 'You don’t have to carry everything.', ['The to-do list','Expectations','An old worry']],
  ['What will you<br>take with you?', 'A little thread to carry forward.', ['A kinder thought','A small intention','This moment']]
];
function flower(count=6,kind='flower'){
  return `<canvas data-thread-count="${count}" data-thread-kind="${kind}" aria-hidden="true"></canvas>`;
}
function threadOptions(count=6,kind='flower'){
  return {colors:palettes[state.palette],count,kind,lift:state.lift/65,fuzz:state.fuzz};
}
function hydrateCanvases(){
  document.querySelectorAll('canvas[data-thread-count]').forEach(canvas=>{
    if(!canvas.dataset.ready){ThreadStudy.draw(canvas,threadOptions(Number(canvas.dataset.threadCount),canvas.dataset.threadKind));canvas.dataset.ready='true';}
  });
}
function draw(animate=false){
  const big=document.querySelector('#flower-stage'), small=document.querySelector('#small-flower');
  big.innerHTML=flower(6);small.innerHTML=flower(state.complete?6:state.step+1);
  document.querySelector('#tiny-leaf').innerHTML=flower(1,'leaf');document.querySelector('#knot').innerHTML=flower(1,'knot');
  hydrateCanvases();
  if(animate)ThreadStudy.play(big.querySelector('canvas'),threadOptions());
  renderMacro();
  renderSingle();
}
function renderQuestion(animate=false){
  const q=questions[state.step];
  document.querySelector('#question').innerHTML=state.complete?'A little more<br>connected.':q[0];
  document.querySelector('#question-sub').textContent=state.complete?'Six small moments. Something all your own.':q[1];
  document.querySelector('#step-label').textContent=state.complete?'COMPLETE':`0${state.step+1} / 06`;
  document.querySelector('#progress').style.width=(state.complete?100:(state.step+1)/6*100)+'%';
  const choices=document.querySelector('#choices');choices.replaceChildren();
  if(!state.complete)q[2].forEach((text,i)=>{let b=document.createElement('button');b.textContent=text;b.setAttribute('aria-pressed',state.answers[state.step]===i?'true':'false');b.onclick=()=>{state.answers[state.step]=i;renderQuestion()};choices.append(b)});
  const next=document.querySelector('#next');next.innerHTML=state.complete?'Begin again <span>↻</span>':state.step===5?'Tie the last stitch <span>→</span>':'One small stitch <span>→</span>';
  next.disabled=!state.complete&&state.answers[state.step]===null;
  document.querySelector('#back').disabled=state.step===0&&!state.complete;
  document.querySelector('#phone-foot').textContent=state.complete?'You made a little space for yourself.':'Your story, a little at a time.';
  document.querySelector('#small-flower').innerHTML=flower(state.complete?6:state.step+1);
  document.querySelector('#small-flower').setAttribute('aria-label',`Embroidered motif with ${state.complete?6:state.step+1} ${state.step===0?'petal':'petals'}`);
  hydrateCanvases();
  if(animate)ThreadStudy.play(document.querySelector('#small-flower canvas'),threadOptions(state.complete?6:state.step+1));
}
document.querySelectorAll('#fabrics button').forEach(b=>b.onclick=()=>{document.body.dataset.fabric=b.dataset.value;document.querySelectorAll('#fabrics button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'))});
document.querySelectorAll('#palettes button').forEach(b=>b.onclick=()=>{state.palette=b.dataset.value;document.querySelectorAll('#palettes button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));document.querySelector('#palette-name').textContent=b.dataset.value[0].toUpperCase()+b.dataset.value.slice(1);draw()});
document.querySelector('#relief').oninput=e=>{state.lift=Number(e.target.value);document.querySelector('#lift-value').textContent=state.lift<30?'Subtle':state.lift>78?'Sculptural':'Raised';draw()};
document.querySelector('#next').onclick=()=>{if(state.complete){state.step=0;state.complete=false;state.answers.fill(null)}else if(state.step<5){state.step++}else{state.complete=true}renderQuestion(true)};
document.querySelector('#back').onclick=()=>{if(state.complete){state.complete=false}else{state.step=Math.max(0,state.step-1)}renderQuestion()};
document.querySelector('#replay').onclick=()=>draw(true);
document.querySelector('#save').onclick=e=>{let b=e.currentTarget,saved=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(saved));b.innerHTML=saved?'Moment saved <span>✓</span>':'Save a moment <span>＋</span>';if(saved)ThreadStudy.draw(document.querySelector('#tiny-leaf canvas'),threadOptions(1,'leaf'))};
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelector('#specimen').onpointermove=e=>{if(reducedMotion.matches)return;let r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--light-x',((e.clientX-r.left)/r.width-.5)*200+'px');e.currentTarget.style.setProperty('--light-y',((e.clientY-r.top)/r.height-.5)*160+'px')};
document.querySelector('#specimen').onpointerleave=e=>{e.currentTarget.style.setProperty('--light-x','0px');e.currentTarget.style.setProperty('--light-y','0px')};
const motion={shape:'spiral',yarnWidth:1,rise:.25,guide:true};
const shapeDurations={spiral:2400,rosette:2300,orbit:2500,sunburst:1500,bloom:1700,fan:1400,seed:2400,petal:3000,spark:2400,leaf:4800};
let macroProgress=0,macroFrame=0,macroStart=0,macroDuration=2400;
function updateMotionControls(){
  macroDuration=shapeDurations[motion.shape]*(document.querySelector('#slow').checked?2:1);
  const name=motion.shape==='leaf'?'original leaf':motion.shape==='bloom'?'flower':motion.shape;
  const radial=['sunburst','bloom','fan','spiral','rosette','orbit'].includes(motion.shape);
  document.querySelector('#radial-stage').classList.toggle('radial',radial);
  document.querySelector('#stitch-origin').disabled=!radial;
  document.querySelector('#motif-title').textContent=`${name.toUpperCase()} / ${macroDuration/1000} SECONDS`;
  document.querySelector('#stitch-macro').setAttribute('aria-label',`An embroidered ${name} ${radial?'growing outward in short curved chains, with a clockwise stitching wave':'forming thread by thread'} over ${motion.guide?'a rough pencil tracing':'bare cloth'}. Yarn width ${Math.round(motion.yarnWidth*100)} percent; thread rise ${Math.round(motion.rise*100)} percent of the original. Use the scrubber to inspect each stage.`);
}
for(const [id,property] of [['shapes','shape'],['yarn-width','yarnWidth'],['thread-rise','rise']]){
  document.querySelectorAll(`#${id} button`).forEach(button=>button.onclick=()=>{
    motion[property]=property==='shape'?button.dataset.value:Number(button.dataset.value);
    document.querySelectorAll(`#${id} button`).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    updateMotionControls();playMacro();
  });
}
function renderMacro(){
  const canvas=document.querySelector('#stitch-macro');
  if(!canvas)return;
  document.querySelector('#radial-stage').classList.toggle('formed',macroProgress>0);
  const phase=ThreadStudy.macro(canvas,{...threadOptions(),...motion},macroProgress);
  if(document.querySelector('#motion-phase').textContent!==phase)document.querySelector('#motion-phase').textContent=phase;
  document.querySelector('#scrub').value=Math.round(macroProgress*1000);
  
}
function pauseMacro(){cancelAnimationFrame(macroFrame);macroFrame=0;document.querySelector('#motion-play').textContent=`↻ Stitch the ${motion.shape==='leaf'?'leaf':motion.shape==='bloom'?'flower':motion.shape}`;}
function playMacro(){
  pauseMacro();
  if(reducedMotion.matches){macroProgress=1;renderMacro();document.querySelector('#motion-phase').textContent='Finished shape · reduced motion';return;}
  macroStart=performance.now();macroProgress=0;renderMacro();document.querySelector('#motion-play').textContent='Ⅱ Pause';
  function frame(now){macroProgress=Math.min(1,(now-macroStart)/macroDuration);renderMacro();if(macroProgress<1){macroFrame=requestAnimationFrame(frame);}else{pauseMacro();}}
  macroFrame=requestAnimationFrame(frame);
}
document.querySelector('#pencil-guide').onchange=e=>{motion.guide=e.target.checked;updateMotionControls();renderMacro();};
document.querySelector('#motion-play').onclick=()=>macroFrame?pauseMacro():playMacro();
document.querySelector('#scrub').oninput=e=>{pauseMacro();macroProgress=Number(e.target.value)/1000;renderMacro();};
document.querySelector('#slow').onchange=e=>{updateMotionControls();if(macroFrame)macroStart=performance.now()-macroProgress*macroDuration;};
document.querySelector('#fuzz').oninput=e=>{state.fuzz=Number(e.target.value)/100;document.querySelector('#fuzz-value').textContent=state.fuzz>.9?'Fuzzy cotton':'Tighter twist';draw();};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){pauseMacro();macroProgress=1;document.querySelectorAll('canvas[data-thread-count]').forEach(ThreadStudy.stop);draw();}});
// Hover fires once per visit; a replay requires leaving the trigger first.
const origin=document.querySelector('#stitch-origin');
let originEntered=false;
function triggerOrigin(){if(originEntered||origin.disabled)return;originEntered=true;playMacro();}
origin.onpointerenter=e=>{if(e.pointerType!=='touch')triggerOrigin();};
origin.onpointerleave=()=>{originEntered=false;};
origin.onpointerdown=e=>{if(e.pointerType==='touch'){originEntered=false;triggerOrigin();}};
origin.onclick=e=>{if(e.detail===0){originEntered=false;triggerOrigin();}};
origin.onfocus=()=>triggerOrigin();
origin.onblur=()=>{originEntered=false;};
const singleState={progress:1,yarnWidth:.55,zoom:14,guide:true,tension:.55};
let singleFrame=0,singleStart=0,singleDuration=4000;
function renderSingle(){
  const phase=ThreadStudy.single(document.querySelector('#single-canvas'),{...threadOptions(),...singleState,rise:.25},singleState.progress);
  document.querySelector('#single-phase').textContent=phase;
  document.querySelector('#single-scrub').value=Math.round(singleState.progress*1000);
  document.querySelector('#single-time').textContent=Math.round(singleState.progress*100)+'%';
  document.querySelector('#single-canvas').setAttribute('aria-label',`One Orbit stitch, magnified ${singleState.zoom} times. ${phase}. Use replay, moment buttons, or the scrubber to inspect it.`);
}
function stopSingle(){cancelAnimationFrame(singleFrame);singleFrame=0;document.querySelector('#single-play').textContent='↻ Replay this stitch';}
function playSingle(){
  stopSingle();
  if(reducedMotion.matches){singleState.progress=1;renderSingle();return;}
  singleState.progress=0;singleStart=performance.now();renderSingle();document.querySelector('#single-play').textContent='Ⅱ Pause';
  function frame(now){singleState.progress=Math.min(1,(now-singleStart)/singleDuration);renderSingle();if(singleState.progress<1)singleFrame=requestAnimationFrame(frame);else stopSingle();}
  singleFrame=requestAnimationFrame(frame);
}
document.querySelector('#single-play').onclick=()=>singleFrame?stopSingle():playSingle();
document.querySelector('#single-scrub').oninput=e=>{stopSingle();singleState.progress=Number(e.target.value)/1000;renderSingle();};
document.querySelectorAll('.single-moments button').forEach(button=>button.onclick=()=>{stopSingle();singleState.progress=Number(button.dataset.at);renderSingle();});
document.querySelectorAll('#single-width button').forEach(button=>button.onclick=()=>{singleState.yarnWidth=Number(button.dataset.value);document.querySelectorAll('#single-width button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderSingle();});
document.querySelector('#single-zoom').oninput=e=>{singleState.zoom=Number(e.target.value);document.querySelector('#single-zoom-value').textContent=singleState.zoom+'×';renderSingle();};
document.querySelector('#single-tension').oninput=e=>{singleState.tension=Number(e.target.value)/100;document.querySelector('#single-tension-value').textContent=e.target.value+'%';renderSingle();};
document.querySelector('#single-guide').onchange=e=>{singleState.guide=e.target.checked;renderSingle();};
document.querySelector('#single-slow').onchange=e=>{singleDuration=e.target.checked?8000:4000;if(singleFrame)singleStart=performance.now()-singleState.progress*singleDuration;};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){stopSingle();singleState.progress=1;renderSingle();}});
updateMotionControls();draw();renderQuestion();


ThreadStudy.imageReady.then(loaded=>{if(loaded){document.querySelector('#texture-status').textContent='Macro cotton texture';draw();}});
