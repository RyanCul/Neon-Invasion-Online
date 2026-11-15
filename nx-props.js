/* NEON INVASION - REMAKE: world dressing. Visual only - collision and game rules stay in shared.js.
   - one surface treatment for every lit prop (sky-tinted edge sheen, a soft sun glint, darker toward the ground)
   - Blender-made vehicles, shop stations, mystery box and loot crates (blender/props.py)
   - building trim: parapets, neon tube rims, awnings, plinths, corner strips, rooftop kit; chamfered cover blocks */
(function(){
'use strict';
if(!window.NIX||typeof THREE==='undefined')return;
const NIX=window.NIX;

/* ------------------------------------------------------------------ shared surface treatment (materials that define NX_PLAIN opt out: the aliens) */
(function(){
  const L=THREE.ShaderLib.lambert,k='#include <lights_lambert_vertex>';
  if(!L||L.vertexShader.indexOf(k)<0)return;
  L.vertexShader=L.vertexShader.replace(k,k+`
  #ifndef NX_PLAIN
  {vec3 nxN=normalize(transformedNormal);vec3 nxV=normalize(-mvPosition.xyz);
   float nxF=pow(1.0-abs(dot(nxN,nxV)),3.0);
   float nxUp=max(normalize(mat3(modelMatrix)*objectNormal).y,0.0);
   #ifdef USE_INSTANCING
   float nxY=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).y;
   #else
   float nxY=(modelMatrix*vec4(transformed,1.0)).y;
   #endif
   float nxAo=mix(0.8,1.0,max(smoothstep(0.2,3.0,nxY),nxUp));
   vec3 nxSp=vec3(0.0);
   #if NUM_DIR_LIGHTS > 0
   nxSp=directionalLights[0].color*pow(max(dot(nxN,normalize(directionalLights[0].direction+nxV)),0.0),28.0)*0.3;
   #endif
   vLightFront=vLightFront*nxAo+vIndirectFront*nxF*0.55+nxSp;vIndirectFront*=nxAo;}
  #endif`);
})();

/* ------------------------------------------------------------------ materials */
let lamM=null,glowM=null;const neonC=new Map(),darkC=new Map();
const LM=()=>lamM||(lamM=new THREE.MeshLambertMaterial({vertexColors:true}));
const GM=()=>glowM||(glowM=new THREE.MeshBasicMaterial({vertexColors:true}));
const neonM=h=>{let m=neonC.get(h);if(!m){m=new THREE.MeshBasicMaterial({color:h});neonC.set(h,m);}return m;};
const darkM=h=>{let m=darkC.get(h);if(!m){m=new THREE.MeshLambertMaterial({color:h});darkC.set(h,m);}return m;};
const put=(par,name,mat)=>{const g=NIX.geo(name);if(!g)return null;const m=new THREE.Mesh(g,mat);par.add(m);return m;};

/* ------------------------------------------------------------------ a box with every edge chamfered (44 triangles) */
NIX.cbox=function(w,h,d,r){
  const hx=w/2,hy=h/2,hz=d/2;r=Math.max(0.005,Math.min(r,hx*0.45,hy*0.45,hz*0.45));
  const X=(a,b,c)=>[a*hx,b*(hy-r),c*(hz-r)],Y=(a,b,c)=>[a*(hx-r),b*hy,c*(hz-r)],Z=(a,b,c)=>[a*(hx-r),b*(hy-r),c*hz];
  const P=[],N=[];
  const tri=(a,b,c)=>{
    let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    if(nx*(a[0]+b[0]+c[0])+ny*(a[1]+b[1]+c[1])+nz*(a[2]+b[2]+c[2])<0){const t=b;b=c;c=t;nx=-nx;ny=-ny;nz=-nz;}
    P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);for(let i=0;i<3;i++)N.push(nx,ny,nz);
  };
  const quad=(a,b,c,e)=>{tri(a,b,c);tri(a,c,e);};
  for(const s of[-1,1]){
    quad(X(s,-1,-1),X(s,1,-1),X(s,1,1),X(s,-1,1));quad(Y(-1,s,-1),Y(1,s,-1),Y(1,s,1),Y(-1,s,1));quad(Z(-1,-1,s),Z(1,-1,s),Z(1,1,s),Z(-1,1,s));
    for(const t of[-1,1]){
      quad(X(s,t,-1),X(s,t,1),Y(s,t,1),Y(s,t,-1));quad(Y(-1,s,t),Y(1,s,t),Z(1,s,t),Z(-1,s,t));quad(X(s,-1,t),X(s,1,t),Z(s,1,t),Z(s,-1,t));
      for(const u of[-1,1])tri(X(s,t,u),Y(s,t,u),Z(s,t,u));
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.computeBoundingSphere();g.computeBoundingBox();return g;
};

/* ------------------------------------------------------------------ Blender models */
const ICO={armory:'ico_cross',forge:'ico_arrow',garage:'ico_wheel',perks:'ico_gem'};
NIX.station=function(g,ico,k){
  if(!NIX.has('st_'+k+'_body'))return false;
  put(g,'st_'+k+'_body',LM());put(g,'st_'+k+'_glow',GM());put(ico,ICO[k],GM());return true;
};
NIX.carModel=function(type,root,bodyMat,trimMat){
  if(!NIX.has('car'+type+'_body'))return false;
  bodyMat.vertexColors=true;
  put(root,'car'+type+'_body',bodyMat);put(root,'car'+type+'_detail',LM());put(root,'car'+type+'_trim',trimMat);put(root,'car'+type+'_lights',GM());
  /* wheels: one mesh per axle (both wheels of the axle), hung on a pivot so NIX.carAnim can spin it, steer the front one and keep it on the road while the body leans */
  const wg=NIX.geo('car'+type+'_wheels');
  if(wg&&wg.userData.ax){
    const A=[];let zf=-1e9;for(const a of wg.userData.ax)zf=Math.max(zf,a[1]);
    for(const a of wg.userData.ax){const piv=new THREE.Group();piv.position.set(0,a[0],a[1]);const m=new THREE.Mesh(wg,LM());m._nxNo=1;piv.add(m);root.add(piv);A.push({piv,m,y:a[0],z:a[1],front:wg.userData.ax.length>1&&a[1]===zf});}
    root.userData.nxAx=A;root.userData.nxWr=wg.userData.r||0.5;
  }
  return true;
};
/* per-frame vehicle animation. v = forward speed (m/s), steer = -1..1 (left is positive), lean = true for four-wheelers whose body should
   squat under power, dive under braking and roll out of a corner. The body sits on a damped spring so it settles instead of snapping. */
const cl=(v,a,b)=>v<a?a:v>b?b:v;
NIX.carAnim=function(root,v,steer,dt,lean){
  const u=root.userData,A=u.nxAx;dt=Math.min(dt,0.05);
  let P=0,R=0;
  if(lean){
    const acc=cl((v-(u.nxV===undefined?v:u.nxV))/Math.max(dt,1e-3),-55,55);u.nxV=v;
    u.nxA=(u.nxA||0)+(acc-(u.nxA||0))*(1-Math.exp(-12*dt));   // smoothed acceleration
    const tp=cl(-u.nxA*0.0055,-0.08,0.095);                  // pitch: squat on gas, dive on brake
    const tr=cl(steer*Math.min(1,Math.abs(v)/9.5)*0.13,-0.13,0.13); // roll: dynamic cornering body roll
    u.nxPv=(u.nxPv||0)+((tp-(u.nxP||0))*130-(u.nxPv||0)*14)*dt;u.nxP=(u.nxP||0)+u.nxPv*dt;
    u.nxRv=(u.nxRv||0)+((tr-(u.nxR||0))*120-(u.nxRv||0)*13)*dt;u.nxR=(u.nxR||0)+u.nxRv*dt;
    P=u.nxP=cl(u.nxP,-0.15,0.15);R=u.nxR=cl(u.nxR,-0.15,0.15);
    root.rotation.x=P;root.rotation.z=R;
    if(!u.nxHov)root.position.y=-0.28*(Math.abs(P)+Math.abs(R));   // chassis settles into tires
  }
  if(A){
    u.nxSpin=((u.nxSpin||0)+v/u.nxWr*dt)%6.2832;
    u.nxSt=(u.nxSt||0)+(steer*0.58-(u.nxSt||0))*(1-Math.exp(-16*dt));   // front wheels steer cleanly
    for(const a of A){a.m.rotation.x=u.nxSpin;a.piv.rotation.set(-P,a.front?u.nxSt:0,-R);a.piv.position.y=a.y+a.z*P-(lean&&!u.nxHov?root.position.y:0);}
  }
};
NIX.mbox=function(g){if(!NIX.has('mbox_body'))return false;put(g,'mbox_body',LM());put(g,'mbox_glow',GM());return true;};
NIX.lootMesh=function(t,col){   // 0 cash crate, 1 rare gem, 2 mix tape, 3 ammo box
  const n=['loot_crate','loot_gem','loot_tape','loot_ammo'][t],g=NIX.geo(n);if(!g)return null;
  return new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:0.5,vertexColors:true}));
};

