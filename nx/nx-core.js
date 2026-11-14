/* NEON INVASION - REMAKE render core.
   HDR pipeline (bloom, light shafts, filmic curve, grade), sun shadows, procedural sky and ocean,
   automatic static batching, GPU particles, dynamic resolution and quality presets.
   Loaded before the game script; the game calls into window.NIX at a handful of hook points. */
(function(){
'use strict';
if(typeof THREE==='undefined')return;
const NIX=window.NIX={ok:true,gpuWater:true};
let R=null,scene=null,camera=null,canvas=null,gl=null,PANE=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ------------------------------------------------------------------ quality */
const PRESETS=[
  {name:'LOW',   dpr:1,   scale:0.72,msaa:0,shadow:0,   shadowR:0,  shadowEvery:0,bloomLv:4,rays:false,ca:false,clouds:1,interior:false},
  {name:'MEDIUM',dpr:1,   scale:0.9, msaa:0,shadow:1024,shadowR:95, shadowEvery:2,bloomLv:5,rays:false,ca:false,clouds:1,interior:true},
  {name:'HIGH',  dpr:1.25,scale:1,   msaa:2,shadow:2048,shadowR:120,shadowEvery:1,bloomLv:5,rays:true, ca:true, clouds:1,interior:true},
  {name:'ULTRA', dpr:2,   scale:1,   msaa:4,shadow:4096,shadowR:150,shadowEvery:1,bloomLv:6,rays:true, ca:true, clouds:1,interior:true}
];
const G=NIX.G={level:1,dyn:true,retro:false,bloom:100,scale:1,dynScale:1};
let Q=PRESETS[1];
NIX.presetNames=PRESETS.map(p=>p.name);
function detectLevel(){
  let s='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');s=String(e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'');}catch(e){}
  NIX.gpuName=s;
  if(/SwiftShader|llvmpipe|Software|Basic Render/i.test(s))return 0;
  if(/(RTX|GTX 1[0-9]|GTX 9[5-9]|RX [5-9]\d{2,3}|RX Vega|Arc\(TM\) A|Apple M\d|Radeon Pro)/i.test(s))return 2;
  if(/Intel|UHD|HD Graphics|Iris|Mali|Adreno|PowerVR/i.test(s))return 1;
  return 2;
}

/* ------------------------------------------------------------------ global shader patches */
/* saturated, bright unlit colours (every neon tube, rim, sign and laser in the game is a MeshBasicMaterial) go over 1.0 so the bloom picks them up */
(function(){
  const L=THREE.ShaderLib,re=/gl_FragColor\s*=\s*vec4\(\s*outgoingLight\s*,\s*diffuseColor\.a\s*\)\s*;/;
  const boost='{float nxM=max(outgoingLight.r,max(outgoingLight.g,outgoingLight.b)),nxm=min(outgoingLight.r,min(outgoingLight.g,outgoingLight.b));float nxS=(nxM-nxm)/max(nxM,1e-3);outgoingLight*=1.0+1.15*nxS*smoothstep(0.35,0.85,nxM)+0.25*smoothstep(0.9,1.0,nxm);}gl_FragColor=vec4(outgoingLight,diffuseColor.a);';
  if(L&&L.basic&&re.test(L.basic.fragmentShader))L.basic.fragmentShader=L.basic.fragmentShader.replace(re,boost);
  if(L&&L.sprite){const rs=/gl_FragColor\s*=\s*vec4\(\s*outgoingLight\s*,\s*diffuseColor\.a\s*\)\s*;/;if(rs.test(L.sprite.fragmentShader))L.sprite.fragmentShader=L.sprite.fragmentShader.replace(rs,'outgoingLight*=1.25;gl_FragColor=vec4(outgoingLight,diffuseColor.a);');}
})();
/* shadows: three's stock PCF reads the shadow map 17 times per pixel, which is most of a frame on integrated graphics.
   This is one bilinear-weighted 2x2 lookup (4 reads, smooth edges) that also fades out toward the edge of the shadowed area. */
(function(){
  const C=THREE.ShaderChunk,re=/#if defined\(\s*SHADOWMAP_TYPE_PCF\s*\)[\s\S]*?#elif defined\(\s*SHADOWMAP_TYPE_PCF_SOFT\s*\)/;
  if(C&&C.shadowmap_pars_fragment&&re.test(C.shadowmap_pars_fragment))C.shadowmap_pars_fragment=C.shadowmap_pars_fragment.replace(re,`#if defined( SHADOWMAP_TYPE_PCF )
      vec2 nxTs=vec2(1.0)/shadowMapSize;vec2 nxUv=shadowCoord.xy*shadowMapSize-0.5;vec2 nxFr=fract(nxUv);vec2 nxB=(floor(nxUv)+0.5)*nxTs;
      float nxA=texture2DCompare(shadowMap,nxB,shadowCoord.z),nxBb=texture2DCompare(shadowMap,nxB+vec2(nxTs.x,0.0),shadowCoord.z),nxC=texture2DCompare(shadowMap,nxB+vec2(0.0,nxTs.y),shadowCoord.z),nxD=texture2DCompare(shadowMap,nxB+nxTs,shadowCoord.z);
      shadow=mix(mix(nxA,nxBb,nxFr.x),mix(nxC,nxD,nxFr.x),nxFr.y);
      vec2 nxE=abs(shadowCoord.xy-0.5)*2.0;shadow=mix(shadow,1.0,smoothstep(0.82,1.0,max(nxE.x,nxE.y)));
    #elif defined( SHADOWMAP_TYPE_PCF_SOFT )`);
})();
/* helper: add code to a stock material's shader */
function patch(mat,fn,key){mat.extensions={derivatives:true};mat.onBeforeCompile=fn;mat.customProgramCacheKey=()=>key;mat.userData.nx=1;return mat;}
const RE_SHADOW=/BRDF_Diffuse_Lambert\(\s*diffuseColor\.rgb\s*\)\s*\*\s*getShadowMask\(\)/;
const U={   // uniforms shared by every patched material
  nxTime:{value:0},nxNight:{value:0},nxSunDir:{value:new THREE.Vector3(0.15,0.2,1).normalize()},nxSunCol:{value:new THREE.Color(1,0.6,0.4)},
  nxSkyA:{value:new THREE.Color()},nxSkyB:{value:new THREE.Color()},nxSkyC:{value:new THREE.Color()},nxNoise:{value:null},nxWet:{value:0.55},nxWind:{value:1}
};
NIX.U=U;

/* ------------------------------------------------------------------ noise texture (tileable fbm in R,G,B + white noise in A) */
function makeNoise(){
  const N=256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),im=x.createImageData(N,N),d=im.data;
  let seed=1337;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const layer=(cells)=>{const g=new Float32Array(cells*cells);for(let i=0;i<g.length;i++)g[i]=rnd();return (u,v)=>{const fx=u*cells,fy=v*cells,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
    const a=g[(y0%cells)*cells+(x0%cells)],b=g[(y0%cells)*cells+((x0+1)%cells)],cc=g[((y0+1)%cells)*cells+(x0%cells)],dd=g[((y0+1)%cells)*cells+((x0+1)%cells)];return a+(b-a)*sx+(cc-a)*sy+(a-b-cc+dd)*sx*sy;};};
  const fbm=(base)=>{const Ls=[layer(base),layer(base*2),layer(base*4),layer(base*8),layer(base*16)];return (u,v)=>Ls[0](u,v)*0.5+Ls[1](u,v)*0.25+Ls[2](u,v)*0.125+Ls[3](u,v)*0.0625+Ls[4](u,v)*0.0625;};
  const f1=fbm(4),f2=fbm(6),f3=fbm(12);
  for(let y=0;y<N;y++)for(let xx=0;xx<N;xx++){const i=(y*N+xx)*4,u=xx/N,v=y/N;d[i]=f1(u,v)*255;d[i+1]=f2(u,v)*255;d[i+2]=f3(u,v)*255;d[i+3]=rnd()*255;}
  x.putImageData(im,0,0);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.premultiplyAlpha=false;return t;
}

