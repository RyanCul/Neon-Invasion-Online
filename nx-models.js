/* NEON INVASION - REMAKE: puts the Blender-made models (nx-assets.js) into the game.
   First-person weapons with a procedural animation rig, the shop preview guns, street lamps with night light pools. */
(function(){
'use strict';
if(!window.NIX||typeof THREE==='undefined')return;
const NIX=window.NIX,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ------------------------------------------------------------------ first-person weapons */
/* where each gun sits in view space: x, y, z, scale, and the aim-down-sights position */
const VP=[
  [0.150,-0.135,-0.43,1.25, 0.0,-0.085,-0.36],   // 0 pistol
  [0.160,-0.150,-0.40,1.0,  0.0,-0.115,-0.34],   // 1 smg
  [0.175,-0.150,-0.37,1.0,  0.0,-0.085,-0.32],   // 2 shotgun
  [0.175,-0.150,-0.35,1.0,  0.0,-0.125,-0.30],   // 3 rail
  [0.200,-0.215,-0.37,1.0,  0.06,-0.19,-0.34],   // 4 minigun
  [0.165,-0.145,-0.34,1.0,  0.0,-0.14,-0.28],    // 5 sniper
  [0.210,-0.225,-0.37,1.0,  0.07,-0.2,-0.34],    // 6 gatling
  [0.165,-0.150,-0.42,1.3,  0.08,-0.13,-0.4],    // 7 stars
  [0.175,-0.150,-0.37,1.0,  0.0,-0.115,-0.33],   // 8 flamethrower
  [0.175,-0.150,-0.39,1.0,  0.0,-0.14,-0.34],    // 9 gas
  [0.000,-0.205,-0.43,1.2,  0.0,-0.19,-0.4],     // 10 knuckles
  [0.175,-0.165,-0.39,1.0,  0.0,-0.16,-0.34]     // 11 bomber
];
let flashTex=null;
function getFlashTex(){
  if(flashTex)return flashTex;
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const rg=g.createRadialGradient(64,64,0,64,64,64);rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(0.18,'rgba(255,255,255,0.85)');rg.addColorStop(0.45,'rgba(255,255,255,0.22)');rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=rg;g.fillRect(0,0,128,128);
  g.globalCompositeOperation='lighter';g.translate(64,64);
  for(let i=0;i<6;i++){g.rotate(Math.PI/3);const lg=g.createLinearGradient(0,0,62,0);lg.addColorStop(0,'rgba(255,255,255,0.9)');lg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=lg;g.beginPath();g.moveTo(0,-5);g.lineTo(62,0);g.lineTo(0,5);g.closePath();g.fill();}
  flashTex=new THREE.CanvasTexture(c);return flashTex;
}
const VMS=[];
NIX.buildVM=function(w,color,root){
  if(!NIX.has('gun'+w+'_body'))return null;
  const gb=NIX.geo('gun'+w+'_body'),gd=NIX.geo('gun'+w+'_detail'),ga=NIX.geo('gun'+w+'_accent'),p=VP[w]||VP[0];
  const grp=new THREE.Group(),mdl=new THREE.Group();grp.add(mdl);
  mdl.position.set(p[0],p[1],p[2]);mdl.scale.setScalar(p[3]);mdl.rotation.y=w===10?0:0.055;
  const bodyM=new THREE.MeshPhongMaterial({color:0x2b2145,vertexColors:true,shininess:64,specular:0x8f8ab0,envMap:NIX.envMap,reflectivity:0.34,combine:THREE.AddOperation});
  const detM=new THREE.MeshPhongMaterial({color:0xffffff,vertexColors:true,shininess:46,specular:0x60607a,envMap:NIX.envMap,reflectivity:0.22,combine:THREE.AddOperation});
  const accent=new THREE.MeshBasicMaterial({color});
  const mk=(g,m)=>{const o=new THREE.Mesh(g,m);o.frustumCulled=false;o._nxF=1;mdl.add(o);return o;};
  mk(gb,bodyM);if(gd)mk(gd,detM);const tip=ga?mk(ga,accent):new THREE.Object3D();
  const mz=(gb.userData&&gb.userData.muzzle)||[0,0,-0.3];
  const muzzle=new THREE.Object3D();muzzle.position.set(mz[0],mz[1],mz[2]);mdl.add(muzzle);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34),new THREE.MeshBasicMaterial({color:0xffffff,map:getFlashTex(),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  flash.position.set(mz[0],mz[1],mz[2]-0.02);flash.frustumCulled=false;flash._nxF=1;flash.renderOrder=10;mdl.add(flash);
  grp.visible=false;root.add(grp);
  const e={grp,accent,tip,flash,muzzle,body:[bodyM],mdl,w};VMS[w]=e;return e;
};
/* the spinning model in the weapon shop */
NIX.gunModel=function(w,color){
  if(!NIX.has('gun'+w+'_body'))return null;
  const g=new THREE.Group(),sc=4;
  const add=(n,m)=>{const geo=NIX.geo(n);if(geo){const o=new THREE.Mesh(geo,m);o.scale.setScalar(sc);g.add(o);}};
  add('gun'+w+'_body',new THREE.MeshLambertMaterial({color:0x8a78c8,vertexColors:true}));
  add('gun'+w+'_detail',new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true}));
  add('gun'+w+'_accent',new THREE.MeshBasicMaterial({color}));
  g.rotation.y=Math.PI/2;return g;
};
/* procedural weapon animation: look sway, walk bob, recoil kick, reload dip, weapon-swap raise, aim-down-sights, landing dip */
const A={yaw:0,pitch:0,sx:0,sy:0,ph:0,bob:0,rel:0,sw:0,lastW:-1,ads:0,land:0,air:0,lastFlash:0,kick:0,roll:0,vy:0,init:false};
NIX.vmAnim=function(root,dt,s){
  if(!A.init){A.init=true;A.yaw=s.yaw;A.pitch=s.pitch;}
  let dy=s.yaw-A.yaw;while(dy>Math.PI)dy-=6.2832;while(dy<-Math.PI)dy+=6.2832;const dp=s.pitch-A.pitch;A.yaw=s.yaw;A.pitch=s.pitch;
  const k=1-Math.exp(-dt*9),inv=dt>0?1/dt:0;
  A.sx+=(clamp(dy*inv*0.012,-0.05,0.05)-A.sx)*k;A.sy+=(clamp(dp*inv*0.012,-0.04,0.04)-A.sy)*k;
  const mv=s.ground?clamp(s.sp/9,0,1.6):0;A.bob+=(mv-A.bob)*(1-Math.exp(-dt*8));A.ph+=dt*(5.5+s.sp*0.55);
  A.rel+=((s.reload?1:0)-A.rel)*(1-Math.exp(-dt*(s.reload?9:7)));
  if(s.w!==A.lastW){A.lastW=s.w;A.sw=1;}A.sw=Math.max(0,A.sw-dt*4.2);
  A.ads+=((s.aim?1:0)-A.ads)*(1-Math.exp(-dt*13));
  if(!s.ground)A.air+=dt;else{if(A.air>0.25)A.land=Math.min(1,A.air*1.4);A.air=0;}A.land=Math.max(0,A.land-dt*4.5);
  A.kick+=(s.recoil-A.kick)*(1-Math.exp(-dt*30));
  const e=VMS[s.w],p=VP[s.w]||VP[0];
  if(e){
    const fo=e.flash.material.opacity;
    if(fo>A.lastFlash+0.3){e.flash.rotation.z=Math.random()*6.28;const fs=0.75+Math.random()*0.6;e.flash.scale.set(fs,fs,fs);
      if(NIX.vmFlash){NIX.vmFlash.color.copy(e.flash.material.color);NIX.vmFlash.intensity=2.6;NIX.vmFlash.position.set(p[0],p[1]+0.05,p[2]-0.5);}A.roll=(Math.random()-0.5)*0.05;}
    A.lastFlash=fo;
    /* slide the model toward the centre line when aiming */
    const a=A.ads*(1-A.rel);
    e.mdl.position.set(p[0]+(p[4]-p[0])*a,p[1]+(p[5]-p[1])*a,p[2]+(p[6]-p[2])*a);
    e.mdl.rotation.y=(s.w===10?0:0.055)*(1-a);
  }
  const ba=A.bob*(1-0.75*A.ads),sw=A.sw*A.sw,rl=A.rel;
  const bx=Math.sin(A.ph*0.5)*0.0075*ba,by=-Math.abs(Math.sin(A.ph*0.5))*0.0085*ba;
  const breathe=Math.sin(A.ph*0.0+performance.now()*0.0016)*0.0018*(1-A.ads);
  root.position.set(bx-A.sx*0.6+rl*0.03,by+breathe+A.sy*0.5-rl*0.17-sw*0.26-A.land*0.035-(s.down?0.22:0)+A.kick*0.012,A.kick*0.055+rl*0.03);
  root.rotation.set(A.kick*0.085-A.sy*0.9+sw*0.75-rl*0.5+A.land*0.09,-A.sx*1.1+rl*0.28,A.sx*0.7+rl*0.55+A.roll*A.kick+Math.sin(A.ph*0.5)*0.012*ba);
  NIX.vmFov=58-A.ads*10;
};

/* ------------------------------------------------------------------ street lamps: Blender-modelled posts, glowing lenses, and soft pools of light on the road at night */
let lampGlow=null,lampPool=null;
NIX.streetLamps=function(scene,list){
  if(!NIX.has('lamp_post')||!list.length)return;
  const post=NIX.geo('lamp_post'),glow=NIX.geo('lamp_glow'),lp=(post.userData&&post.userData.light)||[1.75,9,0];
  const mats=[],m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1),pos=new THREE.Vector3();
  for(const l of list){q.setFromAxisAngle(up,l[2]);pos.set(l[0],0.4,l[1]);mats.push(new THREE.Matrix4().compose(pos,q,one));}
  scene.add(NIX.scatter(post,null,new THREE.MeshLambertMaterial({vertexColors:true}),mats,{cell:176,max:380,cast:false,recv:false,radius:3,height:10}));   // posts dissolve out between 320 and 380 m instead of vanishing at 330
  const sg=NIX.scatter(glow,null,new THREE.MeshBasicMaterial({color:0xffe2b0}),mats,{cell:176,max:520,cast:false,recv:false,radius:3,height:10});
  lampGlow=sg.userData.mat;scene.add(sg);   // the scatter draws with its own copy of the material: that copy is the one whose colour follows the night
  /* light pools: one merged additive mesh, faded in with the night */
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'rgba(255,255,255,0.95)');rg.addColorStop(0.35,'rgba(255,255,255,0.4)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(0,0,64,64);
  const P=[],U=[],C=[],I=[];let v=0;const R=11,cols=[[1.0,0.72,0.42],[1.0,0.45,0.75],[0.45,0.9,1.0]];
  list.forEach((l,i)=>{const cx=l[0]+Math.cos(l[2])*lp[0],cz=l[1]-Math.sin(l[2])*lp[0],col=cols[i%3];
    P.push(cx-R,0.47,cz-R,cx+R,0.47,cz-R,cx+R,0.47,cz+R,cx-R,0.47,cz+R);U.push(0,0,1,0,1,1,0,1);for(let k=0;k<4;k++)C.push(col[0],col[1],col[2]);I.push(v,v+2,v+1,v,v+3,v+2);v+=4;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));geo.setIndex(I);
  lampPool=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  lampPool._nxNo=1;lampPool._nxF=1;lampPool.frustumCulled=false;lampPool.renderOrder=7;lampPool.visible=false;scene.add(lampPool);
};
const dayC=new THREE.Color(0x8a8598),nightC=new THREE.Color(0xffe2b0);
NIX.lampNight=function(n){
  if(lampGlow)lampGlow.color.copy(dayC).lerp(nightC,clamp(n*1.6,0,1));
  if(lampPool){lampPool.visible=n>0.03;lampPool.material.opacity=0.34*n;}
};

