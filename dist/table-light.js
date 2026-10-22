/* A photographic canopy, blended over the worktable like real shade. */
(()=>{
  const layout=new URLSearchParams(location.search).get('layout');
  document.documentElement.dataset.progressLayout=['left','inline','footer'].includes(layout)?layout:'inline';
  const shade=document.createElement('div');
  shade.className='tree-shadow';shade.setAttribute('aria-hidden','true');
  document.body.append(shade);
  document.addEventListener('visibilitychange',()=>shade.style.animationPlayState=document.hidden?'paused':'running');
})();