/* ------------------------------------------------------------------ sky */
const SKY_VS='varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}';   // pinned to the far plane and drawn after the city, so hidden sky pixels cost nothing
const SKY_FS=`
uniform vec3 top;uniform vec3 mid;uniform vec3 bot;uniform vec3 nxSunDir;uniform vec3 nxSunCol;uniform float nxNight;uniform float nxTime;uniform sampler2D nxNoise;uniform float uCloud;
varying vec3 vP;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float cl(vec2 cp,vec2 w){return texture2D(nxNoise,cp*0.045+w).r*0.6+texture2D(nxNoise,cp*0.11-w*1.7).g*0.3+texture2D(nxNoise,cp*0.27+w*2.3).b*0.1;}
void main(){
  vec3 d=normalize(vP);float h=d.y;
  vec3 c=mix(bot,mid,smoothstep(0.0,0.22,h));c=mix(c,top,smoothstep(0.18,0.75,h));
  c+=bot*exp(-abs(h)*9.0)*0.2;
  float sd=dot(d,nxSunDir),sp=max(sd,0.0);
  c+=nxSunCol*(pow(sp,6.0)*0.2+pow(sp,40.0)*0.3)*(1.0-0.5*nxNight);
  if(nxNight>0.02&&h>0.0){
    vec2 sq=d.xz/(h+0.35)*70.0;vec2 ip=floor(sq),fp=fract(sq)-0.5;float r=hash(ip);
    float st=step(0.9,r)*smoothstep(0.2,0.0,length(fp+(vec2(hash(ip+3.1),hash(ip+7.7))-0.5)*0.6));
    st*=0.55+0.45*sin(nxTime*(1.5+r*4.0)+r*40.0);
    c+=vec3(0.8,0.88,1.0)*st*nxNight*smoothstep(0.0,0.12,h)*(0.8+2.2*step(0.985,r));
    float mw=texture2D(nxNoise,d.xz*0.35+d.y*0.2).r;c+=vec3(0.35,0.25,0.6)*smoothstep(0.5,0.85,mw)*nxNight*0.16*smoothstep(0.1,0.5,h);
  }
  if(uCloud>0.0&&h>-0.02){
    vec2 cp=d.xz/(h+0.16)*vec2(0.75,2.1);vec2 w=vec2(nxTime*0.004,nxTime*0.0012);
    float n=cl(cp,w);float cov=smoothstep(0.52,0.84,n);
    if(cov>0.001){
      float n2=cl(cp+nxSunDir.xz*0.9,w);
      float lit=clamp((n-n2)*3.5+0.55,0.0,1.0);
      vec3 cc=mix(mid*0.8+bot*0.25,bot*1.25+nxSunCol*0.4,lit);
      cc+=nxSunCol*pow(sp,5.0)*0.55*(1.0-nxNight);
      cc=mix(cc,cc*0.3+vec3(0.04,0.03,0.1),nxNight*0.75);
      float fade=smoothstep(-0.02,0.1,h)*(1.0-smoothstep(0.5,0.95,h)*0.5);
      c=mix(c,cc,cov*fade*0.62);
    }
  }
  if(sd>0.9){
    vec3 sx=normalize(cross(vec3(0.0,1.0,0.0),nxSunDir)),sy=cross(nxSunDir,sx);
    vec2 p=vec2(dot(d,sx),dot(d,sy))/(sd*0.167);float r=length(p);
    if(r<1.02){
      float vy=p.y*0.5+0.5;
      vec3 dayC=mix(vec3(1.0,0.2,0.55),vec3(1.0,0.92,0.45),vy)*1.7;
      float mn=texture2D(nxNoise,p*0.22+0.3).g;
      vec3 nightC=mix(vec3(0.7,0.8,1.0),vec3(0.92,0.96,1.0),vy)*(1.05+0.35*(mn-0.5))*1.25;
      float a=1.0-smoothstep(0.985,1.02,r);
      float lower=clamp((0.5-vy)*2.0,0.0,1.0);
      float gap=(1.0-nxNight)*step(fract(vy*14.0),lower*0.75);
      c=mix(c,mix(dayC,nightC,nxNight),a*(1.0-gap));
    }
  }
  c*=mix(1.0,0.55,smoothstep(0.0,-0.25,h));
  gl_FragColor=vec4(c,1.0);
}`;
NIX.skyMaterial=function(){
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:true,depthFunc:THREE.LessEqualDepth,fog:false,
    uniforms:{top:{value:new THREE.Color()},mid:{value:new THREE.Color()},bot:{value:new THREE.Color()},nxSunDir:U.nxSunDir,nxSunCol:U.nxSunCol,nxNight:U.nxNight,nxTime:U.nxTime,nxNoise:U.nxNoise,uCloud:{value:1}},
    vertexShader:SKY_VS,fragmentShader:SKY_FS});
  m.userData.nx=1;NIX.skyMat=m;return m;
};

/* ------------------------------------------------------------------ ocean */
const WATER_VS=`
uniform float nxTime;varying vec3 vW;varying vec2 vL;
#include <fog_pars_vertex>
void main(){
  vec3 p=position;float t=nxTime;
  p.z=sin(p.x*0.02+t*1.3)*0.5+cos(p.y*0.03+t)*0.4+sin(p.x*0.07+p.y*0.05+t*2.1)*0.18;
  vL=p.xy;vec4 w=modelMatrix*vec4(p,1.0);vW=w.xyz;
  vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS=`