/* ------------------------------------------------------------------ landmarks (blender/landmarks.py)
   Collision stays the plain boxes from shared.js; each model is built round those boxes. NIX.landmarkDeco is asked about
   every landmark box: true means a Blender model draws it (the first box of a landmark places the whole model). */
const tintC=new Map(),cabC=new Map();
const tintM=h=>{let m=tintC.get(h);if(!m){m=new THREE.MeshLambertMaterial({color:h,vertexColors:true});tintC.set(h,m);}return m;};
const themeAt=(x,z)=>{const T=window.NI&&window.NI.WORLD&&window.NI.WORLD.themes;if(T)for(const t of T)if(t.k!=='marina'&&Math.abs(t.cx-x)<=30&&Math.abs(t.cz-z)<=30)return t;return null;};
function place(scene,name,mat,x,y,z,ry){
  const g=NIX.geo(name);if(!g)return null;const m=new THREE.Mesh(g,mat);
  if(mat.isMeshBasicMaterial)m._nxNoCast=1;   // neon does not cast shadows
  m.position.set(x,y,z);if(ry)m.rotation.y=ry;scene.add(m);return m;
}
const YARDC=[0xff4a3c,0x25a8ff,0xffc83c,0x3cff9e,0xa56bff,0xff2fa0];
const whole2=(scene,t,n,fn)=>{if(!NIX.has('lm_'+n+'_body'))return false;if(!t.nxLm){t.nxLm=1;place(scene,'lm_'+n+'_body',LM(),t.cx,0.2,t.cz);place(scene,'lm_'+n+'_glow',GM(),t.cx,0.2,t.cz);if(fn)fn();}return true;};
/* indoor models get a little self-light so they read inside the dim casino */
let lamI=null,hedgeM=null;const tintE=new Map();
const LMI=()=>lamI||(lamI=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x1c1626}));
const HEDGEM=()=>hedgeM||(hedgeM=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x124822,emissiveIntensity:0.32}));
const tintEM=h=>{let m=tintE.get(h);if(!m){m=new THREE.MeshLambertMaterial({color:h,emissive:h,emissiveIntensity:0.28,vertexColors:true});tintE.set(h,m);}return m;};
NIX.landmarkDeco=function(scene,b){
  /* casino games: the six slot machines and the roulette table stand on the collision boxes shared.js makes inside the casino (turned with the building) */
  const C=window.NI&&window.NI.WORLD&&window.NI.WORLD.casino;
  if(C&&b.nomm&&Math.abs(b.x-C.x)<C.half&&Math.abs(b.z-C.z)<C.half){
    const ry=-(C.k||0)*Math.PI/2;
    if(b.h===3.2&&NIX.has('lm_slot_body')){place(scene,'lm_slot_body',tintEM(b.c),b.x,0.06,b.z,ry);place(scene,'lm_slot_detail',LMI(),b.x,0.06,b.z,ry);place(scene,'lm_slot_glow',GM(),b.x,0.06,b.z,ry);return true;}
    if(b.h===1.2&&NIX.has('lm_roulette_body')){place(scene,'lm_roulette_body',LMI(),b.x,0.06,b.z,ry);place(scene,'lm_roulette_detail',LMI(),b.x,0.06,b.z,ry);place(scene,'lm_roulette_glow',GM(),b.x,0.06,b.z,ry);return true;}
  }
  const t=themeAt(b.x,b.z);if(!t)return false;
  if(t.k==='fountain'&&(b.w===18||b.w===8||b.w===2.2))return whole2(scene,t,'fountain',()=>{   // lamp pillars on the deck corners and the dolphins on the tier are solid
    for(const sx of[-1,1])for(const sz of[-1,1]){NIX.addSolid(t.cx+sx*8.1,t.cz+sz*8.1,0.55,5.4);NIX.addSolid(t.cx+sx*3.1,t.cz+sz*3.1,0.4,5.0);}});
  if(t.k==='maze'&&b.h===5&&NIX.has('lm_hedge_body')){   // one leafy wall piece per collision box; the walls that run along z are the same piece turned
    const ry=b.w>b.d?0:Math.PI/2;place(scene,'lm_hedge_body',HEDGEM(),b.x,0.2,b.z,ry);place(scene,'lm_hedge_glow',GM(),b.x,0.2,b.z,ry);
    if(!t.nxLm){t.nxLm=1;place(scene,'lm_maze_arch_body',LM(),t.cx,0.2,t.cz+21.25);place(scene,'lm_maze_arch_glow',GM(),t.cx,0.2,t.cz+21.25);}   // gate over the gap in the south wall
    return true;
  }
  const whole=(n,fn)=>{if(!NIX.has('lm_'+n+'_body'))return false;if(!t.nxLm){t.nxLm=1;place(scene,'lm_'+n+'_body',LM(),t.cx,0.2,t.cz);place(scene,'lm_'+n+'_glow',GM(),t.cx,0.2,t.cz);if(fn)fn();}return true;};
  if(t.k==='pyramid'&&b.w===b.d)return whole('pyramid',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*3.8,t.cz+sz*3.8,0.5,15.2);});   // the summit obelisks are solid
  if(t.k==='lighthouse'&&b.w===b.d)return whole('lighthouse',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*1.3,t.cz+sz*1.3,0.22,14.4);});   // so are the lookout's columns
  if(t.k==='ferris'&&b.w===3.5&&b.h===27)return whole('wheel_support',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*10,t.cz+sz*8.7,0.8,3);});   // feet of the bracing legs
  if((t.k==='ferris'||t.k==='drivein')&&b.w===9&&b.d===6&&b.h===4&&NIX.has('lm_kiosk_body')){place(scene,'lm_kiosk_body',LM(),b.x,0.2,b.z);place(scene,'lm_kiosk_trim',neonM(b.c),b.x,0.2,b.z);return true;}
  if(t.k==='plaza'&&b.h===34&&NIX.has('lm_clocktower_body')){place(scene,'lm_clocktower_body',LM(),b.x,0.2,b.z);place(scene,'lm_clocktower_glow',GM(),b.x,0.2,b.z);return true;}
  if(t.k==='yard'){
    if(b.w===12.2&&NIX.has('lm_container_body')){   // one model per container; the upper one of a stack is turned round and painted another colour
      const n=Math.max(1,Math.round(b.h/2.6));
      for(let i=0;i<n;i++){const c=i?YARDC[(YARDC.indexOf(b.c)+2+(Math.abs(Math.round(b.z))%3))%6]:b.c,ry=i?Math.PI:0,v=Math.abs(Math.round(b.x*0.7+b.z*1.3)+i)%3;
        place(scene,'lm_container_body',tintEM(c),b.x,0.2+i*2.6,b.z,ry);place(scene,'lm_container_detail',LM(),b.x,0.2+i*2.6,b.z,ry);
        place(scene,'lm_container_deco'+v,LM(),b.x,0.2+i*2.6,b.z,ry);place(scene,'lm_container_glow'+v,GM(),b.x,0.2+i*2.6,b.z,ry);}   // one of three colourways: stripes, logo block, hazard doors, neon edge
      return true;
    }
    if(b.w===2&&b.d===2&&NIX.has('lm_crate')){const v=Math.abs(Math.round(b.x)+Math.round(b.z)*3)%3,ry=(Math.abs(Math.round(b.z))%2)*Math.PI/2;   // three crate looks: wood, teal, violet
      place(scene,NIX.has('lm_crate'+v)?'lm_crate'+v:'lm_crate',LM(),b.x,0.2,b.z,ry);place(scene,'lm_crate_glow'+v,GM(),b.x,0.2,b.z,ry);return true;}
  }
  return false;
};
/* the turning part of the Ferris wheel and its gondolas: they move every frame, so they are kept out of the static batcher */
NIX.ferrisWheel=function(spin){
  if(!NIX.has('lm_wheel_body'))return false;
  const a=put(spin,'lm_wheel_body',LM()),g=NIX.geo('lm_wheel_glow');a._nxNo=1;
  if(g){const m=new THREE.Mesh(g,GM());m._nxNo=1;m._nxNoCast=1;spin.add(m);}
  return true;
};
NIX.gondola=function(par,col){
  const g=NIX.geo('lm_gondola');if(!g)return false;
  let m=cabC.get(col);if(!m){m=new THREE.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:0.16,vertexColors:true});cabC.set(col,m);}
  const me=new THREE.Mesh(g,m);me._nxNo=1;par.add(me);return true;
};
NIX.lighthouseLens=()=>{const g=NIX.geo('lm_lighthouse_body');return g&&g.userData.lens?g.userData.lens[1]+0.2:0;};   // world height of the lamp (0 = no model)
NIX.ufo=function(g){if(!NIX.has('lm_ufo_body'))return false;put(g,'lm_ufo_body',LM());const m=put(g,'lm_ufo_glow',GM());if(m)m.castShadow=false;return true;};
NIX.crystal=function(par){   // faceted gem inside the wire frame that floats over the pyramid
  const g=NIX.geo('lm_crystal');if(!g)return false;
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xff8fd6,emissive:0xff2fa0,emissiveIntensity:0.75}));m._nxNo=1;m._nxNoCast=1;par.add(m);return true;
};
/* casino dressing placed by dressCasino in game.html (par = the casino's own group, in its local frame) */
NIX.roulWheel=function(par){   // the turning part of the roulette wheel; the caller spins the returned group
  if(!NIX.has('lm_roulwheel_body'))return null;
  const w=new THREE.Group();for(const [n,m] of[['body',LMI()],['detail',LMI()],['glow',GM()]]){const me=put(w,'lm_roulwheel_'+n,m);if(me){me._nxNo=1;me._nxNoCast=1;}}
  par.add(w);return w;
};
NIX.bjTable=function(par,x,z){   // blackjack table with its cards, chips, shoe and five stools
  if(!NIX.has('lm_bj_body'))return false;
  for(const [n,m] of[['body',LMI()],['detail',LMI()],['glow',GM()]]){const me=put(par,'lm_bj_'+n,m);if(me)me.position.set(x,0.05,z);}
  return true;
};
/* ------------------------------------------------------------------ beach props (blender/beach.py). Every function returns false when its model is missing, so game.html keeps its old boxes. */
const mk=(par,name,mat,x,y,z,ry)=>{const m=put(par,name,mat);if(m){m.position.set(x||0,y||0,z||0);if(ry)m.rotation.y=ry;}return m;};
NIX.beach={
  umbrella(u,col){if(!NIX.has('bch_umb_top'))return false;mk(u,'bch_umb_pole',LM());mk(u,'bch_umb_top',tintEM(col));return true;},
  towel(par,col,x,z,ry){if(!NIX.has('bch_towel'))return null;return mk(par,'bch_towel',tintEM(col),x,0.06,z,ry);},
  lounger(par,col,x,z,ry){if(!NIX.has('bch_lounger_body'))return false;mk(par,'bch_lounger_body',tintEM(col),x,0.05,z,ry);mk(par,'bch_lounger_detail',LM(),x,0.05,z,ry);return true;},
  torch(par,x,z){if(!NIX.has('bch_torch_body'))return false;mk(par,'bch_torch_body',LM(),x,0,z);mk(par,'bch_torch_detail',LM(),x,0,z);return true;},
  cooler(par,col,x,z,ry){if(!NIX.has('bch_cooler_body'))return false;mk(par,'bch_cooler_body',tintEM(col),x,0.05,z,ry);mk(par,'bch_cooler_detail',LM(),x,0.05,z,ry);return true;},
  ball(par,x,z,ry){if(!NIX.has('bch_ball'))return false;const m=mk(par,'bch_ball',LM(),x,0.05,z,ry);m.rotation.z=0.5;m.position.y=0.15;return true;},   // tipped over so the stripes show; lifted so the low side still rests on the sand
  star(par,col,x,z,ry){if(!NIX.has('bch_star'))return false;mk(par,'bch_star',tintEM(col),x,0.05,z,ry);return true;},
  shell(par,col,x,z,ry){if(!NIX.has('bch_shell'))return false;mk(par,'bch_shell',tintEM(col),x,0.05,z,ry);return true;},
  surf(par,col,x,z,ry,tilt){if(!NIX.has('bch_surf_body'))return false;for(const [n,m] of[['bch_surf_body',tintEM(col)],['bch_surf_detail',LM()]]){const me=mk(par,n,m,x,-0.45,z,ry);if(me)me.rotation.x=tilt||0;}return true;},
  castle(c){if(!NIX.has('bch_castle_body'))return false;mk(c,'bch_castle_body',tintEM(0xffba6a));const g=mk(c,'bch_castle_glow',GM());if(g)g._nxNoCast=1;return true;},
  net(n){if(!NIX.has('bch_net_body'))return false;mk(n,'bch_net_body',LM());const d=mk(n,'bch_net_detail',LM());if(d)d._nxNoCast=1;return true;},
  tower(t){if(!NIX.has('bch_tower_body'))return false;mk(t,'bch_tower_body',LM());mk(t,'bch_tower_detail',LM());const g=mk(t,'bch_tower_glow',GM());if(g)g._nxNoCast=1;return true;}
};

