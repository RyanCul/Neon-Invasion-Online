/* NEON SHORES: INVASION - shared simulation.
   Runs on the Node server (online) AND inside the browser (solo). */
(function(root){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const r2=v=>Math.round(v*100)/100;

/* ---------------- constants ---------------- */
const EYE=2.9;                 // player eye height
const N=8,P=88,HALF=(N/2)*P;
const BOUNDS={x0:-HALF-10,x1:HALF+10,z0:-HALF-10,z1:HALF+64};
const PLAYER_COLORS=[0xff2fa0,0x25f4ff,0xfff3b0,0xa56bff,0x3cff9e,0xff9a3c,0xffffff,0x8fd3ff];

/* weapons: colored laser guns */
const WPN=[
  {id:0,name:'FLAMINGO',  kind:'PINK LASER PISTOL',   color:0xff2fa0,dmg:30, rate:4.6, mag:12, res:120,cost:0,   pellets:1,spread:0.004,pierce:1,reload:1.1,auto:false},
  {id:1,name:'AQUA-9',    kind:'CYAN LASER SMG',      color:0x25f4ff,dmg:17, rate:13,  mag:40, res:280,cost:1000,pellets:1,spread:0.02, pierce:1,reload:1.4,auto:true},
  {id:2,name:'SUNSET',    kind:'ORANGE LASER SHOTGUN',color:0xff9a3c,dmg:20, rate:1.5, mag:6,  res:54, cost:1500,pellets:8,spread:0.07, pierce:1,reload:2.0,auto:false},
  {id:3,name:'VIOLET RAIL',kind:'PURPLE PIERCING RAIL',color:0xa56bff,dmg:170,rate:1.2, mag:8,  res:56, cost:2500,pellets:1,spread:0.0,  pierce:4,reload:1.8,auto:false},
  {id:4,name:'LIME STORM',kind:'GREEN LASER MINIGUN', color:0x3cff9e,dmg:24, rate:11,  mag:90, res:450,cost:3500,pellets:1,spread:0.03, pierce:1,reload:2.4,auto:true}
];
const DMG_MULT=[1,1.6,2.4,3.6];
const MAG_MULT=[1,1.25,1.5,2];
const UP_COST=[1500,3000,6000];          // cost to reach level 1,2,3
const JET_COST=2500;
const AMMO_COST=w=>Math.max(250,Math.round(WPN[w].cost/2/50)*50);

const CARS=[
  {id:0,name:'FLAMINGO COUPE',color:0xff3d9a,cost:1500,hp:250,maxS:42,dmg:26,rate:8, twin:false,body:1.0},
  {id:1,name:'CYAN MUSCLE',   color:0x25f4ff,cost:3500,hp:500,maxS:47,dmg:40,rate:9, twin:true, body:1.12},
  {id:2,name:'SUNSET HYPER',  color:0xffc83c,cost:6000,hp:850,maxS:58,dmg:62,rate:11,twin:true, body:1.2}
];

/* alien types: 0 grunt 1 spitter 2 drone 3 brute 4 boss */
const AT=[
  {name:'GRUNT',  hp:60,  sp:6.8, r:1.5, cy:1.5, dmg:18, money:60,  fly:false},
  {name:'SPITTER',hp:50,  sp:5.6, r:1.4, cy:1.5, dmg:12, money:75,  fly:false,ranged:true},
  {name:'DRONE',  hp:34,  sp:13,  r:1.5, cy:0,   dmg:10, money:70,  fly:true},
  {name:'BRUTE',  hp:420, sp:4.6, r:2.7, cy:2.7, dmg:38, money:200, fly:false},
  {name:'BOSS',   hp:3500,sp:5.4, r:5.2, cy:5.2, dmg:55, money:1500,fly:false,ranged:true,boss:true,stomp:16},
  {name:'CHARGER',hp:45,  sp:12,  r:1.3, cy:1.4, dmg:22, money:80,  fly:false},
  {name:'BOMBER', hp:40,  sp:9.5, r:1.4, cy:1.5, dmg:30, money:90,  fly:false,bomb:true},
  {name:'ARMORED',hp:240, sp:5.8, r:1.8, cy:1.8, dmg:26, money:140, fly:false},
  {name:'MEDIC',  hp:90,  sp:6,   r:1.4, cy:1.5, dmg:0,  money:120, fly:false,support:true},
  {name:'WARSHIP',hp:190, sp:9,   r:2.4, cy:0,   dmg:16, money:160, fly:true,ranged:true},
  {name:'QUEEN',  hp:300, sp:4.8, r:2.0, cy:2.0, dmg:15, money:180, fly:false,ranged:true},
  {name:'TITAN',  hp:1600,sp:4.4, r:3.8, cy:3.8, dmg:52, money:500, fly:false,stomp:12}
];

/* ---------------- world ---------------- */
function genWorld(seed){
  const rand=mulberry32(seed|0);
  const B=[],slabs=[],houses=[],loot=[];
  function add(x,z,w,d,h,extra){
    const b={x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,x,z,w,d,h,
      tex:Math.floor(rand()*4),pal:Math.floor(rand()*8),neon:Math.floor(rand()*5),
      sign:rand()<0.4?Math.floor(rand()*5):-1};
    if(extra)Object.assign(b,extra);
    B.push(b);return b;
  }
  const NAMES=['ARCADE','NEON CLUB','VIDEO RENTAL','DINER','ROLLER RINK','HOTEL LOBBY','TIKI BAR','RECORD SHOP'];
  /* an enterable building: 4 walls with a door gap, a roof, two counters, loot inside */
  function addHouse(cx,cz){
    const S=34,t=1.6,H=11+Math.floor(rand()*3),gap=11,k=Math.floor(rand()*4);
    const tex=Math.floor(rand()*4),pal=Math.floor(rand()*8),neon=Math.floor(rand()*5);
    const R=(lx,lz)=>k===0?[lx,lz]:k===1?[-lz,lx]:k===2?[-lx,-lz]:[lz,-lx];
    const part=(lx,lz,w,d,h,extra)=>{
      const q=R(lx,lz),sw=k%2?d:w,sd=k%2?w:d;
      return add(cx+q[0],cz+q[1],sw,sd,h,Object.assign({tex,pal,neon,sign:-1,part:1},extra));
    };
    const wl=(S-gap)/2;
    part(0,-(S/2-t/2),S,t,H,{k:'wall'});
    part(-(gap/2+wl/2),S/2-t/2,wl,t,H,{k:'wall'});
    part((gap/2+wl/2),S/2-t/2,wl,t,H,{k:'wall'});
    part(0,S/2-t/2,gap,t,H,{k:'lintel',y0:6.5});
    part(-(S/2-t/2),0,t,S-2*t,H,{k:'wall'});
    part((S/2-t/2),0,t,S-2*t,H,{k:'wall'});
    part(0,0,S,S,H+0.6,{k:'roof',y0:H});
    part(-7,-8,10,2.2,1.0,{k:'prop'});
    part(9,-1,2.2,8,1.0,{k:'prop'});
    const dl=R(0,S/2+2);
    houses.push({x:cx,z:cz,S,H,k,name:NAMES[Math.floor(rand()*NAMES.length)],neon,pal,tex,dx:cx+dl[0],dz:cz+dl[1]});
    const corners=[[-12,-12],[12,-12],[-12,12],[12,12]],skip=Math.floor(rand()*4);
    corners.forEach((c,i)=>{if(i===skip)return;const r=R(c[0],c[1]);loot.push({x:cx+r[0],y:1.3,z:cz+r[1],t:0});});
    const rr=R(0,-13);loot.push({x:cx+rr[0],y:1.3,z:cz+rr[1],t:1});
    if(houses.length%3===0)loot.push({x:cx,y:H+0.6+0.9,z:cz,t:1,roof:1});
  }
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const cx=(i-3.5)*P,cz=(j-3.5)*P;
    const park=rand()<0.14;
    slabs.push({cx,cz,park});
    if(park)continue;
    if(rand()<0.2){addHouse(cx,cz);continue;}
    const boost=1+0.7*(1-Math.hypot(i-3.5,j-3.5)/5);
    const low=j>=6;
    const hh=()=>low?(9+rand()*13):((10+rand()*42)*boost);
    const r=rand();
    if(r<0.4){add(cx,cz,34+rand()*8,34+rand()*8,hh());}
    else if(r<0.8){
      const w=19.5,gap=11.25;
      if(rand()<0.5){add(cx-gap,cz,w,40,hh());add(cx+gap,cz,w,40,hh());}
      else{add(cx,cz-gap,40,w,hh());add(cx,cz+gap,40,w,hh());}
    }else{
      for(const sx of[-1,1])for(const sz of[-1,1])add(cx+sx*11.25,cz+sz*11.25,19.5,19.5,hh());
    }
  }
  // rooftop caches on some tall towers (need a jetpack)
  const r3=mulberry32((seed|0)+99);let nroof=0;
  for(const b of B){if(b.part||b.h<26||nroof>=11)continue;if(r3()<0.2){loot.push({x:b.x,y:b.h+0.8+0.9,z:b.z,t:1,roof:1});nroof++;}}
  // beach caches
  [-150,0,150].forEach(x=>loot.push({x,y:0.9,z:HALF+40,t:1,beach:1}));
  loot.forEach((l,i)=>l.id=i);
  return {B,slabs,houses,loot};
}
const SEED=1986;
const WORLD=genWorld(SEED);
const B=WORLD.B,LOOT=WORLD.loot,HOUSES=WORLD.houses;

/* shops live at intersection corners (always an empty strip of sidewalk) */
const STATIONS=[];
const GARAGE_SPAWNS=[];
[[0,0],[-176,-88],[176,88]].forEach((c,ci)=>{
  const [ix,iz]=c,o=18.5;
  STATIONS.push({k:'armory',x:ix-o,z:iz-o,c:ci});
  STATIONS.push({k:'forge', x:ix+o,z:iz-o,c:ci});
  STATIONS.push({k:'garage',x:ix-o,z:iz+o,c:ci});
  STATIONS.push({k:'forge', x:ix+o,z:iz+o,c:ci,hidden:1}); // spare, unused
  GARAGE_SPAWNS.push({x:ix-6,z:iz+30,h:0,c:ci});
});
const SHOP=STATIONS.filter(s=>!s.hidden);

/* ---------------- geometry helpers ---------------- */
const topOf=b=>(b.k==='prop'||b.k==='roof')?b.h:b.h+0.8;
/* fy = feet height. Boxes whose top is at/below the feet (or whose underside is above the head) don't block. */
function pushOut(p,r,fy){
  fy=fy||0;
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(p.x<b.x0-r||p.x>b.x1+r||p.z<b.z0-r||p.z>b.z1+r)continue;
    if(b.y0!==undefined&&fy+EYE+0.1<=b.y0)continue;
    if(topOf(b)<=fy+0.6)continue;
    const cx=clamp(p.x,b.x0,b.x1),cz=clamp(p.z,b.z0,b.z1);
    const dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
    if(d2<r*r){
      if(d2>1e-8){const d=Math.sqrt(d2);p.x=cx+dx/d*r;p.z=cz+dz/d*r;}
      else{
        const l=p.x-b.x0,rr=b.x1-p.x,t=p.z-b.z0,bt=b.z1-p.z,m=Math.min(l,rr,t,bt);
        if(m===l)p.x=b.x0-r;else if(m===rr)p.x=b.x1+r;else if(m===t)p.z=b.z0-r;else p.z=b.z1+r;
      }
    }
  }
}
/* height of the floor/roof under (x,z) that a body at feet height fy can stand on */
function groundAt(x,z,fy,r){
  r=r||0.3;let g=0;
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(x<b.x0-r||x>b.x1+r||z<b.z0-r||z>b.z1+r)continue;
    if(b.y0!==undefined&&fy+EYE+0.1<=b.y0)continue;
    const t=topOf(b);
    if(t<=fy+0.6&&t>g)g=t;
  }
  return g;
}
/* lowest ceiling above a head at feet height fy */
function ceilAt(x,z,fy){
  let c=Infinity;
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(b.y0===undefined)continue;
    if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)continue;
    if(b.y0>=fy+EYE&&b.y0<c)c=b.y0;
  }
  return c;
}
function inBuilding(x,z,y){
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&(y===undefined||(y<topOf(b)&&y>=(b.y0||0))))return true;
  }
  return false;
}
/* ray vs buildings (+ground). returns distance t (<=maxT) */
function rayWorld(ox,oy,oz,dx,dy,dz,maxT){
  let best=maxT;
  if(dy<-1e-6){const tg=-oy/dy;if(tg>0&&tg<best)best=tg;}
  for(let i=0;i<B.length;i++){
    const b=B[i];
    let tmin=0,tmax=best;
    if(Math.abs(dx)<1e-9){if(ox<b.x0||ox>b.x1)continue;}
    else{let t1=(b.x0-ox)/dx,t2=(b.x1-ox)/dx;if(t1>t2){const q=t1;t1=t2;t2=q;}if(t1>tmin)tmin=t1;if(t2<tmax)tmax=t2;if(tmin>tmax)continue;}
    if(Math.abs(dz)<1e-9){if(oz<b.z0||oz>b.z1)continue;}
    else{let t1=(b.z0-oz)/dz,t2=(b.z1-oz)/dz;if(t1>t2){const q=t1;t1=t2;t2=q;}if(t1>tmin)tmin=t1;if(t2<tmax)tmax=t2;if(tmin>tmax)continue;}
    const ylo=b.y0||0,yhi=topOf(b);
    if(Math.abs(dy)<1e-9){if(oy<ylo||oy>yhi)continue;}
    else{let t1=(ylo-oy)/dy,t2=(yhi-oy)/dy;if(t1>t2){const q=t1;t1=t2;t2=q;}if(t1>tmin)tmin=t1;if(t2<tmax)tmax=t2;if(tmin>tmax)continue;}
    if(tmin<best)best=tmin;
  }
  return best;
}
function raySphere(ox,oy,oz,dx,dy,dz,cx,cy,cz,r){
  const lx=cx-ox,ly=cy-oy,lz=cz-oz,tca=lx*dx+ly*dy+lz*dz;
  if(tca<0)return -1;
  const d2=lx*lx+ly*ly+lz*lz-tca*tca;
  if(d2>r*r)return -1;
  return Math.max(0,tca-Math.sqrt(r*r-d2));
}
function spreadDirs(def,d,seed){
  const rnd=mulberry32(seed|0),n=def.pellets||1,out=[];
  let rx=0,ry=1,rz=0;if(Math.abs(d[1])>0.99){rx=1;ry=0;}
  let ax=d[1]*rz-d[2]*ry,ay=d[2]*rx-d[0]*rz,az=d[0]*ry-d[1]*rx;
  let l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
  const ux=ay*d[2]-az*d[1],uy=az*d[0]-ax*d[2],uz=ax*d[1]-ay*d[0];
  for(let i=0;i<n;i++){
    const a=(rnd()-0.5)*2*def.spread,b=(rnd()-0.5)*2*def.spread;
    let x=d[0]+ax*a+ux*b,y=d[1]+ay*a+uy*b,z=d[2]+az*a+uz*b;
    const L=Math.hypot(x,y,z)||1;out.push([x/L,y/L,z/L]);
  }
  return out;
}