uniform vec3 color;uniform float nxTime;uniform float nxNight;uniform vec3 nxSunDir;uniform vec3 nxSunCol;uniform vec3 nxSkyA;uniform vec3 nxSkyB;uniform vec3 nxSkyC;uniform sampler2D nxNoise;
varying vec3 vW;varying vec2 vL;
#include <common>
#include <fog_pars_fragment>
void main(){
  float t=nxTime;float shore=1000.0-vL.y;
  float k=exp(-max(0.0,shore)/260.0);
  vec3 base=color*vec3(0.42+0.62*k,0.62+0.42*k,0.95+0.1*k);
  vec2 uv=vW.xz;
  vec3 n1=texture2D(nxNoise,uv*0.018+vec2(t*0.012,t*0.02)).rgb,n2=texture2D(nxNoise,uv*0.055-vec2(t*0.03,t*0.017)).rgb,n3=texture2D(nxNoise,uv*0.17+vec2(t*0.05,-t*0.04)).rgb;
  vec2 rip=(n1.rg-0.5)*0.5+(n2.gb-0.5)*0.34+(n3.rb-0.5)*0.2;
  float dx=0.01*cos(vL.x*0.02+t*1.3)+0.0126*cos(vL.x*0.07+vL.y*0.05+t*2.1);
  float dz=0.012*sin(vL.y*0.03+t)-0.009*cos(vL.x*0.07+vL.y*0.05+t*2.1);
  vec3 N=normalize(vec3(-dx-rip.x*0.55,1.0,dz-rip.y*0.55));
  vec3 V=normalize(cameraPosition-vW);
  float ndv=max(dot(N,V),0.0);
  float F=0.03+0.97*pow(1.0-ndv,4.0);
  vec3 Rr=reflect(-V,N);Rr.y=abs(Rr.y);
  vec3 sky=mix(nxSkyA,nxSkyB,smoothstep(0.0,0.3,Rr.y));sky=mix(sky,nxSkyC,smoothstep(0.25,0.9,Rr.y));
  float sp=max(dot(Rr,nxSunDir),0.0);
  vec3 spec=nxSunCol*(pow(sp,260.0)*5.0+pow(sp,28.0)*0.35)*(1.0-0.45*nxNight);
  float spk=smoothstep(0.86,1.0,n3.g)*smoothstep(0.55,1.0,n2.r)*pow(sp,6.0);
  spec+=nxSunCol*spk*3.0;
  float lam=0.62+0.38*max(dot(N,nxSunDir),0.0);
  vec3 c=mix(base*lam*(1.0-0.3*nxNight),sky,F)+spec;
  float wob=sin(vL.x*0.05+t*0.8)*3.0+(n1.b-0.5)*8.0;
  float foam=smoothstep(12.0,0.0,shore+wob)*(0.55+0.45*n2.g);
  float band=smoothstep(0.86,1.0,sin(shore*0.3-t*1.4+n1.r*5.0))*smoothstep(70.0,6.0,shore)*smoothstep(0.35,0.7,n2.b);
  c=mix(c,vec3(0.95,0.98,1.0)*(1.0-0.5*nxNight),clamp(foam+band*0.6,0.0,1.0));
  gl_FragColor=vec4(c,1.0);
  #include <fog_fragment>
}`;
NIX.waterMaterial=function(){
  const u=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{color:{value:new THREE.Color(0x16b5c8)}}]);
  Object.assign(u,{nxTime:U.nxTime,nxNight:U.nxNight,nxSunDir:U.nxSunDir,nxSunCol:U.nxSunCol,nxSkyA:U.nxSkyA,nxSkyB:U.nxSkyB,nxSkyC:U.nxSkyC,nxNoise:U.nxNoise});
  const m=new THREE.ShaderMaterial({uniforms:u,vertexShader:WATER_VS,fragmentShader:WATER_FS,fog:true});
  m.color=u.color.value;m.userData.nx=1;return m;
};

/* ------------------------------------------------------------------ ground: wet asphalt + paving */
const WPOS_V='varying vec3 nxW;\n',WPOS_SET='\n#ifdef USE_INSTANCING\nnxW=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\nnxW=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif\n';
function addWorldPos(sh){sh.vertexShader=WPOS_V+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>'+WPOS_SET);}
function shareU(sh,names){for(const n of names)sh.uniforms[n]=U[n];}
const WET_PARS='varying vec3 nxW;uniform sampler2D nxNoise;uniform vec3 nxSunDir;uniform vec3 nxSunCol;uniform vec3 nxSkyA;uniform vec3 nxSkyB;uniform float nxNight;uniform float nxWet;uniform float nxTime;\n';
NIX.patchGround=function(mat){
  return patch(mat,sh=>{
    shareU(sh,['nxNoise','nxSunDir','nxSunCol','nxSkyA','nxSkyB','nxNight','nxWet','nxTime']);addWorldPos(sh);
    sh.fragmentShader=WET_PARS+sh.fragmentShader
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 nxA=texture2D(nxNoise,nxW.xz*0.06).rgb,nxB=texture2D(nxNoise,nxW.xz*0.011+0.37).rgb,nxC=texture2D(nxNoise,nxW.xz*0.31).rgb;
        float nxGrain=(nxC.b-0.5)*0.34+(nxA.g-0.5)*0.3;
        float nxPud=smoothstep(0.56,0.7,nxB.r*0.7+nxA.r*0.3);
        diffuseColor.rgb*=(1.0+nxGrain)*(1.0-0.1*nxPud)*(0.94+0.12*nxB.g);
        float nxSh=1.0;`)
      .replace(RE_SHADOW,'BRDF_Diffuse_Lambert( diffuseColor.rgb ) * (nxSh=getShadowMask())')
      .replace('#include <envmap_fragment>',`
        {vec3 V=normalize(cameraPosition-nxW);vec3 N=normalize(vec3((nxC.r-0.5)*0.16*(1.0-nxPud),1.0,(nxC.g-0.5)*0.16*(1.0-nxPud)));
         float ndv=max(dot(N,V),0.0);float F=pow(1.0-ndv,5.0);float wet=nxWet*(0.35+0.65*nxPud);
         vec3 Rr=reflect(-V,N);vec3 sky=mix(nxSkyA,nxSkyB,smoothstep(0.0,0.35,Rr.y));
         float sp=max(dot(Rr,nxSunDir),0.0);
         vec3 spec=nxSunCol*(pow(sp,mix(40.0,220.0,nxPud))*mix(0.5,2.6,nxPud))*nxSh*(1.0-0.5*nxNight);
         outgoingLight=mix(outgoingLight,sky*(0.55+0.45*nxSh),F*wet*0.85)+spec*wet;}
        #include <envmap_fragment>`);
  },'nxGround');
};
NIX.patchSlab=function(mat){
  return patch(mat,sh=>{
    shareU(sh,['nxNoise']);addWorldPos(sh);
    sh.fragmentShader='varying vec3 nxW;uniform sampler2D nxNoise;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      {vec2 g=nxW.xz/3.0;vec2 f=abs(fract(g)-0.5);float ln=smoothstep(0.47,0.5,max(f.x,f.y));
       vec3 nz=texture2D(nxNoise,nxW.xz*0.09).rgb;float tile=fract(sin(dot(floor(g),vec2(12.9898,78.233)))*43758.5453);
       float top=step(0.5,abs(normalize(cross(dFdx(nxW),dFdy(nxW))).y));
       diffuseColor.rgb*=mix(1.0,(0.9+0.14*tile+(nz.b-0.5)*0.22)*(1.0-0.3*ln),top);
       diffuseColor.rgb*=mix(0.72,1.0,top);}`);
  },'nxSlab');
};
NIX.patchSand=function(mat){
  return patch(mat,sh=>{
    shareU(sh,['nxNoise']);addWorldPos(sh);
    sh.fragmentShader='varying vec3 nxW;uniform sampler2D nxNoise;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      {vec3 a=texture2D(nxNoise,nxW.xz*0.035).rgb,b=texture2D(nxNoise,nxW.xz*0.4).rgb;
       float rip=sin(nxW.z*1.6+a.r*9.0)*0.5+0.5;
       diffuseColor.rgb*=0.88+0.2*a.g+(b.b-0.5)*0.16+rip*0.05;}`);
  },'nxSand');
};
/* palm fronds sway in the wind (vertex colour alpha is not available, so the sway grows with height and distance from the trunk) */
NIX.patchFoliage=function(mat,h0,h1){
  return patch(mat,sh=>{
    shareU(sh,['nxTime','nxWind']);
    sh.vertexShader='uniform float nxTime;uniform float nxWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      {float nxH=smoothstep(${h0.toFixed(1)},${h1.toFixed(1)},position.y);float nxR=length(position.xz);
       #ifdef USE_INSTANCING
       float nxP=instanceMatrix[3][0]*0.13+instanceMatrix[3][2]*0.17;
       #else
       float nxP=0.0;
       #endif
       float s1=sin(nxTime*1.3+nxP),s2=sin(nxTime*2.9+nxP*1.7+nxR*0.7);
       transformed.x+=(s1*0.22*nxH+s2*0.05*nxR*nxH)*nxWind;transformed.z+=(cos(nxTime*1.1+nxP)*0.16*nxH)*nxWind;
       transformed.y+=s2*0.07*nxR*nxH*nxWind;}`);
  },'nxFol'+h0+'_'+h1);
};

/* ------------------------------------------------------------------ Blender-made geometry (nx-assets.js) */
const GEO={};
function b64(s){const b=atob(s),n=b.length,u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=b.charCodeAt(i);return u;}
NIX.geo=function(name){
  if(GEO[name]!==undefined)return GEO[name];
  const A=window.NX_ASSETS&&window.NX_ASSETS.geo&&window.NX_ASSETS.geo[name];if(!A)return GEO[name]=null;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b64(A.p).buffer),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(b64(A.n).buffer),3,true));
  if(A.c)g.setAttribute('color',new THREE.BufferAttribute(b64(A.c),3,true));
  if(A.u)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(b64(A.u).buffer),2));
  if(A.g)g.setAttribute('aGlow',new THREE.BufferAttribute(b64(A.g),1,true));
  const ib=b64(A.i).buffer;g.setIndex(new THREE.BufferAttribute(A.i32?new Uint32Array(ib):new Uint16Array(ib),1));
  g.computeBoundingSphere();g.computeBoundingBox();g.userData=A.m||{};
  return GEO[name]=g;
};
NIX.has=name=>!!(window.NX_ASSETS&&window.NX_ASSETS.geo&&window.NX_ASSETS.geo[name]);

/* ------------------------------------------------------------------ scattered instances (palms, lane paint): split into city cells so they frustum-cull, with a cheap far model */
const SCAT=[];
/* No pop-in: every instance fades by a screen-door dither on its own distance from the camera. The near model dissolves into
   the far model across a band round the swap distance (the two use opposite halves of one dither pattern, so together they
   always cover every pixel exactly once), and everything dissolves out before the draw limit instead of vanishing.
   mode 0 = near model (or the only model), mode 1 = far model. nxFade = (swap start, swap end, limit start, limit end). */
function fadeMat(src,mode){
  const m=src.clone(),f0=src.onBeforeCompile,k0=src.customProgramCacheKey(),u={value:new THREE.Vector4(1e8,1e8+1,1e8,1e8+1)};
  if(src.defines)m.defines=Object.assign({},src.defines);if(src.extensions)m.extensions=src.extensions;
  m.onBeforeCompile=function(sh,r){
    if(f0!==defOBC)f0.call(this,sh,r);
    const reM=/void\s+main\s*\(\s*\)\s*\{/,pv='#include <project_vertex>';
    if(sh.vertexShader.indexOf(pv)<0||!reM.test(sh.fragmentShader))return;   // anchors missing: leave the stock shader (no fade, but nothing breaks)
    sh.uniforms.nxFade=u;
    sh.vertexShader='uniform vec4 nxFade;varying float nxFv;\n'+sh.vertexShader.replace(pv,pv+`
      {
      #ifdef USE_INSTANCING
      float nxD=length((modelViewMatrix*instanceMatrix[3]).xyz);
      #else
      float nxD=length(modelViewMatrix[3].xyz);
      #endif
      float nxS=smoothstep(nxFade.x,nxFade.y,nxD);
      nxFv=${mode?'nxS':'(1.0-nxS)'}*(1.0-smoothstep(nxFade.z,nxFade.w,nxD));
      if(nxFv<=0.0)gl_Position=vec4(2.0,2.0,2.0,1.0);}`);   // fully faded instances are thrown off screen so they cost no pixels
    sh.fragmentShader='varying float nxFv;\n'+sh.fragmentShader.replace(reM,`void main() {
      if(nxFv<1.0){float nxN=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));if(${mode?'nxFv<1.0-nxN':'nxFv<=nxN'})discard;}`);
  };
  m.customProgramCacheKey=()=>k0+'|nxFade'+mode;m.userData.nx=1;m.userData.nxFade=u;
  return m;
}
NIX.scatter=function(geoHi,geoLo,mat,mats,o){
  o=Object.assign({cell:88,cellLo:0,lod:140,max:1e9,cast:true,recv:true,radius:8,height:12},o||{});
  const grp=new THREE.Group();grp._nxNo=1;
  const matHi=fadeMat(mat,0),matLo=geoLo?fadeMat(mat,1):null;grp.userData.mat=matHi;grp.userData.matLo=matLo;   // callers that animate the material (lamp glow colour) use these copies
  const t=new THREE.Matrix4(),off=new THREE.Matrix4();
  /* one InstancedMesh per city cell. The near model can use smaller cells than the far one (cellLo): near cells are switched by
     distance, and the finer they are, the fewer detailed models are sent to the GPU only to be faded out. */
  const build=(geo,cell,mat)=>{
    const cells=new Map(),out=[];
    for(const m of mats){const e=m.elements,kx=Math.floor(e[12]/cell),kz=Math.floor(e[14]/cell),k=kx+','+kz;let c=cells.get(k);if(!c){c={cx:(kx+0.5)*cell,cz:(kz+0.5)*cell,list:[]};cells.set(k,c);}c.list.push(m);}
    for(const c of cells.values()){
      const g=new THREE.BufferGeometry();for(const k in geo.attributes)g.setAttribute(k,geo.attributes[k]);if(geo.index)g.setIndex(geo.index);
      g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,o.height/2,0),cell*0.71+o.radius+o.height/2);
      const im=new THREE.InstancedMesh(g,mat,c.list.length);im._nxNo=1;im._nxF=1;
      im.frustumCulled=true;   // r128 switches culling OFF for every InstancedMesh; each cell has a bounding sphere (above), so cells behind or beside the camera are skipped
      off.makeTranslation(-c.cx,0,-c.cz);c.list.forEach((m,i)=>{t.multiplyMatrices(off,m);im.setMatrixAt(i,t);});
      im.position.set(c.cx,0,c.cz);im.updateMatrix();im.matrixAutoUpdate=false;im.castShadow=o.cast;im.receiveShadow=o.recv;grp.add(im);out.push({cx:c.cx,cz:c.cz,m:im});
    }
    return out;
  };
  const cLo=o.cellLo||o.cell,MOVE=8;   // MOVE: how far the camera can travel between two visibility checks
  const set={o,hi:build(geoHi,o.cell,matHi),lo:geoLo?build(geoLo,cLo,matLo):null,uHi:matHi.userData.nxFade,uLo:matLo?matLo.userData.nxFade:null,sHi:o.cell*0.71+MOVE,sLo:cLo*0.71+MOVE};   // sHi / sLo: half a cell's diagonal plus MOVE
  if(set.lo)for(const c of set.lo)c.m.visible=false;   // the far model casts shadows too, so a palm's shadow does not vanish at the swap
  SCAT.push(set);return grp;
};
NIX.scatterFrom=function(inst,o){const L=[];for(let i=0;i<inst.count;i++){const m=new THREE.Matrix4();inst.getMatrixAt(i,m);L.push(m);}return NIX.scatter(inst.geometry,null,inst.material,L,o);};
let scatN=0;
function updScatter(){
  if((scatN++%3)!==0)return;const cx=camera.position.x,cz=camera.position.z;
  for(const s of SCAT){const lod=s.o.lod*(Q.shadow?1:0.8),mx=s.o.max,l0=lod*0.86,l1=lod*1.14,m0=mx*0.84;
    const sh=s.o.cast?Q.shadowR*1.6+2.1*s.o.height:-1;   // only cells close enough for their shadows to land inside the shadowed area are drawn into the shadow map
    /* the fade itself happens per instance in the shader (fadeMat); a whole cell is only switched off once every instance in it has fully faded */
    if(s.lo){s.uHi.value.set(l0,l1,m0,mx);s.uLo.value.set(l0,l1,m0,mx);
      for(const c of s.hi){const d=Math.hypot(cx-c.cx,cz-c.cz)-s.sHi;c.m.visible=d<l1;c.m.castShadow=d<sh;}
      for(const c of s.lo){const d=Math.hypot(cx-c.cx,cz-c.cz);c.m.visible=d+s.sLo>l0&&d-s.sLo<mx;c.m.castShadow=d-s.sLo<sh;}
    }else{s.uHi.value.set(1e8,1e8+1,m0,mx);for(const c of s.hi){const d=Math.hypot(cx-c.cx,cz-c.cz)-s.sHi;c.m.visible=d<mx;c.m.castShadow=d<sh;}}
  }
}
/* ------------------------------------------------------------------ buildings: one merged mesh per city cell, windows drawn in the shader */
const FAC=[];let facMat=null,facMeshes=[];
NIX.building=function(b,kind,colHex,neonHex){
  if(kind!==''&&kind!=='wall'&&kind!=='lintel')return false;
  FAC.push({b,kind,col:colHex,neon:neonHex});return true;
};
function facadeMaterial(){
  const m=new THREE.MeshLambertMaterial({vertexColors:true});
  return patch(m,sh=>{
    shareU(sh,['nxNoise','nxNight','nxSkyA','nxSkyB','nxSunDir','nxSunCol','nxTime']);
    sh.vertexShader='attribute vec4 aInfo;attribute vec3 aNeon;varying vec2 vFuv;varying vec4 vInfo;varying vec3 vVts;varying vec3 vNeon;varying vec3 vWp;\n'+sh.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      {vec3 wp=(modelMatrix*vec4(transformed,1.0)).xyz;vec3 dd=wp-cameraPosition;vec3 T=vec3(normal.z,0.0,-normal.x);
       vVts=vec3(dot(dd,T),dd.y,-dot(dd,normal));vFuv=uv;vInfo=aInfo;vNeon=aNeon;vWp=wp;}`);
    sh.fragmentShader=`varying vec2 vFuv;varying vec4 vInfo;varying vec3 vVts;varying vec3 vNeon;varying vec3 vWp;
      uniform sampler2D nxNoise;uniform float nxNight;uniform vec3 nxSkyA;uniform vec3 nxSkyB;uniform vec3 nxSunDir;uniform vec3 nxSunCol;uniform float nxTime;
      float nxH(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      `+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 nxEm=vec3(0.0);float nxGlass=0.0;
      {
        float flag=vInfo.w,seed=vInfo.z;
        vec3 nz=texture2D(nxNoise,vec2(vWp.x+vWp.z,vWp.y)*0.035).rgb;
        if(flag<1.5){
          vec2 cell=floor(vFuv),f=fract(vFuv);
          float ground=step(cell.y,0.5)*step(flag,0.5);
          vec2 mrg=mix(vec2(0.17,0.2),vec2(0.07,0.1),ground);
          vec2 e=smoothstep(mrg-0.012,mrg+0.012,f)*smoothstep(mrg-0.012,mrg+0.012,1.0-f);
          float win=e.x*e.y;
          vec2 fr=smoothstep(mrg-0.07,mrg-0.05,f)*smoothstep(mrg-0.07,mrg-0.05,1.0-f);
          float frame=fr.x*fr.y-win;
          float rnd=nxH(cell+seed*17.13),rnd2=nxH(cell*1.7+seed*3.1+5.0);
          float lit=step(rnd,mix(0.14,0.62,nxNight)+0.25*ground);
          float flick=1.0-0.5*step(0.985,rnd2)*step(0.5,fract(nxTime*3.0+rnd*9.0));
          vec3 wall=diffuseColor.rgb*(0.9+0.2*nz.r)*(0.82+0.18*smoothstep(0.0,9.0,vWp.y));
          wall*=1.0-0.16*smoothstep(0.42,0.5,abs(f.y-0.5))*(1.0-win);
          vec3 glass=mix(vec3(0.05,0.06,0.13),vec3(0.1,0.13,0.24),f.y);
          vec3 vd=normalize(vVts);
          float fres=pow(1.0-clamp(vd.z,0.0,1.0),3.0);
          vec3 refl=mix(nxSkyA,nxSkyB,clamp(0.3+f.y*0.5-vd.y*0.6,0.0,1.0));
          glass=mix(glass,refl,0.22+0.6*fres);
          vec3 room=vec3(0.0);
          #ifdef NX_INTERIOR
          if(lit>0.5&&flag<0.5){
            vec3 ro=vec3(f,0.0);vec3 rd=vec3(vVts.x/vInfo.x,vVts.y/vInfo.y,max(vVts.z,1e-3)/3.4);
            vec3 tt=(step(vec3(0.0),rd)-ro)/rd;float tm=min(tt.x,min(tt.y,tt.z));vec3 hp=ro+rd*tm;
            float sh=tt.z<=tm+1e-4?1.0:(tt.y<=tm+1e-4?(rd.y>0.0?1.25:0.5):0.72);
            float furn=step(0.55,nxH(floor(hp.xy*vec2(3.0,2.0))+cell+seed))*step(tt.z,tm+1e-4)*step(hp.y,0.5);
            vec3 tint=mix(vec3(1.0,0.82,0.52),mix(vec3(0.5,0.95,1.0),vec3(1.0,0.45,0.85),step(0.5,rnd2)),step(0.72,nxH(cell+seed+9.0)));
            room=tint*sh*(1.0-0.45*furn)*(1.0-0.5*hp.z)*(0.75+0.5*rnd2);
          }else
          #endif
          if(lit>0.5){
            vec3 tint=mix(vec3(1.0,0.82,0.52),mix(vec3(0.5,0.95,1.0),vec3(1.0,0.45,0.85),step(0.5,rnd2)),step(0.72,nxH(cell+seed+9.0)));
            room=tint*(0.7+0.3*f.y)*(0.75+0.5*rnd2);
          }
          vec2 mul=abs(f-0.5);float bar=(1.0-smoothstep(0.012,0.02,mul.x))*(1.0-ground)+(1.0-smoothstep(0.01,0.018,abs(f.y-0.62)))*(1.0-ground);
          room*=flick*(1.0-0.6*bar);
          float litK=lit*mix(0.5,1.45,nxNight);
          nxEm=room*win*litK;
          vec3 store=vNeon*(0.35+0.65*nxNight);
          nxEm+=store*ground*frame*1.6;
          diffuseColor.rgb=mix(wall,glass*(1.0-0.75*lit),win);
          diffuseColor.rgb=mix(diffuseColor.rgb,wall*0.55,frame*(1.0-ground));
          nxGlass=win*(1.0-lit);
        }else{
          diffuseColor.rgb*=0.85+0.25*nz.g;
        }
      }`).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=nxEm;')
       .replace(RE_SHADOW,'BRDF_Diffuse_Lambert( diffuseColor.rgb ) * (nxShv=getShadowMask())')
       .replace('void main() {','float nxShv=1.0;\nvoid main() {')
       .replace('#include <envmap_fragment>',`
        {vec3 Vw=normalize(cameraPosition-vWp);vec3 Rr=reflect(-Vw,normalize(cross(dFdx(vWp),dFdy(vWp))));
         float sp=max(dot(Rr,nxSunDir),0.0);outgoingLight+=nxSunCol*pow(sp,90.0)*2.2*nxGlass*nxShv*(1.0-0.6*nxNight);}
        #include <envmap_fragment>`);
  },'nxFacade'+(Q.interior?1:0));
}
function buildFacades(){
  if(!FAC.length)return;
  const cells=new Map(),CS=176,tmpC=new THREE.Color();
  for(const it of FAC){const b=it.b,key=Math.floor(b.x/CS)+','+Math.floor(b.z/CS);let a=cells.get(key);if(!a){a=[];cells.set(key,a);}a.push(it);}
  facMat=facadeMaterial();facMat.defines=Q.interior?{NX_INTERIOR:1}:{};
  for(const arr of cells.values()){
    const P=[],Nn=[],Cc=[],Uv=[],In=[],Ne=[],Ix=[];let v=0;
    const quad=(p,n,c,uvs,info,neon)=>{for(let i=0;i<4;i++){P.push(p[i][0],p[i][1],p[i][2]);Nn.push(n[0],n[1],n[2]);Cc.push(c.r,c.g,c.b);Uv.push(uvs[i][0],uvs[i][1]);In.push(info[0],info[1],info[2],info[3]);Ne.push(neon.r,neon.g,neon.b);}Ix.push(v,v+1,v+2,v,v+2,v+3);v+=4;};
    for(const it of arr){
      const b=it.b,y0=(b.y0||0)+0.2,y1=b.h+0.2,h=y1-y0,x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
      const c=new THREE.Color(it.col),neon=new THREE.Color(it.neon),seed=((b.x*0.37+b.z*0.73)%7+7)%7;
      const thin=it.kind==='wall'||it.kind==='lintel';
      const side=(ax,az,bx,bz,nx,nz,len)=>{
        const small=len<6||h<5;
        const nb=Math.max(1,Math.round(len/5)),nf=Math.max(1,Math.round(h/4.2));
        const flag=small?2:(thin?1:0);
        quad([[ax,y0,az],[bx,y0,bz],[bx,y1,bz],[ax,y1,az]],[nx,0,nz],c,[[0,0],[nb,0],[nb,nf],[0,nf]],[len/nb,h/nf,seed+nx*1.3+nz*2.1,(it.kind==='lintel')?2:flag],neon);
      };
      side(x0,z1,x1,z1,0,1,b.w);side(x1,z1,x1,z0,1,0,b.d);side(x1,z0,x0,z0,0,-1,b.w);side(x0,z0,x0,z1,-1,0,b.d);
      const dark=tmpC.copy(c).multiplyScalar(0.6);
      quad([[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],[0,1,0],dark,[[0,0],[1,0],[1,1],[0,1]],[1,1,seed,2],neon);
      if((b.y0||0)>0)quad([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[0,-1,0],dark,[[0,0],[1,0],[1,1],[0,1]],[1,1,seed,2],neon);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(Uv,2));g.setAttribute('aInfo',new THREE.Float32BufferAttribute(In,4));g.setAttribute('aNeon',new THREE.Float32BufferAttribute(Ne,3));
    g.setIndex(Ix);g.computeBoundingSphere();g.computeBoundingBox();
    const m=new THREE.Mesh(g,facMat);m._nxNo=1;m._nxF=1;m.castShadow=true;m.receiveShadow=true;m.matrixAutoUpdate=false;m.renderOrder=-6;scene.add(m);facMeshes.push(m);
  }
}

/* ------------------------------------------------------------------ automatic static batching
   The city is thousands of little meshes with a material each. After a short observation window, everything that never
   moved or changed is merged into a handful of big vertex-coloured meshes per city cell. The originals stay in the scene
   (on a layer the camera does not draw) and are watched: the moment the game touches one, it is pulled back out. */
const BT={state:0,frame:0,cand:null,sources:[],chunks:[],anc:new Map(),mats:new Map(),matList:[],matI:0,stats:{}};
const HIDE=31;
const defOBC=THREE.Material.prototype.onBeforeCompile;
function eligible(m){
  if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||m._nxNo)return false;
  const mat=m.material;if(!mat||Array.isArray(mat))return false;
  if(!(mat.isMeshLambertMaterial||mat.isMeshBasicMaterial))return false;
  if(mat.userData.nx||mat.transparent||mat.wireframe||mat.alphaMap||mat.envMap||mat.lightMap||mat.aoMap||mat.specularMap||mat.emissiveMap||mat.morphTargets||mat.skinning||!mat.visible||mat.alphaTest>0||!mat.depthTest||!mat.depthWrite||mat.blending!==THREE.NormalBlending||mat.onBeforeCompile!==defOBC||mat.opacity<1)return false;
  if(m.renderOrder!==0||!m.frustumCulled||m.layers.mask!==1)return false;
  const g=m.geometry;if(!g||!g.isBufferGeometry)return false;const p=g.attributes.position;
  if(!p||p.isInterleavedBufferAttribute||p.count>8000||p.count<3)return false;
  if(mat.map&&!g.attributes.uv)return false;
  if(g.morphAttributes&&g.morphAttributes.position)return false;
  for(let o=m;o;o=o.parent){if(!o.visible||o===camera||o._nxNo)return false;if(!o.parent&&o!==scene)return false;}
  return true;
}
const sigMat=m=>m.color.getHex()+'|'+(m.emissive?m.emissive.getHex()+'|'+m.emissiveIntensity:'')+'|'+(m.map?m.map.uuid:'')+'|'+m.opacity+'|'+m.side+'|'+(m.transparent?1:0)+'|'+(m.visible?1:0);
function trs(o,t){const p=o.position,q=o.quaternion,s=o.scale;t[0]=p.x;t[1]=p.y;t[2]=p.z;t[3]=q.x;t[4]=q.y;t[5]=q.z;t[6]=q.w;t[7]=s.x;t[8]=s.y;t[9]=s.z;return t;}
function trsSame(o,t){const p=o.position,q=o.quaternion,s=o.scale;return p.x===t[0]&&p.y===t[1]&&p.z===t[2]&&q.x===t[3]&&q.y===t[4]&&q.z===t[5]&&q.w===t[6]&&s.x===t[7]&&s.y===t[8]&&s.z===t[9];}
function btObserve(){
  const list=[];
  scene.traverse(m=>{if(eligible(m)){list.push({m,mw:Float64Array.from(m.matrixWorld.elements),sig:sigMat(m.material)});}});
  BT.cand=list;
}
function btBuild(){
  const t0=performance.now(),groups=new Map(),CS=176,v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3(),ctr=new THREE.Vector3(),col=new THREE.Color();
  let nSrc=0;
  for(const c of BT.cand){
    const m=c.m;if(!eligible(m))continue;
    const e=m.matrixWorld.elements;let same=true;for(let i=0;i<16;i++)if(e[i]!==c.mw[i]){same=false;break;}
    if(!same||sigMat(m.material)!==c.sig)continue;
    const g=m.geometry,mat=m.material;
    if(!g.attributes.normal)g.computeVertexNormals();
    if(!g.boundingSphere)g.computeBoundingSphere();
    ctr.copy(g.boundingSphere.center).applyMatrix4(m.matrixWorld);
    const lam=mat.isMeshLambertMaterial;
    const key=(lam?'L':'B')+'|'+(mat.map?mat.map.uuid:'')+'|'+mat.side+'|'+(mat.fog?1:0)+'|'+(mat.polygonOffset?mat.polygonOffsetFactor+','+mat.polygonOffsetUnits:'')+'|'+Math.floor(ctr.x/CS)+','+Math.floor(ctr.z/CS);
    let G0=groups.get(key);if(!G0){G0={key,lam,mat,list:[],nv:0,ni:0};groups.set(key,G0);}
    G0.list.push(m);G0.nv+=g.attributes.position.count;G0.ni+=g.index?g.index.count:g.attributes.position.count;nSrc++;
  }
  for(const G0 of groups.values()){
    if(G0.list.length<2)continue;
    const src=G0.mat,P=new Float32Array(G0.nv*3),Nn=new Float32Array(G0.nv*3),Cc=new Uint8Array(G0.nv*3),Em=G0.lam?new Uint8Array(G0.nv*3):null,Uv=src.map?new Float32Array(G0.nv*2):null,Ix=G0.nv>65535?new Uint32Array(G0.ni):new Uint16Array(G0.ni);
    let vo=0,io=0;const chunk={geo:null,mesh:null,dirty0:1e9,dirty1:-1};
    for(const m of G0.list){
      const g=m.geometry,mat=m.material,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,ca=mat.vertexColors?g.attributes.color:null,cnt=pa.count;
      nm.getNormalMatrix(m.matrixWorld);const flip=m.matrixWorld.determinant()<0;
      const cr=mat.color.r,cg=mat.color.g,cb=mat.color.b;
      let er=0,eg=0,eb=0;if(G0.lam){er=mat.emissive.r*mat.emissiveIntensity;eg=mat.emissive.g*mat.emissiveIntensity;eb=mat.emissive.b*mat.emissiveIntensity;}
      for(let i=0;i<cnt;i++){
        v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);n.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();if(flip)n.negate();
        const o=(vo+i)*3;P[o]=v.x;P[o+1]=v.y;P[o+2]=v.z;Nn[o]=n.x;Nn[o+1]=n.y;Nn[o+2]=n.z;
        let r=cr,gg=cg,b=cb;if(ca){r*=ca.getX(i);gg*=ca.getY(i);b*=ca.getZ(i);}
        Cc[o]=Math.min(255,r*255);Cc[o+1]=Math.min(255,gg*255);Cc[o+2]=Math.min(255,b*255);
        if(Em){Em[o]=Math.min(255,er*255);Em[o+1]=Math.min(255,eg*255);Em[o+2]=Math.min(255,eb*255);}
        if(Uv){Uv[(vo+i)*2]=ua.getX(i);Uv[(vo+i)*2+1]=ua.getY(i);}
      }
      const ia=g.index,ic=ia?ia.count:cnt;
      for(let i=0;i<ic;i+=3){const a=ia?ia.getX(i):i,b=ia?ia.getX(i+1):i+1,c2=ia?ia.getX(i+2):i+2;Ix[io+i]=vo+a;Ix[io+i+1]=vo+(flip?c2:b);Ix[io+i+2]=vo+(flip?b:c2);}
      const s={mesh:m,chunk,v0:vo,vn:cnt,parent:m.parent,mat,t:trs(m,new Float64Array(10)),mau:m.matrixAutoUpdate,dead:false,cast:m.castShadow};
      BT.sources.push(s);m._nxSrc=s;
      let mr=BT.mats.get(mat);if(!mr){mr={mat,sig:sigMat(mat),list:[]};BT.mats.set(mat,mr);BT.matList.push(mr);}mr.list.push(s);
      for(let a=m.parent;a&&a!==scene;a=a.parent){let ar=BT.anc.get(a);if(!ar){ar={o:a,parent:a.parent,t:trs(a,new Float64Array(10)),list:[]};BT.anc.set(a,ar);}ar.list.push(s);}
      m.layers.set(HIDE);m.matrixAutoUpdate=false;
      vo+=cnt;io+=ic;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(Nn,3));geo.setAttribute('color',new THREE.BufferAttribute(Cc,3,true));
    if(Em)geo.setAttribute('aEmis',new THREE.BufferAttribute(Em,3,true));if(Uv)geo.setAttribute('uv',new THREE.BufferAttribute(Uv,2));
    geo.setIndex(new THREE.BufferAttribute(Ix,1));geo.computeBoundingSphere();geo.computeBoundingBox();
    const opt={vertexColors:true,map:src.map||null,side:src.side,fog:src.fog,polygonOffset:src.polygonOffset,polygonOffsetFactor:src.polygonOffsetFactor,polygonOffsetUnits:src.polygonOffsetUnits};
    let mat;
    if(G0.lam){mat=new THREE.MeshLambertMaterial(opt);patch(mat,sh=>{
      sh.vertexShader='attribute vec3 aEmis;varying vec3 vEmis;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEmis=aEmis;');
      sh.fragmentShader='varying vec3 vEmis;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vEmis;');},'nxBatchL');}
    else{mat=new THREE.MeshBasicMaterial(opt);mat.userData.nx=1;}
    const mesh=new THREE.Mesh(geo,mat);mesh._nxNo=1;mesh._nxF=1;mesh.matrixAutoUpdate=false;mesh.castShadow=G0.lam&&!src.polygonOffset;mesh.receiveShadow=G0.lam;
    mesh.renderOrder=-5;   // occluders first: the ground, sea and sky behind them then skip their hidden pixels
    scene.add(mesh);chunk.geo=geo;chunk.mesh=mesh;BT.chunks.push(chunk);
  }
  BT.cand=null;BT.stats={sources:BT.sources.length,chunks:BT.chunks.length,ms:Math.round(performance.now()-t0),seen:nSrc};
}
function unbatch(s){
  if(s.dead)return;s.dead=true;
  const ch=s.chunk,pa=ch.geo.attributes.position;pa.array.fill(0,s.v0*3,(s.v0+s.vn)*3);
  ch.dirty0=Math.min(ch.dirty0,s.v0*3);ch.dirty1=Math.max(ch.dirty1,(s.v0+s.vn)*3);
  s.mesh.layers.set(0);s.mesh.matrixAutoUpdate=s.mau;s.mesh._nxSrc=null;BT.unb=(BT.unb|0)+1;
}
function btWatch(){
  const S=BT.sources;
  for(let i=0;i<S.length;i++){const s=S[i];if(s.dead)continue;const m=s.mesh;if(m.visible!==true||m.parent!==s.parent||m.material!==s.mat||!trsSame(m,s.t))unbatch(s);}
  for(const ar of BT.anc.values()){if(ar.dead)continue;const o=ar.o;if(o.visible!==true||o.parent!==ar.parent||!trsSame(o,ar.t)){ar.dead=true;for(const s of ar.list)unbatch(s);}}
  const ML=BT.matList,nM=Math.min(ML.length,Math.ceil(ML.length/3));
  for(let k=0;k<nM;k++){const mr=ML[BT.matI=(BT.matI+1)%ML.length];if(mr.dead)continue;if(sigMat(mr.mat)!==mr.sig){mr.dead=true;for(const s of mr.list)unbatch(s);}}
  for(const ch of BT.chunks)if(ch.dirty1>=0){const pa=ch.geo.attributes.position;pa.updateRange.offset=ch.dirty0;pa.updateRange.count=ch.dirty1-ch.dirty0;pa.needsUpdate=true;ch.dirty0=1e9;ch.dirty1=-1;}
}
NIX.batchStats=()=>Object.assign({unbatched:BT.unb|0,state:BT.state},BT.stats);

