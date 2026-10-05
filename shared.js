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
  {id:1,name:'AQUA-9',    kind:'CYAN LASER SMG',      color:0x25f4ff,dmg:17, rate:13,  mag:24, res:120,cost:3200,pellets:1,spread:0.02, pierce:1,reload:1.4,auto:true},
  {id:2,name:'SUNSET',    kind:'ORANGE LASER SHOTGUN',color:0xff9a3c,dmg:20, rate:1.5, mag:6,  res:54, cost:1500,pellets:8,spread:0.07, pierce:1,reload:2.0,auto:false},
  {id:3,name:'VIOLET RAIL',kind:'PURPLE PIERCING RAIL',color:0xa56bff,dmg:170,rate:1.2, mag:8,  res:56, cost:2500,pellets:1,spread:0.0,  pierce:4,reload:1.8,auto:false},
  {id:4,name:'LIME STORM',kind:'GREEN LASER MINIGUN', color:0x3cff9e,dmg:24, rate:11,  mag:90, res:450,cost:3500,pellets:1,spread:0.03, pierce:1,reload:2.4,auto:true},
  {id:5,name:'LONGSHOT',  kind:'BLUE LASER SCOPE RIFLE',color:0x3c8cff,dmg:230,rate:0.95,mag:5,  res:40, cost:3000,pellets:1,spread:0,   pierce:3,reload:2.3,auto:false,range:420,scope:true},
  {id:6,name:'ARC GATLING',kind:'RED CHARGE-UP MINIGUN',color:0xff3c4c,dmg:13, rate:20,  mag:180,res:720,cost:7000,pellets:1,spread:0.04,pierce:1,reload:3.0,auto:true,charge:0.9},
  {id:7,name:'NEON STARS',kind:'GOLD THROWING STARS', color:0xffd23c,dmg:55, rate:3.2, mag:12, res:96, cost:2000,pellets:1,spread:0.006,pierce:5,reload:1.2,auto:false,range:90,proj:'star'},
  {id:8,name:'INFERNO',   kind:'FLAMETHROWER',        color:0xff5a1a,dmg:7,  rate:18,  mag:100,res:500,cost:3800,pellets:3,spread:0.13, pierce:6,reload:2.2,auto:true,range:24,flame:true,burn:true},
  {id:9,name:'TOXIC SPRAYER',kind:'GAS CLOUD LAUNCHER',color:0xb6ff1c,dmg:30, rate:1.4, mag:6,  res:36, cost:4500,pellets:1,spread:0.01, pierce:1,reload:2.0,auto:false,range:75,gas:true},
  {id:10,name:'BRASS KNUCKLES',kind:'CLOSE-RANGE PUNCHERS',color:0xffc83c,dmg:90,rate:3.2,mag:999,res:0,  cost:800, pellets:1,spread:0.08,pierce:3,reload:0,auto:true,range:4.3,melee:true}
];
WPN[0].upm=0.5;WPN[1].upm=0.8;WPN[10].upm=0.6;WPN[7].upm=0.8;
/* ---- levels & gun skins (profile is stored in the player's browser) ---- */
const MAXLV=50;
const xpNeed=L=>400+120*(L-1);          // XP needed to go from level L to L+1
const SKINS=[
  {id:0, name:'NEON STOCK', lvl:1,  col:null,      body:null},
  {id:1, name:'CHROME',     lvl:2,  col:0xdfefff,   body:0xa9b4c4},
  {id:2, name:'GOLD RUSH',  lvl:5,  col:0xffd23c,   body:0xb8902a},
  {id:3, name:'GLACIER',    lvl:8,  col:0x8ff3ff,   body:0x4aa3c8},
  {id:4, name:'MAGMA',      lvl:12, col:0xff4a1c,   body:0x5a1a0c},
  {id:5, name:'TOXIC',      lvl:16, col:0xb6ff1c,   body:0x2d5a10},
  {id:6, name:'GALAXY',     lvl:20, col:0xc58cff,   body:0x2a1060},
  {id:7, name:'RAINBOW',    lvl:25, col:'rainbow',  body:0x333344},
  {id:8, name:'VOID',       lvl:30, col:0xffffff,   body:0x050008},
  {id:9, name:'DIAMOND',    lvl:40, col:0xe8ffff,   body:0xcfefff},
  {id:10,name:'NEON GOD',   lvl:50, col:'rainbow',  body:'rainbow'}
];
const MAXUP=5;                            // every weapon has 5 upgrades (MK II ... MK VI)
const DMG_MULT=[1,1.5,2.1,2.8,3.7,4.8];
const MAG_MULT=[1,1.2,1.4,1.65,1.9,2.3];
const UP_COST=[1500,3000,5500,9000,14000];   // cost to reach upgrade 1..5 (scaled per weapon by upm)
const PERKS=[
  {id:0,name:'NEON TANK',  cost:2500,desc:'+50 max health'},
  {id:1,name:'QUICK REVIVE',cost:1500,desc:'revive teammates twice as fast'},
  {id:2,name:'FAST HANDS', cost:3000,desc:'reload 40% faster'},
  {id:3,name:'SPRINTER',   cost:2000,desc:'run 18% faster'},
  {id:4,name:'DEAD EYE',   cost:4000,desc:'headshots / weak spots do 60% more'},
  {id:5,name:'CASH MAGNET',cost:3500,desc:'+25% cash from kills'},
  {id:6,name:'KEVLAR',     cost:5000,desc:'take 25% less damage'},
  {id:7,name:'DOUBLE TAP', cost:5000,desc:'+20% weapon damage'},
  {id:8,name:'NEON TANK II', cost:4000,desc:'+50 more max health (total +100)',req:0},
  {id:9,name:'NEON TANK III',cost:6500,desc:'+50 more max health (total +150)',req:8},
  {id:10,name:'NEON TANK IV',cost:10000,desc:'+50 more max health (total +200)',req:9},
  {id:11,name:'SPRINTER II',cost:3500,desc:'run another 12% faster',req:3},
  {id:12,name:'SPRINTER III',cost:5500,desc:'run another 12% faster',req:11},
  {id:13,name:'SPRINTER IV',cost:8000,desc:'run another 12% faster (about 54% total)',req:12}
];
const HP_TIERS=[0,8,9,10];
const mhp=p=>100+(p.perks?50*HP_TIERS.filter(i=>p.perks[i]).length:0);
const UPCOST=(w,lv)=>Math.round(UP_COST[lv]*(WPN[w].upm||1)/50)*50;
const newWo=()=>WPN.map((_,i)=>i===0?0:-1);
const AMMO_ALL=p=>200+100*p.wo.filter((v,i)=>v>=0&&!WPN[i].melee).length;
const MBOX_COST=950,JET_COST=2500,JET_UP=[1500,3000,5000],jetMax=l=>4+2*(l|0);
const AMMO_COST=w=>Math.max(250,Math.round(WPN[w].cost/2/50)*50);

const CARS=[
  {id:0,name:'NEON SEGWAY',     kind:'segway',color:0x9dff3c,cost:500,  hp:90,  maxS:13,acc:2.6,turn:3.4,rad:1.1,ram:1.5,body:1.0, cdist:7, chgt:3.4,eye:2.0},
  {id:1,name:'DRIFT MOTORCYCLE',kind:'moto',  color:0xff9a3c,cost:1000, hp:160, maxS:22,acc:2.2,turn:2.9,rad:1.2,ram:1.5,body:1.0, cdist:8, chgt:3.7,eye:2.2},
  {id:2,name:'FLAMINGO COUPE',  kind:'car',   color:0xff3d9a,cost:1500, hp:250, maxS:25,acc:1.5,turn:2.1,rad:2.3,ram:1.6,body:1.0, cdist:11,chgt:4.6,eye:2.4},
  {id:3,name:'CYAN MUSCLE',     kind:'car',   color:0x25f4ff,cost:3500, hp:500, maxS:29,acc:1.5,turn:2.0,rad:2.4,ram:1.9,body:1.12,cdist:11,chgt:4.8,eye:2.5},
  {id:4,name:'SUNSET HYPER',    kind:'car',   color:0xffc83c,cost:6000, hp:850, maxS:33,acc:1.7,turn:2.0,rad:2.4,ram:2.2,body:1.2, cdist:12,chgt:5.0,eye:2.6},
  {id:5,name:'MONSTER TRUCK',   kind:'truck', color:0x7a3cff,cost:9000, hp:1500,maxS:24,acc:1.1,turn:1.5,rad:3.4,ram:3.4,body:1.5, cdist:15,chgt:6.6,eye:4.0},
  {id:6,name:'VOID HOVERCAR',   kind:'hover', color:0xb03cff,cost:14000,hp:1100,maxS:38,acc:1.9,turn:2.3,rad:2.6,ram:2.6,body:1.2, cdist:12,chgt:5.0,eye:2.6},
  {id:7,name:'GUNSHIP HELICOPTER',kind:'heli',color:0x3cffb0,cost:30000,hp:1400,maxS:32,acc:1.5,turn:2.0,rad:2.6,ram:0,body:1.0, cdist:15,chgt:5.5,eye:2.4,gun:true,dmg:44,rate:9}
];
/* everything sold at the garage, cheapest first (the jetpack sits between the coupe and the muscle car) */
const GARAGE_ITEMS=[{k:'car',id:0},{k:'car',id:1},{k:'car',id:2},{k:'jet'},{k:'jetup'},{k:'car',id:3},{k:'car',id:4},{k:'car',id:5},{k:'car',id:6},{k:'car',id:7}];
/* car paint & designs unlocked by level */
const CSKINS=[
  {id:0,name:'FACTORY',    lvl:1, body:null,     trim:null,     deco:'none'},
  {id:1,name:'ICE STRIPE', lvl:3, body:0xf2f7ff,  trim:0x25f4ff, deco:'stripe'},
  {id:2,name:'CRIMSON GT', lvl:6, body:0xd0142c,  trim:0xffd23c, deco:'spoiler'},
  {id:3,name:'MIDNIGHT',   lvl:10,body:0x15152e,  trim:0xff2fa0, deco:'underglow'},
  {id:4,name:'LIME RACER', lvl:14,body:0x7aff3c,  trim:0x111111, deco:'stripe2'},
  {id:5,name:'GOLD RUSH',  lvl:18,body:0xffc83c,  trim:0xffffff, deco:'spoiler'},
  {id:6,name:'FLAME',      lvl:22,body:0xff5a1a,  trim:0xffe23c, deco:'flames'},
  {id:7,name:'GALAXY WING',lvl:28,body:0x3a1a8a,  trim:0x25f4ff, deco:'wings'},
  {id:8,name:'RAINBOW',    lvl:35,body:'rainbow',trim:0xffffff, deco:'underglow'},
  {id:9,name:'NEON GOD',   lvl:45,body:'rainbow',trim:'rainbow',deco:'wings'}
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
  {name:'TITAN',  hp:1600,sp:4.4, r:3.8, cy:3.8, dmg:52, money:500, fly:false,stomp:12},
  {name:'GODZILLA',hp:60000,sp:3.6,r:15, cy:22,  dmg:95, money:20000,fly:false,ranged:true,boss:true,giant:true,stomp:42},
  {name:'KNIFER', hp:70,  sp:16, r:1.3, cy:1.4, dmg:26, money:110, fly:false},
  {name:'STALKER',hp:900, sp:4.6,r:1.9, cy:2.0, dmg:46, money:1500,fly:false,stalker:true,loner:true},
  {name:'ROOF SNIPER',hp:200,sp:0,r:1.3,cy:1.6,dmg:34,money:700,fly:false,sniper:true,loner:true},
  {name:'HOUND',  hp:55,  sp:18, r:1.2, cy:0.8, dmg:15, money:90,  fly:false,biter:true},
  {name:'THE OVERMIND',hp:150000,sp:3.0,r:17,cy:26,dmg:120,money:60000,fly:false,ranged:true,boss:true,giant:true,stomp:52,summon:true},
  {name:'ALIEN SHARK',hp:2600,sp:15,r:3.0,cy:1.8,dmg:30,money:6000,fly:false,beach:true,loner:true},
  {name:'PIZZA ALIEN',hp:260,sp:5.2,r:1.5,cy:1.6,dmg:14,money:300,fly:false,ranged:true,pizza:true,loner:true}
];