/* ---------------- navigation (flow field over streets) ---------------- */
const CELL=4,GX0=-HALF-20,GZ0=-HALF-20;
const GW=Math.ceil((2*HALF+40)/CELL),GH=Math.ceil((2*HALF+64+40)/CELL);
const BLOCK=new Uint8Array(GW*GH);
(function(){
  for(const b of B){
    if(b.y0!==undefined)continue;
    const inflate=b.k==='wall'?1.2:b.k==='prop'?0.5:2.0;
    const x0=Math.floor((b.x0-inflate-GX0)/CELL),x1=Math.floor((b.x1+inflate-GX0)/CELL);
    const z0=Math.floor((b.z0-inflate-GZ0)/CELL),z1=Math.floor((b.z1+inflate-GZ0)/CELL);
    for(let z=Math.max(0,z0);z<=Math.min(GH-1,z1);z++)for(let x=Math.max(0,x0);x<=Math.min(GW-1,x1);x++)BLOCK[z*GW+x]=1;
  }
})();
const cellOf=(x,z)=>{
  const cx=clamp(Math.floor((x-GX0)/CELL),0,GW-1),cz=clamp(Math.floor((z-GZ0)/CELL),0,GH-1);
  return cz*GW+cx;
};
const QUEUE=new Int32Array(GW*GH);
function buildFlow(tx,tz,out){
  const dist=out||new Uint16Array(GW*GH);dist.fill(65535);
  let s=cellOf(tx,tz);
  dist[s]=0;let qh=0,qt=0;QUEUE[qt++]=s;
  while(qh<qt){
    const c=QUEUE[qh++],d=dist[c]+1,cx=c%GW,cz=(c/GW)|0;
    if(cx>0&&!BLOCK[c-1]&&dist[c-1]>d){dist[c-1]=d;QUEUE[qt++]=c-1;}
    if(cx<GW-1&&!BLOCK[c+1]&&dist[c+1]>d){dist[c+1]=d;QUEUE[qt++]=c+1;}
    if(cz>0&&!BLOCK[c-GW]&&dist[c-GW]>d){dist[c-GW]=d;QUEUE[qt++]=c-GW;}
    if(cz<GH-1&&!BLOCK[c+GW]&&dist[c+GW]>d){dist[c+GW]=d;QUEUE[qt++]=c+GW;}
  }
  return dist;
}
/* next waypoint (world coords) from a flow field, or null */
function flowStep(dist,x,z){
  const c=cellOf(x,z),cx=c%GW,cz=(c/GW)|0;
  let best=dist[c],bx=cx,bz=cz;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;
    const nx=cx+dx,nz=cz+dz;
    if(nx<0||nz<0||nx>=GW||nz>=GH)continue;
    const ni=nz*GW+nx;
    if(BLOCK[ni])continue;
    if(dx&&dz&&(BLOCK[cz*GW+nx]||BLOCK[nz*GW+cx]))continue;
    if(dist[ni]<best){best=dist[ni];bx=nx;bz=nz;}
  }
  if(best===65535||(bx===cx&&bz===cz))return null;
  return [GX0+(bx+0.5)*CELL,GZ0+(bz+0.5)*CELL];
}