/* ------------------------------------------------------------------ shadow / material flags for everything added to the scene */
(function(){
  const add=THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add=function(o){
    if(o&&o.isMesh&&o._nxF===undefined&&arguments.length===1){
      o._nxF=1;const m=o.material;
      if(m&&!Array.isArray(m)&&!m.isShaderMaterial){
        const lit=m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial;
        if(lit&&!o._nxNoRecv)o.receiveShadow=true;
        if(!m.transparent&&m.depthWrite&&m.depthTest&&!m.wireframe&&m.blending===THREE.NormalBlending&&!o._nxNoCast&&!m.polygonOffset)o.castShadow=true;
      }
    }
    return add.apply(this,arguments);
  };
})();

/* ------------------------------------------------------------------ GPU particles (replaces 220 box meshes with one draw call) */
const PT={n:1400,i:0,alive:0};
function initParticles(){
  const n=PT.n;PT.pos=new Float32Array(n*3);PT.col=new Float32Array(n*4);PT.size=new Float32Array(n);PT.vel=new Float32Array(n*3);PT.life=new Float32Array(n);PT.max=new Float32Array(n);PT.base=new Float32Array(n*3);PT.sz0=new Float32Array(n);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(PT.pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aCol',new THREE.BufferAttribute(PT.col,4).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aSize',new THREE.BufferAttribute(PT.size,1).setUsage(THREE.DynamicDrawUsage));
  PT.mat=new THREE.ShaderMaterial({uniforms:{uScale:{value:500}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'attribute vec4 aCol;attribute float aSize;uniform float uScale;varying vec4 vCol;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(aSize*uScale/max(-mv.z,0.1),uScale*0.35);gl_Position=projectionMatrix*mv;vCol=aCol;if(aCol.a<=0.0)gl_Position=vec4(2.0,2.0,2.0,1.0);}',
    fragmentShader:'varying vec4 vCol;void main(){vec2 p=gl_PointCoord-0.5;float d=length(p)*2.0;float a=max(0.0,1.0-d);a=a*a*0.9+smoothstep(0.35,0.0,d)*0.9;gl_FragColor=vec4(vCol.rgb*a*vCol.a*1.6,1.0);}'});
  PT.mat.userData.nx=1;
  PT.pts=new THREE.Points(g,PT.mat);PT.pts.frustumCulled=false;PT.pts.renderOrder=5;PT.pts._nxNo=1;scene.add(PT.pts);PT.geo=g;
}
const _pc=new THREE.Color();
NIX.burst=function(x,y,z,color,n,speed,size){
  if(!PT.pts)return false;
  _pc.set(color);const sz=(size||1);
  const nn=Math.max(1,Math.round(n*(Q===PRESETS[0]?1:1.6)));
  for(let k=0;k<nn;k++){
    const i=PT.i=(PT.i+1)%PT.n,a=Math.random()*6.2832,e=Math.random()*2-0.6,s=speed*(0.4+Math.random()*0.8),o=i*3;
    PT.vel[o]=Math.cos(a)*s;PT.vel[o+2]=Math.sin(a)*s;PT.vel[o+1]=e*s*0.6+speed*0.3;
    PT.pos[o]=x;PT.pos[o+1]=y;PT.pos[o+2]=z;PT.base[o]=_pc.r;PT.base[o+1]=_pc.g;PT.base[o+2]=_pc.b;
    PT.life[i]=PT.max[i]=0.4+Math.random()*0.55;PT.sz0[i]=sz*(0.45+Math.random()*0.5);
  }
  PT.alive=1;return true;
};
function updParticles(dt){
  if(!PT.pts||!PT.alive){if(PT.pts)PT.pts.visible=false;return;}
  let any=0;const L=PT.life,P=PT.pos,V=PT.vel,C=PT.col,B=PT.base;
  for(let i=0;i<PT.n;i++){
    if(L[i]<=0)continue;L[i]-=dt;const o=i*3,c=i*4;
    if(L[i]<=0){C[c+3]=0;PT.size[i]=0;continue;}
    any=1;V[o+1]-=22*dt;P[o]+=V[o]*dt;P[o+1]+=V[o+1]*dt;P[o+2]+=V[o+2]*dt;
    if(P[o+1]<0.2){P[o+1]=0.2;V[o+1]*=-0.3;V[o]*=0.7;V[o+2]*=0.7;}
    const k=L[i]/PT.max[i];C[c]=B[o];C[c+1]=B[o+1];C[c+2]=B[o+2];C[c+3]=k;PT.size[i]=PT.sz0[i]*(0.55+0.45*k);
  }
  PT.alive=any;PT.pts.visible=true;
  PT.geo.attributes.position.needsUpdate=true;PT.geo.attributes.aCol.needsUpdate=true;PT.geo.attributes.aSize.needsUpdate=true;
}

/* ------------------------------------------------------------------ post-processing */
const FS_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
let fsScene,fsCam,fsMesh,RT={},hdrType=null,hdrFmt=null,hdrInt=null;
const M={};
function mkMat(fs,uniforms,extra){const m=new THREE.ShaderMaterial(Object.assign({uniforms,vertexShader:FS_VS,fragmentShader:fs,depthTest:false,depthWrite:false},extra||{}));m.userData.nx=1;return m;}
function initPost(){
  fsScene=new THREE.Scene();fsCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
  fsMesh=new THREE.Mesh(g,null);fsMesh.frustumCulled=false;fsScene.add(fsMesh);
  M.bright=mkMat(`uniform sampler2D t;uniform vec2 px;uniform float thr;varying vec2 vUv;
    void main(){vec3 c=texture2D(t,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,1.0)).rgb;c*=0.25;
      c=min(c,vec3(12.0));float m=max(c.r,max(c.g,c.b));float k=clamp((m-thr)/0.45,0.0,1.0);gl_FragColor=vec4(c*k*k,1.0);}`,{t:{value:null},px:{value:new THREE.Vector2()},thr:{value:0.86}});
  M.down=mkMat(`uniform sampler2D t;uniform vec2 px;varying vec2 vUv;
    void main(){vec3 c=texture2D(t,vUv).rgb*4.0+texture2D(t,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,1.0)).rgb;gl_FragColor=vec4(c*0.125,1.0);}`,{t:{value:null},px:{value:new THREE.Vector2()}});
  M.up=mkMat(`uniform sampler2D t;uniform vec2 px;uniform float k;varying vec2 vUv;
    void main(){vec3 c=texture2D(t,vUv+px*vec2(-2.0,0.0)).rgb+texture2D(t,vUv+px*vec2(2.0,0.0)).rgb+texture2D(t,vUv+px*vec2(0.0,-2.0)).rgb+texture2D(t,vUv+px*vec2(0.0,2.0)).rgb;
      c+=(texture2D(t,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,1.0)).rgb)*2.0;gl_FragColor=vec4(c/12.0*k,1.0);}`,{t:{value:null},px:{value:new THREE.Vector2()},k:{value:1}},{blending:THREE.AdditiveBlending,transparent:true});
  M.rays=mkMat(`uniform sampler2D t;uniform vec2 sun;uniform float k;varying vec2 vUv;
    void main(){vec2 d=(sun-vUv)/18.0*0.82;vec2 p=vUv;vec3 c=vec3(0.0);float w=1.0;for(int i=0;i<18;i++){c+=texture2D(t,p).rgb*w;w*=0.93;p+=d;}gl_FragColor=vec4(c*k/9.0,1.0);}`,{t:{value:null},sun:{value:new THREE.Vector2(0.5,0.5)},k:{value:1}});
  M.final=mkMat(`uniform sampler2D tScene;uniform sampler2D tBloom;uniform sampler2D tRays;uniform sampler2D nxNoise;
    uniform float uBloom,uRays,uCA,uTime,uGrain,uVig,uRetro,uSat,uCon,uExp,uHurt;uniform vec2 uRes;uniform vec3 uTint;varying vec2 vUv;
    void main(){
      vec2 uv=vUv;
      if(uRetro>0.5){vec2 q=uRes/3.0;uv=(floor(uv*q)+0.5)/q;}
      vec2 d=uv-0.5;float r2=dot(d,d);
      vec3 c;
      #ifdef NX_CA
      vec2 o=d*r2*uCA;c=vec3(texture2D(tScene,uv+o).r,texture2D(tScene,uv).g,texture2D(tScene,uv-o).b);
      #else
      c=texture2D(tScene,uv).rgb;
      #endif
      vec3 b=texture2D(tBloom,uv).rgb;
      c+=b*uBloom;
      #ifdef NX_RAYS
      c+=texture2D(tRays,uv).rgb*uRays;
      #endif
      c*=uExp;
      float mx=max(c.r,max(c.g,c.b));
      const float K=0.72;
      float tm=mx<=K?mx:K+(1.0-K)*(1.0-exp(-(mx-K)/(1.0-K)));
      c*=tm/max(mx,1e-4);
      c=mix(c,vec3(tm),smoothstep(1.1,4.5,mx)*0.6);
      float l=dot(c,vec3(0.299,0.587,0.114));
      c=mix(vec3(l),c,uSat);
      c=(c-0.5)*uCon+0.5;
      c+=uTint*(0.5-abs(l-0.5))*0.07;
      c=mix(c,vec3(c.r*1.1+0.06,c.g*0.35,c.b*0.35),uHurt*smoothstep(0.08,0.5,r2));
      c*=1.0-uVig*smoothstep(0.12,0.62,r2);
      float g=texture2D(nxNoise,gl_FragCoord.xy/256.0+vec2(fract(uTime*7.13),fract(uTime*3.71))).a-0.5;
      c+=g*uGrain;
      if(uRetro>0.5){c*=0.9+0.1*sin(gl_FragCoord.y*3.14159*0.6667);}
      gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
    }`,{tScene:{value:null},tBloom:{value:null},tRays:{value:null},nxNoise:U.nxNoise,uBloom:{value:0.9},uRays:{value:0},uCA:{value:0.05},uTime:U.nxTime,uGrain:{value:0.028},uVig:{value:0.3},uRetro:{value:0},uSat:{value:1.08},uCon:{value:1.06},uExp:{value:1},uHurt:{value:0},uRes:{value:new THREE.Vector2(1,1)},uTint:{value:new THREE.Color(0.2,0.0,0.3)}});
}
function pass(mat,target,additive){fsMesh.material=mat;R.setRenderTarget(target);const ac=R.autoClear;R.autoClear=!additive;R.render(fsScene,fsCam);R.autoClear=ac;}
function pickHDR(){
  const tryFmt=(type,fmt,internal)=>{
    try{
      const rt=new THREE.WebGLRenderTarget(8,8,{type,format:fmt,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});if(internal)rt.texture.internalFormat=internal;
      R.setRenderTarget(rt);R.clear();const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&gl.getError()===gl.NO_ERROR;R.setRenderTarget(null);rt.dispose();return ok;
    }catch(e){return false;}
  };
  const drain=()=>{for(let i=0;i<8&&gl.getError()!==gl.NO_ERROR;i++){}};
  drain();
  if(tryFmt(THREE.HalfFloatType,THREE.RGBAFormat,null)){hdrType=THREE.HalfFloatType;hdrFmt=THREE.RGBAFormat;hdrInt=null;}
  else{hdrType=THREE.UnsignedByteType;hdrFmt=THREE.RGBAFormat;hdrInt=null;}
  NIX.hdr=hdrInt||(hdrType===THREE.HalfFloatType?'RGBA16F':'RGBA8');
}
function mkRT(w,h,depth,samples){
  const o={type:hdrType,format:hdrFmt,depthBuffer:!!depth,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false};
  const rt=(samples>0&&R.capabilities.isWebGL2)?new THREE.WebGLMultisampleRenderTarget(w,h,o):new THREE.WebGLRenderTarget(w,h,o);
  if(samples>0&&rt.isWebGLMultisampleRenderTarget)rt.samples=Math.min(samples,R.capabilities.maxSamples||4);
  if(hdrInt)rt.texture.internalFormat=hdrInt;return rt;
}
let curW=0,curH=0,curKey='';
function allocRT(){
  const db=R.getDrawingBufferSize(new THREE.Vector2());
  const sc=G.retro?0.45:clamp(Q.scale*G.dynScale,0.4,1);
  const w=Math.max(160,Math.round(db.x*sc/2)*2),h=Math.max(90,Math.round(db.y*sc/2)*2),key=w+'x'+h+'|'+Q.msaa+'|'+Q.bloomLv;
  if(key===curKey)return;curKey=key;curW=w;curH=h;
  for(const k in RT){const r=RT[k];if(Array.isArray(r))r.forEach(x=>x.dispose());else if(r)r.dispose();}
  RT={};RT.scene=mkRT(w,h,true,G.retro?0:Q.msaa);
  RT.bloom=[];let bw=w>>1,bh=h>>1;for(let i=0;i<Q.bloomLv-1;i++){bw=Math.max(2,bw>>1);bh=Math.max(2,bh>>1);RT.bloom.push(mkRT(bw,bh,false,0));}   // the chain starts at quarter resolution
  RT.rays=mkRT(Math.max(2,w>>2),Math.max(2,h>>2),false,0);
  if(G.retro){RT.scene.texture.magFilter=THREE.NearestFilter;RT.scene.texture.minFilter=THREE.NearestFilter;}
}

/* ------------------------------------------------------------------ dynamic resolution */
const DYN={acc:0,n:0,t:0,refresh:16.7,samples:[],lock:0,ext:null,q:null,pending:[],gpuMs:0,gpuN:0,gpuAcc:0,lastUp:0,ceil:1,calm:0,warm:4,t0:0,ceilT:0};
NIX.dynWarm=function(s){DYN.warm=Math.max(DYN.warm,s||3);};   // the game calls this around known hitches (starting a match) so they don't count as slow frames
function dynInit(){try{DYN.ext=R.capabilities.isWebGL2?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;}catch(e){DYN.ext=null;}}
function dynBegin(){
  if(!DYN.ext||DYN.q)return;
  const q=gl.createQuery();gl.beginQuery(DYN.ext.TIME_ELAPSED_EXT,q);DYN.q=q;
}
function dynEnd(){
  if(!DYN.ext||!DYN.q)return;
  gl.endQuery(DYN.ext.TIME_ELAPSED_EXT);DYN.pending.push(DYN.q);DYN.q=null;
  while(DYN.pending.length){const q=DYN.pending[0];
    if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(DYN.pending.length>6){gl.deleteQuery(DYN.pending.shift());continue;}break;}
    const dj=gl.getParameter(DYN.ext.GPU_DISJOINT_EXT);const ns=gl.getQueryParameter(q,gl.QUERY_RESULT);gl.deleteQuery(q);DYN.pending.shift();
    if(!dj){DYN.gpuAcc+=ns/1e6;DYN.gpuN++;}
  }
}
function dynTick(dtReal){
  const ms=dtReal*1000;
  if(ms>0&&ms<200){DYN.samples.push(ms);if(DYN.samples.length>120)DYN.samples.shift();}
  DYN.acc+=ms;DYN.n++;DYN.t+=dtReal;
  if(DYN.t<0.75)return;
  const avg=DYN.acc/DYN.n;DYN.acc=0;DYN.n=0;DYN.t=0;
  const s=DYN.samples.slice().sort((a,b)=>a-b);if(s.length>30){const lo=s[Math.floor(s.length*0.1)];DYN.refresh=lo<9.5?6.94:lo<13?8.33:16.67;}   // never conclude "30 Hz screen" from our own frame times: a slow game looks identical, and that made the scaler settle for 30 fps
  NIX.fps=1000/avg;
  const gpu=DYN.gpuN?DYN.gpuAcc/DYN.gpuN:0;DYN.gpuAcc=0;DYN.gpuN=0;DYN.gpuMs=gpu;NIX.gpuMs=gpu;
  if(!G.dyn||G.retro){if(G.dynScale!==1){G.dynScale=1;allocRT();}return;}
  /* the signal that matters is missed frames: how many of the last frames took clearly longer than one screen refresh */
  DYN.lock-=0.75;DYN.calm+=0.75;
  const target=Math.max(DYN.refresh,NIX.fpsCap>0?1000/NIX.fpsCap:16.67),recent=DYN.samples.slice(-Math.max(12,Math.round(750/target)));   // never chase more than 60 fps: on a 144 Hz screen a steady 72 is fine
  let late=0;for(const v of recent)if(v>target*1.45)late++;
  const lateF=late/recent.length;NIX.late=lateF;
  if(DYN.warm>0){DYN.warm-=0.75;return;}
  if(avg>150||document.hidden)return;   // tab hidden or throttled: those are not real frame times   // ignore the first seconds (shader compiles, asset uploads)
  if(lateF>0.12||(gpu>0&&gpu>target*0.92)){
    DYN.calm=0;
    if(G.dynScale>0.5&&DYN.lock<=0){
      const step=lateF>0.4?0.14:0.07;
      if(DYN.lastUp>0&&DYN.t0-DYN.lastUp<6)DYN.ceil=Math.max(0.5,G.dynScale-0.01);   // the last step up caused this: remember it as the ceiling
      G.dynScale=Math.max(0.5,G.dynScale-step);DYN.lock=1.5;allocRT();
    }
  }else if(G.dynScale<Math.min(1,DYN.ceil)&&DYN.calm>=(gpu>0&&gpu<target*0.4?3:7)&&DYN.lock<=0){
    G.dynScale=Math.min(1,DYN.ceil,G.dynScale+0.05);DYN.lock=2.5;DYN.calm=0;DYN.lastUp=DYN.t0;allocRT();
  }
  DYN.t0+=0.75;DYN.ceilT+=0.75;if(DYN.ceilT>45){DYN.ceilT=0;DYN.ceil=Math.min(1,DYN.ceil+0.1);}   // every so often allow another try at a higher resolution
}

