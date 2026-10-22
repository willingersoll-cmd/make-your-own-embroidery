/* UI controls and local share-card export. Nothing posts or sends automatically. */
const completion=document.querySelector('#completion'),shareDialog=document.querySelector('#share-dialog');
let completed=false,shareFile=null,shareBlob=null,cardURL=null,cardVersion=0,format='square',toastTimer;
const shareNote=document.querySelector('#share-note');
// Keep the completion invitation and share sheet over the actual stitched work.
document.querySelector('.hoop-holder').append(completion);
function placeShareDialog(){
  if(!shareDialog.open)return;
  const hoop=document.querySelector('#art-frame').getBoundingClientRect();
  const viewport=window.visualViewport;
  const vw=viewport?.width??innerWidth,vh=viewport?.height??innerHeight;
  const ox=viewport?.offsetLeft??0,oy=viewport?.offsetTop??0;
  shareDialog.style.width=Math.min(400,vw-32,Math.max(260,hoop.width-32))+'px';
  shareDialog.style.maxHeight=Math.max(160,vh-32)+'px';
  const sheet=shareDialog.getBoundingClientRect();
  shareDialog.style.left=(ox+Math.max(16,Math.min(vw-sheet.width-16,hoop.left+hoop.width/2-ox-sheet.width/2)))+'px';
  shareDialog.style.top=(oy+Math.max(16,Math.min(vh-sheet.height-16,hoop.top+hoop.height/2-oy-sheet.height/2)))+'px';
}
addEventListener('resize',placeShareDialog);
addEventListener('scroll',placeShareDialog,{passive:true});
window.visualViewport?.addEventListener('resize',placeShareDialog);
window.updateEmbroideryCompletion=(done,total)=>{
  const next=total>0&&done===total;
  completion.hidden=!next;
  if(next&&!completed){completion.classList.remove('celebrated');void completion.offsetWidth;completion.classList.add('celebrated');}
  if(!next&&completed){shareFile=null;shareBlob=null;if(shareDialog.open)shareDialog.close();}
  completed=next;
};
document.querySelectorAll('[data-control]').forEach(group=>{
  const control=document.getElementById(group.dataset.control);
  group.querySelectorAll('button').forEach(button=>button.onclick=()=>{
    if(control.value===button.dataset.value)return;
    control.value=button.dataset.value;
    group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    control.dispatchEvent(new Event('change',{bubbles:true}));
  });
});
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4200);}
function rosette(context,x,y,size){
  context.save();context.translate(x,y);context.strokeStyle='#a66f56';context.lineWidth=2.8;context.lineCap='round';context.setLineDash([4,3]);
  for(let n=0;n<6;n++){context.save();context.rotate(n*Math.PI/3);context.beginPath();context.ellipse(0,-size*.43,size*.12,size*.28,.15,0,Math.PI*2);context.stroke();context.restore();}
  context.setLineDash([]);context.fillStyle='#b7974e';context.beginPath();context.arc(0,0,size*.1,0,Math.PI*2);context.fill();context.restore();
}
function buildCard(){
  const card=document.createElement('canvas');card.width=1080;card.height=format==='story'?1920:1080;const c=card.getContext('2d'),story=format==='story';
  c.fillStyle='#f4f0e5';c.fillRect(0,0,1080,card.height);
  c.lineWidth=.6;c.strokeStyle='#9586640b';for(let n=0;n<card.height;n+=4){c.beginPath();c.moveTo(0,n);c.lineTo(1080,n);c.stroke();}for(let n=0;n<1080;n+=4){c.beginPath();c.moveTo(n,0);c.lineTo(n,card.height);c.stroke();}
  const top=story?420:172,radius=378,centerX=540,centerY=top+radius,artHeight=radius*2,artWidth=artHeight*W/H,artX=centerX-artWidth/2,artY=centerY-artHeight/2;
  c.textAlign='center';
  c.fillStyle='#4a513c';c.font='400 64px "Are You Serious"';c.fillText('Made of thread.',540,story?363:125);
  c.save();c.beginPath();c.arc(centerX,centerY,radius-11,0,Math.PI*2);c.clip();
  c.fillStyle='#eae4d1';c.fillRect(centerX-radius,top,radius*2,radius*2);
  c.strokeStyle='#8e805013';c.lineWidth=.65;for(let n=0;n<radius*2;n+=3){c.beginPath();c.moveTo(centerX-radius,top+n);c.lineTo(centerX+radius,top+n);c.stroke();c.beginPath();c.moveTo(centerX-radius+n,top);c.lineTo(centerX-radius+n,top+radius*2);c.stroke();}
  // Match the live hoop: fill the circle and clip excess image at its edge.
  c.save();c.translate(artX,artY);c.scale(artWidth/W,artHeight/H);
  for(let layer=0;layer<2;layer++)zones.forEach(z=>{const item=z.layers[layer];if(item)c.drawImage(item.canvas,z.bounds.x,z.bounds.y,z.bounds.w,z.bounds.h);});c.restore();c.restore();
  c.strokeStyle='#bea07a';c.lineWidth=20;c.beginPath();c.arc(centerX,centerY,radius-8,0,Math.PI*2);c.stroke();
  c.strokeStyle='#dbc7a4';c.lineWidth=2;c.beginPath();c.arc(centerX,centerY,radius-19,0,Math.PI*2);c.stroke();
  c.fillStyle='#c4a47c';c.fillRect(centerX-22,top-21,14,30);c.fillRect(centerX+8,top-21,14,30);
  c.fillStyle='#bca35f';c.fillRect(centerX-33,top-16,66,7);c.fillStyle='#d2bd7c';c.fillRect(centerX+29,top-20,8,15);
  const bottom=top+radius*2;rosette(c,540,bottom+(story?130:42),story?44:30);
  c.fillStyle='#a8ad95';c.font='400 30px "Are You Serious"';c.fillText('little thread.',540,story?1570:1050);
  if(story){c.strokeStyle='#c7cbb6';c.lineWidth=2;c.setLineDash([4,6]);c.beginPath();c.moveTo(440,1640);c.bezierCurveTo(510,1600,560,1710,640,1660);c.stroke();}
  return card;
}
async function prepareCard(){
  const version=++cardVersion;shareFile=null;shareBlob=null;
  document.querySelectorAll('#share-dialog button:not(.dialog-close):not([data-format])').forEach(b=>b.disabled=true);
  shareNote.textContent='Preparing image…';
  document.querySelector('.share-card-placeholder').classList.toggle('story',format==='story');
  try{
    await document.fonts.load('400 64px "Are You Serious"');
    const blob=await new Promise(resolve=>buildCard().toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Export failed');if(version!==cardVersion)return;
    shareBlob=blob;shareFile=new File([blob],format==='story'?'little-thread-story.png':'little-thread-postcard.png',{type:'image/png'});
    if(cardURL)URL.revokeObjectURL(cardURL);cardURL=URL.createObjectURL(blob);document.querySelector('#share-preview').src=cardURL;
    document.querySelectorAll('#share-dialog button').forEach(b=>b.disabled=false);
    document.querySelector('#native-share').textContent=navigator.canShare?.({files:[shareFile]})?'Share image':'Save image ↓';
    document.querySelector('#download-card').hidden=!navigator.canShare?.({files:[shareFile]});shareNote.textContent='';placeShareDialog();
  }catch{shareNote.textContent='Couldn’t make the card. Close this window and try again.';}
}
document.querySelector('#open-share').onclick=()=>{if(!completed)return;shareDialog.showModal();placeShareDialog();prepareCard();};
document.querySelector('#close-share').onclick=()=>shareDialog.close();
shareDialog.addEventListener('click',e=>{if(e.target===shareDialog){const r=shareDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shareDialog.close();}});
document.querySelectorAll('[data-format]').forEach(button=>button.onclick=()=>{format=button.dataset.format;document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));prepareCard();});
function downloadCard(){if(!shareFile||!cardURL)return;const a=document.createElement('a');a.href=cardURL;a.download=shareFile.name;document.body.append(a);a.click();a.remove();}
async function nativeShare(destination){
  if(!shareFile)return;
  if(navigator.canShare?.({files:[shareFile]})){
    try{await navigator.share({files:[shareFile],title:'My embroidery',text:'Made with Little Thread.'});shareNote.textContent='Shared.';}catch(error){if(error.name!=='AbortError'){downloadCard();shareNote.textContent='Sharing wasn’t available. Your card is saved — attach it in '+destination+'.';}}
  }else{downloadCard();shareNote.textContent='Card saved. '+(destination==='Instagram'?'Open Instagram and choose the saved image for your post or story.':destination==='Messages'?'Open Messages and attach the saved image to a conversation.':'You can attach it in Messages, X, or Instagram.');}
}
document.querySelector('#native-share').onclick=()=>nativeShare('your favorite app');
document.querySelector('#share-messages').onclick=()=>nativeShare('Messages');
document.querySelector('#share-instagram').onclick=()=>nativeShare('Instagram');
document.querySelector('#share-x').onclick=()=>{
  if(!shareFile)return;downloadCard();
  window.open('https://x.com/intent/post?text='+encodeURIComponent('Made a little something, one stitch at a time. ♡'),'_blank','noopener,noreferrer');
  shareNote.textContent='Card saved and X opened. Attach '+shareFile.name+' to your post.';
};
document.querySelector('#download-card').onclick=()=>{downloadCard();shareNote.textContent='Image saved.';toast('Image saved');};
document.querySelector('#copy-card').onclick=async()=>{
  if(!shareBlob)return;
  try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Unsupported');await navigator.clipboard.write([new ClipboardItem({'image/png':shareBlob})]);shareNote.textContent='Image copied. Paste it into a message or post.';toast('Image copied');}
  catch{shareNote.textContent='Image copying isn’t available here. Use Save image to attach the card instead.';}
};
status();