/* ------------------------------------------------------------------ the invaders: 30 hand-built designs from blender/aliens.py
   Each one is a body plus the rigid limbs the game animates (5-7 meshes instead of the 12-25 boxes the old ones used).
   Colours are painted per vertex in Blender; a second per-vertex channel says how much a surface glows. */
const AMAT={};
function alienMat(key,emissive){
  if(AMAT[key])return AMAT[key];
  const m=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,emissive:emissive||0x000000,emissiveIntensity:emissive?0.4:1});
  m.defines={NX_PLAIN:1};   // keep the aliens out of the shared prop sheen (nx-props.js)
  m.userData.uSelf={value:0.2};m.userData.uGK={value:1.9};m.userData.nxAlien=1;m.userData.nx=1;
  const uS=m.userData.uSelf,uG=m.userData.uGK;
  m.onBeforeCompile=sh=>{
    sh.uniforms.uSelf=uS;sh.uniforms.uGK=uG;
    sh.vertexShader='attribute float aGlow;varying float vGlow;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=aGlow;');
    sh.fragmentShader='varying float vGlow;uniform float uSelf;uniform float uGK;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor*(uSelf+vGlow*uGK);');
  };
  m.customProgramCacheKey=()=>'nxAlien';
  return AMAT[key]=m;
}
NIX.alienCount=()=>{const A=window.NX_ASSETS&&window.NX_ASSETS.aliens;return A?Object.keys(A).length:0;};
NIX.alienInfo=t=>{const A=window.NX_ASSETS&&window.NX_ASSETS.aliens;return A&&A[t]||null;};
function cleoSnakes(o,g){
  o.snakes=[];const sg=new THREE.MeshLambertMaterial({color:0x2fd86a,emissive:0x0a5a20,emissiveIntensity:0.7}),sd=new THREE.MeshLambertMaterial({color:0xf2e08a,emissive:0x6a5a10,emissiveIntensity:0.5}),se=new THREE.MeshBasicMaterial({color:0xff2040});
  const s1=new THREE.SphereGeometry(1,8,6),hoodG=new THREE.SphereGeometry(1,8,5);
  for(let i=0;i<5;i++){
    const an=i*6.2832/5+0.3,sn=new THREE.Group();sn.position.set(Math.cos(an)*1.05*1.05,3.75*1.05,Math.sin(an)*1.05*1.05);
    const segs=[];for(let k=0;k<4;k++){const sp=new THREE.Mesh(s1,k%2?sd:sg);sp.scale.setScalar(0.2-k*0.02);sp.position.y=k*0.28;sn.add(sp);segs.push(sp);}
    const hd=new THREE.Group();hd.position.set(0,1.15,0.1);sn.add(hd);
    const sk=new THREE.Mesh(s1,sg);sk.scale.set(0.26,0.21,0.36);hd.add(sk);
    const hood=new THREE.Mesh(hoodG,sg);hood.scale.set(0.42,0.36,0.08);hood.position.set(0,-0.05,-0.16);hd.add(hood);
    const bel=new THREE.Mesh(hoodG,sd);bel.scale.set(0.3,0.28,0.05);bel.position.set(0,-0.08,-0.1);hd.add(bel);
    for(const sx of[-1,1]){const e=new THREE.Mesh(s1,se);e.scale.setScalar(0.05);e.position.set(sx*0.11,0.05,0.18);hd.add(e);}
    sn.userData={segs,hd,ph:i*1.7};g.add(sn);o.snakes.push(sn);
  }
}
NIX.makeAlien=function(t){
  const A=NIX.alienInfo(t);if(!A||!NIX.geo(A.body))return null;
  const g=new THREE.Group(),hum=new THREE.Group();hum.scale.setScalar(A.s);g.add(hum);
  if(A.gs&&A.gs!==1)g.scale.setScalar(A.gs);
  const mat=alienMat(t===28?'disco':'std');
  const o={g,legs:[],arms:[],t,ring:null,fly:!!A.fly,pulse:null};
  const mesh=(name,par)=>{const me=new THREE.Mesh(NIX.geo(name),mat);par.add(me);return me;};
  mesh(A.body,hum);
  const limbs=(list,out)=>{for(const L of list||[]){const pv=new THREE.Group();pv.position.set(L.p[0],L.p[1],L.p[2]);const me=mesh(L.g,pv);if(L.mx<0)me.scale.x=-1;hum.add(pv);out.push(pv);}};
  limbs(A.legs,o.legs);limbs(A.arms,o.arms);
  if(A.armrot)A.armrot.forEach((r,i)=>{if(o.arms[i])o.arms[i].rotation.x=r;});
  for(const E of A.ex||[]){
    const par=E.par==='g'?g:E.par==='arm1'?o.arms[1]:E.par==='arm0'?o.arms[0]:hum;let node;
    if(E.role==='ring'){node=new THREE.Group();node.rotation.x=Math.PI/2;const me=mesh(E.g,node);me.rotation.x=-Math.PI/2;}   // the game spins rings about their own z
    else if(E.add){node=new THREE.Mesh(NIX.geo(E.g),new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false}));node.visible=false;}
    else node=new THREE.Mesh(NIX.geo(E.g),mat);
    node.position.set(E.p[0],E.p[1],E.p[2]);par.add(node);
    if(E.role)o[E.role]=node;
  }
  if(A.sniper)o.sniperPose=true;if(A.dance)o.dance=true;if(A.hum)o.hum=hum;
  if(A.bm)o.bm={set emissiveIntensity(v){mat.userData.uGK.value=1.3+v*2.4;mat.userData.uSelf.value=0.14+v*0.3;}};
  if(A.snakes)cleoSnakes(o,g);
  /* state for NIX.alienAnim (made once here, so the frame loop allocates nothing). calm = giants and bosses whose hit zones are
     tied to the pose in shared.js: they only breathe. */
  o._nx={h:hum,s:A.s,by:0,age:0,hp:undefined,fl:0,flz:0,bank:0,lean:0,yaw:NaN,seed:Math.random()*100,hopT:1.5+Math.random()*6,hop:0,tw:0,sg:1,
    ly:o.legs.map(L=>L.position.y),calm:A.s*(A.gs||1)>2.5||!!A.snakes,heavy:A.s*(A.gs||1)>=1.4,amp:clamp(1.15/Math.sqrt(A.s),0.6,1.3)};
  return o;
};
/* ------------------------------------------------------------------ livelier invaders
   Body motion layered over the leg and arm swing the game already does: a springy pop on arrival, a bounce and roll in the walk,
   squash and stretch, leaning into the run, banking into turns, breathing and looking around when idle, a flinch when shot,
   and now and then a hop with both arms in the air (sometimes with a twirl). Visual only and kept small, so hit zones still match.
   Called once per alien per frame from game.html, after the game's own animation. */