/* ------------------------------------------------------------------ sun shadows */
let sunL=null,shFrame=0;const _f=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3(),_L=new THREE.Vector3(0.3,0.5,1).normalize();
NIX.sunLight=function(dl){sunL=dl;scene.add(dl.target);applyShadowQ();};
function applyShadowQ(){
  if(!sunL)return;
  const on=Q.shadow>0;sunL.castShadow=on;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFShadowMap;R.shadowMap.autoUpdate=false;
  if(on){const s=sunL.shadow,c=s.camera,d=Q.shadowR;
    if(s.mapSize.x!==Q.shadow){s.mapSize.set(Q.shadow,Q.shadow);if(s.map){s.map.dispose();s.map=null;}}
    c.left=-d;c.right=d;c.top=d;c.bottom=-d;c.near=1;c.far=900;c.updateProjectionMatrix();s.bias=-0.0006;s.normalBias=0.35;}
}
function updShadow(){
  if(!sunL||!Q.shadow)return;
  shFrame++;if(Q.shadowEvery>1&&(shFrame%Q.shadowEvery))return;
  const d=Q.shadowR;camera.getWorldDirection(_f);_f.y=0;if(_f.lengthSq()<1e-4)_f.set(0,0,-1);_f.normalize();
  const cp=camera.position;_f.multiplyScalar(d*0.55).add(cp);_f.y=0;
  _r.set(0,1,0).cross(_L).normalize();_u.copy(_L).cross(_r);
  const tex=2*d/Q.shadow,fx=_f.dot(_r),fy=_f.dot(_u);
  _f.addScaledVector(_r,Math.round(fx/tex)*tex-fx).addScaledVector(_u,Math.round(fy/tex)*tex-fy);
  sunL.target.position.copy(_f);sunL.position.copy(_f).addScaledVector(_L,420);sunL.target.updateMatrixWorld();sunL.updateMatrixWorld();
  R.shadowMap.needsUpdate=true;
}

