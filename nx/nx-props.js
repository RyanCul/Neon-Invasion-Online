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
  put(root,'car'+type+'_body',bodyMat);put(root,'car'+type+'_detail',LM());put(root,'car'+type+'_trim',trimMat);put(root,'car'+type+'_lights',GM());return true;
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
NIX.landmarkDeco=function(scene,b){
  const t=themeAt(b.x,b.z);if(!t)return false;
  const whole=(n,fn)=>{if(!NIX.has('lm_'+n+'_body'))return false;if(!t.nxLm){t.nxLm=1;place(scene,'lm_'+n+'_body',LM(),t.cx,0.2,t.cz);place(scene,'lm_'+n+'_glow',GM(),t.cx,0.2,t.cz);if(fn)fn();}return true;};
  if(t.k==='pyramid'&&b.w===b.d)return whole('pyramid',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*3.8,t.cz+sz*3.8,0.5,15.2);});   // the summit obelisks are solid
  if(t.k==='lighthouse'&&b.w===b.d)return whole('lighthouse',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*1.3,t.cz+sz*1.3,0.22,14.4);});   // so are the lookout's columns
  if(t.k==='ferris'&&b.w===3.5&&b.h===27)return whole('wheel_support',()=>{for(const sx of[-1,1])for(const sz of[-1,1])NIX.addSolid(t.cx+sx*10,t.cz+sz*8.7,0.8,3);});   // feet of the bracing legs
  if((t.k==='ferris'||t.k==='drivein')&&b.w===9&&b.d===6&&b.h===4&&NIX.has('lm_kiosk_body')){place(scene,'lm_kiosk_body',LM(),b.x,0.2,b.z);place(scene,'lm_kiosk_trim',neonM(b.c),b.x,0.2,b.z);return true;}
  if(t.k==='plaza'&&b.h===34&&NIX.has('lm_clocktower_body')){place(scene,'lm_clocktower_body',LM(),b.x,0.2,b.z);place(scene,'lm_clocktower_glow',GM(),b.x,0.2,b.z);return true;}
  if(t.k==='yard'){
    if(b.w===12.2&&NIX.has('lm_container_body')){   // one model per container; the upper one of a stack is turned round and painted another colour
      const n=Math.max(1,Math.round(b.h/2.6));
      for(let i=0;i<n;i++){const c=i?YARDC[(YARDC.indexOf(b.c)+2+(Math.abs(Math.round(b.z))%3))%6]:b.c,ry=i?Math.PI:0;place(scene,'lm_container_body',tintM(c),b.x,0.2+i*2.6,b.z,ry);place(scene,'lm_container_detail',LM(),b.x,0.2+i*2.6,b.z,ry);}
      return true;
    }
    if(b.w===2&&b.d===2&&NIX.has('lm_crate')){place(scene,'lm_crate',LM(),b.x,0.2,b.z,(Math.abs(Math.round(b.z))%2)*Math.PI/2);return true;}
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
  const w=b.w,d=b.d,y0=b.y0||0,h=b.h-y0,nm=neonM(neonHex),R=rng(b.x*73.1+b.z*131.7+b.h*7);
  frame(scene,w+0.9,d+0.9,0.4,0.9,b.x,b.h+1.0,b.z,roofMat);            // parapet
  frame(scene,w+1.1,d+1.1,0.16,0.16,b.x,b.h+1.5,b.z,nm);                // neon tube along the top
  if(!y0){
    const c=new THREE.Color(colHex).multiplyScalar(0.42);
    frame(scene,w+0.5,d+0.5,0.25,0.9,b.x,0.65,b.z,darkM(c.getHex()));   // plinth
    if(h>9){frame(scene,w+1.4,d+1.4,0.7,0.16,b.x,4.5,b.z,roofMat);frame(scene,w+1.5,d+1.5,0.1,0.1,b.x,4.38,b.z,nm);}   // awning over the shopfronts
  }
  if(h>38)for(const sx of[-1,1])for(const sz of[-1,1])bx(scene,0.22,h-6,0.22,b.x+sx*(w/2+0.06),y0+5.5+(h-6)/2,b.z+sz*(d/2+0.06),nm);
  const crown=h>44&&w>12&&d>12;
  if(crown){bx(scene,w*0.55,3.2,d*0.55,b.x,b.h+2.4,b.z,roofMat);frame(scene,w*0.55+0.5,d*0.55+0.5,0.14,0.14,b.x,b.h+4.1,b.z,nm);kitAdd('ant',b.x,b.h+4,b.z,R()*6.28,1.5);}
  roofKit(b.x,b.z,crown?w*0.9:w,crown?d*0.9:d,b.h+0.8,R,crown);
  return true;
};
NIX.dressSign=function(scene,s,roofMat){
  const p=s.geometry.parameters;bx(scene,p.width+0.7,p.height+0.5,0.3,s.position.x,s.position.y,s.position.z-0.3,roofMat);
  for(const sx of[-1,1])bx(scene,0.25,p.height+1.6,0.25,s.position.x+sx*(p.width/2+0.1),s.position.y-0.6,s.position.z-0.3,roofMat);
};
NIX.dressWall=function(scene,b){bx(scene,b.w+0.24,0.7,b.d+0.24,b.x,0.55,b.z,darkM(0x1c1430));};
NIX.dressLintel=function(scene,b,neonHex){bx(scene,b.w+0.06,0.12,b.d+0.06,b.x,(b.y0||0)+0.15,b.z,neonM(neonHex));};
NIX.dressRoof=function(scene,b,neonHex,roofMat){
  frame(scene,b.w+0.4,b.d+0.4,0.35,0.7,b.x,b.h+0.65,b.z,roofMat);
  roofKit(b.x,b.z,b.w-2,b.d-2,b.h+0.2,rng(b.x*31.3+b.z*57.9+3),true);
};
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