/* ---------------- the game ---------------- */
class Game{
  constructor(out,opts){
    this.online=!!(opts&&opts.online);
    this.out=out;           // {all(msg)}
    this.players=new Map();
    this.aliens=[];this.orbs=[];this.cars=[];
    this.nid=1;this.ev=[];
    this.round=0;this.state='lobby';this.timer=0;this.queue=[];this.spawnT=0;
    this.time=0;this.snapT=0;this.flows=new Map();this.flowT=0;
    this.rnd=mulberry32((Math.random()*1e9)|0);
    this.overStats=null;this.best=0;this.loot=LOOT.map(()=>true);
  }
  rand(){return this.rnd();}
  addPlayer(id,name){
    const idx=this.players.size;
    const p={id,name:String(name||'PLAYER').replace(/[^\w \-]/g,'').slice(0,12).toUpperCase()||'PLAYER',
      color:PLAYER_COLORS[(id-1)%PLAYER_COLORS.length],
      x:0,y:EYE,z:0,yaw:0,pitch:0,hp:100,st:'alive',money:500+Math.max(0,this.round-1)*250,kills:0,
      wo:[0,-1,-1,-1,-1],w:0,jet:false,jfl:0,car:-1,lastHit:-99,bleed:0,rvProg:0,rvT:-9,rvTarget:0,fireT:0,sp:0};
    this.spawnPos(p);
    this.players.set(id,p);
    if(this.state==='lobby'){this.state='rest';this.timer=6;this.round=0;}
    return p;
  }
  removePlayer(id){
    const p=this.players.get(id);if(!p)return;
    if(p.car>=0){const c=this.cars.find(c=>c.id===p.car);if(c)c.drv=-1;}
    this.players.delete(id);this.flows.delete(id);
    if(!this.players.size){this.state='lobby';}
  }
  spawnPos(p){p.x=(this.rand()-0.5)*10;p.z=(this.rand()-0.5)*10;p.y=EYE;p.car=-1;this.push('tp',p.id,r2(p.x),r2(p.z));}
  push(...e){this.ev.push(e);}
  give(p,n){p.money+=n;}