/* ------------------------------------------------------------------ first-person weapon scene (drawn over the world with its own depth and a fixed lens) */
let vmScene=null,vmCam=null,vmHolder=null,vmHemi=null,vmDir=null,vmFlash=null,envRT=null,envCam=null,envScene=null,envT=0;
NIX.viewHolder=function(){
  vmScene=new THREE.Scene();vmHolder=new THREE.Group();vmHolder.matrixAutoUpdate=false;vmScene.add(vmHolder);
  vmCam=new THREE.PerspectiveCamera(58,1,0.02,20);vmCam.matrixAutoUpdate=false;
  vmHemi=new THREE.HemisphereLight(0xffffff,0x444444,1);vmDir=new THREE.DirectionalLight(0xffffff,1);vmFlash=new THREE.PointLight(0xffffff,0,6,2);
  const vmFill=new THREE.DirectionalLight(0xffffff,0.55);vmFill.position.set(0.6,0.8,0.5);vmHolder.add(vmFill);vmHolder.add(vmFill.target);vmFill.target.position.set(0,0,-1);
  vmScene.add(vmHemi);vmScene.add(vmDir);vmScene.add(vmDir.target);vmHolder.add(vmFlash);vmFlash.position.set(0.25,-0.1,-1.3);
  NIX.vmHolder=vmHolder;NIX.vmFlash=vmFlash;return vmHolder;
};
NIX.vmFov=58;
const _v4=new THREE.Vector3(),_m4=new THREE.Matrix4();
/* where a point on the gun appears in the world as seen through the main lens (so lasers leave the barrel you see) */
NIX.muzzleWorld=function(obj,out){
  out=out||new THREE.Vector3();
  if(!vmHolder){return obj.getWorldPosition(out);}
  vmHolder.matrix.copy(camera.matrixWorld);vmHolder.matrixWorld.copy(camera.matrixWorld);
  obj.updateWorldMatrix(true,false);out.setFromMatrixPosition(obj.matrixWorld);
  _v4.copy(out).applyMatrix4(camera.matrixWorldInverse);
  const z=_v4.z,k=Math.tan(vmCam.fov*Math.PI/360)/Math.tan(camera.fov*Math.PI/360);
  _v4.x*=1/k;_v4.y*=1/k;
  return out.copy(_v4).applyMatrix4(camera.matrixWorld);
};
function initEnv(){
  envRT=new THREE.WebGLCubeRenderTarget(64,{format:THREE.RGBAFormat,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
  envCam=new THREE.CubeCamera(1,4000,envRT);envScene=new THREE.Scene();
  NIX.envMap=envRT.texture;
}
function updEnv(dt){
  if(!envRT||!NIX.skyMat)return;envT-=dt;if(envT>0)return;envT=2.5;
  if(!envScene.children.length){const m=new THREE.Mesh(new THREE.SphereGeometry(1500,16,10),NIX.skyMat);m.frustumCulled=false;envScene.add(m);}
  const rt=R.getRenderTarget();envCam.update(R,envScene);R.setRenderTarget(rt);
}

/* ------------------------------------------------------------------ init / frame */
NIX.init=function(renderer,scn,cam,cv,pane){
  R=renderer;scene=scn;camera=cam;canvas=cv;PANE=pane|0;gl=R.getContext();
  R.info.autoReset=false;R.sortObjects=true;
  U.nxNoise.value=makeNoise();
  pickHDR();initPost();dynInit();initParticles();initEnv();
  try{const s=JSON.parse(localStorage.getItem('ni_gfx')||'null');if(s){if(s.level>=0&&s.level<=3)G.level=s.level|0;G.dyn=s.dyn!==false;G.retro=!!s.retro;if(typeof s.bloom==='number')G.bloom=s.bloom;NIX.userSet=true;}}catch(e){}
  if(!NIX.userSet)G.level=detectLevel();else detectLevel();
  if(PANE)G.level=Math.min(G.level,1);
  Q=PRESETS[G.level];
  NIX.ready=true;
};
NIX.save=function(){try{localStorage.setItem('ni_gfx',JSON.stringify({level:G.level,dyn:G.dyn,retro:G.retro,bloom:G.bloom}));}catch(e){}};
NIX.setQuality=function(lv){G.level=clamp(lv|0,0,3);Q=PRESETS[G.level];G.dynScale=1;curKey='';NIX.applyRes();applyShadowQ();
  if(facMat){facMat.defines=Q.interior?{NX_INTERIOR:1}:{};facMat.customProgramCacheKey=()=>'nxFacade'+(Q.interior?1:0);facMat.needsUpdate=true;}
  if(M.final){M.final.defines={};if(Q.ca)M.final.defines.NX_CA=1;if(Q.rays)M.final.defines.NX_RAYS=1;M.final.needsUpdate=true;}
};
NIX.applyRes=function(){
  if(!R)return;
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,PANE?1:Q.dpr));R.setSize(window.innerWidth,window.innerHeight);
  canvas.classList.remove('retro');allocRT();
  if(M.final){M.final.defines={};if(Q.ca)M.final.defines.NX_CA=1;if(Q.rays)M.final.defines.NX_RAYS=1;M.final.needsUpdate=true;}
};
NIX.setRetro=function(v){G.retro=!!v;curKey='';NIX.applyRes();};
/* called once the whole city has been built */
NIX.worldReady=function(){buildFacades();BT.state=1;BT.frame=0;};
/* called every frame after the game has set its sky / light colours */
const _sc=new THREE.Color();
NIX.env=function(night,dt,hemi,dir){
  U.nxNight.value=night;if(NIX.lampNight)NIX.lampNight(night);
  if(NIX.skyMat){const u=NIX.skyMat.uniforms;U.nxSkyA.value.copy(u.bot.value);U.nxSkyB.value.copy(u.mid.value);U.nxSkyC.value.copy(u.top.value);u.uCloud.value=Q.clouds;}
  U.nxSunCol.value.setRGB(1.0,0.62,0.4).lerp(_sc.setRGB(0.55,0.68,1.0),night);
  if(dir)U.nxSunCol.value.lerp(dir.color,0.35);
  if(vmHemi&&hemi){vmHemi.color.copy(hemi.color);vmHemi.groundColor.copy(hemi.groundColor);vmHemi.intensity=hemi.intensity*1.05;vmDir.color.copy(dir.color);vmDir.intensity=dir.intensity*1.1;}
};
NIX.hurt=0;NIX.exposure=1;
const _sv=new THREE.Vector3();
let lastT=0;
NIX.render=function(dt,drawView){
  const now=performance.now(),real=lastT?(now-lastT)/1000:dt;lastT=now;
  U.nxTime.value+=dt;
  if(BT.state===1){BT.frame++;if(BT.frame===4)btObserve();else if(BT.frame>=40&&BT.cand){btBuild();BT.state=2;}}
  else if(BT.state===2)btWatch();
  updParticles(dt);updShadow();updEnv(dt);updScatter();
  if(!RT.scene)allocRT();
  R.info.reset();dynBegin();
  PT.mat.uniforms.uScale.value=curH/(2*Math.tan(camera.fov*Math.PI/360));
  R.setRenderTarget(RT.scene);R.autoClear=true;R.render(scene,camera);
  if(vmScene&&drawView){
    vmHolder.matrix.copy(camera.matrixWorld);vmHolder.matrixWorld.copy(camera.matrixWorld);
    vmCam.fov=NIX.vmFov;vmCam.aspect=camera.aspect;vmCam.updateProjectionMatrix();
    vmCam.matrixWorld.copy(camera.matrixWorld);vmCam.matrixWorldInverse.copy(camera.matrixWorldInverse);
    vmDir.position.copy(camera.position).addScaledVector(_L,10);vmDir.target.position.copy(camera.position);
    vmFlash.intensity*=Math.exp(-dt*26);if(vmFlash.intensity<0.02)vmFlash.intensity=0;
    R.autoClear=false;R.clearDepth();R.render(vmScene,vmCam);R.autoClear=true;
  }
  /* bloom chain */
  const B=RT.bloom,src=RT.scene.texture;
  M.bright.uniforms.t.value=src;M.bright.uniforms.px.value.set(1/curW,1/curH);M.bright.uniforms.thr.value=hdrType===THREE.UnsignedByteType?0.72:0.9;pass(M.bright,B[0]);   // 4 bilinear taps = a 4x4 box, straight to quarter res
  for(let i=1;i<B.length;i++){M.down.uniforms.t.value=B[i-1].texture;M.down.uniforms.px.value.set(1/B[i-1].width,1/B[i-1].height);pass(M.down,B[i]);}
  let rays=0;
  if(Q.rays&&!G.retro){
    _sv.copy(camera.position).addScaledVector(U.nxSunDir.value,1000).project(camera);
    camera.getWorldDirection(_f);const fac=_f.dot(U.nxSunDir.value);
    if(_sv.z<1&&fac>0.25&&Math.abs(_sv.x)<1.6&&Math.abs(_sv.y)<1.6){
      rays=clamp((fac-0.25)*2,0,1)*(1-0.55*U.nxNight.value);
      M.rays.uniforms.t.value=B[0].texture;M.rays.uniforms.sun.value.set(_sv.x*0.5+0.5,_sv.y*0.5+0.5);M.rays.uniforms.k.value=1;pass(M.rays,RT.rays);
    }
  }
  for(let i=B.length-2;i>=0;i--){M.up.uniforms.t.value=B[i+1].texture;M.up.uniforms.px.value.set(0.5/B[i+1].width,0.5/B[i+1].height);M.up.uniforms.k.value=i===0?0.85:1.0;pass(M.up,B[i],true);}
  /* final composite straight to the screen */
  const F=M.final.uniforms;F.tScene.value=src;F.tBloom.value=B[0].texture;F.tRays.value=RT.rays.texture;
  F.uBloom.value=0.5*(G.bloom/100)/Math.max(1,B.length-2);F.uRays.value=rays*0.55;F.uRetro.value=G.retro?1:0;F.uExp.value=NIX.exposure;F.uHurt.value=NIX.hurt;
  F.uRes.value.set(canvas.width,canvas.height);F.uCA.value=0.045;
  F.uTint.value.setRGB(0.25,0.02,0.32).lerp(_sc.setRGB(0.02,0.1,0.42),U.nxNight.value);
  pass(M.final,null);
  dynEnd();dynTick(real);
};
NIX.info=function(){return {calls:R.info.render.calls,tris:R.info.render.triangles,fps:NIX.fps,gpuMs:NIX.gpuMs,scale:G.dynScale,res:curW+'x'+curH,level:G.level,hdr:NIX.hdr,batch:NIX.batchStats(),programs:R.info.programs.length,geos:R.info.memory.geometries,refresh:DYN.refresh};};
})();