NIX.alienAnim=function(o,dt,moved,t){
  const a=o._nx;if(!a||!(dt>0))return;
  const h=a.h,sp=moved/dt,mv=Math.min(1,sp*0.15),idle=1-mv,k8=1-Math.exp(-8*dt),sd=a.seed,disco=o.t===28;
  a.age+=dt;
  let pop=1;if(a.age<0.5){const u=a.age/0.5-1;pop=Math.max(0.02,1+2.9*u*u*u+1.9*u*u);}   // arrival: grows from nothing and overshoots
  if(o.hp<a.hp){a.fl=1;a.flz=(Math.random()-0.5)*0.5;}a.hp=o.hp;   // it just lost health
  a.fl=Math.max(0,a.fl-dt*5);const fl=a.fl*a.fl;
  let dy=isNaN(a.yaw)?0:o.yaw-a.yaw;a.yaw=o.yaw;while(dy>Math.PI)dy-=6.2832;while(dy<-Math.PI)dy+=6.2832;
  a.bank+=(clamp(-dy/dt*0.07,-0.3,0.3)*mv-a.bank)*k8;
  a.lean+=(Math.min(o.fly?0.3:0.2,sp*(o.fly?0.03:0.022))-a.lean)*k8;
  const st=Math.sin(o.ph*2.2);   // the game's stride: +-1 with the legs apart, 0 as they pass
  let sy=1,sx=1,py=0,rx=0,ry=0,rz=0;
  if(a.calm||o.vm){sy=1+0.012*Math.sin(t*1.3+sd);rz=0.012*Math.sin(t*0.8+sd);}
  else if(o.fly){
    rx=a.lean+Math.sin(t*1.7+sd)*0.05;rz=a.bank*1.6+Math.sin(t*2.3+sd)*0.09+Math.sin(t*5.1+sd*2)*0.03;sy=1+0.04*Math.sin(t*4+sd);
  }else{
    const amp=a.amp,L=o.legs,R=o.arms,limbs=!disco&&!o.sniperPose&&L.length>1&&R.length>1;
    py=(1-st*st)*0.1*amp*mv;rx=a.lean;rz=a.bank+st*0.07*mv*amp;ry=st*0.12*mv;sy=1+(0.5-st*st)*0.07*mv*amp;
    sy+=0.022*Math.sin(t*2.1+sd)*idle;rz+=Math.sin(t*0.9+sd)*0.035*idle;if(!o.sniperPose)ry+=Math.sin(t*0.6+sd*1.7)*0.22*idle;
    if(a.heavy&&mv>0.5){const sg=st<0?-1:1;if(sg!==a.sg&&NIX.burst)NIX.burst(o.x,o.y+0.15,o.z,0xd8c8ff,3,3,0.8);a.sg=sg;}   // heavy ones kick up dust on every footfall
    /* the hop */
    if(a.hop<=0&&!o.dorm&&a.age>1){a.hopT-=dt;if(a.hopT<=0){a.hopT=3.5+Math.random()*6;a.hop=1;a.tw=Math.random()<0.34?1:0;}}
    let e=0;
    if(a.hop>0){a.hop=Math.max(0,a.hop-dt/0.55);const u=1-a.hop;e=Math.sin(Math.PI*u);py+=e*0.2*amp;sy+=0.09*Math.sin(u*6.2832);if(a.tw&&!o.sniperPose)ry+=u*u*(3-2*u)*6.2832;}
    if(limbs){
      L[0].position.y=a.ly[0]+Math.max(0,st)*0.14*mv;L[1].position.y=a.ly[1]+Math.max(0,-st)*0.14*mv;   // feet lift as they swing
      if(!o.dance){
        const f=Math.sin(t*1.6+sd)*0.1*idle;
        for(let i=0;i<2;i++){const A0=R[i],sgn=A0.position.x<0?-1:1;
          A0.rotation.x+=(i?-f:f);A0.rotation.x+=(-2.5-A0.rotation.x)*e;   // both arms go up in the hop
          A0.rotation.z=sgn*((0.06+0.1*Math.abs(st))*mv+0.45*e+0.2*fl);}
      }
    }
  }
  rx-=0.3*fl;rz+=a.flz*fl;sy*=1-0.1*fl;sx=1+0.07*fl+(1-sy)*0.5;   // flinch; and whatever is squashed in height bulges sideways
  const S=a.s*pop;h.scale.set(S*sx,S*sy*(pop<1?0.6+0.4*pop:1),S*sx);
  if(disco)return;   // the moonwalker steers its own lean and height
  h.rotation.set(rx,ry,rz);
  if(!o.dance){const ny=py*a.s;h.position.y+=ny-a.by;a.by=ny;}   // the game may have moved the body itself (vehicle riders), so only our own offset is changed
};
/* mutated aliens get a coloured inner glow */
NIX.mutTint=function(o,c){
  let any=false;const m=alienMat('mut'+c,c);
  o.g.traverse(x=>{if(x.isMesh&&x.material&&x.material.userData&&x.material.userData.nxAlien){x.material=m;any=true;}});
  return any;
};