  /* ---- client messages ---- */
  onMsg(id,m){
    const p=this.players.get(id);if(!p||!m)return;
    switch(m.t){
      case 'st':{
        if(p.st==='dead')break;
        const x=+m.x,y=+m.y,z=+m.z;
        if(!isFinite(x+y+z))break;
        p.yaw=+m.yaw||0;p.pitch=+m.pitch||0;p.w=m.w|0;p.jfl=m.jt?1:0;
        if(p.car>=0){
          const c=this.cars.find(c=>c.id===p.car);
          if(c&&m.car){c.x=clamp(+m.car.x,BOUNDS.x0,BOUNDS.x1);c.z=clamp(+m.car.z,BOUNDS.z0,BOUNDS.z1);c.h=+m.car.h||0;c.sp=+m.car.sp||0;}
          if(c){p.x=c.x;p.z=c.z;p.y=EYE;}
        }else if(p.st==='alive'||p.st==='down'){
          p.x=clamp(x,BOUNDS.x0,BOUNDS.x1);p.z=clamp(z,BOUNDS.z0,BOUNDS.z1);p.y=clamp(y,0,120);
        }
        break;
      }
      case 'fire':this.onFire(p,m);break;
      case 'buy':this.onBuy(p,m);break;
      case 'enter':{
        if(p.st!=='alive'||p.car>=0)break;
        const c=this.cars.find(c=>c.id===m.id);
        if(!c||c.drv>=0)break;
        if(Math.hypot(c.x-p.x,c.z-p.z)>7)break;
        c.drv=p.id;p.car=c.id;break;
      }
      case 'exit':{
        if(p.car<0)break;
        const c=this.cars.find(c=>c.id===p.car);
        if(c){c.drv=-1;c.sp=0;p.x=c.x+Math.cos(c.h)*3.2;p.z=c.z-Math.sin(c.h)*3.2;}
        p.car=-1;break;
      }
      case 'rv':p.rvTarget=m.target|0;p.rvT=this.time;break;
    }
  }

  onFire(p,m){
    if(p.st!=='alive')return;
    if(!Array.isArray(m.o)||!Array.isArray(m.d))return;
    let [ox,oy,oz]=m.o.map(Number),dl=Math.hypot(+m.d[0],+m.d[1],+m.d[2]);
    if(!(dl>0)||!isFinite(ox+oy+oz))return;
    const d=[m.d[0]/dl,m.d[1]/dl,m.d[2]/dl];
    if(Math.hypot(ox-p.x,oz-p.z)>9)return;
    let def,dmg,lvl=0,col;
    if(m.w===-1){
      if(p.car<0)return;
      const c=this.cars.find(c=>c.id===p.car);if(!c)return;
      const cd=CARS[c.t];
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/cd.rate;
      def={pellets:1,spread:0.006,pierce:2};dmg=cd.dmg;col=cd.color;
    }else{
      if(p.car>=0)return;
      const w=m.w|0;if(!WPN[w]||p.wo[w]<0)return;
      def=WPN[w];lvl=p.wo[w];
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/def.rate;
      dmg=def.dmg*DMG_MULT[lvl];col=def.color;
    }
    const dirs=spreadDirs(def,d,m.s|0);
    for(const dd of dirs){
      const wt=rayWorld(ox,oy,oz,dd[0],dd[1],dd[2],260);
      const hits=[];
      for(const a of this.aliens){
        const t=raySphere(ox,oy,oz,dd[0],dd[1],dd[2],a.x,a.y+a.cy,a.z,a.r+0.3);
        if(t>=0&&t<wt)hits.push([t,a]);
      }
      hits.sort((a,b)=>a[0]-b[0]);
      let n=0;
      for(const h of hits){
        if(n>=def.pierce)break;n++;
        const a=h[1];
        this.damageAlien(a,dmg*(n>1?0.8:1),p,ox+dd[0]*h[0],oy+dd[1]*h[0],oz+dd[2]*h[0]);
      }
    }
    this.push('shot',p.id,m.w,lvl,r2(ox),r2(oy),r2(oz),r2(d[0]),r2(d[1]),r2(d[2]),m.s|0);
  }