/* ---------------- world ---------------- */
/* city districts: they change the colours and the feel of each part of town */
const DISTRICTS=['DOWNTOWN','ARTS QUARTER','INDUSTRIAL ZONE','HARBOR','NEON STRIP'];
function distAt(x,z){
  const i=clamp(Math.floor(x/P+4),0,N-1),j=clamp(Math.floor(z/P+4),0,N-1);
  if(j>=6)return 3;if(j<=1)return 4;if(i<=1)return 1;if(i>=6)return 2;return 0;
}
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
    const S=34,t=1.6,H=20+Math.floor(rand()*4),gap=11,k=Math.floor(rand()*4);
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
    part(-14.8,4,2.0,3.2,3.2,{k:'prop',vend:1});   // vending machine: heal for $250
    const dl=R(0,S/2+2);
    const vp=R(-12.8,4);houses.push({x:cx,z:cz,S,H,k,name:NAMES[Math.floor(rand()*NAMES.length)],neon,pal,tex,dx:cx+dl[0],dz:cz+dl[1],vx:cx+vp[0],vz:cz+vp[1]});
    const corners=[[-12,-12],[12,-12],[-12,12],[12,12]],skip=Math.floor(rand()*4);
    corners.forEach((c,i)=>{if(i===skip)return;const r=R(c[0],c[1]);loot.push({x:cx+r[0],y:1.3,z:cz+r[1],t:0});});
    const rr=R(0,-13);loot.push({x:cx+rr[0],y:1.3,z:cz+rr[1],t:1});
    if(houses.length%3===0)loot.push({x:cx,y:H+0.6+0.9,z:cz,t:1,roof:1});
    /* ---- interior dressing: every kind of place gets its own furniture; every other building also has a second floor ---- */
    const hs0=houses[houses.length-1],hi=houses.length-1;
    const zones=[[-7,7,6,16],[11,15.6,2,15.6],[-4.2,4.2,-4.2,4.2],[-13,-7,7,13],[-2,2,-15,-11],[-12,-2,-9.3,-6.7],[7.7,10.3,-5.2,3.2],[-16,-13.6,2.2,5.8],[10,14,-14,-10],[-14,-10,-14,-10],[-14,-10,10,14]];
    const free=(lx,lz,w,d)=>!zones.some(z=>lx+w/2>z[0]&&lx-w/2<z[1]&&lz+d/2>z[2]&&lz-d/2<z[3]);
    const prop=(lx,lz,w,d,hh,neonI,flat)=>{if(!flat&&!free(lx,lz,w,d))return;if(Math.abs(lx)+w/2>15||Math.abs(lz)+d/2>15)return;part(lx,lz,w,d,hh,{k:'prop',neon:neonI,nomm:1});};
    const nm=hs0.name;
    if(nm==='ARCADE'){
      [-12.5,-9,-5.5,5.5,9,12.5].forEach((x,i)=>prop(x,-14,2.2,1.6,3.2,i%5));
      prop(-4,4,2,3,2.4,1);prop(4,4,2,3,2.4,2);prop(9,9,2,3,2.4,4);
    }else if(nm==='NEON CLUB'){
      prop(0,-14.3,8,1.4,2.4,1);prop(-12.5,-14,2.2,2.2,4.4,0);prop(12.5,-14,2.2,2.2,4.4,0);
      [[-8,2],[8,2],[-8,-2],[8,-2]].forEach(p=>prop(p[0],p[1],5,3.5,0.3,(p[0]<0)?0:2,true));
      for(let i=0;i<5;i++)prop(-12.5+i*1.9,9,0.9,0.9,1.2,3);
    }else if(nm==='VIDEO RENTAL'){
      prop(-12.5,-1,1.2,8,3.2,2);prop(-3,-14.2,8,1.2,3.4,2);prop(4,-8,1.2,8,2.8,1);prop(8.5,-13,4,1.2,3.2,1);prop(12.5,-6,1.2,5,2.6,4);
    }else if(nm==='DINER'){
      for(const z of[-12,-6,0])prop(-13,z,2.4,4,1.6,0);
      for(const z of[-12,-6])prop(13,z,2.4,4,1.6,0);
      prop(-8,-3,2.2,2.2,1.1,3);prop(-8,3,2.2,2.2,1.1,3);prop(8,-12,2.2,2.2,1.1,3);prop(13,-13.5,1.6,1.6,3.2,4);
    }else if(nm==='ROLLER RINK'){
      prop(0,-1,20,18,0.25,0,true);prop(0,-1,8,8,0.35,1,true);prop(0,-14.3,6,1.4,2.6,2);
      for(const x of[-13.5,13.5])prop(x,8,1.2,6,1.0,3);
    }else if(nm==='HOTEL LOBBY'){
      prop(-6,-14,8,1.6,1.7,3);prop(6,-14,8,1.6,1.7,3);prop(-12.5,-2,2.4,6,1.4,2);prop(-8,-1,1.6,1.6,7,0);prop(8,-1,1.6,1.6,7,0);prop(0,-8,6,3,1.0,2);
    }else if(nm==='TIKI BAR'){
      prop(-9,-14,10,1.8,1.7,3);prop(11,-14,6,1.8,1.7,3);
      for(let i=0;i<6;i++)prop(-13+i*2.2,-11.6,0.8,0.8,1.1,3);
      prop(-13.5,-3,1.4,1.4,5,3);prop(13.5,-3,1.4,1.4,5,3);prop(0,-8,2.6,2.6,1.1,4);prop(-7,0,2,2,1.1,4);
    }else if(nm==='RECORD SHOP'){
      for(const z of[-11,-5])prop(-9,z,1.4,5,1.1,1);
      prop(9,-12,3,3,3.2,0);prop(-3,-14.2,6,1.2,3.4,2);prop(6,-14.2,4,1.2,3.4,2);prop(-13,3,1.4,5,1.1,1);
    }
  }
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const cx=(i-3.5)*P,cz=(j-3.5)*P;
    const park=rand()<0.14;
    slabs.push({cx,cz,park,b0:B.length,dist:distAt(cx,cz)});
    if(park)continue;
    if(rand()<0.36){addHouse(cx,cz);slabs[slabs.length-1].house=true;continue;}
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
  for(let i=0;i<slabs.length;i++)slabs[i].b1=i+1<slabs.length?slabs[i+1].b0:B.length;
  for(const b of B)b.dist=distAt(b.x,b.z);
  /* ---- themed landmark blocks: some ordinary blocks become places worth exploring ---- */
  const r4=mulberry32((seed|0)+7),themes=[],sauc=[];
  const dbox=(x,z,w,d,h,c,extra)=>add(x,z,w,d,h,Object.assign({k:'deco',c,part:1,sign:-1},extra));
  const NEON6=[0xff2fa0,0x25f4ff,0xa56bff,0xff9a3c,0x3cff9e,0xffe63c];
  {
    const cand=slabs.map((s,i)=>({s,i})).filter(o=>!o.s.park&&!o.s.house&&o.s.b1>o.s.b0&&Math.max(...B.slice(o.s.b0,o.s.b1).map(b=>b.h))<=34);
    const plan=['pyramid','ferris','maze','drivein','plaza','yard','yard','maze','pyramid'],chosen=[];
    for(const kind of plan){
      if(!cand.length)break;
      let best=null,bd=-1;
      for(const o of cand){const d=chosen.length?Math.min(...chosen.map(c=>Math.hypot(c.s.cx-o.s.cx,c.s.cz-o.s.cz))):r4()*100;if(d>bd){bd=d;best=o;}}
      chosen.push(best);cand.splice(cand.indexOf(best),1);
      const sl=best.s,cx=sl.cx,cz=sl.cz;
      for(let k=sl.b0;k<sl.b1;k++)B[k].dead=1;
      sl.theme=kind;themes.push({k:kind,cx,cz});
      if(kind==='pyramid'){
        for(let t=0;t<8;t++){const w=46-t*5.2;dbox(cx,cz,w,w,1.4*(t+1),NEON6[t%6],{em:1});}
        loot.push({x:cx,y:11.2+1.7,z:cz,t:1});
        for(const [ax,az] of [[-24,-24],[24,-24],[-24,24],[24,24]])loot.push({x:cx+ax,y:1.3,z:cz+az,t:0});
      }else if(kind==='ferris'){
        dbox(cx-10,cz,3.5,3.5,27,0xe8e8f4,{});dbox(cx+10,cz,3.5,3.5,27,0xe8e8f4,{});
        dbox(cx,cz+22,9,6,4,0xff2fa0,{em:1});loot.push({x:cx,y:4+1.7,z:cz+22,t:1});
        loot.push({x:cx-20,y:1.3,z:cz+18,t:0});loot.push({x:cx+20,y:1.3,z:cz-18,t:0});
      }else if(kind==='maze'){
        const M=5,C=10,ox=cx-25,oz=cz-25,V=[],H=[];
        for(let a=0;a<=M;a++){V.push(Array(M).fill(true));H.push(Array(M+1).fill(true));}
        // V[a][b]: wall left of cell (a,b); H[a][b]: wall above cell (a,b) (cells indexed [a][b], a=x,b=z)
        const seen=Array.from({length:M},()=>Array(M).fill(false)),st=[[0,0]];seen[0][0]=true;
        while(st.length){
          const [a,b]=st[st.length-1],nb=[[1,0],[-1,0],[0,1],[0,-1]].map(d=>[a+d[0],b+d[1],d]).filter(q=>q[0]>=0&&q[0]<M&&q[1]>=0&&q[1]<M&&!seen[q[0]][q[1]]);
          if(!nb.length){st.pop();continue;}
          const q=nb[Math.floor(r4()*nb.length)];seen[q[0]][q[1]]=true;
          if(q[2][0]===1)V[a+1][b]=false;else if(q[2][0]===-1)V[a][b]=false;else if(q[2][1]===1)H[a][b+1]=false;else H[a][b]=false;
          st.push([q[0],q[1]]);
        }
        H[2][M]=false;H[2][0]=true;   // the entrance faces +z (south)
        for(let a=0;a<=M;a++)for(let b=0;b<M;b++)if(V[a][b])dbox(ox+a*C,oz+b*C+C/2,1.6,C+1.6,5,0x1fa84f,{});
        for(let a=0;a<M;a++)for(let b=0;b<=M;b++)if(H[a][b])dbox(ox+a*C+C/2,oz+b*C,C+1.6,1.6,5,0x1fa84f,{});
        loot.push({x:cx,y:1.3,z:cz,t:1});loot.push({x:ox+5,y:1.3,z:oz+5,t:0});loot.push({x:ox+45,y:1.3,z:oz+5,t:0});
      }else if(kind==='drivein'){
        dbox(cx,cz-27,36,1.6,19,0x14102a,{scr:1});
        for(let rw=0;rw<3;rw++)for(let c=0;c<4;c++)dbox(cx-15+c*10,cz-14+rw*11,4.4,2.2,1.5,NEON6[(rw*4+c)%6],{em:1,tilt:1});
        dbox(cx+21,cz+23,9,6,4,0xffe63c,{em:1});
        loot.push({x:cx+21,y:4+1.7,z:cz+23,t:1});loot.push({x:cx-20,y:1.3,z:cz+22,t:0});loot.push({x:cx,y:1.3,z:cz+24,t:0});
      }else if(kind==='plaza'){
        dbox(cx-8,cz+6,12,12,1.0,0x25f4ff,{em:1});dbox(cx-8,cz+6,3,3,4.5,0xffffff,{em:1});
        dbox(cx+17,cz-17,5,5,34,0xff9a3c,{em:1});
        loot.push({x:cx+17,y:34+0.8+0.9,z:cz-17,t:1,roof:1});
        loot.push({x:cx+22,y:1.3,z:cz+20,t:0});loot.push({x:cx-24,y:1.3,z:cz-20,t:0});
      }else if(kind==='yard'){
        const COL=[0xff4a3c,0x25a8ff,0xffc83c,0x3cff9e,0xa56bff,0xff2fa0];
        let top=null;
        for(let rw=0;rw<4;rw++)for(let c=0;c<2;c++){
          const x=cx-13+c*26,z=cz-21+rw*14,n=r4()<0.55?1:2,h=1.3*2*n;
          dbox(x,z,12.2,2.6,h,COL[Math.floor(r4()*6)],{});
          if(n===1){dbox(x+(c?-8.5:8.5),z,2,2,1.3,0x8a6a44,{});if(!top)top=[x,z,h];}
        }
        if(top)loot.push({x:top[0],y:top[2]+1.7,z:top[1],t:1});
        loot.push({x:cx,y:1.3,z:cz-3,t:0});loot.push({x:cx,y:1.3,z:cz+16,t:0});
      }
    }
  }
  /* park flavours */
  {let pi=0;const pk=['pond','stage','ufo'];
    for(const sl of slabs){if(!sl.park)continue;const kind=pk[pi++%pk.length];sl.theme=kind;themes.push({k:kind,cx:sl.cx,cz:sl.cz});
      if(kind==='stage'){dbox(sl.cx,sl.cz-8,20,11,1.2,0x2b2145,{em:1,c2:1});dbox(sl.cx,sl.cz-13,20,1.4,8,0xff2fa0,{em:1});loot.push({x:sl.cx,y:1.2+1.7,z:sl.cz-8,t:1});}
      if(kind==='ufo'){   // crashed saucer: three stacked tiers you can climb (1.4 per step)
        {   // the saucer lies tilted on its side (same angles as the model in the client): a sloped, walkable top surface
          const th=0.4,ph=0.15,ny=Math.cos(th)*Math.cos(ph),yc=3.2;
          sauc.push({x:sl.cx,z:sl.cz,R:9.5,sx:Math.tan(th)/Math.cos(ph),sz:-Math.tan(ph),base:yc+1.2/ny,thick:2.4/ny});
        }
        loot.push({x:sl.cx,y:3.2+1.2/(Math.cos(0.4)*Math.cos(0.15))+1.7,z:sl.cz,t:1});loot.push({x:sl.cx+14,y:1.3,z:sl.cz-12,t:0});
      }
      if(kind==='pond')loot.push({x:sl.cx+17,y:1.3,z:sl.cz+17,t:0});
    }
  }
  /* MARINA on the beach: boardwalk, piers and docked boats (stand on the decks; yacht roof has loot) */
  {const mx=190,mz=392;themes.push({k:'marina',cx:mx,cz:mz});
    dbox(mx,mz-8,70,3.2,0.7,0x8a5a2a,{nomm:1});                                       // boardwalk along the shore
    for(const px of[-24,-8,8,24])dbox(mx+px,mz+3,2.6,18,0.7,0x8a5a2a,{nomm:1});        // four piers
    const BC=[0xffffff,0xff2fa0,0x25f4ff,0xffc83c];
    [[-16,0],[0,6],[16,0]].forEach(([bx,bz],i)=>{                                      // boats between the piers
      dbox(mx+bx,mz+bz+2,5.4,12,1.4,BC[i%4],{em:1,nomm:1});dbox(mx+bx,mz+bz,3.4,4.6,3.6,0xe8e8f4,{nomm:1});dbox(mx+bx,mz+bz+5,0.5,0.5,9,0xffffff,{nomm:1});
    });
    loot.push({x:mx+0,y:3.6+1.7,z:mz+6,t:1});loot.push({x:mx-30,y:0.7+1.3,z:mz-8,t:0});loot.push({x:mx+30,y:0.7+1.3,z:mz-8,t:0});
  }
  for(let k=B.length-1;k>=0;k--)if(B[k].dead)B.splice(k,1);
  // rooftop caches on some tall towers (need a jetpack)
  const r3=mulberry32((seed|0)+99);let nroof=0;
  for(const b of B){if(b.part||b.h<26||nroof>=11)continue;if(r3()<0.2){loot.push({x:b.x,y:b.h+0.8+0.9,z:b.z,t:1,roof:1});nroof++;}}
  // beach caches
  [-150,0,150].forEach(x=>loot.push({x,y:0.9,z:HALF+40,t:1,beach:1}));
  // three secret NEON TAPES: one on the far beach, one on the tallest roof, one inside a building
  loot.push({x:-300,y:0.9,z:HALF+56,t:2});
  {let tb=null;for(const b of B){if(b.part)continue;if(!tb||b.h>tb.h)tb=b;}if(tb)loot.push({x:tb.x,y:tb.h+0.8+0.9,z:tb.z,t:2,roof:1});}
  {const hs=houses[Math.min(4,houses.length-1)];if(hs)loot.push({x:hs.x,y:1.3,z:hs.z+3,t:2});}
  loot.forEach((l,i)=>l.id=i);
  // jump pads on street intersections: they launch you up to the rooftops
  const pads=[[88,0],[-88,88],[176,-88],[-176,-176],[0,176],[-264,88],[264,176]].filter(p=>!B.some(b=>p[0]>b.x0-5&&p[0]<b.x1+5&&p[1]>b.z0-5&&p[1]<b.z1+5)).map(p=>({x:p[0],z:p[1]}));
  let mbox=null;
  {let best=-1,hs0=null;for(const hs of houses){const d=Math.hypot(hs.x,hs.z);if(d>best){best=d;hs0=hs;}}
   if(hs0){const k=hs0.k,lx=-10,lz=10,q=k===0?[lx,lz]:k===1?[-lz,lx]:k===2?[-lx,-lz]:[lz,-lx];mbox={x:hs0.x+q[0],z:hs0.z+q[1],name:hs0.name};}}
  return {B,slabs,houses,loot,pads,themes,sauc,mbox};
}
const SEED=1986;
const WORLD=genWorld(SEED);
const SAUC=WORLD.sauc,B=WORLD.B,LOOT=WORLD.loot,HOUSES=WORLD.houses,PADS=WORLD.pads;

