/* A lightweight canopy shader. Decorative only; never intercepts the needle. */
(()=>{
  const canvas=document.createElement('canvas');canvas.className='sunlight-layer';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl){canvas.remove();document.body.classList.add('sunlight-fallback');return;}
  const vertex=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const fragment=`precision highp float;
    varying vec2 v_uv;uniform vec2 u_size;uniform float u_time;uniform float u_scroll;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
    float leaves(vec2 p,float t){
      vec2 cell=floor(p);float shadow=0.;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 id=cell+vec2(float(x),float(y));float seed=hash(id);
        vec2 center=id+vec2(.18+.65*seed,.18+.65*hash(id+31.));
        center+=.045*vec2(sin(t*.36+seed*6.),cos(t*.29+seed*9.));
        vec2 q=p-center;float angle=seed*6.283+.11*sin(t*.33+seed*8.);
        float c=cos(angle),s=sin(angle);q=mat2(c,-s,s,c)*q;
        vec2 radius=vec2(.18+.13*hash(id+7.),.36+.22*hash(id+13.));
        float shape=length(q/radius);float edge=.96+.06*sin(q.y*19.+seed*12.);
        float leaf=1.-smoothstep(edge-.2,edge+.24,shape);
        float cluster=smoothstep(.25,.65,noise(id*.29+vec2(5.,2.)));
        shadow=max(shadow,leaf*(.2+.8*cluster));
      }
      return shadow;
    }
    void main(){
      float aspect=u_size.x/u_size.y;
      vec2 p=vec2(v_uv.x*aspect,1.-v_uv.y+u_scroll)*11.;
      p+=vec2(.09*sin(u_time*.12),.065*cos(u_time*.16));
      p+=vec2(noise(p*.42),noise(p*.42+8.))*.28;
      float leaf=leaves(p,u_time);
      float canopy=noise(p*.42+vec2(12.,4.));
      float branch=1.-smoothstep(.04,.18,abs(p.y-(1.1+p.x*.42+.12*sin(p.x*.8+u_time*.12))));
      float shade=clamp(leaf*.85+smoothstep(.44,.8,canopy)*.2+branch*.26,0.,1.);
      // Warm gaps between cooler, soft leaf shadows retain readable controls.
      vec3 ink=mix(vec3(1.,.94,.72),vec3(.22,.27,.14),smoothstep(.05,.5,shade));
      float alpha=mix(.025,.12,smoothstep(.05,.9,shade));
      gl_FragColor=vec4(ink,alpha);
    }`;
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Canopy shader unavailable');}return shader;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Canopy program unavailable');}
  catch{canvas.remove();document.body.classList.add('sunlight-fallback');return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const size=gl.getUniformLocation(program,'u_size'),time=gl.getUniformLocation(program,'u_time'),scroll=gl.getUniformLocation(program,'u_scroll');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0,lost=false;
  function draw(now){if(lost)return;gl.uniform2f(size,innerWidth,innerHeight);gl.uniform1f(time,reduced.matches?0:now*.001);gl.uniform1f(scroll,scrollY/innerHeight);gl.drawArrays(gl.TRIANGLES,0,6);}
  function loop(now){frame=0;if(document.hidden||reduced.matches||lost)return;if(now-last>=50){draw(now);last=now;}frame=requestAnimationFrame(loop);}
  function restart(){cancelAnimationFrame(frame);frame=0;if(document.hidden||lost)return;draw(performance.now());if(!reduced.matches)frame=requestAnimationFrame(loop);}
  function resize(){const scale=Math.min(.7,Math.sqrt(450000/(innerWidth*innerHeight)));canvas.width=Math.max(1,Math.round(innerWidth*scale));canvas.height=Math.max(1,Math.round(innerHeight*scale));gl.viewport(0,0,canvas.width,canvas.height);restart();}
  addEventListener('resize',resize,{passive:true});addEventListener('scroll',()=>{if(reduced.matches)draw(0);},{passive:true});document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);canvas.remove();document.body.classList.add('sunlight-fallback');});resize();
})();