  onBuy(p,m){
    if(p.st!=='alive'||p.car>=0)return;
    const near=k=>SHOP.find(s=>s.k===k&&Math.hypot(s.x-p.x,s.z-p.z)<6);
    if(m.k==='wpn'){
      if(!near('armory'))return;
      const w=m.id|0;if(!WPN[w])return;
      if(p.wo[w]>=0){
        const c=AMMO_COST(w);if(p.money<c)return;p.money-=c;this.push('ammo',p.id,w);
      }else{
        if(p.money<WPN[w].cost)return;p.money-=WPN[w].cost;p.wo[w]=0;this.push('gave',p.id,w);
      }
    }else if(m.k==='upg'){
      if(!near('forge'))return;
      const w=m.id|0;if(!WPN[w]||p.wo[w]<0||p.wo[w]>=3)return;
      const c=UP_COST[p.wo[w]];if(p.money<c)return;
      p.money-=c;p.wo[w]++;this.push('upg',p.id,w,p.wo[w]);
    }else if(m.k==='jet'){
      if(!near('garage')||p.jet||p.money<JET_COST)return;
      p.money-=JET_COST;p.jet=true;this.push('gotjet',p.id);
    }else if(m.k==='car'){
      const g=near('garage');if(!g)return;
      const t=m.id|0;if(!CARS[t])return;
      if(p.money<CARS[t].cost)return;
      if(this.cars.length>=8)return;
      const sp=GARAGE_SPAWNS[g.c];
      let z=sp.z,tries=0;
      while(this.cars.some(c=>Math.hypot(c.x-sp.x,c.z-z)<7)&&tries++<6)z+=7;
      p.money-=CARS[t].cost;
      const c={id:this.nid++,t,x:sp.x,z,h:Math.PI/2*0,hp:CARS[t].hp,drv:-1,sp:0};
      c.h=0;
      this.cars.push(c);this.push('bought',p.id,c.id);
    }
  }

  pickLoot(p,l){
    const r=this.rand();
    if(l.t===1){
      const cash=Math.round((400+this.round*40)*(0.8+0.5*this.rand()));
      p.money+=cash;p.hp=100;
      this.push('loot',p.id,'rare',cash,l.id);this.push('ammoall',p.id);
    }else if(r<0.55){
      const cash=Math.round((100+this.round*18)*(0.8+0.6*this.rand()));
      p.money+=cash;this.push('loot',p.id,'cash',cash,l.id);
    }else if(r<0.8){this.push('loot',p.id,'ammo',0,l.id);this.push('ammoall',p.id);}
    else{p.hp=100;this.push('loot',p.id,'med',0,l.id);}
  }
  damageAlien(a,dmg,p,x,y,z){
    if(a.hp<=0)return;
    if(a.dorm){for(const o of this.aliens)if(o.dorm&&Math.hypot(o.x-a.x,o.z-a.z)<30)o.dorm=false;}
    a.hp-=dmg;
    p.money+=10;
    let killed=0;
    if(a.hp<=0){killed=1;this.killAlien(a,p);}
    this.push('hit',p.id,r2(x),r2(y),r2(z),killed,Math.round(dmg));
  }
  killAlien(a,p){
    const def=AT[a.t];
    p.money+=def.money+(a.far?Math.round(def.money*0.5):0);p.kills++;
    this.push('boom',r2(a.x),r2(a.y+a.cy),r2(a.z),a.t,a.id);
  }

  /* ---- rounds ---- */
  hpMul(){const r=this.round;return r<=10?1+0.15*(r-1):(1+0.15*9)*Math.pow(1.08,r-10);}
  startRound(){
    this.round++;
    const mul=this.online?1.5:1;     // online rooms get 1.5x aliens
    let total=Math.round((5+this.round*2.4)*mul);
    const boss=this.round%5===0;
    if(boss)total=Math.round(total*0.5);
    const q=[];
    const pool=[[0,1,Math.max(3,10-this.round*0.4)],[2,2,3],[1,3,3],[5,4,3],[3,5,2],[6,6,2.5],[7,7,2.5],[8,8,1.5],[9,9,1.5],[10,11,1.2],[11,13,1]].filter(e=>this.round>=e[1]);
    const ptot=pool.reduce((sum,e)=>sum+e[2],0);
    for(let i=0;i<total;i++){
      let r=this.rand()*ptot,t=0;
      for(const e of pool){r-=e[2];if(r<=0){t=e[0];break;}}
      q.push(t);
    }
    if(boss){const nb=1+Math.floor(this.round/20);for(let i=0;i<nb;i++)q.unshift(4);}
    for(const p of this.players.values()){   // everyone who fell comes back at the start of the round
      if(p.st!=='alive'){
        p.st='alive';p.hp=100;p.rvProg=0;this.spawnPos(p);
        if(p.money<500)p.money=500;
        this.push('revived',p.id);
      }
    }
    this.nested=false;this.queue=q;this.state='fight';this.spawnT=1.5;this.loot.fill(true);
    this.push('round',this.round,boss?1:0);
  }
  endRound(){
    this.state='rest';this.timer=this.round%5===0?12:9;
    for(const p of this.players.values()){
      if(p.st==='alive')p.money+=50*this.round;
    }
    this.push('clear',this.round);
  }
  resetGame(){
    this.aliens.length=0;this.orbs.length=0;this.cars.length=0;this.queue.length=0;
    for(const p of this.players.values()){
      p.wo=[0,-1,-1,-1,-1];p.w=0;p.jet=false;p.money=500;p.kills=0;p.hp=100;p.st='alive';p.car=-1;this.spawnPos(p);
    }
    this.loot.fill(true);this.round=0;this.state='rest';this.timer=6;this.push('reset');
  }

  spawnAlien(t,fx,fz){
    const def=AT[t],pl=[...this.players.values()].filter(p=>p.st==='alive');
    if(!pl.length)return;
    const tg=pl[Math.floor(this.rand()*pl.length)];
    let x=0,z=0,ok=false;
    for(let i=0;i<25&&!ok;i++){
      const a=this.rand()*Math.PI*2,d=(t===4?90:70)+this.rand()*70;
      x=tg.x+Math.cos(a)*d;z=tg.z+Math.sin(a)*d;
      if(x<BOUNDS.x0||x>BOUNDS.x1||z<BOUNDS.z0||z>BOUNDS.z1-30)continue;
      if(!def.fly&&BLOCK[cellOf(x,z)])continue;
      ok=true;
    }
    if(!ok){x=(this.rand()<0.5?-1:1)*88*(1+Math.floor(this.rand()*3));z=(this.rand()-0.5)*300;
      if(x===0)x=88;}
    if(fx!==undefined){x=fx;z=fz;}
    const np=Math.max(1,this.players.size);
    let hp=def.hp*this.hpMul();
    if(t===4)hp=2200*(1+0.5*(this.round/5-1))*(1+0.5*(np-1));
    const sp=def.sp*(1+Math.min(0.55,0.028*this.round))*(0.9+this.rand()*0.25);
    this.aliens.push({id:this.nid++,t,x,y:def.fly?9+this.rand()*6:0,z,yaw:0,hp,mhp:hp,sp,r:def.r,cy:def.cy,
      dmg:def.dmg*(1+0.025*this.round),cd:1+this.rand()*1.5,tT:0,tgt:tg.id,los:false,ph:this.rand()*6.28,rt:0,vx:0,vz:0,vol:0,stomp:4,dorm:false,far:false,dormT:0});
  }