/* shops live at intersection corners (always an empty strip of sidewalk) */
const STATIONS=[];
const GARAGE_SPAWNS=[];
[[0,0],[-176,-88],[176,88]].forEach((c,ci)=>{
  const [ix,iz]=c,o=18.5;
  STATIONS.push({k:'armory',x:ix-o,z:iz-o,c:ci});
  STATIONS.push({k:'forge', x:ix+o,z:iz-o,c:ci});
  STATIONS.push({k:'garage',x:ix-o,z:iz+o,c:ci});
  STATIONS.push({k:'perks', x:ix+o,z:iz+o,c:ci}); // perk tower
  GARAGE_SPAWNS.push({x:ix-6,z:iz+30,h:0,c:ci});
});
const SHOP=STATIONS.filter(s=>!s.hidden);

/* ---------------- geometry helpers ---------------- */
const topOf=b=>(b.k==='prop'||b.k==='roof'||b.k==='deco')?b.h:b.h+0.8;
/* fy = feet height. Boxes whose top is at/below the feet (or whose underside is above the head) don't block. */
function pushOut(p,r,fy){
  fy=fy||0;
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(p.x<b.x0-r||p.x>b.x1+r||p.z<b.z0-r||p.z>b.z1+r)continue;
    if(b.y0!==undefined&&fy+EYE+0.1<=b.y0)continue;
    if(topOf(b)<=fy+0.6)continue;
    if(b.circ){const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz),Rr=b.circ+r;if(d<Rr){if(d>1e-6){p.x=b.x+dx/d*Rr;p.z=b.z+dz/d*Rr;}else p.x=b.x+Rr;}continue;}
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
  for(const u of SAUC){   // tilted saucer: solid body, but you can walk up its slope or under its raised side
    const dx=p.x-u.x,dz=p.z-u.z,d=Math.hypot(dx,dz);
    if(d>=u.R+r)continue;
    const T=u.base+u.sx*dx+u.sz*dz;
    if(fy+EYE<=T-u.thick||fy+0.6>=T)continue;
    if(d>1e-6){p.x=u.x+dx/d*(u.R+r);p.z=u.z+dz/d*(u.R+r);}else p.x=u.x+u.R+r;
  }
}
/* height of the floor/roof under (x,z) that a body at feet height fy can stand on */
function groundAt(x,z,fy,r){
  r=r||0.3;let g=0;
  for(let i=0;i<B.length;i++){
    const b=B[i];
    if(x<b.x0-r||x>b.x1+r||z<b.z0-r||z>b.z1+r)continue;
    if(b.y0!==undefined&&fy+EYE+0.1<=b.y0)continue;
    if(b.circ&&Math.hypot(x-b.x,z-b.z)>b.circ+r)continue;
    const t=topOf(b);
    if(t<=fy+0.6&&t>g)g=t;
  }
  for(const u of SAUC){const dx=x-u.x,dz=z-u.z;if(Math.hypot(dx,dz)>u.R)continue;const T=u.base+u.sx*dx+u.sz*dz;if(T<=fy+0.6&&T>g)g=T;}
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
    this.aliens=[];this.orbs=[];this.cars=[];this.clouds=[];
    this.nid=1;this.ev=[];
    this.round=0;this.state='lobby';this.timer=0;this.queue=[];this.spawnT=0;
    this.time=0;this.snapT=0;this.flows=new Map();this.flowT=0;
    this.rnd=mulberry32((Math.random()*1e9)|0);
    this.overStats=null;this.best=0;this.loot=LOOT.map(()=>true);this.tapeTaken={};this.tapes=0;this.weather=0;this.bolts=[];this.wxT=0;
  }
  rand(){return this.rnd();}
  addPlayer(id,name){
    const idx=this.players.size;
    const p={id,name:String(name||'PLAYER').replace(/[^\w \-]/g,'').slice(0,12).toUpperCase()||'PLAYER',
      color:PLAYER_COLORS[(id-1)%PLAYER_COLORS.length],
      x:0,y:EYE,z:0,yaw:0,pitch:0,hp:100,st:'alive',money:500+Math.max(0,this.round-1)*250,kills:0,
      joinRound:(this.state==='fight'?this.round:this.round+1),wo:newWo(),perks:PERKS.map(()=>false),w:0,lv:1,sk:0,jet:false,jl:0,oc:0,jfl:0,ck:0,car:-1,lastHit:-99,bleed:0,rvProg:0,rvT:-9,rvTarget:0,fireT:0,sp:0,dd:0,rvd:0,dn:0,dt:0,bk:0};
    this.spawnPos(p);
    this.players.set(id,p);
    if(this.state==='lobby'){if(this.online){this.state='wait';this.timer=0;}else{this.state='rest';this.timer=6;}this.round=0;}
    return p;
  }
  setProfile(id,lv,sk,ck){
    const p=this.players.get(id);if(!p)return;
    p.lv=clamp(lv|0,1,MAXLV);sk=sk|0;p.sk=(sk>=0&&sk<SKINS.length)?sk:0;
    ck=ck|0;p.ck=(ck>=0&&ck<CSKINS.length&&CSKINS[ck].lvl<=p.lv)?ck:0;
  }
  /* rounds this player survived while in the game (for the leaderboard) */
  credit(p){
    const done=this.state==='rest'?this.round:this.round-1;
    return Math.max(0,done-(p.joinRound-1));
  }
  report(list){
    if(!this.onRecord)return;
    try{this.onRecord(list.map(p=>({name:p.name,rounds:this.credit(p),kills:p.kills,lv:p.lv})));}catch(e){console.error('record error',e);}
  }
  removePlayer(id){
    const p=this.players.get(id);if(!p)return;
    if(this.round>=1&&this.state!=='over')this.report([p]);
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
          if(c&&m.car){c.x=clamp(+m.car.x,BOUNDS.x0,BOUNDS.x1);c.z=clamp(+m.car.z,BOUNDS.z0,BOUNDS.z1);c.h=+m.car.h||0;c.sp=clamp(+m.car.sp||0,-20,CARS[c.t].maxS*1.15);c.y=CARS[c.t].kind==='heli'?clamp(+m.car.y||0,0,95):0;}
          if(c){p.x=c.x;p.z=c.z;p.y=EYE+(c.y||0);}
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
        if(c&&(c.y||0)>3)break;   // land the helicopter first
        if(c){c.drv=-1;c.sp=0;p.x=c.x+Math.cos(c.h)*3.2;p.z=c.z-Math.sin(c.h)*3.2;}
        p.car=-1;break;
      }
      case 'start':{
        if(this.state!=='wait')break;
        let host=1e9;for(const q of this.players.values())host=Math.min(host,q.id);
        if(p.id!==host)break;
        this.state='rest';this.timer=5;this.round=0;this.push('go');break;
      }
      case 'rv':p.rvTarget=m.target|0;p.rvT=this.time;break;
      case 'prof':this.setProfile(id,m.lv,m.sk,m.ck);break;
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
      if(!cd.gun)return;   // only the helicopter has guns - every other vehicle just rams
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/cd.rate;
      def={pellets:1,spread:0.012,pierce:2,range:320};dmg=cd.dmg;col=cd.color;
    }else{
      if(p.car>=0)return;
      const w=m.w|0;if(!WPN[w]||p.wo[w]<0)return;
      def=WPN[w];lvl=p.wo[w];
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/def.rate;
      dmg=def.dmg*DMG_MULT[lvl]*(p.perks[7]?1.2:1);col=def.color;
    }
    const range=def.range||260;
    const shotEv=()=>this.push('shot',p.id,m.w,lvl,r2(ox),r2(oy),r2(oz),r2(d[0]),r2(d[1]),r2(d[2]),m.s|0,p.sk|0);
    if(def.gas){   // lob a gas canister: a poison cloud forms where it lands
      const wt0=rayWorld(ox,oy,oz,d[0],d[1],d[2],range);let tb=wt0;
      for(const a of this.aliens){const t=raySphere(ox,oy,oz,d[0],d[1],d[2],a.x,a.y+a.cy,a.z,a.r+0.3);if(t>=0&&t<tb)tb=t;}
      if(this.clouds.length>=30)this.clouds.shift();
      this.clouds.push({id:this.nid++,x:ox+d[0]*tb,y:Math.max(0.6,oy+d[1]*tb),z:oz+d[2]*tb,r:6+lvl*0.9,life:6+lvl*0.5,dps:dmg*1.6,own:p.id,tk:0.2});
      shotEv();return;
    }
    const dirs=spreadDirs(def,d,m.s|0);
    for(const dd of dirs){
      const wt=rayWorld(ox,oy,oz,dd[0],dd[1],dd[2],range);
      const hits=[];
      for(const a of this.aliens){
        const t=raySphere(ox,oy,oz,dd[0],dd[1],dd[2],a.x,a.y+a.cy,a.z,a.r+0.3);
        if(t>=0&&t<=range&&(t<wt||AT[a.t].giant))hits.push([t,a]);
      }
      hits.sort((a,b)=>a[0]-b[0]);
      let n=0;
      for(const h of hits){
        if(n>=def.pierce)break;n++;
        const a=h[1];
        this.damageAlien(a,dmg*(n>1?0.8:1),p,ox+dd[0]*h[0],oy+dd[1]*h[0],oz+dd[2]*h[0]);
        if(def.burn&&a.hp>0){a.burn=2.5;a.burnD=Math.max(a.burnD||0,dmg*1.4);a.burnOwn=p.id;}
      }
    }
    shotEv();
  }

  onBuy(p,m){
    if(p.st!=='alive'||p.car>=0)return;
    const near=k=>SHOP.find(s=>s.k===k&&Math.hypot(s.x-p.x,s.z-p.z)<6);
    if(m.k==='wpn'){
      if(!near('armory'))return;
      const w=m.id|0;if(!WPN[w])return;
      if(p.wo[w]>=0)return;
      if(p.money<WPN[w].cost)return;p.money-=WPN[w].cost;p.wo[w]=0;this.push('gave',p.id,w);
    }else if(m.k==='ammoall'){
      if(!near('armory'))return;
      const c=AMMO_ALL(p);if(p.money<c)return;p.money-=c;this.push('ammoall',p.id);
    }else if(m.k==='upg'){
      if(!near('forge')&&!near('armory'))return;
      const w=m.id|0;if(!WPN[w]||p.wo[w]<0||p.wo[w]>=MAXUP)return;
      const c=UPCOST(w,p.wo[w]);if(p.money<c)return;
      p.money-=c;p.wo[w]++;this.push('upg',p.id,w,p.wo[w]);
    }else if(m.k==='perk'){
      if(!near('perks'))return;
      const id=m.id|0,pk=PERKS[id];if(!pk||p.perks[id]||p.money<pk.cost||(pk.req!==undefined&&!p.perks[pk.req]))return;
      p.money-=pk.cost;p.perks[id]=true;if(HP_TIERS.includes(id))p.hp=Math.min(mhp(p),p.hp+50);this.push('perk',p.id,id);
    }else if(m.k==='mbox'){
      const mb=WORLD.mbox;if(!mb||Math.hypot(mb.x-p.x,mb.z-p.z)>4.5||p.money<MBOX_COST)return;
      p.money-=MBOX_COST;
      const w=1+Math.floor(this.rand()*(WPN.length-1));
      if(p.wo[w]<0){p.wo[w]=0;this.push('gave',p.id,w);}
      else if(p.wo[w]<MAXUP){p.wo[w]++;this.push('upg',p.id,w,p.wo[w]);}
      else this.push('ammoall',p.id);
      this.push('mbox',p.id,w);
    }else if(m.k==='vend'){
      const h=HOUSES.find(h=>Math.hypot(h.vx-p.x,h.vz-p.z)<4);if(!h)return;
      if(p.money<250||p.hp>=mhp(p)-0.5)return;p.money-=250;p.hp=mhp(p);this.push('vend',p.id);
    }else if(m.k==='jet'){
      if(!near('garage')||p.jet||p.money<JET_COST)return;
      p.money-=JET_COST;p.jet=true;p.jl=0;this.push('gotjet',p.id);
    }else if(m.k==='jetup'){
      if(!near('garage')||!p.jet||(p.jl|0)>=JET_UP.length||p.money<JET_UP[p.jl|0])return;
      p.money-=JET_UP[p.jl|0];p.jl=(p.jl|0)+1;this.push('gotjet',p.id);
    }else if(m.k==='car'){
      const g=near('garage');if(!g)return;
      const t=m.id|0;if(!CARS[t])return;
      const owned=(p.oc>>t)&1;
      if(!owned&&p.money<CARS[t].cost)return;
      if(this.cars.length>=8)return;
      const sp=GARAGE_SPAWNS[g.c];
      let z=sp.z,tries=0;
      while(this.cars.some(c=>Math.hypot(c.x-sp.x,c.z-z)<7)&&tries++<6)z+=7;
      if(!owned){p.money-=CARS[t].cost;p.oc|=1<<t;}
      const c={id:this.nid++,t,x:sp.x,z,h:Math.PI/2*0,hp:CARS[t].hp,drv:-1,sp:0,k:p.ck|0};
      c.h=0;
      this.cars.push(c);this.push('bought',p.id,c.id);
    }
  }

  pickLoot(p,l){
    if(l.t===2){
      this.tapeTaken[l.id]=1;this.tapes++;this.push('tape',p.id,this.tapes);
      if(this.tapes>=3){for(const q of this.players.values()){q.money+=25000;q.hp=mhp(q);}this.push('tapesall');}
      return;
    }
    const r=this.rand();
    if(l.t===1){
      const cash=Math.round((400+this.round*40)*(0.8+0.5*this.rand()));
      p.money+=cash;p.hp=mhp(p);
      this.push('loot',p.id,'rare',cash,l.id);this.push('ammoall',p.id);
    }else if(r<0.55){
      const cash=Math.round((100+this.round*18)*(0.8+0.6*this.rand()));
      p.money+=cash;this.push('loot',p.id,'cash',cash,l.id);
    }else if(r<0.8){this.push('loot',p.id,'ammo',0,l.id);this.push('ammoall',p.id);}
    else{p.hp=mhp(p);this.push('loot',p.id,'med',0,l.id);}
  }
  damageAlien(a,dmg,p,x,y,z){
    if(a.hp<=0)return;
    if(a.dorm){for(const o of this.aliens)if(o.dorm&&Math.hypot(o.x-a.x,o.z-a.z)<30)o.dorm=false;}
    if(a.hide){a.hide=false;this.push('stalk',a.id);}
    if(AT[a.t].stalker)a.enr=1;
    let crit=0;
    if(y!==undefined){const df=AT[a.t];if(y>a.y+a.cy+df.r*(df.giant?0.12:0.4)){crit=1;dmg*=(df.giant?2.5:2)*(p.perks&&p.perks[4]?1.6:1);}}
    p.dd=(p.dd||0)+Math.max(0,Math.min(dmg,a.hp));
    a.hp-=dmg;
    p.money+=10;
    let killed=0;
    if(a.hp<=0){killed=1;this.killAlien(a,p);}
    this.push('hit',p.id,r2(x),r2(y),r2(z),killed,Math.round(dmg),crit);
  }
  killAlien(a,p){
    const def=AT[a.t];
    const mk=(def.money+(a.far?Math.round(def.money*0.5):0))*(a.mut?3:1)*(p.perks&&p.perks[5]?1.25:1);
    p.money+=Math.round(mk);p.kills++;
    for(const q of this.players.values()){   // teammates close to the kill get 25% of the cash
      if(q===p||q.st!=='alive')continue;
      if(Math.hypot(q.x-a.x,q.z-a.z)<60)q.money+=Math.round(mk*0.25);
    }
    if(a.mut===1){   // volatile mutant: blows up when it dies
      this.push('blast',r2(a.x),r2(a.y+1),r2(a.z));
      for(const q of this.players.values()){if(q.st!=='alive')continue;const t=this.targetPos(q),d=Math.hypot(t.x-a.x,t.z-a.z);if(d<9&&q.y-EYE<6)this.hurt(q,(25+this.round)*(1-d/12),a.x,a.z);}
    }
    if(def.boss){p.bk=(p.bk|0)+1;this.bossDrop(a,p);}
    if(def.pizza){for(const q of this.players.values()){if(q.st==='alive'&&Math.hypot(q.x-a.x,q.z-a.z)<45)q.hp=Math.min(mhp(q),q.hp+(q===p?mhp(q)*0.4:25));}this.push('pizza',r2(a.x),r2(a.y+1),r2(a.z));}
    this.push('boom',r2(a.x),r2(a.y+a.cy),r2(a.z),a.t,a.id);
  }

  /* ---- rounds ---- */
  hpMul(){const r=this.round;return r<=10?1+0.15*(r-1):(1+0.15*9)*Math.pow(1.08,r-10);}
  startRound(){
    this.round++;
    const npl=Math.max(1,this.players.size),mul=1+0.55*(npl-1);     // bigger crews face bigger waves: 1.0x solo, 1.55x for 2, 2.65x for 4, 3.75x for 6
    let total=Math.round((5+this.round*2.4)*mul);
    const giant=this.round%20===0,ultimate=this.round%50===0,shark=this.round%13===0;
    const boss=this.round%5===0;
    if(boss)total=Math.round(total*0.5);
    const q=[];
    const pool=[[0,1,Math.max(3,10-this.round*0.4)],[2,2,3],[1,3,3],[5,4,3],[3,5,2],[6,6,2.5],[7,7,2.5],[8,8,1.5],[9,9,1.5],[10,11,1.2],[11,13,1],[13,8,3],[16,11,3]].filter(e=>this.round>=e[1]);
    const ptot=pool.reduce((sum,e)=>sum+e[2],0);
    for(let i=0;i<total;i++){
      let r=this.rand()*ptot,t=0;
      for(const e of pool){r-=e[2];if(r<=0){t=e[0];break;}}
      q.push(t);
    }
    if(this.round<=5){   // early rounds: just ONE red blade-wielder (charger / knifer) at a time
      let seen=0;
      for(let i=0;i<q.length;i++)if(q[i]===5||q[i]===13){if(++seen>1)q[i]=0;}
      if(this.round===3&&!seen)q[Math.floor(this.rand()*q.length)]=5;
    }
    for(const t of q.slice())if(t===16)q.push(16,16);     // hounds come in packs of three
    if(this.round>=6&&(this.round-6)%4===0){const ns=1+Math.floor(this.round/24);for(let i=0;i<ns;i++)q.unshift(14);}   // the stalker: rounds 6, 10, 14, ...
    if(this.round>=16){const nn=Math.min(4,1+Math.floor((this.round-16)/5));for(let i=0;i<nn;i++)q.unshift(15);}        // rooftop snipers from round 16
    if(this.round>=7&&(this.round-7)%5===0){const np2=1+Math.floor((this.round-7)/20)+(this.players.size>3?1:0);for(let i=0;i<np2;i++)q.unshift(19);}   // the pizza alien: rounds 7, 12, 17, ...
    if(shark){const nsh=1+Math.floor(this.round/39);for(let i=0;i<nsh;i++)q.unshift(18);}   // an alien shark on the beach every 13 rounds
    if(ultimate){q.unshift(17);}
    if(giant){const ng=1+Math.floor(this.round/100);for(let i=0;i<ng;i++)q.unshift(12);}
    else if(boss){const nb=1+Math.floor(this.round/20);for(let i=0;i<nb;i++)q.unshift(4);}
    for(const p of this.players.values()){   // everyone who fell comes back at the start of the round
      if(p.st!=='alive'){
        p.st='alive';p.hp=mhp(p);p.rvProg=0;this.spawnPos(p);
        if(p.money<500)p.money=500;
        this.push('revived',p.id);
      }
    }
    this.nested=false;this.queue=q;this.state='fight';this.spawnT=1.5;this.loot.fill(true);LOOT.forEach((l,i)=>{if(l.t===2&&this.tapeTaken[i])this.loot[i]=false;});
    this.weather=0;
    if(this.round>=9&&this.rand()<0.45){this.weather=1+Math.floor(this.rand()*3);this.wxT=0;this.push('weather',this.weather);}
    this.push('round',this.round,ultimate?3:giant?2:(boss?1:0));
  }
  endRound(){
    this.sides=null;this.state='rest';this.timer=this.round%5===0?12:9;
    if(this.weather){this.weather=0;this.bolts.length=0;this.push('weather',0);}
    for(const p of this.players.values()){
      if(p.st==='alive')p.money+=50*this.round;
    }
    this.push('clear',this.round);
  }
  resetGame(){
    this.sides=null;
    this.aliens.length=0;this.orbs.length=0;this.cars.length=0;this.queue.length=0;this.clouds.length=0;
    for(const p of this.players.values()){
      p.wo=newWo();p.perks=PERKS.map(()=>false);p.joinRound=1;p.w=0;p.jet=false;p.jl=0;p.oc=0;p.dd=0;p.rvd=0;p.dn=0;p.dt=0;p.bk=0;p.money=500;p.kills=0;p.hp=100;p.st='alive';p.car=-1;this.spawnPos(p);
    }
    this.loot.fill(true);this.tapeTaken={};this.tapes=0;this.weather=0;this.bolts.length=0;this.round=0;this.state=this.online?'wait':'rest';this.timer=6;this.push('reset');
  }

  pickSides(){
    const n=this.round+1>=8?2:1,a0=this.rand()*Math.PI*2;
    return n===1?[a0]:[a0,a0+Math.PI*(0.7+this.rand()*0.6)];
  }
  spawnAlien(t,fx,fz){
    const def=AT[t],pl=[...this.players.values()].filter(p=>p.st==='alive');
    if(!pl.length)return;
    const tg=pl[Math.floor(this.rand()*pl.length)];
    let x=0,z=0,ok=false;
    for(let i=0;i<25&&!ok;i++){
      const a=(this.sides&&this.sides.length&&this.state==='fight'&&!def.beach&&this.rand()<0.85)?this.sides[Math.floor(this.rand()*this.sides.length)]+(this.rand()-0.5)*1.0:this.rand()*Math.PI*2,d=Math.max(Math.min(62,40+4*this.round),((t===17?180:t===12?150:t===4?90:80)+this.rand()*70)*Math.min(1,0.4+0.08*this.round));   // early rounds spawn a bit closer, but never right on top of you
      x=tg.x+Math.cos(a)*d;z=tg.z+Math.sin(a)*d;
      if(x<BOUNDS.x0||x>BOUNDS.x1||z<BOUNDS.z0||z>BOUNDS.z1-30)continue;
      if(!def.fly&&BLOCK[cellOf(x,z)])continue;
      ok=true;
    }
    if(!ok){x=(this.rand()<0.5?-1:1)*88*(1+Math.floor(this.rand()*3));z=(this.rand()-0.5)*300;
      if(x===0)x=88;}
    if(fx!==undefined){x=fx;z=fz;}
    let yy=def.fly?9+this.rand()*6:0;
    if(t===14){   // hide inside one of the enterable buildings
      const hs=HOUSES[Math.floor(this.rand()*HOUSES.length)];
      let hx=hs.x,hz=hs.z;
      for(let i=0;i<30;i++){const tx=hs.x+(this.rand()-0.5)*hs.S*0.55,tz=hs.z+(this.rand()-0.5)*hs.S*0.55;if(!inBuilding(tx,tz,1)){hx=tx;hz=tz;break;}}
      x=hx;z=hz;
    }
    if(t===18){x=(this.rand()-0.5)*260;z=HALF+40;}
    if(t===15){   // perch on a rooftop
      const roofs=B.filter(b=>b.k===undefined&&topOf(b)>=14&&(b.x1-b.x0)>=8&&(b.z1-b.z0)>=8);
      if(roofs.length){
        let best=null,bd=-1;
        for(let i=0;i<60;i++){const b=roofs[Math.floor(this.rand()*roofs.length)];const d=Math.hypot((b.x0+b.x1)/2-tg.x,(b.z0+b.z1)/2-tg.z);if(d>30&&(bd<0||Math.abs(d-85)<Math.abs(bd-85))){best=b;bd=d;}}
        const b=best||roofs[Math.floor(this.rand()*roofs.length)];
        const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,ang=Math.atan2(tg.z-cz,tg.x-cx);
        x=clamp(cx+Math.cos(ang)*((b.x1-b.x0)/2-2.2),b.x0+2,b.x1-2);z=clamp(cz+Math.sin(ang)*((b.z1-b.z0)/2-2.2),b.z0+2,b.z1-2);yy=topOf(b);
      }
    }
    const np=Math.max(1,this.players.size);
    let hp=def.hp*this.hpMul()*(1+0.1*(np-1));   // +10% alien health per extra player
    if(t===4)hp=2200*(1+0.5*(this.round/5-1))*(1+0.5*(np-1));
    if(t===18)hp=2600*(1+0.35*(this.round/13-1))*(1+0.5*(np-1));
    if(t===17)hp=150000*(1+0.5*(this.round/50-1))*(1+0.5*(np-1));
    if(t===12)hp=60000*(1+0.5*(this.round/20-1))*(1+0.5*(np-1));
    const sp=def.sp*(1+Math.min(0.55,0.028*this.round))*(0.9+this.rand()*0.25);
    const al={id:this.nid++,t,x,y:yy,z,yaw:0,hp,mhp:hp,sp,r:def.r,cy:def.cy,
      dmg:def.dmg*(1+0.025*this.round),cd:1+this.rand()*1.5,tT:0,tgt:tg.id,los:false,ph:this.rand()*6.28,rt:0,vx:0,vz:0,vol:0,stomp:4,dorm:false,far:false,dormT:0};
    if(t===14){al.hide=true;al.stT=0;}
    if(this.round>=9&&!def.boss&&!def.loner&&!def.support&&!def.beach&&this.rand()<Math.min(0.28,0.05+0.012*(this.round-9))){
      al.mut=1+Math.floor(this.rand()*3);
      if(al.mut===2){al.hp*=2.6;al.mhp=al.hp;al.sp*=0.85;}
      else if(al.mut===3){al.sp*=1.5;al.hp*=0.8;al.mhp=al.hp;}
    }
    this.aliens.push(al);
    if(t===14)this.push('stalker',al.id,r2(x),r2(z));
    if(t===18)this.push('shark',al.id,r2(x),r2(z));
    if(t===15)this.push('sniper',al.id,r2(x),r2(z));
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
    for(let i=0;i<n&&this.queue.length&&!AT[this.queue[0]].fly&&!AT[this.queue[0]].boss&&!AT[this.queue[0]].support&&!AT[this.queue[0]].loner;i++)list.push(this.queue.shift());
    let k=0;
    for(const ty of list){
      this.spawnAlien(ty,x+(this.rand()-0.5)*14,z+(this.rand()-0.5)*14);
      const a=this.aliens[this.aliens.length-1];
      if(BLOCK[cellOf(a.x,a.z)]){a.x=x;a.z=z;}
      a.dorm=true;a.far=true;a.dormT=55+this.rand()*20;k++;
    }
    if(!this.nested){this.nested=true;this.push('nest');}
  }
  startTel(a,tp,dx,dz,dist,alive){
    const L=dist||1;let tel=[],T=1.8;
    if(a.t===4){tel=[{k:'c',x:tp.x,z:tp.z,r:14}];T=1.7;}                                   // SLAM: lands where you stand
    else if(a.t===12){tel=[{k:'l',x:a.x,z:a.z,dx:dx/L,dz:dz/L,w:9,len:150}];T=2.3;}        // BEAM: a long lane
    else{for(const p of alive){const q=this.targetPos(p);tel.push({k:'c',x:q.x,z:q.z,r:10});for(let i=0;i<2;i++){const an=this.rand()*6.28,rr=8+this.rand()*14;tel.push({k:'c',x:q.x+Math.cos(an)*rr,z:q.z+Math.sin(an)*rr,r:10});}}tel=tel.slice(0,9);T=2.4;}   // METEORS
    a.tel=tel;a.telT=T;a.telD=T;this.push('telwarn',a.t);
  }
  resolveTel(a,alive){
    const dmg=(a.t===4?70:a.t===12?95:85)*(1+0.02*this.round);
    this.push('telhit',a.t,r2(a.x),r2(a.z));
    for(const sh of a.tel){if(sh.k==='c')this.push('blast',r2(sh.x),1,r2(sh.z));}
    for(const p of alive){
      const q=this.targetPos(p);if(p.y-EYE>5)continue;
      let hit=false;
      for(const sh of a.tel){
        if(sh.k==='c'){if(Math.hypot(q.x-sh.x,q.z-sh.z)<sh.r+1)hit=true;}
        else{const rx=q.x-sh.x,rz=q.z-sh.z,al=rx*sh.dx+rz*sh.dz,pe=Math.abs(rx*sh.dz-rz*sh.dx);if(al>0&&al<sh.len&&pe<sh.w/2+1)hit=true;}
      }
      if(hit)this.hurt(p,dmg,a.x,a.z);
    }
  }
  bossDrop(a,killer){
    const all=[...this.players.values()];
    if(a.t===4){      // RESTOCK: full health, ammo, revives, cash
      for(const q of all){if(q.st==='dead')continue;q.st='alive';q.hp=mhp(q);q.bleed=0;q.money+=1000;this.push('ammoall',q.id);}
    }else if(a.t===12){   // a free perk for everyone
      for(const q of all){
        const opts=PERKS.filter(pk=>!q.perks[pk.id]&&(pk.req===undefined||q.perks[pk.req]));
        if(opts.length){const pk=opts[Math.floor(this.rand()*opts.length)];q.perks[pk.id]=true;if(HP_TIERS.includes(pk.id))q.hp=Math.min(mhp(q),q.hp+50);this.push('perk',q.id,pk.id);}
        else q.money+=5000;
      }
    }else if(a.t===17){   // every gun you own goes up a level
      for(const q of all){for(let w=0;w<WPN.length;w++)if(q.wo[w]>=0&&q.wo[w]<MAXUP)q.wo[w]++;this.push('ammoall',q.id);}
    }
    this.push('bossdrop',a.t);
  }
  explode(a){
    a.hp=0;this.push('blast',r2(a.x),r2(a.y+1),r2(a.z));
    for(const p of this.players.values()){
      if(p.st!=='alive')continue;
      const q=this.targetPos(p),d=Math.hypot(q.x-a.x,q.z-a.z);
      if(d<10&&p.y-EYE<6)this.hurt(p,a.dmg*(1-d/14),a.x,a.z);
    }
  }
  updateSniper(a,tp0,tp,dx,dz,dist,dt){
    a.vx=a.vz=0;
    const my=a.y+1.8,py=Math.max(0.8,tp0.y-EYE*0.5)+(tp.car?0.5:0);
    const ox=a.x+dx/(dist||1)*2.8,oz=a.z+dz/(dist||1)*2.8;      // the rifle barrel sticks out past the roof edge
    const ex=tp.x-ox,ez=tp.z-oz,dl=Math.hypot(ex,py-my,ez)||1;
    const clear=dist<175&&rayWorld(ox,my,oz,ex/dl,(py-my)/dl,ez/dl,dl)>=dl-1.0;
    if(a.aim>0){
      a.aim-=dt;
      if(!clear&&a.aim>0.3){a.aim=0;a.cd=1.5;return;}          // lost sight: cancel the shot
      if(a.aim<=0){
        const hit=clear&&Math.hypot(tp.x-a.ax,tp.z-a.az)<5;       // keep moving and the shot misses
        this.push('snipe',a.id,r2(tp.x),r2(py),r2(tp.z),hit?1:0);
        if(hit)this.hurt(tp0,a.dmg,a.x,a.z);
        a.cd=4.2;
      }
    }else if(a.cd<=0&&clear){a.aim=1.3;a.ax=tp.x;a.az=tp.z;this.push('aim',a.id,tp0.id,1.3);}
  }
  targetPos(p){
    if(p.car>=0){const c=this.cars.find(c=>c.id===p.car);if(c)return{x:c.x,z:c.z,y:1+(c.y||0),car:c};}
    return{x:p.x,z:p.z,y:p.y-EYE,car:null};
  }
  hurt(p,dmg,sx,sz){
    if(p.st!=='alive')return;
    if(p.car>=0){
      const c=this.cars.find(c=>c.id===p.car);
      if(c){
        c.hp-=dmg*0.8;this.push('carhit',p.id,sx===undefined?0:r2(sx),sz===undefined?0:r2(sz),sx===undefined?0:1);
        if(c.hp<=0){
          this.push('boom',r2(c.x),2,r2(c.z),99,0);
          p.car=-1;p.hp-=25;this.cars.splice(this.cars.indexOf(c),1);
          p.x=c.x+3;p.z=c.z;this.push('tp',p.id,r2(p.x),r2(p.z));
          this.push('hurt',p.id,25);
          if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;p.dn=(p.dn|0)+1;}
        }
        return;
      }
    }
    if(p.perks&&p.perks[6])dmg*=0.75;
    p.hp-=dmg;p.lastHit=this.time;p.dt=(p.dt||0)+dmg;
    this.push('hurt',p.id,Math.round(dmg),sx===undefined?0:r2(sx),sz===undefined?0:r2(sz),sx===undefined?0:1);
    if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;p.car=-1;p.dn=(p.dn|0)+1;this.push('down',p.id);}
  }
  fireOrb(a,tx,ty,tz,spread,speed,dmg){
    let ox=a.x,oy=a.y+a.cy+(a.t===4?1.5:0.4),oz=a.z;
    if(a.t===12||a.t===17){const hl=Math.hypot(tx-a.x,tz-a.z)||1;ox+=(tx-a.x)/hl*13;oz+=(tz-a.z)/hl*13;oy=a.y+30;}
    let dx=tx-ox,dy=ty-oy,dz=tz-oz;const l=Math.hypot(dx,dy,dz)||1;
    dx/=l;dy/=l;dz/=l;
    dx+=(this.rand()-0.5)*spread;dz+=(this.rand()-0.5)*spread;dy+=(this.rand()-0.5)*spread*0.5;
    const l2=Math.hypot(dx,dy,dz);
    this.orbs.push({id:this.nid++,x:ox,y:oy,z:oz,vx:dx/l2*speed,vy:dy/l2*speed,vz:dz/l2*speed,life:5,dmg,big:(a.t===4||a.t===12||a.t===17)?1:(a.t===19?2:0)});
  }

  /* ---- main tick ---- */
  tick(dt){
    if(!this.players.size)return;
    dt=Math.min(dt,0.1);
    this.time+=dt;
    const plist=[...this.players.values()];

    // player upkeep
    for(const p of plist){
      if(p.st==='alive'&&p.hp<mhp(p)&&this.time-p.lastHit>5)p.hp=Math.min(mhp(p),p.hp+28*dt);
      if(p.st==='down'){
        if(this.state!=='rest')p.bleed-=dt;
        let reviving=false;
        for(const q of plist){
          if(q.id!==p.id&&q.st==='alive'&&q.rvTarget===p.id&&this.time-q.rvT<0.35&&Math.hypot(q.x-p.x,q.z-p.z)<5)reviving=true;
        }
        p.rvProg=reviving?p.rvProg+dt*(plist.some(q=>q.id!==p.id&&q.st==='alive'&&q.rvTarget===p.id&&q.perks[1])?2:1):Math.max(0,p.rvProg-dt*2);
        if(p.rvProg>=3){const rvr=plist.find(q=>q.id!==p.id&&q.st==='alive'&&q.rvTarget===p.id);if(rvr)rvr.rvd=(rvr.rvd|0)+1;p.st='alive';p.hp=55;p.rvProg=0;p.lastHit=this.time;this.push('revived',p.id);}
        else if(p.bleed<=0&&this.state!=='rest'){p.st='dead';p.oc=0;this.push('died',p.id);}
      }
    }

    for(const p of plist){
      if(p.st!=='alive')continue;
      const dc=p.car>=0?this.cars.find(c=>c.id===p.car):null;
      for(let i=0;i<LOOT.length;i++){
        if(!this.loot[i])continue;const l=LOOT[i];
        if(dc){if(Math.abs(l.x-dc.x)<3.6&&Math.abs(l.z-dc.z)<3.6&&Math.abs((dc.y||0)+1-(l.y-0.9))<3.2){this.loot[i]=false;this.pickLoot(p,l);}}   // grab loot while driving
        else if(Math.abs(l.x-p.x)<2.3&&Math.abs(l.z-p.z)<2.3&&Math.abs((p.y-EYE)-(l.y-0.9))<2.4){this.loot[i]=false;this.pickLoot(p,l);}
      }
    }

    if(this.state==='rest'){
      if(!this.sides)this.sides=this.pickSides();
      this.timer-=dt;
      if(this.timer<=0)this.startRound();
    }else if(this.state==='over'){
      this.timer-=dt;
      if(this.timer<=0)this.resetGame();
    }else if(this.state==='fight'){
      this.spawnT-=dt;
      const cap=Math.min(48,22+6*(plist.length-1));
      while(this.queue.length&&this.aliens.length<cap&&this.spawnT<=0){
        const nt=this.queue.shift();
        if(this.round>=1&&!AT[nt].fly&&!AT[nt].boss&&!AT[nt].support&&!AT[nt].loner&&this.rand()<0.22)this.spawnFarGroup(nt);else this.spawnAlien(nt);
        this.spawnT=Math.max(0.3,1.0-this.round*0.03)*Math.min(1,0.45+0.1*this.round);
      }
      if(!this.queue.length&&!this.aliens.length)this.endRound();
      else if(plist.every(p=>p.st!=='alive')){
        this.state='over';this.timer=14;
        this.best=Math.max(this.best,this.round);
        this.push('over',this.round);
        this.report(plist);
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
    this.updateFx(dt);

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
      if(def.sniper){this.updateSniper(a,tp0,tp,dx,dz,dist,dt);continue;}
      if(def.stalker&&a.hide){   // hiding: stands still until someone gets close (or 2.5 minutes pass)
        a.stT=(a.stT||0)+dt;a.vx=a.vz=0;
        if(dist<12||a.stT>150){a.hide=false;this.push('stalk',a.id);}
        continue;
      }
      let mx=0,mz=0,speed=a.sp;
      if(def.stalker)speed=(a.enr||dist<16)?a.sp*2.0:a.sp;
      if(def.beach){   // the shark prowls the sand and lunges at anyone who comes onto the beach
        const onBeach=tp.z>HALF+6&&!tp.car;
        let gx,gz,sp2;
        if(onBeach&&dist<110){gx=tp.x;gz=tp.z;sp2=speed;}
        else{
          if(a.px===undefined||Math.abs(a.x-a.px)<8)a.px=(this.rand()-0.5)*280;
          gx=a.px;gz=HALF+38;sp2=speed*0.35;
        }
        const gl=Math.hypot(gx-a.x,gz-a.z)||1;
        a.vx+=((gx-a.x)/gl*sp2-a.vx)*Math.min(1,dt*5);a.vz+=((gz-a.z)/gl*sp2-a.vz)*Math.min(1,dt*5);
        a.x+=a.vx*dt;a.z+=a.vz*dt;
        a.z=clamp(a.z,HALF+16,HALF+62);
        a.yaw=Math.atan2(gx-a.x,gz-a.z);
      }else if(def.fly){
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
          const keep=(a.t===12||a.t===17)?4:30;
          if(a.los&&dist<keep+8)want=dist<keep-10?-0.6:0;
        }
        if(want!==0){
          let dirx=dx/dist,dirz=dz/dist;
          if(!(a.los&&dist<45)||want<0){
            const f=def.giant?null:this.flows.get(a.tgt);
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
        if(!def.giant)pushOut(a,Math.min(a.r,1.8));
      }
      a.x=clamp(a.x,BOUNDS.x0,BOUNDS.x1);a.z=clamp(a.z,BOUNDS.z0,BOUNDS.z1);

      // attacks
      const melee=(def.fly&&!def.ranged)||(!def.ranged&&!def.support)||def.boss;
      if(melee){
        const reach=a.r+(def.fly?1.6:1.4);
        const dy=def.fly?Math.abs(a.y-(tp0.y-EYE*0.5)):0;
        if(dist<reach+(tp.car?1.8:0.4)&&dy<4&&a.cd<=0&&(def.fly||tp0.y-EYE<6)){
          a.cd=def.fly?1.1:(def.biter?0.55:0.9);
          if(def.bomb){this.explode(a);a.cd=9;}
          else this.hurt(tp0,a.dmg,a.x,a.z);
        }
      }
      if(def.ranged&&a.cd<=0&&dist<60){
        const ty=tp0.y-EYE*0.35;
        let seen=a.los;
        if(def.fly){const d3=Math.hypot(dx,a.y+0.5-ty,dz)||1;seen=rayWorld(a.x,a.y+0.5,a.z,dx/d3,(ty-a.y-0.5)/d3,dz/d3,d3)>=d3-0.5;}
        if(seen){
          if(a.t===17){
            a.cd=2.2;
            for(let i=-4;i<=4;i++){
              const ang=Math.atan2(dx,dz)+i*0.11;
              this.fireOrb(a,a.x+Math.sin(ang)*60,ty,a.z+Math.cos(ang)*60,0.04,50,30*(1+0.03*this.round));
            }
          }else if(a.t===12){
            a.cd=2.8;
            for(let i=-3;i<=3;i++){
              const ang=Math.atan2(dx,dz)+i*0.13;
              this.fireOrb(a,a.x+Math.sin(ang)*60,ty,a.z+Math.cos(ang)*60,0.04,46,26*(1+0.03*this.round));
            }
          }else if(a.t===4){
            a.cd=3.0;
            for(let i=-2;i<=2;i++){
              const ang=Math.atan2(dx,dz)+i*0.16;
              this.fireOrb(a,a.x+Math.sin(ang)*30,ty,a.z+Math.cos(ang)*30,0.04,42,20*(1+0.03*this.round));
            }
          }else if(a.t===19){      // PIZZA ALIEN: lobs pizzas
            a.cd=1.5+this.rand()*0.6;
            this.fireOrb(a,tp.x,ty,tp.z,0.05,32,a.dmg);
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
      if(def.boss){   // telegraphed special attack: red zones show where it will land
        if(a.tel){
          a.telT-=dt;
          if(a.telT<=0){this.resolveTel(a,alive);a.tel=null;a.atkT=a.t===4?7:a.t===12?9:11;}
        }else{
          a.atkT=(a.atkT===undefined?4:a.atkT)-dt;
          if(a.atkT<=0&&dist<130)this.startTel(a,tp,dx,dz,dist,alive);
        }
      }
      if(def.stomp){ // shockwave
        a.stomp-=dt;
        const R=def.stomp;
        if(a.stomp<=0&&dist<R){a.stomp=6;this.push('stomp',r2(a.x),r2(a.z));
          for(const p of alive){const q=this.targetPos(p);if(Math.hypot(q.x-a.x,q.z-a.z)<R&&p.y<5)this.hurt(p,a.t===17?95:a.t===12?70:a.t===4?35:30,a.x,a.z);}}
      }
      if(def.summon){ // the Overmind calls its swarm
        a.sumT=(a.sumT===undefined?4:a.sumT)-dt;
        if(a.sumT<=0&&this.aliens.length<46){a.sumT=13;this.push('summon',r2(a.x),r2(a.z));
          const kinds=[0,2,5,13,3,16];for(let i=0;i<7;i++){const ang=i/7*6.283,rr=20+this.rand()*8;this.spawnAlien(kinds[i%kinds.length],a.x+Math.cos(ang)*rr,a.z+Math.sin(ang)*rr);}}
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
          if(a.t!==4&&a.t!==12){a.x-=nx;a.z-=nz;}
          if(b.t!==4&&b.t!==12){b.x+=nx;b.z+=nz;}
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
        if(Math.hypot(o.x-tp.x,o.z-tp.z)<hr&&Math.abs(o.y-(tp.car?1.2+(tp.car.y||0):p.y-EYE*0.5))<(tp.car?2.2:2.0)){
          this.hurt(p,o.dmg,o.x-o.vx*0.3,o.z-o.vz*0.3);dead=true;break;
        }
      }
      if(dead)this.orbs.splice(i,1);
    }
  }

  updateFx(dt){
    if(this.weather&&this.state==='fight'){
      this.wxT+=dt;
      const alive=[...this.players.values()].filter(p=>p.st==='alive');
      if(this.weather===1){   // acid rain: stay inside a building or a car
        this.acidT=(this.acidT||0)-dt;
        if(this.acidT<=0){this.acidT=1;for(const p of alive){if(p.car>=0)continue;if(inBuilding(p.x,p.z,0.5)&&p.y<30)continue;this.hurt(p,4+this.round*0.15);}}
      }else if(this.weather===3&&alive.length){   // lightning storm
        this.boltT=(this.boltT||0)-dt;
        if(this.boltT<=0){this.boltT=2.4-Math.min(1.2,this.round*0.03);
          const p=alive[Math.floor(this.rand()*alive.length)],a=this.rand()*6.28,d=this.rand()*14;
          const bx=p.x+Math.cos(a)*d,bz=p.z+Math.sin(a)*d;
          this.bolts.push({x:bx,z:bz,t:1.1});this.push('bolt',r2(bx),r2(bz));}
      }
    }
    for(let i=this.bolts.length-1;i>=0;i--){
      const b=this.bolts[i];b.t-=dt;
      if(b.t<=0){this.bolts.splice(i,1);
        this.push('strike',r2(b.x),r2(b.z));
        for(const p of this.players.values()){if(p.st!=='alive')continue;const q=this.targetPos(p);if(Math.hypot(q.x-b.x,q.z-b.z)<7)this.hurt(p,38+this.round*0.5);}
        for(const a of this.aliens){if(Math.hypot(a.x-b.x,a.z-b.z)<8&&a.hp>0&&!AT[a.t].giant){a.hp-=Math.max(250,a.mhp*0.4);if(a.hp<=0){const o=[...this.players.values()][0];if(o)this.killAlien(a,o);}}}
      }
    }
    for(let i=this.clouds.length-1;i>=0;i--){
      const cl=this.clouds[i];cl.life-=dt;
      const o=this.players.get(cl.own);
      if(cl.life<=0||!o){this.clouds.splice(i,1);continue;}
      cl.tk-=dt;
      if(cl.tk<=0){cl.tk=0.5;
        for(const a of this.aliens.slice()){
          if(a.hp<=0)continue;
          if(Math.hypot(a.x-cl.x,a.z-cl.z)<cl.r+a.r*0.6&&a.y<cl.y+cl.r+4)this.damageAlien(a,cl.dps*0.5,o,a.x,a.y+a.cy,a.z);
        }
      }
    }
    for(const a of this.aliens.slice()){
      if(!(a.burn>0)||a.hp<=0)continue;
      a.burn-=dt;a.burnT=(a.burnT||0)-dt;
      if(a.burnT<=0){a.burnT=0.5;const o=this.players.get(a.burnOwn);if(o)this.damageAlien(a,a.burnD*0.5,o,a.x,a.y+a.cy,a.z);}
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
      const cdef=CARS[c.t];
      if(Math.abs(c.sp)>5&&cdef.ram>0){
        for(const a of this.aliens){
          if(a.hp<=0||a.rt>0)continue;
          if(Math.hypot(a.x-c.x,a.z-c.z)<a.r+cdef.rad+0.1&&a.y<5){
            const df=AT[a.t],huge=!!df.giant,big=df.r>2.5;
            a.rt=huge?0.7:0.45;
            this.damageAlien(a,Math.abs(c.sp)*(huge?9:big?4:8)*cdef.ram,p,a.x,a.y+a.cy,a.z);
            c.hp-=huge?35:big?10:3;
            this.push('thud',r2(a.x),r2(a.z));
          }
        }
        if(c.hp<=0){
          this.push('boom',r2(c.x),2,r2(c.z),99,0);
          p.car=-1;p.hp-=25;this.cars.splice(i,1);p.x=c.x+3;p.z=c.z;this.push('tp',p.id,r2(p.x),r2(p.z));
          if(p.hp<=0){p.hp=0;p.st='down';p.bleed=25;p.dn=(p.dn|0)+1;}
        }
      }
    }
  }

  snapshot(){
    const ev=this.ev;this.ev=[];
    return{
      t:'snap',tm:r2(this.time),
      rd:{sd:(this.sides&&(this.state==='rest'||this.state==='fight'))?this.sides.map(r2):0,w:this.weather|0,tp:this.tapes|0,h:Math.min(...this.players.keys()),n:this.round,s:this.state,tm:Math.max(0,Math.round(this.timer*10)/10),left:this.queue.length+this.aliens.length,best:this.best},
      p:[...this.players.values()].map(p=>({id:p.id,n:p.name,c:p.color,x:r2(p.x),y:r2(p.y),z:r2(p.z),yw:r2(p.yaw),pt:r2(p.pitch),
        hp:Math.round(p.hp),mh:mhp(p),pk:p.perks.reduce((m,v,i)=>m|(v?1<<i:0),0),st:p.st,m:p.money,k:p.kills,lv:p.lv,sk:p.sk,wo:p.wo,w:p.w,jo:p.jet?1:0,jl:p.jl|0,oc:p.oc|0,j:p.jfl,car:p.car,rp:r2(p.rvProg),bl:r2(p.bleed),dd:Math.round(p.dd||0),rv:p.rvd|0,dn:p.dn|0,bk:p.bk|0})),
      a:this.aliens.map(a=>[a.id,a.t,r2(a.x),r2(a.y),r2(a.z),r2(a.yaw),Math.max(0,Math.round(a.hp/a.mhp*100)),Math.round(a.vx*10)/10,a.dorm?1:0,a.burn>0?1:0,a.hide?1:0,a.mut|0,a.tel?{T:r2(a.telT),D:a.telD,s:a.tel.map(q=>q.k==='c'?[0,r2(q.x),r2(q.z),q.r]:[1,r2(q.x),r2(q.z),r2(q.dx),r2(q.dz),q.w,q.len])}:0]),
      o:this.orbs.map(o=>[o.id,r2(o.x),r2(o.y),r2(o.z),o.big]),
      c:this.cars.map(c=>({id:c.id,t:c.t,x:r2(c.x),z:r2(c.z),h:r2(c.h),hp:Math.round(c.hp),d:c.drv,sp:r2(c.sp||0),k:c.k|0,y:r2(c.y||0)})),
      g:this.clouds.map(c=>[c.id,r2(c.x),r2(c.y),r2(c.z),r2(c.r),r2(c.life)]),
      lo:this.loot.map(v=>v?1:0).join(''),
      ev
    };
  }
}

const API={PERKS,mhp,PADS,MAXLV,xpNeed,SKINS,CSKINS,GARAGE_ITEMS,MAXUP,UPCOST,AMMO_ALL,newWo,EYE,clamp,mulberry32,N,P,HALF,BOUNDS,PLAYER_COLORS,WPN,DMG_MULT,MAG_MULT,UP_COST,AMMO_COST,CARS,AT,
  genWorld,DISTRICTS,distAt,SEED,WORLD,B,LOOT,HOUSES,JET_COST,MBOX_COST,JET_UP,jetMax,topOf,groundAt,ceilAt,STATIONS:SHOP,GARAGE_SPAWNS,pushOut,inBuilding,rayWorld,raySphere,spreadDirs,BLOCK,cellOf,buildFlow,flowStep,Game};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.NI=API;
})(typeof self!=='undefined'?self:this);