/* ------------------------------------------------------------------ solid street furniture: palm trunks (and lamp posts) the player bumps into */
const SOL={cell:8,map:new Map(),n:0};
NIX.addSolid=function(x,z,r,h){
  const k=Math.floor(x/SOL.cell)+','+Math.floor(z/SOL.cell);let a=SOL.map.get(k);if(!a){a=[];SOL.map.set(k,a);}a.push(x,z,r,h||1e9);SOL.n++;
};
NIX.solidCount=()=>SOL.n;
/* push a circle (the player: p.x, p.z, radius rad, feet at height y) out of every solid it overlaps; returns true if it touched one */
NIX.pushSolids=function(p,rad,y){
  const cx=Math.floor(p.x/SOL.cell),cz=Math.floor(p.z/SOL.cell);let hit=false;
  for(let i=cx-1;i<=cx+1;i++)for(let j=cz-1;j<=cz+1;j++){
    const a=SOL.map.get(i+','+j);if(!a)continue;
    for(let k=0;k<a.length;k+=4){
      if(y!==undefined&&y>a[k+3])continue;   // above it (jetpack, rooftops)
      const dx=p.x-a[k],dz=p.z-a[k+1],rr=rad+a[k+2],d2=dx*dx+dz*dz;
      if(d2<rr*rr){const d=Math.sqrt(d2);if(d<1e-4){p.x+=rr;}else{const s=(rr-d)/d;p.x+=dx*s;p.z+=dz*s;}hit=true;}
    }
  }
  return hit;
};
})();