  /* a nest of aliens far from the players: they idle until someone gets close, so exploring pays off */
  spawnFarGroup(t){
    const pl=[...this.players.values()].filter(p=>p.st==='alive');
    if(!pl.length)return;
    const tg=pl[Math.floor(this.rand()*pl.length)];
    let x=0,z=0,ok=false;
    for(let i=0;i<40&&!ok;i++){
      const ramp=Math.min(1,Math.max(0,(this.round-1)/9));   // nests start close and get farther each round
      const a=this.rand()*Math.PI*2,d=100+ramp*70+this.rand()*(60+ramp*100);
      x=tg.x+Math.cos(a)*d;z=tg.z+Math.sin(a)*d;
      if(x<BOUNDS.x0+10||x>BOUNDS.x1-10||z<BOUNDS.z0+10||z>BOUNDS.z1-40)continue;
      if(BLOCK[cellOf(x,z)])continue;
      ok=true;
    }
    if(!ok){this.spawnAlien(t);return;}
    const n=1+Math.floor(this.rand()*3);
    const list=[t];
    for(let i=0;i<n&&this.queue.length&&!AT[this.queue[0]].fly&&!AT[this.queue[0]].boss&&!AT[this.queue[0]].support;i++)list.push(this.queue.shift());
    let k=0;
    for(const ty of list){
      this.spawnAlien(ty,x+(this.rand()-0.5)*14,z+(this.rand()-0.5)*14);
      const a=this.aliens[this.aliens.length-1];
      if(BLOCK[cellOf(a.x,a.z)]){a.x=x;a.z=z;}
      a.dorm=true;a.far=true;a.dormT=55+this.rand()*20;k++;
    }
    if(!this.nested){this.nested=true;this.push('nest');}
  }
  explode(a){
    a.hp=0;this.push('blast',r2(a.x),r2(a.y+1),r2(a.z));
    for(const p of this.players.values()){
      if(p.st!=='alive')continue;
      const q=this.targetPos(p),d=Math.hypot(q.x-a.x,q.z-a.z);
      if(d<10&&p.y-EYE<6)this.hurt(p,a.dmg*(1-d/14));
    }
  }
  targetPos(p){
    if(p.car>=0){const c=this.cars.find(c=>c.id===p.car);if(c)return{x:c.x,z:c.z,y:1,car:c};}
    return{x:p.x,z:p.z,y:p.y-EYE,car:null};
  }
  hurt(p,dmg){
    if(p.st!=='alive')return;
    if(p.car>=0){
      const c=this.cars.find(c=>c.id===p.car);
      if(c){
        c.hp-=dmg*0.8;this.push('carhit',p.id);
        if(c.hp<=0){
          this.push('boom',r2(c.x),2,r2(c.z),99,0);
          p.car=-1;p.hp-=25;this.cars.splice(this.cars.indexOf(c),1);
          p.x=c.x+3;p.z=c.z;this.push('tp',p.id,r2(p.x),r2(p.z));
          this.push('hurt',p.id,25);
          if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;}
        }
        return;
      }
    }
    p.hp-=dmg;p.lastHit=this.time;
    this.push('hurt',p.id,Math.round(dmg));
    if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;p.car=-1;this.push('down',p.id);}
  }
  fireOrb(a,tx,ty,tz,spread,speed,dmg){
    const ox=a.x,oy=a.y+a.cy+(a.t===4?1.5:0.4),oz=a.z;
    let dx=tx-ox,dy=ty-oy,dz=tz-oz;const l=Math.hypot(dx,dy,dz)||1;
    dx/=l;dy/=l;dz/=l;
    dx+=(this.rand()-0.5)*spread;dz+=(this.rand()-0.5)*spread;dy+=(this.rand()-0.5)*spread*0.5;
    const l2=Math.hypot(dx,dy,dz);
    this.orbs.push({id:this.nid++,x:ox,y:oy,z:oz,vx:dx/l2*speed,vy:dy/l2*speed,vz:dz/l2*speed,life:5,dmg,big:a.t===4?1:0});
  }

  /* ---- main tick ---- */
  tick(dt){
    if(!this.players.size)return;
    dt=Math.min(dt,0.1);
    this.time+=dt;
    const plist=[...this.players.values()];

    // player upkeep
    for(const p of plist){
      if(p.st==='alive'&&p.hp<100&&this.time-p.lastHit>5)p.hp=Math.min(100,p.hp+28*dt);
      if(p.st==='down'){
        if(this.state!=='rest')p.bleed-=dt;
        let reviving=false;
        for(const q of plist){
          if(q.id!==p.id&&q.st==='alive'&&q.rvTarget===p.id&&this.time-q.rvT<0.35&&Math.hypot(q.x-p.x,q.z-p.z)<5)reviving=true;
        }
        p.rvProg=reviving?p.rvProg+dt:Math.max(0,p.rvProg-dt*2);
        if(p.rvProg>=3){p.st='alive';p.hp=55;p.rvProg=0;p.lastHit=this.time;this.push('revived',p.id);}
        else if(p.bleed<=0&&this.state!=='rest'){p.st='dead';this.push('died',p.id);}
      }
    }

    for(const p of plist){
      if(p.st!=='alive'||p.car>=0)continue;
      for(let i=0;i<LOOT.length;i++){
        if(!this.loot[i])continue;const l=LOOT[i];
        if(Math.abs(l.x-p.x)<2.3&&Math.abs(l.z-p.z)<2.3&&Math.abs((p.y-EYE)-(l.y-0.9))<2.4){this.loot[i]=false;this.pickLoot(p,l);}
      }
    }

    if(this.state==='rest'){
      this.timer-=dt;
      if(this.timer<=0)this.startRound();
    }else if(this.state==='over'){
      this.timer-=dt;
      if(this.timer<=0)this.resetGame();
    }else if(this.state==='fight'){
      this.spawnT-=dt;
      const cap=Math.min(40,22+5*(plist.length-1));
      while(this.queue.length&&this.aliens.length<cap&&this.spawnT<=0){
        const nt=this.queue.shift();
        if(this.round>=1&&!AT[nt].fly&&!AT[nt].boss&&!AT[nt].support&&this.rand()<0.22)this.spawnFarGroup(nt);else this.spawnAlien(nt);
        this.spawnT=Math.max(0.3,1.0-this.round*0.03);
      }
      if(!this.queue.length&&!this.aliens.length)this.endRound();
      else if(plist.every(p=>p.st!=='alive')){
        this.state='over';this.timer=14;
        this.best=Math.max(this.best,this.round);
        this.push('over',this.round);
      }
    }

    // flow fields for on-foot targets
    this.flowT-=dt;
    if(this.flowT<=0){
      this.flowT=0.6;
      for(const p of plist){
        if(p.st!=='alive')continue;
        const tp=this.targetPos(p);
        let f=this.flows.get(p.id);
        f=buildFlow(tp.x,tp.z,f);this.flows.set(p.id,f);
      }
    }

    this.updateAliens(dt,plist);
    this.updateOrbs(dt,plist);
    this.updateCars(dt,plist);

    this.snapT-=dt;
    if(this.snapT<=0){this.snapT=0.05;this.out.all(this.snapshot());}
  }

  updateAliens(dt,plist){
    const alive=plist.filter(p=>p.st==='alive');
    for(const a of this.aliens){
      const def=AT[a.t];
      a.cd-=dt;a.rt-=dt;a.tT-=dt;a.ph+=dt*3;
      if(a.dorm){
        a.dormT-=dt;
        let near=1e9;for(const p of alive){const d=Math.hypot(p.x-a.x,p.z-a.z);if(d<near)near=d;}
        if(near<85||a.dormT<=0)a.dorm=false;
        else{
          const ang=a.ph*0.12+a.id;a.vx=Math.cos(ang)*1.8;a.vz=Math.sin(ang)*1.8;
          a.x+=a.vx*dt;a.z+=a.vz*dt;pushOut(a,Math.min(a.r,1.8));a.yaw=Math.atan2(a.vx,a.vz);
          continue;
        }
      }
      if(a.tT<=0){
        a.tT=0.4;
        let best=1e9,bp=null;
        for(const p of alive){const tp=this.targetPos(p);const d=Math.hypot(tp.x-a.x,tp.z-a.z);if(d<best){best=d;bp=p;}}
        if(bp){a.tgt=bp.id;
          const tp=this.targetPos(bp);
          a.los=best<70&&rayWorld(a.x,1.5,a.z,(tp.x-a.x)/best,0,(tp.z-a.z)/best,best)>=best-0.5;}
      }
      const tp0=this.players.get(a.tgt);
      if(!tp0||tp0.st!=='alive'){continue;}
      const tp=this.targetPos(tp0);
      const dx=tp.x-a.x,dz=tp.z-a.z,dist=Math.hypot(dx,dz)||1;
      a.yaw=Math.atan2(dx,dz);
      let mx=0,mz=0,speed=a.sp;
      if(def.fly){
        const ty=(tp0.y)+(def.ranged?9:3)+Math.sin(a.ph*0.7)*2.5;
        a.y+=(ty-a.y)*Math.min(1,dt*2);
        let fw=1;
        if(def.ranged&&dist<34)fw=dist<22?-0.7:0;
        if(fw!==0){mx=dx/dist*fw;mz=dz/dist*fw;if(!def.ranged&&dist<4){mx=0;mz=0;}}
        else{const px=-dz/dist,pz=dx/dist;mx=px*Math.sin(a.ph*0.25)*0.7;mz=pz*Math.sin(a.ph*0.25)*0.7;}
        a.x+=mx*speed*dt;a.z+=mz*speed*dt;
      }else{
        let want=1;
        if(def.ranged||def.support){
          const keep=30;
          if(a.los&&dist<keep+8)want=dist<keep-10?-0.6:0;
        }
        if(want!==0){
          let dirx=dx/dist,dirz=dz/dist;
          if(!(a.los&&dist<45)||want<0){
            const f=this.flows.get(a.tgt);
            if(f&&want>0){const s=flowStep(f,a.x,a.z);if(s){const sx=s[0]-a.x,sz=s[1]-a.z,sl=Math.hypot(sx,sz)||1;dirx=sx/sl;dirz=sz/sl;}}
            else if(want<0){dirx=-dirx;dirz=-dirz;}
          }
          mx=dirx*want;mz=dirz*want;
        }else{ // strafe
          mx=Math.cos(a.ph*0.3)*0.5;mz=Math.sin(a.ph*0.3)*0.5;
          const px=-dz/dist,pz=dx/dist;mx=px*Math.sin(a.ph*0.25)*0.6;mz=pz*Math.sin(a.ph*0.25)*0.6;
        }
        a.vx+=(mx*speed-a.vx)*Math.min(1,dt*6);a.vz+=(mz*speed-a.vz)*Math.min(1,dt*6);
        a.x+=a.vx*dt;a.z+=a.vz*dt;
        pushOut(a,Math.min(a.r,1.8));
      }
      a.x=clamp(a.x,BOUNDS.x0,BOUNDS.x1);a.z=clamp(a.z,BOUNDS.z0,BOUNDS.z1);

      // attacks
      const melee=(def.fly&&!def.ranged)||(!def.ranged&&!def.support)||def.boss;
      if(melee){
        const reach=a.r+(def.fly?1.6:1.4);
        const dy=def.fly?Math.abs(a.y-(tp0.y-EYE*0.5)):0;
        if(dist<reach+(tp.car?1.8:0.4)&&dy<4&&a.cd<=0){
          a.cd=def.fly?1.1:0.9;
          if(def.bomb){this.explode(a);a.cd=9;}
          else this.hurt(tp0,a.dmg);
        }
      }
      if(def.ranged&&a.cd<=0&&dist<60){
        const ty=tp0.y-EYE*0.35;
        let seen=a.los;
        if(def.fly){const d3=Math.hypot(dx,a.y+0.5-ty,dz)||1;seen=rayWorld(a.x,a.y+0.5,a.z,dx/d3,(ty-a.y-0.5)/d3,dz/d3,d3)>=d3-0.5;}
        if(seen){
          if(a.t===4){
            a.cd=3.0;
            for(let i=-2;i<=2;i++){
              const ang=Math.atan2(dx,dz)+i*0.16;
              this.fireOrb(a,a.x+Math.sin(ang)*30,ty,a.z+Math.cos(ang)*30,0.04,42,20*(1+0.03*this.round));
            }
          }else if(a.t===10){
            a.cd=2.4+this.rand();
            for(let i=-1;i<=1;i++){
              const ang=Math.atan2(dx,dz)+i*0.2;
              this.fireOrb(a,a.x+Math.sin(ang)*30,ty,a.z+Math.cos(ang)*30,0.05,40,a.dmg);
            }
          }else if(a.t===9){
            a.cd=1.5+this.rand()*0.6;
            this.fireOrb(a,tp.x,ty,tp.z,0.08,50,a.dmg);
          }else{
            a.cd=2.0+this.rand();
            this.fireOrb(a,tp.x,ty,tp.z,0.12,38,a.dmg);
          }
        }
      }
      if(def.stomp){ // shockwave
        a.stomp-=dt;
        const R=def.stomp;
        if(a.stomp<=0&&dist<R){a.stomp=6;this.push('stomp',r2(a.x),r2(a.z));
          for(const p of alive){const q=this.targetPos(p);if(Math.hypot(q.x-a.x,q.z-a.z)<R&&p.y<5)this.hurt(p,a.t===4?35:30);}}
      }
      if(def.support){ // medic heals nearby aliens
        a.healT=(a.healT===undefined?2:a.healT)-dt;
        if(a.healT<=0){
          a.healT=3;let any=false;
          for(const o of this.aliens){if(o!==a&&o.hp>0&&o.hp<o.mhp&&Math.hypot(o.x-a.x,o.z-a.z)<20){o.hp=Math.min(o.mhp,o.hp+o.mhp*0.18);any=true;}}
          if(any)this.push('heal',r2(a.x),r2(a.y+3),r2(a.z));
        }
      }
    }
    // separation
    const al=this.aliens;
    for(let i=0;i<al.length;i++){
      const a=al[i];
      for(let j=i+1;j<al.length;j++){
        const b=al[j];
        const dx=b.x-a.x,dz=b.z-a.z,mind=(a.r+b.r)*0.7,d2=dx*dx+dz*dz;
        if(d2<mind*mind&&d2>1e-6){
          const d=Math.sqrt(d2),push=(mind-d)*0.5;
          const nx=dx/d*push,nz=dz/d*push;
          if(a.t!==4){a.x-=nx;a.z-=nz;}
          if(b.t!==4){b.x+=nx;b.z+=nz;}
        }
      }
    }
    // remove dead
    for(let i=al.length-1;i>=0;i--)if(al[i].hp<=0)al.splice(i,1);
  }

  updateOrbs(dt,plist){
    for(let i=this.orbs.length-1;i>=0;i--){
      const o=this.orbs[i];
      o.life-=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;
      let dead=o.life<=0||o.y<0||inBuilding(o.x,o.z,o.y);
      if(!dead)for(const p of plist){
        if(p.st!=='alive')continue;
        const tp=this.targetPos(p);
        const hr=tp.car?2.6:1.1;
        if(Math.hypot(o.x-tp.x,o.z-tp.z)<hr&&Math.abs(o.y-(tp.car?1.2:p.y-EYE*0.5))<(tp.car?2.2:2.0)){
          this.hurt(p,o.dmg);dead=true;break;
        }
      }
      if(dead)this.orbs.splice(i,1);
    }
  }

  updateCars(dt,plist){
    for(let i=this.cars.length-1;i>=0;i--){
      const c=this.cars[i];
      if(c.drv<0)continue;
      const p=this.players.get(c.drv);
      if(!p){c.drv=-1;continue;}
      if(p.st!=='alive'){c.drv=-1;p.car=-1;continue;}
      // run over
      if(Math.abs(c.sp)>10){
        for(const a of this.aliens){
          if(a.hp<=0||a.rt>0)continue;
          if(Math.hypot(a.x-c.x,a.z-c.z)<a.r+2.4&&a.y<5){
            a.rt=0.45;
            const big=a.t>=3;
            this.damageAlien(a,Math.abs(c.sp)*(big?2.5:5)*(1+0.3*CARS[c.t].id),p,a.x,a.y+a.cy,a.z);
            c.hp-=big?6:1.5;
            this.push('thud',r2(a.x),r2(a.z));
          }
        }
        if(c.hp<=0){
          this.push('boom',r2(c.x),2,r2(c.z),99,0);
          p.car=-1;p.hp-=25;this.cars.splice(i,1);p.x=c.x+3;p.z=c.z;this.push('tp',p.id,r2(p.x),r2(p.z));
          if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;}
        }
      }
    }
  }

  snapshot(){
    const ev=this.ev;this.ev=[];
    return{
      t:'snap',tm:r2(this.time),
      rd:{n:this.round,s:this.state,tm:Math.max(0,Math.round(this.timer*10)/10),left:this.queue.length+this.aliens.length,best:this.best},
      p:[...this.players.values()].map(p=>({id:p.id,n:p.name,c:p.color,x:r2(p.x),y:r2(p.y),z:r2(p.z),yw:r2(p.yaw),pt:r2(p.pitch),
        hp:Math.round(p.hp),st:p.st,m:p.money,k:p.kills,wo:p.wo,w:p.w,jo:p.jet?1:0,j:p.jfl,car:p.car,rp:r2(p.rvProg),bl:r2(p.bleed)})),
      a:this.aliens.map(a=>[a.id,a.t,r2(a.x),r2(a.y),r2(a.z),r2(a.yaw),Math.max(0,Math.round(a.hp/a.mhp*100)),Math.round(a.vx*10)/10,a.dorm?1:0]),
      o:this.orbs.map(o=>[o.id,r2(o.x),r2(o.y),r2(o.z),o.big]),
      c:this.cars.map(c=>({id:c.id,t:c.t,x:r2(c.x),z:r2(c.z),h:r2(c.h),hp:Math.round(c.hp),d:c.drv,sp:r2(c.sp||0)})),
      lo:this.loot.map(v=>v?1:0).join(''),
      ev
    };
  }
}

const API={EYE,clamp,mulberry32,N,P,HALF,BOUNDS,PLAYER_COLORS,WPN,DMG_MULT,MAG_MULT,UP_COST,AMMO_COST,CARS,AT,
  genWorld,SEED,WORLD,B,LOOT,HOUSES,JET_COST,topOf,groundAt,ceilAt,STATIONS:SHOP,GARAGE_SPAWNS,pushOut,inBuilding,rayWorld,raySphere,spreadDirs,BLOCK,cellOf,buildFlow,flowStep,Game};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.NI=API;
})(typeof self!=='undefined'?self:this);