/* ------------------------------------------------------------------ building trim */
const KIT={ac:[],tank:[],ant:[],vent:[]};
function rng(seed){let s=(Math.floor(seed)>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function bx(scene,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m;}
function frame(scene,w,d,t,h,x,y,z,mat){   // four bars making a rectangular ring, outer size w x d
  bx(scene,w,h,t,x,y,z-d/2+t/2,mat);bx(scene,w,h,t,x,y,z+d/2-t/2,mat);bx(scene,t,h,d-2*t,x-w/2+t/2,y,z,mat);bx(scene,t,h,d-2*t,x+w/2-t/2,y,z,mat);
}
const m4=new THREE.Matrix4(),q4=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),p3=new THREE.Vector3(),s3=new THREE.Vector3();
function kitAdd(k,x,y,z,ry,sc){q4.setFromAxisAngle(up,ry);p3.set(x,y,z);s3.set(sc,sc,sc);KIT[k].push(new THREE.Matrix4().compose(p3,q4,s3));}
function roofKit(cx,cz,w,d,y,R,noAnt){
  const mx=Math.max(0,w-5.5),mz=Math.max(0,d-5.5),at=()=>[cx+(R()-0.5)*mx,cz+(R()-0.5)*mz];
  const nAc=Math.max(1,Math.min(4,Math.floor(w*d/200)));
  for(let i=0;i<nAc;i++){const p=at();kitAdd('ac',p[0],y,p[1],R()<0.5?0:Math.PI/2,0.9+R()*0.3);}
  if(w>14&&d>14&&R()<0.6){const p=at();kitAdd('tank',p[0],y,p[1],R()*6.28,0.9+R()*0.4);}
  for(let i=0,n=1+Math.floor(R()*3);i<n;i++){const p=at();kitAdd('vent',p[0],y,p[1],0,0.9+R()*0.5);}
  if(!noAnt&&R()<0.45){const p=at();kitAdd('ant',p[0],y,p[1],R()*6.28,0.8+R()*0.6);}
}
NIX.dressBuilding=function(scene,b,colHex,neonHex,roofMat){
  return false;
};
NIX.dressSign=function(scene,s,roofMat){};
NIX.dressWall=function(scene,b){};
NIX.dressLintel=function(scene,b,neonHex){};
NIX.dressRoof=function(scene,b,neonHex,roofMat){};
const propC=new Map();
NIX.dressProp=function(scene,b,neonHex){
  let pm=propC.get(neonHex);if(!pm){pm=new THREE.MeshLambertMaterial({color:0x2b2145,emissive:neonHex,emissiveIntensity:0.28});propC.set(neonHex,pm);}
  const w=b.w,d=b.d,h=b.h,r=Math.min(0.14,0.2*Math.min(w,h,d)),nm=neonM(neonHex);
  const m=new THREE.Mesh(NIX.cbox(w,h,d,r),pm);m.position.set(b.x,h/2+0.4,b.z);scene.add(m);
  if(w>0.8&&d>0.8)bx(scene,w-0.36,0.1,d-0.36,b.x,h+0.42,b.z,nm);else bx(scene,w+0.1,0.12,d+0.1,b.x,h+0.45,b.z,nm);
  if(h>=1.6&&w>0.8&&d>0.8)frame(scene,w+0.08,d+0.08,0.06,0.09,b.x,0.4+h-0.36,b.z,nm);
  return true;
};
NIX.dressDone=function(scene){
  for(const k in KIT){const g=NIX.geo('roof_'+k);if(!g||!KIT[k].length)continue;
    scene.add(NIX.scatter(g,null,LM(),KIT[k],{cell:176,max:440,cast:true,recv:true,radius:4,height:140}));KIT[k]=[];}
};
})();
