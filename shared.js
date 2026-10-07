/* NEON SHORES: INVASION - shared simulation.
   Runs on the Node server (online) AND inside the browser (solo). */
(function(root){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HELI_RECHARGE=5;   // seconds landed and still to refill the gunship
const SPEED_CAP=15;   // top speed for every alien, whatever the round or mutation
function soft(v,k,s){return v<=k?v:k+(v-k)*s;}   // linear up to k, then keeps climbing at a slower slope (never a hard cap)
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const r2=v=>Math.round(v*100)/100;

/* ---------------- constants ---------------- */
const EYE=2.9;                 // player eye height
const N=8,P=88,HALF=(N/2)*P;
const BOUNDS={x0:-HALF-10,x1:HALF+10,z0:-HALF-10,z1:HALF+64};
const PLAYER_COLORS=[0xff2fa0,0x25f4ff,0xfff3b0,0xa56bff,0x3cff9e,0xff9a3c,0xffffff,0x8fd3ff];

/* weapons: colored laser guns */
const WPN=[
  {id:0,name:'FLAMINGO',  kind:'PINK LASER PISTOL',   color:0xff2fa0,dmg:30, rate:4.6, mag:12, res:120,cost:0,   pellets:1,spread:0.004,pierce:1,reload:1.1,auto:false,tag:'ACCURATE SIDEARM - no tricks, never runs out'},
  {id:1,name:'AQUA-9',    kind:'CYAN LASER SMG',      color:0x25f4ff,dmg:17, rate:13,  mag:24, res:120,cost:3200,pellets:1,spread:0.02, pierce:1,reload:1.4,auto:true,chain:1,tag:'CHAIN LIGHTNING - hits arc to a nearby alien'},
  {id:2,name:'SUNSET',    kind:'ORANGE LASER SHOTGUN',color:0xff9a3c,dmg:20, rate:1.5, mag:6,  res:54, cost:1500,pellets:8,spread:0.07, pierce:1,reload:2.0,auto:false,falloff:1,tag:'POINT-BLANK - huge up close, weak at range'},
  {id:3,name:'VIOLET RAIL',kind:'PURPLE PIERCING RAIL',color:0xa56bff,dmg:170,rate:1.2, mag:8,  res:56, cost:2500,pellets:1,spread:0.0,  pierce:4,reload:1.8,auto:false,ramp:1,tag:'ARMOR PIERCER - every alien it passes through takes MORE'},
  {id:4,name:'LIME STORM',kind:'GREEN LASER MINIGUN', color:0x3cff9e,dmg:24, rate:11,  mag:90, res:450,cost:3500,pellets:1,spread:0.03, pierce:1,reload:2.4,auto:true,slow:1,tag:'SUPPRESSION - hits slow aliens down'},
  {id:5,name:'LONGSHOT',  kind:'BLUE LASER SCOPE RIFLE',color:0x3c8cff,dmg:230,rate:0.95,mag:5,  res:40, cost:3000,pellets:1,spread:0,   pierce:3,reload:2.3,auto:false,range:420,scope:true,far:1,tag:'SNIPER - damage grows with distance'},
  {id:6,name:'ARC GATLING',kind:'RED CHARGE-UP MINIGUN',color:0xff3c4c,dmg:13, rate:20,  mag:180,res:720,cost:7000,pellets:1,spread:0.04,pierce:1,reload:3.0,auto:true,charge:0.9,spin:1,tag:'SPIN-UP - damage ramps the longer you hold fire'},
  {id:7,name:'NEON STARS',kind:'GOLD THROWING STARS', color:0xffd23c,dmg:55, rate:3.2, mag:12, res:96, cost:2000,pellets:1,spread:0.006,pierce:5,reload:1.2,auto:false,range:90,proj:'star',bounce:1,tag:'RICOCHET - stars bounce between aliens'},
  {id:8,name:'INFERNO',   kind:'FLAMETHROWER',        color:0xff5a1a,dmg:7,  rate:18,  mag:100,res:500,cost:3800,pellets:3,spread:0.13, pierce:6,reload:2.2,auto:true,range:24,flame:true,burn:true,tag:'BURN - sets aliens on fire'},
  {id:9,name:'TOXIC SPRAYER',kind:'GAS CLOUD LAUNCHER',color:0xb6ff1c,dmg:30, rate:1.4, mag:6,  res:36, cost:4500,pellets:1,spread:0.01, pierce:1,reload:2.0,auto:false,range:75,gas:true,tag:'POISON CLOUD - area damage over time'},
  {id:10,name:'BRASS KNUCKLES',kind:'CLOSE-RANGE PUNCHERS',color:0xffc83c,dmg:90,rate:3.2,mag:999,res:0,  cost:800, pellets:1,spread:0.08,pierce:3,reload:0,auto:true,range:4.3,melee:true,tag:'MELEE - massive close damage, unlimited'},
  {id:11,name:'MINI-BOMBER',kind:'MINI BOMB LAUNCHER',color:0xff3cf0,dmg:62,rate:2.2,mag:8,res:56,cost:5500,pellets:1,spread:0.008,pierce:1,reload:2.2,auto:false,range:110,br:5,tag:'EXPLOSIVES - mini blasts hurt everything nearby'}
];
WPN[0].upm=0.5;WPN[1].upm=0.8;WPN[10].upm=0.6;WPN[7].upm=0.8;
/* ---- levels & gun skins (profile is stored in the player's browser) ---- */
const MAXLV=100;
const xpNeed=L=>400+120*(L-1)+(L>50?8*(L-50)*(L-50):0);          // XP needed to go from level L to L+1
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
/* ---- character customizer: Vice City styles unlocked by level (picked in the locker, shown to teammates) ---- */
const CH_SUITS=[
  {id:0,name:'TEAM COLOR',      lvl:1, col:null,   c:'#ff2fa0'},
  {id:1,name:'FLAMINGO PINK',   lvl:2, col:0xff5fb0,c:'#ff5fb0'},
  {id:2,name:'MIAMI TEAL',      lvl:4, col:0x1fd6c4,c:'#1fd6c4'},
  {id:3,name:'SUNSET ORANGE',   lvl:7, col:0xff8a3c,c:'#ff8a3c'},
  {id:4,name:'OCEAN DRIVE BLUE',lvl:10,col:0x2f8bff,c:'#2f8bff'},
  {id:5,name:'PALM GREEN',      lvl:13,col:0x2fd86a,c:'#2fd86a'},
  {id:6,name:'LAVENDER HAZE',   lvl:17,col:0xb58cff,c:'#b58cff'},
  {id:7,name:'LAMBO WHITE',     lvl:22,col:0xf4f4ff,c:'#f4f4ff'},
  {id:8,name:'GOLD CHAIN',      lvl:28,col:0xffc83c,c:'#ffc83c'},
  {id:9,name:'MIDNIGHT NEON',   lvl:35,col:0x1a1040,glow:0x25f4ff,c:'#25f4ff'},
  {id:10,name:'VICE RAINBOW',   lvl:45,col:'rainbow',c:'#ff9a3c'}
];
const CH_HATS=[
  {id:0,name:'NO HAT',          lvl:1, c:'#4b3a7a'},
  {id:1,name:'PANAMA HAT',      lvl:2, c:'#e8d29a'},
  {id:2,name:'FEDORA',          lvl:5, c:'#d9c7a0'},
  {id:3,name:'PINK HEADBAND',   lvl:8, c:'#ff2fa0'},
  {id:4,name:'SAILOR CAP',      lvl:11,c:'#ffffff'},
  {id:5,name:'BUCKET HAT',      lvl:15,c:'#5fe3d6'},
  {id:6,name:'VICE TRUCKER CAP',lvl:19,c:'#ff7ab8'},
  {id:7,name:"CAPTAIN'S CAP",   lvl:24,c:'#f6f6ff'},
  {id:8,name:'PALM CROWN',      lvl:30,c:'#2fd86a'},
  {id:9,name:'FLAMINGO FLOATIE',lvl:38,c:'#ff5fb0'},
  {id:10,name:'NEON CROWN',     lvl:48,c:'#ffd23c'}
];
const CH_SHADES=[
  {id:0,name:'NO SHADES',       lvl:1, c:'#4b3a7a'},
  {id:1,name:'AVIATORS',        lvl:3, c:'#3a3a48'},
  {id:2,name:'PINK WAYFARERS',  lvl:6, c:'#ff2fa0'},
  {id:3,name:'ROUND LENNONS',   lvl:9, c:'#25c8ff'},
  {id:4,name:'SUNSET VISOR',    lvl:14,c:'#ff8a3c'},
  {id:5,name:'HEART SHADES',    lvl:20,c:'#ff3c6a'},
  {id:6,name:'NEON BAR',        lvl:27,c:'#25f4ff'},
  {id:7,name:'GOLD AVIATORS',   lvl:36,c:'#ffd23c'},
  {id:8,name:'RAINBOW LENSES',  lvl:44,c:'#a56bff'}
];
const CH_SHIRTS=[
  {id:0,name:'TANK TOP',        lvl:1, kind:'none',    base:'#4b3a7a'},
  {id:1,name:'PALM PARADISE',   lvl:2, kind:'palm',    base:'#1fb6c8',c2:'#0b6a4a',c3:'#ffffff'},
  {id:2,name:'HIBISCUS RED',    lvl:5, kind:'hibiscus',base:'#ffffff',c2:'#ff2f4f',c3:'#ffd23c'},
  {id:3,name:'FLAMINGO PARTY',  lvl:8, kind:'flamingo',base:'#fff3f8',c2:'#ff5fb0',c3:'#ff2fa0'},
  {id:4,name:'SUNSET GRID',     lvl:12,kind:'sunset',  base:'#3b1470',c2:'#ff3f8f',c3:'#ffb347'},
  {id:5,name:'OCEAN WAVES',     lvl:16,kind:'waves',   base:'#0e4f8a',c2:'#25f4ff',c3:'#ffffff'},
  {id:6,name:'PARROT JUNGLE',   lvl:21,kind:'parrot',  base:'#0f7a4a',c2:'#ff3f4f',c3:'#ffd23c'},
  {id:7,name:'MIAMI STRIPES',   lvl:26,kind:'stripes', base:'#ff8fc8',c2:'#ff8fc8',c3:'#5fe3d6'},
  {id:8,name:'GOLD PALMS',      lvl:32,kind:'palm',    base:'#14101c',c2:'#ffc83c',c3:'#ffc83c'},
  {id:9,name:'VICE SUNSET',     lvl:40,kind:'sunset',  base:'#0b1b5a',c2:'#ff2fa0',c3:'#ffe63c'},
  {id:10,name:'LEGEND FLORAL',  lvl:46,kind:'hibiscus',base:'#14101c',c2:'#25f4ff',c3:'#ff2fa0'}
];
const CH_JACKETS=[
  {id:0,name:'NO JACKET',        lvl:1, c:'#4b3a7a'},
  {id:1,name:'WHITE LINEN BLAZER',lvl:3, col:0xf6f2e6,trim:0xdddddd,c:'#f6f2e6'},
  {id:2,name:'PASTEL PINK BLAZER',lvl:7, col:0xffa8d2,trim:0xff6fb2,c:'#ffa8d2'},
  {id:3,name:'MIAMI TEAL BLAZER', lvl:11,col:0x3fe0cf,trim:0xf4f4ff,c:'#3fe0cf'},
  {id:4,name:'ORANGE BOMBER',    lvl:15,col:0xff8a3c,trim:0x222233,c:'#ff8a3c'},
  {id:5,name:'LETTERMAN',        lvl:19,col:0x2f4bff,trim:0xffffff,c:'#2f4bff',kind:'letter'},
  {id:6,name:'NEON TRACK JACKET',lvl:23,col:0x14102a,trim:0x25f4ff,glow:1,c:'#25f4ff'},
  {id:7,name:'LEOPARD COAT',     lvl:29,col:0xd89a3c,trim:0x3a2210,kind:'leopard',c:'#d89a3c'},
  {id:8,name:'CHROME JACKET',    lvl:34,col:0xc8d0e0,trim:0xffffff,glow:1,c:'#c8d0e0'},
  {id:9,name:'SUNSET SATIN',     lvl:42,col:0xff3f8f,trim:0xffb347,c:'#ff3f8f'},
  {id:10,name:'GOLD TUXEDO',     lvl:49,col:0xffc83c,trim:0x15101c,glow:1,c:'#ffc83c'}
];
const CH_CHAINS=[
  {id:0,name:'NO CHAIN',        lvl:1, c:'#4b3a7a'},
  {id:1,name:'GOLD CHAIN',      lvl:2, col:0xffc83c,pend:'',c:'#ffc83c'},
  {id:2,name:'DOUBLE GOLD',     lvl:8, col:0xffc83c,pend:'double',c:'#ffd86a'},
  {id:3,name:'PINK HEART',      lvl:14,col:0xff2fa0,pend:'heart',c:'#ff2fa0'},
  {id:4,name:'DOLLAR COIN',     lvl:20,col:0xffc83c,pend:'coin',c:'#ffe27a'},
  {id:5,name:'FLAMINGO CHARM',  lvl:27,col:0xff5fb0,pend:'flamingo',c:'#ff5fb0'},
  {id:6,name:'PALM TREE',       lvl:33,col:0x2fd86a,pend:'palm',c:'#2fd86a'},
  {id:7,name:'DIAMOND ICE',     lvl:40,col:0xdff6ff,pend:'diamond',c:'#dff6ff'},
  {id:8,name:'NEON TUBE',       lvl:47,col:0x25f4ff,pend:'neon',glow:1,c:'#25f4ff'}
];
const CH_SHOES=[
  {id:0,name:'BAREFOOT',        lvl:1, c:'#4b3a7a'},
  {id:1,name:'WHITE SNEAKERS',  lvl:2, up:0xf4f4ff,sole:0xdddddd,c:'#f4f4ff'},
  {id:2,name:'PINK HIGH-TOPS',  lvl:6, up:0xff5fb0,sole:0xffffff,hi:1,c:'#ff5fb0'},
  {id:3,name:'JELLY SANDALS',   lvl:10,up:0x5fe3d6,sole:0x5fe3d6,kind:'sandal',c:'#5fe3d6'},
  {id:4,name:'ROLLER SKATES',   lvl:16,up:0xff2fa0,sole:0xffffff,kind:'skate',c:'#ff2fa0'},
  {id:5,name:'FLIP FLOPS',      lvl:21,up:0xffe63c,sole:0xff8a3c,kind:'sandal',c:'#ffe63c'},
  {id:6,name:'NEON RUNNERS',    lvl:26,up:0x14102a,sole:0x25f4ff,glow:1,c:'#25f4ff'},
  {id:7,name:'GOLD KICKS',      lvl:33,up:0xffc83c,sole:0xffffff,hi:1,c:'#ffc83c'},
  {id:8,name:'ALIEN STOMPERS',  lvl:41,up:0x3cff9e,sole:0x1a3a2a,big:1,c:'#3cff9e'},
  {id:9,name:'ROCKET BOOTS',    lvl:47,up:0xc8d0e0,sole:0x444455,kind:'rocket',c:'#ff9a3c'}
];
const CH_FACES=[
  {id:0,name:'CLEAN FACE',      lvl:1, c:'#4b3a7a'},
  {id:1,name:'VICE MUSTACHE',   lvl:4, kind:'stache',c:'#3a2210'},
  {id:2,name:'HEADPHONES',      lvl:12,kind:'phones',col:0xff2fa0,c:'#ff2fa0'},
  {id:3,name:'GOLD HOOP',       lvl:17,kind:'hoop',c:'#ffc83c'},
  {id:4,name:'NEON FACE PAINT', lvl:22,kind:'paint',c:'#25f4ff'},
  {id:5,name:'BANDANA MASK',    lvl:28,kind:'bandana',c:'#ff2040'},
  {id:6,name:'DIAMOND GRILL',   lvl:35,kind:'grill',c:'#dff6ff'},
  {id:7,name:'ALIEN ANTENNAE',  lvl:43,kind:'antenna',c:'#3cff9e'}
];
const CH_BACKS=[
  {id:0,name:'NOTHING',         lvl:1, c:'#4b3a7a'},
  {id:1,name:'SURFBOARD',       lvl:5, kind:'surf',c:'#25f4ff'},
  {id:2,name:'BOOMBOX',         lvl:13,kind:'boombox',c:'#ff2fa0'},
  {id:3,name:'PALM BACKPACK',   lvl:18,kind:'pack',c:'#2fd86a'},
  {id:4,name:'ROCKET PACK',     lvl:25,kind:'rocket',c:'#ff9a3c'},
  {id:5,name:'PINK CAPE',       lvl:31,kind:'cape',col:0xff5fb0,c:'#ff5fb0'},
  {id:6,name:'ANGEL WINGS',     lvl:37,kind:'wings',col:0xffffff,c:'#f4f4ff'},
  {id:7,name:'NEON WINGS',      lvl:44,kind:'wings',col:0x25f4ff,glow:1,c:'#25f4ff'},
  {id:8,name:'GOLD CAPE',       lvl:50,kind:'cape',col:0xffc83c,glow:1,c:'#ffc83c'}
];
const CH_LISTS=[CH_SUITS,CH_HATS,CH_SHADES,CH_SHIRTS,CH_JACKETS,CH_CHAINS,CH_SHOES,CH_FACES,CH_BACKS];
/* ---------------- titles, badges, name colours, frames, camos, kill effects, achievements ----------------
   Every item opens by level (lvl) or by an achievement (ach = achievement id). Items with an ach are EARNED-ONLY. */
CH_HATS.push({id:11,name:'MEDIC CAP',lvl:999,ach:'rv10',c:'#ff2f4f'},{id:12,name:'BOSS HORNS',lvl:999,ach:'bo10',c:'#ff2040'});
CH_SUITS.push({id:11,name:'CRIMSON GUARD',lvl:999,ach:'rv50',col:0xe0102a,c:'#e0102a'},{id:12,name:'OBSIDIAN GOLD',lvl:999,ach:'br50',col:0x16161f,glow:0xffc83c,c:'#ffc83c'});
CH_JACKETS.push({id:11,name:'SURVIVOR JACKET',lvl:999,ach:'br30',col:0x23304a,trim:0xffc83c,glow:1,c:'#ffc83c'},{id:12,name:'BOSS HUNTER COAT',lvl:999,ach:'bo10',col:0x7a0f1f,trim:0xff9a3c,glow:1,c:'#ff4f3c'});
CH_BACKS.push({id:9,name:'FLAME WINGS',lvl:999,ach:'br50',kind:'wings',col:0xff6a1f,glow:1,c:'#ff6a1f'},{id:10,name:'CRIMSON CAPE',lvl:999,ach:'rv50',kind:'cape',col:0xd0102a,c:'#d0102a'});
CH_CHAINS.push({id:9,name:'ALIEN DOG TAGS',lvl:999,ach:'k2000',col:0xc8d0e0,pend:'coin',c:'#c8d0e0'});
CH_SHOES.push({id:10,name:'ROAD RUNNERS',lvl:999,ach:'rk25',up:0x14102a,sole:0xff9a3c,glow:1,c:'#ff9a3c'});
CH_SHIRTS.push({id:11,name:'SURVIVOR CAMO',lvl:999,ach:'br20',kind:'stripes',base:'#2f4a2a',c2:'#5a7a3a',c3:'#14201a'});
const TITLES=[
  {id:0,name:'NO TITLE',lvl:1},
  {id:1,name:'NEWCOMER',lvl:1},{id:2,name:'NEON RECRUIT',lvl:5},{id:3,name:'BEACH PATROL',lvl:10},{id:4,name:'VICE VETERAN',lvl:20},{id:5,name:'MIAMI LEGEND',lvl:30},{id:6,name:'NEON ELITE',lvl:40},{id:7,name:'THE ONE',lvl:50},
  {id:8,name:'ALIEN SLAYER',ach:'k100'},{id:9,name:'EXTERMINATOR',ach:'k2000'},{id:10,name:'ALIEN APOCALYPSE',ach:'k10000'},
  {id:11,name:'FIELD MEDIC',ach:'rv10'},{id:12,name:'GUARDIAN ANGEL',ach:'rv50'},
  {id:13,name:'BOSS SLAYER',ach:'bo10'},{id:14,name:'GODSLAYER',ach:'bo50'},
  {id:15,name:'SURVIVOR',ach:'br10'},{id:16,name:'OVERRUN VETERAN',ach:'br20'},{id:17,name:'UNSTOPPABLE',ach:'br30'},{id:18,name:'LAST OF THE NEON',ach:'br50'},
  {id:19,name:'HEADHUNTER',ach:'cr500'},{id:20,name:'ROAD RAGE',ach:'rk25'},
  {id:21,name:'SNIPER ELITE',ach:'w5'},{id:22,name:'PYROMANIAC',ach:'w8'},{id:23,name:'TOXIC AVENGER',ach:'w9'},{id:24,name:'GATLING GOD',ach:'w6'},{id:25,name:'BRAWLER',ach:'w10'},{id:26,name:'DEMOLITION',ach:'w11'},
  {id:27,name:'NEON ADDICT',ach:'gm100'},{id:28,name:'MARATHON RUNNER',ach:'rt500'}
];
const BADGES=[
  {id:0,name:'NO BADGE',lvl:1,sym:'',c:'#4b3a7a'},
  {id:1,name:'STAR',lvl:4,sym:'★',c:'#ffd23c'},{id:2,name:'SPADE',lvl:12,sym:'♠',c:'#9ffcff'},{id:3,name:'CLUB',lvl:24,sym:'♣',c:'#7dff9a'},{id:4,name:'YIN YANG',lvl:36,sym:'☯',c:'#ffffff'},{id:5,name:'DIAMOND',lvl:50,sym:'❖',c:'#ff2fa0'},
  {id:6,name:'SPARKLE',ach:'k500',sym:'✦',c:'#fff3b0'},{id:7,name:'RADIATION',ach:'k10000',sym:'☢',c:'#9dff3c'},{id:8,name:'MEDIC CROSS',ach:'rv50',sym:'✚',c:'#ff2f4f'},
  {id:9,name:'SKULL',ach:'bo1',sym:'☠',c:'#ffffff'},{id:10,name:'FLAG',ach:'br10',sym:'⚑',c:'#25f4ff'},{id:11,name:'CROWN',ach:'br50',sym:'♛',c:'#ffc83c'},
  {id:12,name:'TARGET',ach:'cr100',sym:'✪',c:'#ff9a3c'},{id:13,name:'ARROW',ach:'rk25',sym:'➤',c:'#ff9a3c'},{id:14,name:'HEART',ach:'gm10',sym:'♥',c:'#ff3c6a'},{id:15,name:'GEM',ach:'rt100',sym:'♦',c:'#25f4ff'}
];
const NAME_COLS=[
  {id:0,name:'WHITE',lvl:1,col:0xffffff},{id:1,name:'FLAMINGO',lvl:6,col:0xff5fb0},{id:2,name:'AQUA',lvl:11,col:0x25f4ff},{id:3,name:'LIME',lvl:16,col:0x9dff3c},
  {id:4,name:'SUNSET',lvl:21,col:0xff9a3c},{id:5,name:'VIOLET',lvl:26,col:0xb58cff},{id:6,name:'GOLD',lvl:33,col:0xffd23c},{id:7,name:'ICE',lvl:39,col:0xdff6ff},{id:8,name:'RAINBOW',lvl:47,col:'rainbow'},
  {id:9,name:'BLOOD RED',ach:'k2000',col:0xff2040}
];
const FRAMES=[
  {id:0,name:'NO FRAME',lvl:1},
  {id:1,name:'PINK LINE',lvl:5,c1:'#ff2fa0',c2:'#ff2fa0'},{id:2,name:'CYAN LINE',lvl:10,c1:'#25f4ff',c2:'#25f4ff'},{id:3,name:'PALM',lvl:15,c1:'#2fd86a',c2:'#ff5fb0'},
  {id:4,name:'SUNSET',lvl:22,c1:'#ffb347',c2:'#ff2fa0'},{id:5,name:'CHROME',lvl:30,c1:'#ffffff',c2:'#8a94b0'},{id:6,name:'GOLD',lvl:38,c1:'#fff3b0',c2:'#d9962a'},{id:7,name:'RAINBOW',lvl:45,c1:'rainbow',c2:'rainbow'},
  {id:8,name:'FLAMES',ach:'bo10',c1:'#ffe63c',c2:'#ff2a1a'},{id:9,name:'HAZARD',ach:'rk100',c1:'#ffd23c',c2:'#14101c'},{id:10,name:'VETERAN',ach:'br20',c1:'#7dff9a',c2:'#1a5a2a'}
];
const CAMOS=[
  {id:0,name:'STANDARD',lvl:1},
  {id:1,name:'WOODLAND',ach:'k100',k:'wood',c:['#2f4a2a','#5a7a3a','#14201a','#7a6a3a']},{id:2,name:'DIGITAL',ach:'k500',k:'dig',c:['#2a3a5a','#4a6a9a','#141c2c','#8aa0c8']},
  {id:3,name:'TIGER STRIPE',ach:'k2000',k:'tiger',c:['#d9822a','#14101c','#f2b45a','#7a3a10']},{id:4,name:'ARCTIC',ach:'w5',k:'wood',c:['#dff6ff','#9ccfe8','#ffffff','#6aa0c0']},
  {id:5,name:'LAVA',ach:'w8',k:'lava',c:['#1a0a0a','#ff4a1a','#ffb02a','#5a1408']},{id:6,name:'TOXIC',ach:'w9',k:'dig',c:['#16301a','#3cff6a','#9dff3c','#0a1a0c']},
  {id:7,name:'GOLD PLATE',ach:'w6',k:'gold',c:['#8a5a10','#ffd23c','#fff3b0','#c88a1a']},{id:8,name:'GALAXY',ach:'k10000',k:'galaxy',c:['#0a0420','#5a2cff','#ff2fa0','#ffffff']},
  {id:9,name:'NEON GRID',ach:'cr500',k:'grid',c:['#14102a','#25f4ff','#ff2fa0','#ffffff']},{id:10,name:'VICE SUNSET',ach:'br20',k:'sunset',c:['#2a0f5a','#ff2fa0','#ffb347','#25f4ff']}
];
const KFX=[
  {id:0,name:'DEFAULT',lvl:1},{id:1,name:'CONFETTI',ach:'k500'},{id:2,name:'GOLD COINS',ach:'rt100'},{id:3,name:'ELECTRIC',ach:'w6'},{id:4,name:'EMBERS',ach:'w8'},
  {id:5,name:'TOXIC SLIME',ach:'w9'},{id:6,name:'FIREWORKS',ach:'w11'},{id:7,name:'GALAXY',ach:'k10000'},{id:8,name:'INFERNO',ach:'bo50'},{id:9,name:'RAINBOW',lvl:40}
];
/* s: stat key (k kills, rv revives, bo bosses, br best round, cr headshot kills, rk roadkills, gm games, rt rounds cleared, w = kills with weapon i) */
const ACH=[
  {id:'k100',n:'FIRST BLOOD',d:'KILL 100 ALIENS',s:'k',g:100},{id:'k500',n:'BUG SQUASHER',d:'KILL 500 ALIENS',s:'k',g:500},
  {id:'k2000',n:'EXTERMINATOR',d:'KILL 2,000 ALIENS',s:'k',g:2000},{id:'k10000',n:'ALIEN APOCALYPSE',d:'KILL 10,000 ALIENS',s:'k',g:10000},
  {id:'rv10',n:'FIELD MEDIC',d:'REVIVE 10 TEAMMATES',s:'rv',g:10},{id:'rv50',n:'GUARDIAN ANGEL',d:'REVIVE 50 TEAMMATES',s:'rv',g:50},
  {id:'bo1',n:'GIANT KILLER',d:'KILL A BOSS',s:'bo',g:1},{id:'bo10',n:'BOSS SLAYER',d:'KILL 10 BOSSES',s:'bo',g:10},{id:'bo50',n:'GODSLAYER',d:'KILL 50 BOSSES',s:'bo',g:50},
  {id:'br10',n:'SURVIVOR',d:'REACH ROUND 10',s:'br',g:10},{id:'br20',n:'OVERRUN VETERAN',d:'REACH ROUND 20',s:'br',g:20},
  {id:'br30',n:'ROUND 30 SURVIVOR',d:'REACH ROUND 30',s:'br',g:30},{id:'br40',n:'NEON WARDEN',d:'REACH ROUND 40',s:'br',g:40},{id:'br50',n:'LAST OF THE NEON',d:'REACH ROUND 50',s:'br',g:50},{id:'br100',n:'CENTURION',d:'REACH ROUND 100',s:'br',g:100},{id:'br150',n:'LIVING LEGEND',d:'REACH ROUND 150',s:'br',g:150},{id:'br200',n:'UNTOUCHABLE',d:'REACH ROUND 200',s:'br',g:200},
  {id:'cr100',n:'SHARPSHOOTER',d:'GET 100 HEADSHOT KILLS',s:'cr',g:100},{id:'cr500',n:'HEADHUNTER',d:'GET 500 HEADSHOT KILLS',s:'cr',g:500},
  {id:'rk25',n:'ROAD RAGE',d:'RUN OVER 25 ALIENS',s:'rk',g:25},{id:'rk100',n:'HIT AND RUN',d:'RUN OVER 100 ALIENS',s:'rk',g:100},
  {id:'w5',n:'SNIPER ELITE',d:'100 KILLS WITH THE LONGSHOT',s:'w',i:5,g:100},{id:'w8',n:'PYROMANIAC',d:'200 KILLS WITH THE INFERNO',s:'w',i:8,g:200},
  {id:'w9',n:'TOXIC AVENGER',d:'200 KILLS WITH THE TOXIC SPRAYER',s:'w',i:9,g:200},{id:'w6',n:'GATLING GOD',d:'300 KILLS WITH THE ARC GATLING',s:'w',i:6,g:300},
  {id:'w10',n:'BRAWLER',d:'75 KILLS WITH BRASS KNUCKLES',s:'w',i:10,g:75},{id:'w11',n:'DEMOLITION',d:'150 KILLS WITH THE MINI-BOMBER',s:'w',i:11,g:150},
  {id:'gm10',n:'REGULAR',d:'PLAY 10 GAMES',s:'gm',g:10},{id:'gm100',n:'NEON ADDICT',d:'PLAY 100 GAMES',s:'gm',g:100},
  {id:'rt100',n:'ROUND TRIPPER',d:'CLEAR 100 ROUNDS IN TOTAL',s:'rt',g:100},{id:'rt500',n:'MARATHON',d:'CLEAR 500 ROUNDS IN TOTAL',s:'rt',g:500}
];
/* rewards for the high-round achievements */
TITLES.push({id:TITLES.length,name:'NEON WARDEN',ach:'br40'},{id:TITLES.length+1,name:'CENTURION',ach:'br100'},{id:TITLES.length+2,name:'LIVING LEGEND',ach:'br150'},{id:TITLES.length+3,name:'UNTOUCHABLE',ach:'br200'});
BADGES.push({id:BADGES.length,name:'SHIELD',ach:'br40',sym:'⛨',c:'#7dff9a'},{id:BADGES.length+1,name:'CENTURION',ach:'br100',sym:'Ⅽ',c:'#ffd23c'},{id:BADGES.length+2,name:'LEGEND STAR',ach:'br150',sym:'✯',c:'#ff2fa0'},{id:BADGES.length+3,name:'INFINITY',ach:'br200',sym:'∞',c:'#25f4ff'});
NAME_COLS.push({id:NAME_COLS.length,name:'EMERALD',ach:'br100',col:0x2fffa0},{id:NAME_COLS.length+1,name:'ROYAL PURPLE',ach:'br150',col:0xb36bff},{id:NAME_COLS.length+2,name:'PLATINUM',ach:'br200',col:0xe8f6ff});
FRAMES.push({id:FRAMES.length,name:'WARDEN',ach:'br40',c1:'#7dff9a',c2:'#25f4ff'},{id:FRAMES.length+1,name:'LEGEND',ach:'br150',c1:'#ff2fa0',c2:'#ffd23c'},{id:FRAMES.length+2,name:'UNTOUCHABLE',ach:'br200',c1:'#ffffff',c2:'#25f4ff'});
/* one achievement per boss: KILL THE <BOSS>; s:'bk' counts per boss type in st.bk[type] */
const BOSS_TYPES=[[4,'BOSS',5,'♚','#ff2f4f'],[14,'STALKER',6,'✂','#c58cff'],[11,'TITAN',13,'♜','#ff9a3c'],[18,'ALIEN SHARK',13,'⚓','#25f4ff'],[23,'CARNIVAL BOSS',16,'☺','#ffe63c'],[12,'GODZILLA',20,'☄','#9dff3c'],[24,'THE BUTCHER',25,'⚔','#ff2f4f'],[22,'PIRATE CAPTAIN',26,'☠','#ffd23c'],[21,'CLEOPATRA',32,'☥','#ffc83c'],[17,'THE OVERMIND',50,'✺','#ff2fa0']];   // in order of the round each first shows up
BOSS_TYPES.forEach(([t,nm,rd,sym,c])=>{const the=(nm.indexOf('THE ')===0||nm==='GODZILLA'||nm==='CLEOPATRA')?nm:'THE '+nm;ACH.push({id:'bk'+t,n:nm+' DOWN',d:'KILL '+the,s:'bk',i:t,g:1});TITLES.push({id:TITLES.length,name:nm+' HUNTER',ach:'bk'+t});BADGES.push({id:BADGES.length,name:nm+' TROPHY',ach:'bk'+t,sym,c});});
const ACH_IDS=ACH.map(a=>a.id);
const EXLISTS=[TITLES,BADGES,NAME_COLS,FRAMES,CAMOS,KFX];   // order of the ex[] array: title, badge, name colour, frame, camo, kill effect
const EX_NAMES=['TITLE','BADGE','NAME COLOR','FRAME','GUN CAMO','KILL EFFECT'];
/* is this item open for a player of level lv holding achievements ach (array of ids)? */
function itemOpen(it,lv,ach){if(!it)return false;if(it.lvl!==undefined&&it.lvl<=lv)return true;return !!(it.ach&&ach&&ach.indexOf(it.ach)>=0);}
function achProgress(a,st){st=st||{};if(a.s==='bk')return(st.bk&&st.bk[a.i])|0;if(a.s==='w')return(st.wk&&st.wk[a.i])|0;return(st[a.s])|0;}
/* everything an achievement unlocks, as [kind,name] pairs */
function achRewards(id){
  const out=[];
  EXLISTS.forEach((L,i)=>{for(const it of L)if(it.ach===id)out.push([EX_NAMES[i],it.name]);});
  CH_LISTS.forEach((L,i)=>{for(const it of L)if(it.ach===id)out.push(['STYLE',it.name]);});
  return out;
}

const MAXUP=9;                            // every weapon has 9 upgrades (MK II ... MK X): late-game power for the long haul
const DMG_MULT=[1,1.5,2.1,2.8,3.7,4.8,6.2,8.0,10.2,13.0];
const MAG_MULT=[1,1.2,1.4,1.65,1.9,2.3,2.6,2.9,3.2,3.5];
const UP_COST=[1500,3000,5500,9000,14000,22000,34000,50000,75000];   // cost to reach upgrade 1..5 (scaled per weapon by upm)
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
  {id:9,name:'NEON TANK III',cost:10000,desc:'+50 more max health (total +150)',req:8},
  {id:10,name:'NEON TANK IV',cost:100000,desc:'+50 more max health (total +200)',req:9},
  {id:11,name:'SPRINTER II',cost:3500,desc:'run another 12% faster',req:3},
  {id:12,name:'SPRINTER III',cost:10000,desc:'run another 12% faster',req:11},
  {id:13,name:'SPRINTER IV',cost:100000,desc:'run another 12% faster (about 54% total)',req:12}
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
  {id:5,name:'MONSTER TRUCK',   kind:'truck', color:0x7a3cff,cost:9000, hp:2600,maxS:28,acc:1.4,turn:1.7,rad:3.5,ram:5.0,body:1.5, cdist:15,chgt:6.6,eye:4.0},
  {id:6,name:'VOID HOVERCAR',   kind:'hover', color:0xb03cff,cost:14000,hp:1100,maxS:38,acc:1.9,turn:2.3,rad:2.6,ram:2.6,body:1.2, cdist:12,chgt:5.0,eye:2.6},
  {id:7,name:'GUNSHIP HELICOPTER',kind:'heli',color:0x3cffb0,cost:15000,hp:1000,maxS:32,acc:1.5,turn:2.0,rad:2.6,ram:0,body:1.0, cdist:15,chgt:5.5,eye:2.4,gun:true,dmg:30,rate:6,ammo:240},
  {id:8,name:'BATTLE TANK',kind:'tank',color:0x6cff3c,cost:25000,hp:7000,maxS:9,acc:0.7,turn:0.95,rad:4.2,ram:6.0,body:1.8,cdist:19,chgt:8.5,eye:4.8,gun:true,dmg:130,rate:0.8,blast:8}
];
const SEATS={segway:2,moto:2,car:4,truck:4,hover:4,heli:4,tank:4};CARS.forEach(c=>{c.seats=SEATS[c.kind]||2;});
/* alien drivers: [first round, vehicle id] - weaker rides first, the tank arrives at round 51 */
const VEH_TIERS=[[8,0],[16,1],[21,2],[28,3],[34,4],[40,5],[45,6],[48,7],[51,8]];
/* everything sold at the garage, cheapest first (the jetpack sits between the coupe and the muscle car) */
const GARAGE_ITEMS=[{k:'car',id:0},{k:'car',id:1},{k:'car',id:2},{k:'jet'},{k:'jetup'},{k:'car',id:3},{k:'car',id:4},{k:'car',id:5},{k:'car',id:6},{k:'car',id:7},{k:'car',id:8}];
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
  {name:'BOSS',   hp:3500,sp:5.4, r:5.2, cy:5.2, dmg:55, money:1500,fly:false,ranged:true,boss:true,stomp:10},
  {name:'CHARGER',hp:45,  sp:12,  r:1.3, cy:1.4, dmg:22, money:80,  fly:false},
  {name:'BOMBER', hp:40,  sp:9.5, r:1.4, cy:1.5, dmg:30, money:90,  fly:false,bomb:true},
  {name:'ARMORED',hp:240, sp:5.8, r:1.8, cy:1.8, dmg:26, money:140, fly:false},
  {name:'MEDIC',  hp:90,  sp:6,   r:1.4, cy:1.5, dmg:0,  money:120, fly:false,support:true},
  {name:'WARSHIP',hp:190, sp:9,   r:2.4, cy:0,   dmg:16, money:160, fly:true,ranged:true},
  {name:'QUEEN',  hp:300, sp:4.8, r:2.0, cy:2.0, dmg:15, money:180, fly:false,ranged:true},
  {name:'TITAN',  hp:1600,sp:4.4, r:3.8, cy:3.8, dmg:52, money:500, fly:false,stomp:12},
  {name:'GODZILLA',hp:60000,sp:3.9,r:15, cy:22,  dmg:140, money:20000,fly:false,ranged:true,boss:true,giant:true},
  {name:'KNIFER', hp:70,  sp:12, r:1.3, cy:1.4, dmg:26, money:110, fly:false},
  {name:'STALKER',hp:900, sp:4.6,r:1.9, cy:2.0, dmg:46, money:1500,fly:false,stalker:true,loner:true},
  {name:'ROOF SNIPER',hp:200,sp:0,r:1.3,cy:1.6,dmg:34,money:700,fly:false,sniper:true,loner:true},
  {name:'HOUND',  hp:55,  sp:18, r:1.2, cy:0.8, dmg:15, money:90,  fly:false,biter:true},
  {name:'THE OVERMIND',hp:150000,sp:3.0,r:17,cy:26,dmg:120,money:60000,fly:false,ranged:true,boss:true,giant:true,stomp:30,summon:true},
  {name:'ALIEN SHARK',hp:2600,sp:15,r:3.0,cy:1.8,dmg:30,money:6000,fly:false,ranged:true,beach:true,loner:true},
  {name:'PIZZA ALIEN',hp:260,sp:5.2,r:1.5,cy:1.6,dmg:14,money:300,fly:false,ranged:true,pizza:true,loner:true},
  {name:'MOVIE ALIEN',hp:520,sp:5.0,r:1.6,cy:1.7,dmg:16,money:700,fly:false,ranged:true,movie:true,loner:true},
  {name:'CLEOPATRA',hp:4300,sp:0,r:1.6,cy:1.8,dmg:30,money:4000,fly:false,ranged:true,perch:true,loner:true},
  {name:'PIRATE CAPTAIN',hp:4600,sp:0,r:1.6,cy:1.8,dmg:32,money:4500,fly:false,ranged:true,perch:true,pirate:true,loner:true},
  {name:'CARNIVAL BOSS',hp:2000,sp:0,r:1.7,cy:1.9,dmg:30,money:3500,fly:false,ranged:true,perch:true,carni:true,loner:true},
  {name:'THE BUTCHER',hp:4000,sp:5.0,r:1.9,cy:2.0,dmg:56,money:6000,fly:false,stalker:true,loner:true,saw:true},
  {name:'TIPSY ALIEN',hp:110,sp:5.0,r:1.4,cy:1.5,dmg:0,money:120,fly:false,ranged:true,tipsy:true},
  {name:'GIANT ALIEN SHARK',hp:9000,sp:13,r:8.5,cy:5.5,dmg:48,money:30000,fly:false,ranged:true,beach:true,loner:true,giantShark:true},
  {name:'BASEBALL SLUGGER',hp:2400,sp:5.4,r:1.8,cy:2.0,dmg:28,money:3500,fly:false,ranged:true,ball:true,loner:true}
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
  let dinerN=0;
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
    const vp=R(-12.8,4);houses.push({x:cx,z:cz,S,H,k,name:(()=>{let n=NAMES[Math.floor(rand()*NAMES.length)];if(n==='DINER'&&(++dinerN)%2===0)n='PIZZA SHOP';return n;})(),neon,pal,tex,dx:cx+dl[0],dz:cz+dl[1],vx:cx+vp[0],vz:cz+vp[1]});
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
    if(nm==='TIKI BAR'){const kq=R(4,-13.4),bq=R(4,-10.6);part(0,-13.4,27,1.8,1.25,{k:'prop',neon:3,nomm:1});hs0.bx=cx+bq[0];hs0.bz=cz+bq[1];hs0.kx=cx+kq[0];hs0.kz=cz+kq[1];}   // a beer tap at the tiki bar
    if(nm==='ARCADE'){
      [-12.5,-9,-5.5,5.5,9,12.5].forEach((x,i)=>prop(x,-14,2.2,1.6,3.2,i%5));
      prop(-4,4,2,3,2.4,1);prop(4,4,2,3,2.4,2);prop(9,9,2,3,2.4,4);
    }else if(nm==='NEON CLUB'){
      prop(0,-14.3,8,1.4,2.4,1);prop(-12.5,-14,2.2,2.2,4.4,0);prop(12.5,-14,2.2,2.2,4.4,0);
      [[-8,2],[8,2],[-8,-2],[8,-2]].forEach(p=>prop(p[0],p[1],5,3.5,0.3,(p[0]<0)?0:2,true));
      for(let i=0;i<5;i++)prop(-12.5+i*1.9,9,0.9,0.9,1.2,3);
    }else if(nm==='VIDEO RENTAL'){
      prop(-12.5,-1,1.2,8,3.2,2);prop(-3,-14.2,8,1.2,3.4,2);prop(4,-8,1.2,8,2.8,1);prop(8.5,-13,4,1.2,3.2,1);prop(12.5,-6,1.2,5,2.6,4);
    }else if(nm==='PIZZA SHOP'){
      // same furniture as the diner (so the world generator stays in step), plus a brick oven and a prep counter added without touching the random stream
      const nr=(lx,lz,w,d,hh)=>{const q=R(lx,lz),sw=k%2?d:w,sd=k%2?w:d;B.push({x0:cx+q[0]-sw/2,x1:cx+q[0]+sw/2,z0:cz+q[1]-sd/2,z1:cz+q[1]+sd/2,x:cx+q[0],z:cz+q[1],w:sw,d:sd,h:hh,tex,pal,neon:0,sign:-1,part:1,k:'prop',nomm:1});};
      nr(7,-13.4,6,2.6,3.4);nr(-5,-14.1,12,1.6,1.1);
      for(const z of[-12,-6,0])prop(-13,z,2.4,4,1.6,0);
      for(const z of[-12,-6])prop(13,z,2.4,4,1.6,0);
      prop(-8,-3,2.2,2.2,1.1,3);prop(-8,3,2.2,2.2,1.1,3);prop(8,-12,2.2,2.2,1.1,3);prop(13,-13.5,1.6,1.6,3.2,4);
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
  const r4=mulberry32((seed|0)+7),themes=[],sauc=[],yardRec=[],mazeRec=[];
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
        const mb0=B.length,ml0=loot.length;
        const M=5,C=8.5,ox=cx-21.25,oz=cz-21.25,V=[],H=[];   // 8.5-unit cells keep the maze clear of the corner shops
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
        loot.push({x:cx,y:1.3,z:cz,t:1});loot.push({x:ox+C/2,y:1.3,z:oz+C/2,t:0});loot.push({x:ox+M*C-C/2,y:1.3,z:oz+C/2,t:0});
        mazeRec.push({sl,cx,cz,b0:mb0,b1:B.length,l0:ml0,l1:loot.length,th:themes[themes.length-1]});
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
        const yb0=B.length,yl0=loot.length;
        const COL=[0xff4a3c,0x25a8ff,0xffc83c,0x3cff9e,0xa56bff,0xff2fa0];
        let top=null;
        for(let rw=0;rw<4;rw++)for(let c=0;c<2;c++){
          const x=cx-13+c*26,z=cz-21+rw*14,n=r4()<0.55?1:2,h=1.3*2*n;
          dbox(x,z,12.2,2.6,h,COL[Math.floor(r4()*6)],{});
          if(n===1){dbox(x+(c?-8.5:8.5),z,2,2,1.3,0x8a6a44,{});if(!top)top=[x,z,h];}
        }
        if(top)loot.push({x:top[0],y:top[2]+1.7,z:top[1],t:1});
        loot.push({x:cx,y:1.3,z:cz-3,t:0});loot.push({x:cx,y:1.3,z:cz+16,t:0});
        yardRec.push({sl,cx,cz,b0:yb0,b1:B.length,l0:yl0,l1:loot.length,th:themes[themes.length-1]});
      }
    }
  }
  /* park flavours */
  {let pi=0;const pk=['pond','stage','lighthouse'];
    for(const sl of slabs){if(!sl.park)continue;const kind=pk[pi++%pk.length];sl.theme=kind;themes.push({k:kind,cx:sl.cx,cz:sl.cz});
      if(kind==='stage'){dbox(sl.cx,sl.cz-8,20,11,1.2,0x2b2145,{em:1,c2:1});dbox(sl.cx,sl.cz-13,20,1.4,8,0xff2fa0,{em:1});loot.push({x:sl.cx,y:1.2+1.7,z:sl.cz-8,t:1});}
      if(kind==='lighthouse'){   // a stepped, striped tower (1.4 per step) with a lantern room on top (client) and a cache up there
        for(let t=0;t<8;t++){const w=16-t*1.8;dbox(sl.cx,sl.cz,w,w,1.4*(t+1),t%2?0xff2a3c:0xf4f4ff,{});}
        loot.push({x:sl.cx,y:11.2+1.7,z:sl.cz,t:1});loot.push({x:sl.cx+14,y:1.3,z:sl.cz-12,t:0});
      }
      if(kind==='pond')loot.push({x:sl.cx+17,y:1.3,z:sl.cz+17,t:0});
    }
  }
      const buildUfo=(ucx,ucz)=>{   // crashed saucer: three stacked tiers you can climb (1.4 per step)
        {   // the saucer lies tilted on its side (same angles as the model in the client): a sloped, walkable top surface
          const th=0.4,ph=0.15,ny=Math.cos(th)*Math.cos(ph),yc=3.2;
          sauc.push({x:ucx,z:ucz,R:9.5,sx:Math.tan(th)/Math.cos(ph),sz:-Math.tan(ph),base:yc+1.2/ny,thick:2.4/ny});
        }
        loot.push({x:ucx,y:3.2+1.2/(Math.cos(0.4)*Math.cos(0.15))+1.7,z:ucz,t:1});loot.push({x:ucx+14,y:1.3,z:ucz-12,t:0});
      };
  /* the maze nearest the middle of the map is cleared and the crashed UFO lands there instead (the old UFO park became the lighthouse) */
  {let mr=null,bd=1e9;for(const r of mazeRec){const d=Math.hypot(r.cx,r.cz);if(d<bd){bd=d;mr=r;}}
   if(mr){
     for(let k=mr.b0;k<mr.b1;k++)B[k].dead=1;
     loot.splice(mr.l0,mr.l1-mr.l0);
     mr.sl.theme='ufo';mr.th.k='ufo';buildUfo(mr.cx,mr.cz);
   }}
  /* the westernmost container yard becomes a baseball field (same random draws as before, so every other landmark stays put) */
  {const yr=yardRec.slice().sort((a,b)=>a.cx-b.cx)[0];
   if(yr){
     for(let k=yr.b0;k<yr.b1;k++)B[k].dead=1;
     loot.splice(yr.l0,yr.l1-yr.l0);
     yr.sl.theme='ballpark';yr.th.k='ballpark';
     const {cx,cz}=yr;
     // outfield wall (north) with scoreboard, short side fences
     dbox(cx,cz-26,46,1,3,0x1b6b3a,{em:1});dbox(cx,cz-26.4,20,1.2,8,0x14102a,{});
     // dugouts along the baselines (roofs are climbable, one holds a cache)
     dbox(cx-21,cz+10,5,12,2.4,0x2a8bff,{});dbox(cx+21,cz+10,5,12,2.4,0xff4a3c,{});
     loot.push({x:cx+21,y:2.4+1.7,z:cz+10,t:1});
     // bleachers: three 1.4-high steps up the back of each side
     for(const sx of[-1,1])for(let i=0;i<3;i++)dbox(cx+sx*(22+i*2.2),cz-14,2.2,16,1.4*(i+1),[0xffe63c,0xff9a3c,0xff2fa0][i],{});
     // backstop + home plate area, pitcher's mound, bases
     dbox(cx,cz+26,18,0.5,5,0x888aa0,{});
     dbox(cx,cz+2,4,4,0.4,0xc98a4a,{});
     for(const [bx,bz] of[[12,2],[0,-10],[-12,2]])dbox(cx+bx,cz+bz,1.6,1.6,0.25,0xffffff,{});
     loot.push({x:cx-16,y:1.3,z:cz-18,t:0});loot.push({x:cx+16,y:1.3,z:cz-18,t:0});loot.push({x:cx,y:1.3,z:cz+21,t:0});
   }}
  /* the park flavours: the north-western lake becomes a green park, the other lake a fountain square */
  {const ponds=themes.filter(t=>t.k==='pond').sort((a,b)=>(a.cx+a.cz)-(b.cx+b.cz));
   if(ponds[0]){const t=ponds[0];t.k='greens';const sl=slabs.find(q=>q.park&&q.cx===t.cx&&q.cz===t.cz);if(sl)sl.theme='greens';
     dbox(t.cx,t.cz,6,6,1.0,0x3a9fd0,{em:1});                                  // little pavilion fountain base
     for(const [bx,bz,w,d] of[[-12,-12,5,1.4],[12,-12,5,1.4],[-12,12,5,1.4],[12,12,5,1.4]])dbox(t.cx+bx,t.cz+bz,w,d,1.0,0x8a5a2a,{});   // benches
     dbox(t.cx-16,t.cz+2,8,8,0.5,0xe0c890,{nomm:1});                           // sandbox
   }
   if(ponds[1]){const t=ponds[1];t.k='fountain';const sl=slabs.find(q=>q.park&&q.cx===t.cx&&q.cz===t.cz);if(sl)sl.theme='fountain';
     dbox(t.cx,t.cz,18,18,1.4,0x25a8ff,{em:1});dbox(t.cx,t.cz,8,8,2.8,0x6fd0ff,{em:1});dbox(t.cx,t.cz,2.2,2.2,6,0xffffff,{em:1});
   }}
  /* the casino takes over the roller rink nearest the top-right corner of the map (its rink props are removed; the shell, door and counters stay) */
  let casinoHouse=null;
  {let best=-1e9;for(const hs of houses){if(hs.name!=='ROLLER RINK')continue;const sc=hs.x-hs.z;if(sc>best){best=sc;casinoHouse=hs;}}
   if(casinoHouse){
     const sl=slabs.find(q=>q.house&&q.cx===casinoHouse.x&&q.cz===casinoHouse.z);
     if(sl)for(let k=sl.b0;k<sl.b1;k++){const b=B[k];if(b&&b.k==='prop'&&b.nomm)b.dead=true;}   // rink floor, stage and benches
     casinoHouse.name='CASINO';
     /* the casino and the single tall building diagonal from it (next to the pyramid) trade places */
     const A=slabs.find(q=>q.house&&q.cx===casinoHouse.x&&q.cz===casinoHouse.z),T=slabs.find(q=>!q.house&&!q.park&&!q.theme&&q.cx===casinoHouse.x-88&&q.cz===casinoHouse.z+88);
     if(A&&T){
       const mv=(sl,dx,dz)=>{
         const lx0=sl.cx-18,lx1=sl.cx+18,lz0=sl.cz-18,lz1=sl.cz+18;
         for(let k=sl.b0;k<sl.b1;k++){const b=B[k];for(const f of['x0','x1','x'])if(typeof b[f]==='number')b[f]+=dx;for(const f of['z0','z1','z'])if(typeof b[f]==='number')b[f]+=dz;}
         for(const l of loot)if(l.x>lx0-12&&l.x<lx1+12&&l.z>lz0-12&&l.z<lz1+12&&Math.abs(l.x-sl.cx)<34&&Math.abs(l.z-sl.cz)<34&&!l.mv){l.x+=dx;l.z+=dz;l.mv=1;}
         for(const h of houses)if(!h.mv&&h.x===sl.cx&&h.z===sl.cz){h.mv=1;for(const f of['x','dx','vx','bx','kx'])if(typeof h[f]==='number')h[f]+=dx;for(const f of['z','dz','vz','bz','kz'])if(typeof h[f]==='number')h[f]+=dz;}
         sl.cx+=dx;sl.cz+=dz;
       };
       mv(A,-88,88);mv(T,88,-88);
       for(const l of loot)delete l.mv;for(const h of houses)delete h.mv;
     }
   }}
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
  const mboxSpots=houses.map(h=>{const k=h.k,lx=-10,lz=10,q=k===0?[lx,lz]:k===1?[-lz,lx]:k===2?[-lx,-lz]:[lz,-lx];return {x:h.x+q[0],z:h.z+q[1],name:h.name};});
  /* an open-air tiki bar on the beach (solid counter; beer at the bx,bz spot) */
  const bbar={x:-20,z:HALF+40};
  dbox(bbar.x,bbar.z,16,2,1.25,0x7a4a22,{nomm:1});
  bbar.bx=bbar.x+3;bbar.bz=bbar.z-3.2;
  /* NEON PALACE CASINO: lives inside the converted roller rink. Local frame = the house frame (door on +z, back wall on -z). */
  const casino={x:casinoHouse?casinoHouse.x:-110,z:casinoHouse?casinoHouse.z:HALF+38,k:casinoHouse?casinoHouse.k:0,half:16.2,slots:[]};
  if(casinoHouse){
    const k=casinoHouse.k,cx=casinoHouse.x,cz=casinoHouse.z,R2=(lx,lz)=>k===0?[lx,lz]:k===1?[-lz,lx]:k===2?[-lx,-lz]:[lz,-lx];
    const lbox=(lx,lz,w,d,h,c,ex)=>{const q=R2(lx,lz);dbox(cx+q[0],cz+q[1],k%2?d:w,k%2?w:d,h,c,ex);};
    lbox(0,-3,9,4.4,1.2,0x0b6b3a,{em:1,nomm:1});{const q=R2(0,-3);casino.roul={x:cx+q[0],z:cz+q[1]};}
    for(let i=0;i<6;i++){const lx=-12.5+i*5;lbox(lx,-14.4,2.2,1.8,3.2,i%2?0xff2fa0:0x25f4ff,{em:1,nomm:1});const q=R2(lx,-12.6);casino.slots.push({x:cx+q[0],z:cz+q[1]});}
  }
  /* beach extras: a climbable lifeguard tower, an arcade row, a boom box, a pier plaza and the pirate ship's mooring */
  const beach={tower:{x:-150,z:HALF+36,top:6.4},boom:{x:140,z:HALF+20},pier:{x:-250,z:HALF+48},ship:{x:190,z:HALF+168}};
  {const t=beach.tower;
   dbox(t.x,t.z,4.4,4.4,6.4,0xff6a3c,{nomm:1});
   dbox(t.x,t.z-2.85,2.6,1.3,4.8,0xffffff,{nomm:1});dbox(t.x,t.z-4.15,2.6,1.3,3.2,0xffffff,{nomm:1});dbox(t.x,t.z-5.45,2.6,1.3,1.6,0xffffff,{nomm:1});   // steps up the front
   loot.push({x:t.x,y:6.4+0.8+0.9,z:t.z,t:1});}
  dbox(beach.boom.x,beach.boom.z,1.8,0.8,1.1,0xff2fa0,{em:1,nomm:1});                                 // retro boom box
  {const pr=beach.pier;dbox(pr.x,pr.z,12,34,0.7,0x8a5a2a,{nomm:1});dbox(pr.x-6.3,pr.z,0.5,34,1.5,0xe8e8f4,{nomm:1});dbox(pr.x+6.3,pr.z,0.5,34,1.5,0xe8e8f4,{nomm:1});}   // pier deck + rails
  loot.forEach((l,i)=>l.id=i);
  return {B,slabs,houses,loot,pads,themes,sauc,mbox,mbox0:mbox&&Object.assign({},mbox),mboxSpots,bbar,casino,beach};
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
    this.aliens=[];this.orbs=[];this.cars=[];this.clouds=[];this.crabs=[];this.crabT=0;this.shipT=3;
    this.nid=1;this.ev=[];
    this.mbox=Object.assign({},WORLD.mbox0);this.round=0;this.state='lobby';this.timer=0;this.queue=[];this.spawnT=0;this.hard=!!(opts&&opts.hard);this.vs=false;this.vsWin=null;this.vsKeep=false;this.vsWinner=0;   // vs = versus mode: last player standing wins
    this.time=0;this.snapT=0;this.flows=new Map();this.flowT=0;
    this.rnd=mulberry32((Math.random()*1e9)|0);
    this.overStats=null;this.best=0;this.loot=LOOT.map(()=>true);this.tapeTaken={};this.tapes=0;this.weather=0;this.bolts=[];this.fires=[];this.wxT=0;
  }
  rand(){return this.rnd();}
  addPlayer(id,name){
    const idx=this.players.size;
    const p={id,name:String(name||'PLAYER').replace(/[^\w \-]/g,'').slice(0,12).toUpperCase()||'PLAYER',
      color:PLAYER_COLORS[(id-1)%PLAYER_COLORS.length],
      x:0,y:EYE,z:0,yaw:0,pitch:0,hp:100,st:'alive',money:500+Math.max(0,this.round-1)*250,kills:0,
      joinRound:(this.state==='fight'?this.round:this.round+1),wo:newWo(),perks:PERKS.map(()=>false),w:0,lv:1,sk:0,ch:[0,0,0,0,0,0,0,0,0],jet:false,jl:0,oc:0,jfl:0,ck:0,car:-1,lastHit:-99,bleed:0,rvProg:0,rvT:-9,rvTarget:0,fireT:0,sp:0,dd:0,rvd:0,dn:0,dt:0,bk:0};
    this.spawnPos(p);
    this.players.set(id,p);
    if(this.state==='lobby'){if(this.online){this.state='wait';this.timer=0;}else{this.state='rest';this.timer=6;}this.round=0;}
    return p;
  }
  setProfile(id,lv,sk,ck,ch,ex,ach){
    const p=this.players.get(id);if(!p)return;
    p.lv=clamp(lv|0,1,MAXLV);
    if(Array.isArray(ach))p.ach=ach.filter(a=>typeof a==='string'&&ACH_IDS.indexOf(a)>=0).slice(0,60);else if(!p.ach)p.ach=[];
    p.ex=EXLISTS.map((L,i)=>{const v=Array.isArray(ex)?(ex[i]|0):0;return(v>=0&&v<L.length&&itemOpen(L[v],p.lv,p.ach))?v:0;});
    sk=sk|0;p.sk=(sk>=0&&sk<SKINS.length)?sk:0;
    ck=ck|0;p.ck=(ck>=0&&ck<CSKINS.length&&CSKINS[ck].lvl<=p.lv)?ck:0;
    p.ch=CH_LISTS.map((L,i)=>{const v=Array.isArray(ch)?(ch[i]|0):0;return(v>=0&&v<L.length&&itemOpen(L[v],p.lv,p.ach))?v:0;});
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
    if(p.car>=0)this.leaveCar(p);
    this.players.delete(id);this.flows.delete(id);
    if(!this.players.size){this.state='lobby';}
  }
  /* leave a vehicle: a passenger just steps out; if the driver leaves, whoever got in first takes the wheel */
  leaveCar(p){
    const c=this.cars.find(c=>c.id===p.car);p.car=-1;if(!c)return null;
    c.pax=c.pax||[];const i=c.pax.indexOf(p.id);
    if(i>=0)c.pax.splice(i,1);
    else if(c.drv===p.id){c.drv=c.pax.length?c.pax.shift():-1;c.sp=0;}
    return c;
  }
  /* a destroyed vehicle throws everybody out */
  wreck(c){
    const occ=[c.drv,...(c.pax||[])];
    this.push('boom',r2(c.x),2,r2(c.z),99,0);
    const ix=this.cars.indexOf(c);if(ix>=0)this.cars.splice(ix,1);
    const ow=this.players.get(c.own);if(ow){ow.vcd=ow.vcd||{};ow.vcd[c.t]=this.round+1;}   // a wrecked ride can't be taken out again until the next round
    let k=0;
    for(const id of occ){
      const q=this.players.get(id);if(!q||q.car!==c.id)continue;
      q.car=-1;q.hp-=25;q.x=c.x+3+k*1.6;q.z=c.z+k;k++;this.push('tp',q.id,r2(q.x),r2(q.z));this.push('hurt',q.id,25);
      if(q.hp<=0){q.hp=0;q.st='down';q.bleed=25;q.dn=(q.dn|0)+1;this.push('down',q.id);}
    }
  }
  wheelAng(){return (this.time*0.12)%(Math.PI*2);}   // the crystal wheel turns on server time so everyone sees the same spin
  wheelPos(fw){const s=this.wheelAng();return{x:fw.cx,z:fw.cz-22*Math.cos(s),y:27+22*Math.sin(s)-0.5};}
  spawnPos(p){p.x=(this.rand()-0.5)*10;p.z=(this.rand()-0.5)*10;p.y=EYE;p.car=-1;this.push('tp',p.id,r2(p.x),r2(p.z));}
  push(...e){this.ev.push(e);}
  give(p,n){p.money+=n;}

  /* ---- client messages ---- */
  onMsg(id,m){
    const p=this.players.get(id);if(!p||!m)return;
    switch(m.t){
      case 'st':{
        if(p.st==='dead'||this.state==='wait')break;   // nobody moves around the map until the host starts the game
        const x=+m.x,y=+m.y,z=+m.z;
        if(!isFinite(x+y+z))break;
        p.yaw=+m.yaw||0;p.pitch=+m.pitch||0;p.w=m.w|0;p.jfl=m.jt?1:0;
        if(p.car>=0){
          const c=this.cars.find(c=>c.id===p.car);
          if(c&&c.drv===p.id&&m.car){c.x=clamp(+m.car.x,BOUNDS.x0,BOUNDS.x1);c.z=clamp(+m.car.z,BOUNDS.z0,BOUNDS.z1);c.h=+m.car.h||0;c.sp=clamp(+m.car.sp||0,-20,CARS[c.t].maxS*1.15);c.y=CARS[c.t].kind==='heli'?clamp(+m.car.y||0,0,95):0;}
          if(c){p.x=c.x;p.z=c.z;p.y=EYE+(c.y||0);}
        }else if(p.st==='alive'||p.st==='down'){
          p.x=clamp(x,BOUNDS.x0,BOUNDS.x1);p.z=clamp(z,BOUNDS.z0,BOUNDS.z1);p.y=clamp(y,0,120);
        }
        break;
      }
      case 'fire':if(this.state==='wait')break;this.onFire(p,m);break;
      case 'buy':if(this.state==='wait')break;this.onBuy(p,m);break;
      case 'hard':{   // the host flips hard mode on / off from the waiting room
        if(this.state!=='wait')break;
        let host=1e9;for(const q of this.players.values())host=Math.min(host,q.id);
        if(p.id===host)this.hard=!!m.on;
        break;
      }
      case 'enter':{
        if(this.state==='wait')break;
        if(p.st!=='alive'||p.car>=0)break;
        const c=this.cars.find(c=>c.id===m.id);
        if(!c)break;
        if(Math.hypot(c.x-p.x,c.z-p.z)>7)break;
        c.pax=c.pax||[];
        if(c.drv<0){c.drv=p.id;}
        else{if(1+c.pax.length>=CARS[c.t].seats)break;c.pax.push(p.id);}   // somebody is already driving: ride along
        p.car=c.id;break;
      }
      case 'exit':{
        if(p.car<0)break;
        const c=this.cars.find(c=>c.id===p.car);
        if(c&&(c.y||0)>3)break;   // land the helicopter first
        this.leaveCar(p);
        if(c){p.x=c.x+Math.cos(c.h)*3.2;p.z=c.z-Math.sin(c.h)*3.2;}
        break;
      }
      case 'base':{   // between rounds: teleport back to the starting plaza (server-side so cars / helis / the wheel can't desync it)
        if(this.state!=='rest'||this.round<1||p.st!=='alive')break;
        if(p.car>=0)this.leaveCar(p);
        p.car=-1;p.x=-15;p.z=-15;p.y=EYE;
        this.push('tp',p.id,-15,-15);
        break;
      }
      case 'vs':{   // the host switches between co-op and versus in the waiting room
        if(this.state!=='wait')break;
        let host=1e9;for(const q of this.players.values())host=Math.min(host,q.id);
        if(p.id===host)this.vs=!!m.on;
        break;
      }
      case 'keep':case 'quit':{   // the versus winner chooses: keep going solo, or end the game
        if(!this.vsWin||!this.vsWin.pend||this.vsWin.id!==p.id)break;
        if(m.t==='keep'){this.vsWin.pend=false;this.vsKeep=true;this.vs=false;this.push('vskeep',p.id);}   // switch to co-op: the rest get back up when this round endselse this.vsEnd();
        break;
      }
      case 'start':{
        if(this.state!=='wait')break;
        let host=1e9;for(const q of this.players.values())host=Math.min(host,q.id);
        if(p.id!==host)break;
        if(this.vs&&this.players.size<2){this.push('vsmin');break;}   // versus needs at least two players
        this.vsN=this.vs?this.players.size:0;
        this.state='rest';this.timer=5;this.round=0;this.push('go');break;
      }
      case 'rv':p.rvTarget=m.target|0;p.rvT=this.time;break;
      case 'prof':this.setProfile(id,m.lv,m.sk,m.ck,m.ch,m.ex,m.ach);break;
    }
  }

  onFire(p,m){
    if(p.st!=='alive'||this.inCasino(p))return;   // no shooting inside the casino safe zone
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
      if(c.am===undefined)c.am=cd.ammo;
      if(c.am<=0){if(this.time-(p.noAm||-9)>1){p.noAm=this.time;this.push('noammo',p.id);}return;}
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/cd.rate;c.am--;
      def=cd.blast?{pellets:1,spread:0.0,pierce:1,range:260,br:cd.blast}:{pellets:1,spread:0.012,pierce:2,range:320};dmg=cd.dmg;col=cd.color;
    }else{
      if(p.car>=0)return;
      const w=m.w|0;if(!WPN[w]||p.wo[w]<0)return;
      def=WPN[w];lvl=p.wo[w];
      if(this.time<p.fireT)return;p.fireT=this.time+0.8/def.rate;
      dmg=def.dmg*DMG_MULT[lvl]*(p.perks[7]?1.2:1);col=def.color;
      if(def.spin){p.spin=(this.time-(p.lastF||-9)<0.35)?Math.min(2.2,(p.spin||0)+0.8/def.rate):0;p.lastF=this.time;dmg*=0.65+0.55*Math.min(1,p.spin/1.6);}
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
    if(def.br){   // explosive shell: bursts where it lands and hurts everything nearby
      let tb=rayWorld(ox,oy,oz,d[0],d[1],d[2],range);
      for(const a of this.aliens){const t=raySphere(ox,oy,oz,d[0],d[1],d[2],a.x,a.y+a.cy,a.z,a.r+0.3);if(t>=0&&t<tb)tb=t;}
      const bx=ox+d[0]*tb,by=oy+d[1]*tb,bz=oz+d[2]*tb;
      this.push('bomb',r2(bx),r2(by),r2(bz),def.br);
      for(const a of this.aliens.slice()){
        const dd2=Math.hypot(a.x-bx,a.y+a.cy-by,a.z-bz),reach=def.br+a.r;
        if(dd2<reach)this.damageAlien(a,dmg*(1-0.55*dd2/reach),p,a.x,a.y+a.cy,a.z);
      }
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
      for(const cb of this.crabs.slice()){const t=raySphere(ox,oy,oz,dd[0],dd[1],dd[2],cb.x,0.7,cb.z,1.3);if(t>=0&&t<=range&&t<wt)this.killCrab(cb,p);}
      hits.sort((a,b)=>a[0]-b[0]);
      let n=0;
      for(const h of hits){
        if(n>=def.pierce)break;n++;
        const a=h[1];
        let hm=n>1?0.8:1;
        if(def.ramp&&n>1)hm=Math.pow(1.3,n-1);
        if(def.falloff)hm*=h[0]<10?1.7:h[0]>34?0.45:1.7-1.25*(h[0]-10)/24;
        if(def.far)hm*=1+Math.min(1,h[0]/160);
        this.damageAlien(a,dmg*hm,p,ox+dd[0]*h[0],oy+dd[1]*h[0],oz+dd[2]*h[0]);
        if(def.slow&&a.hp>0)a.slowT=0.8;
        if(def.chain||def.bounce){   // arc / ricochet to a nearby alien
          let cur=a;const seen=new Set([a.id]);
          for(let j=0;j<(def.bounce?2:1);j++){
            let nx=null,nd=def.bounce?18:10;
            for(const o of this.aliens){if(seen.has(o.id)||o.hp<=0)continue;const dq=Math.hypot(o.x-cur.x,o.z-cur.z);if(dq<nd){nd=dq;nx=o;}}
            if(!nx)break;seen.add(nx.id);this.damageAlien(nx,dmg*(def.bounce?0.7:0.5),p,nx.x,nx.y+nx.cy,nx.z);cur=nx;
          }
        }
        if(def.burn&&a.hp>0){a.burn=2.5;a.burnD=Math.max(a.burnD||0,dmg*1.4);a.burnOwn=p.id;}
      }
    }
    shotEv();
  }

  onBuy(p,m){
    if(p.st!=='alive'||p.car>=0)return;
    const near=k=>SHOP.find(s=>s.k===k&&Math.hypot(s.x-p.x,s.z-p.z)<5.9);
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
      const mb=this.mbox;if(!mb||Math.hypot(mb.x-p.x,mb.z-p.z)>4.5||p.money<MBOX_COST)return;
      p.money-=MBOX_COST;
      const w=1+Math.floor(this.rand()*(WPN.length-1));
      if(p.wo[w]<0){p.wo[w]=0;this.push('gave',p.id,w);}
      else if(p.wo[w]<MAXUP){p.wo[w]++;this.push('upg',p.id,w,p.wo[w]);}
      else this.push('ammoall',p.id);
      this.push('mbox',p.id,w);
    }else if(m.k==='beer'){
      const h=HOUSES.find(h=>h.bx!==undefined&&Math.hypot(h.bx-p.x,h.bz-p.z)<4.5)||(WORLD.bbar&&Math.hypot(WORLD.bbar.bx-p.x,WORLD.bbar.bz-p.z)<4.5);if(!h||p.money<40)return;p.money-=40;this.push('beer',p.id);
    }else if(m.k==='slot'){
      const C=WORLD.casino;if(!C||p.y>5||!C.slots.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<4.6))return;
      const bet=m.all?Math.floor(p.money):([50,100,250,500,1000,5000,10000,25000,100000].includes(m.bet|0)?m.bet|0:0);if(!bet||p.money<bet)return;
      p.money-=bet;
      const W=[30,25,18,12,8,5],MUL=[8,12,24,40,90,250],pick=()=>{let r=this.rand()*98,i=0;while(i<5&&r>=W[i]){r-=W[i];i++;}return i;};
      const rl=[pick(),pick(),pick()];let win=0;
      if(rl[0]===rl[1]&&rl[1]===rl[2])win=bet*MUL[rl[0]];
      else if(rl.filter(v=>v===0).length>=2)win=bet;
      p.money+=win;this.push('slot',p.id,rl[0],rl[1],rl[2],win,bet);
    }else if(m.k==='roul'){
      const C=WORLD.casino;if(!C||!C.roul||p.y>5||Math.hypot(C.roul.x-p.x,C.roul.z-p.z)>6.2)return;
      const bet=m.all?Math.floor(p.money):([50,100,250,500,1000,5000,10000,25000,100000].includes(m.bet|0)?m.bet|0:0);if(!bet||p.money<bet)return;
      const kinds=['red','black','odd','even','low','high','num','green'];if(!kinds.includes(m.kind))return;
      const num=Math.max(0,Math.min(36,m.num|0));
      p.money-=bet;const r=Math.floor(this.rand()*37),RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      let mul=0;if(m.kind==='num'){if(r===num)mul=36;}else if(m.kind==='green'){if(r===0)mul=36;}else if(r>0){
        if(m.kind==='red'&&RED.includes(r))mul=2;else if(m.kind==='black'&&!RED.includes(r))mul=2;
        else if(m.kind==='odd'&&r%2===1)mul=2;else if(m.kind==='even'&&r%2===0)mul=2;
        else if(m.kind==='low'&&r<=18)mul=2;else if(m.kind==='high'&&r>=19)mul=2;}
      const win=bet*mul;p.money+=win;this.push('roul',p.id,r,win,bet);
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
      if(p.vcd&&(p.vcd[t]|0)>this.round){this.push('nocar',p.id,1);return;}   // wrecked: one round cooldown
      if(this.cars.some(c=>c.own===p.id&&c.t===t)){this.push('nocar',p.id);return;}   // only one of each car per person at a time
      const sp=GARAGE_SPAWNS[g.c];
      let z=sp.z,tries=0;
      while(this.cars.some(c=>Math.hypot(c.x-sp.x,c.z-z)<7)&&tries++<6)z+=7;
      if(!owned){p.money-=CARS[t].cost;p.oc|=1<<t;}
      const c={id:this.nid++,t,x:sp.x,z,h:Math.PI/2*0,hp:CARS[t].hp,drv:-1,pax:[],sp:0,k:p.ck|0,own:p.id};
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
    a.guard=false;
    if(a.hide){a.hide=false;this.push('stalk',a.id);}
    if(AT[a.t].stalker)a.enr=1;
    let crit=0;
    if(y!==undefined){const df=AT[a.t];if(y>a.y+a.cy+df.r*(df.giant?0.12:0.4)){crit=1;dmg*=(df.giant?2.5:2)*(p.perks&&p.perks[4]?1.6:1);}}
    p.dd=(p.dd||0)+Math.max(0,Math.min(dmg,a.hp));
    a.hp-=dmg;
    p.money+=10;
    let killed=0;
    if(a.hp<=0){killed=1;this.killAlien(a,p,crit);}
    this.push('hit',p.id,r2(x),r2(y),r2(z),killed,Math.round(dmg),crit);
  }
  killAlien(a,p,crit){
    const def=AT[a.t];
    this.push('kc',p.id,p.car>=0?-1:(p.w|0),crit?1:0,def.boss?1:0,a.t);   // credit for the killer's own lifetime stats / achievements
    const mk=(def.money+(a.far?Math.round(def.money*0.5):0))*(a.mut?3:1)*(p.perks&&p.perks[5]?1.25:1)*(this.hard?1.25:1)*(this.weather===6?1.5:1)/(1+0.22*(this.players.size-1));   // bigger crews fight more aliens, so each kill pays less
    p.money+=Math.round(mk);p.kills++;
    for(const q of this.players.values()){   // teammates close to the kill get 25% of the cash
      if(q===p||q.st!=='alive')continue;
      if(Math.hypot(q.x-a.x,q.z-a.z)<60)q.money+=Math.round(mk*0.1);
    }
    if(a.veh>=0){this.push('boom',r2(a.x),2,r2(a.z),99,0);p.money+=Math.round(CARS[a.veh].cost*0.04);}   // the wrecked ride pays a little
    if(a.mut===1){   // volatile mutant: blows up when it dies
      this.push('blast',r2(a.x),r2(a.y+1),r2(a.z));
      for(const q of this.players.values()){if(q.st!=='alive')continue;const t=this.targetPos(q),d=Math.hypot(t.x-a.x,t.z-a.z);if(d<9&&q.y-EYE<6)this.hurt(q,(25+this.round)*(1-d/12),a.x,a.z);}
    }
    if(def.boss){p.bk=(p.bk|0)+1;this.bossDrop(a,p);}
    if(def.pizza){for(const q of this.players.values()){if(q.st==='alive'&&Math.hypot(q.x-a.x,q.z-a.z)<45)q.hp=Math.min(mhp(q),q.hp+(q===p?mhp(q)*0.4:25));}this.push('pizza',r2(a.x),r2(a.y+1),r2(a.z));}
    if(def.pirate){p.money+=2400;for(const q of this.players.values())if(q.st==='alive')this.push('ammoall',q.id);this.push('piratedead',p.id);}
    if(def.ball){p.money+=2000;for(const q of this.players.values())if(q.st==='alive')this.push('ammoall',q.id);this.push('balldead',p.id);}
    if(def.carni){p.money+=2000;for(const q of this.players.values())if(q.st==='alive')q.hp=mhp(q);this.push('carnidead',p.id);}
    if(def.perch&&!def.pirate&&!def.carni){p.money+=2000;const opts=PERKS.filter(pk=>!p.perks[pk.id]&&(pk.req===undefined||p.perks[pk.req]));if(opts.length){const pk=opts[Math.floor(this.rand()*opts.length)];p.perks[pk.id]=true;if(HP_TIERS.includes(pk.id))p.hp=Math.min(mhp(p),p.hp+50);this.push('perk',p.id,pk.id);}this.push('cleodead',p.id);}
    if(def.movie){p.money+=800;this.push('ammoall',p.id);this.push('ticket',p.id);}
    this.push('boom',r2(a.x),r2(a.y+a.cy),r2(a.z),a.t,a.id,p.id);
  }

  /* ---- rounds ---- */
  hpMul(){const r=this.round;   // steep early, then a gentle slope after round 40 so round 150 stays winnable
    if(r<=10)return 1+0.15*(r-1);
    const m40=(1+0.15*9)*Math.pow(1.08,30);
    return r<=40?(1+0.15*9)*Math.pow(1.08,r-10):r<=50?m40*Math.pow(1.006,r-40):m40*Math.pow(1.006,10)*Math.pow(1.009,r-50);}   // past round 50 it ramps a touch faster but still only slowly: extremely hard, never a wall
  startRound(){
    this.round++;
    const npl=Math.max(1,this.players.size),crewF=Math.min(1,0.65+0.35*(this.round-1)/11),mul=1+0.55*(npl-1)*crewF;   // crews of 3-8 get a bit fewer aliens in the first rounds so they are not too repetitive     // bigger crews face bigger waves: 1.0x solo, 1.55x for 2, 2.65x for 4, 3.75x for 6
    let total=Math.round(soft(5+this.round*2.4,75,0.15)*mul*(this.hard?1.25:1));
    const giant=this.round%20===0,ultimate=this.round%50===0,shark=this.round%13===0;
    const boss=this.round%5===0;
    if(boss)total=Math.max(4,Math.round(total*0.28));   // boss rounds: only a few escorts so the boss is the focus
    const q=[];
    const pool=[[0,1,Math.max(3,10-this.round*0.4)],[2,2,3],[1,3,3],[5,4,3],[3,5,2],[6,6,2.5],[7,7,2.5],[8,8,1.5],[9,9,1.5],[10,11,1.2],[11,13,1],[13,8,3],[16,11,3]].filter(e=>this.round>=e[1]);
    {const late=Math.max(0,this.round-30),hm=1+Math.log(1+late)*0.7,gm=1/(1+late*0.03);   // after round 30 the tough aliens (brute, armored, queen, titan, warship) keep getting likelier and plain grunts fade, with no ceiling
      for(const e of pool){if(e[0]===3||e[0]===7||e[0]===9||e[0]===10||e[0]===11)e[2]*=hm;else if(e[0]===0)e[2]*=Math.max(0.35,gm);}}
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
    if(this.round>=26&&(this.round-26)%7===0&&WORLD.themes.some(q=>q.k==='marina'))q.unshift(22);   // pirate captain on the marina boardwalk: rounds 26, 33, 40, ...
    if(this.round>=17&&(this.round-17)%10===0&&WORLD.themes.some(q=>q.k==='ballpark'))q.unshift(27);   // the baseball slugger waits in the ballpark: rounds 17, 27, 37, ...
    if(this.round>=16&&(this.round-16)%7===0&&WORLD.themes.some(q=>q.k==='ferris'))q.unshift(23);   // carnival boss under the ferris wheel: rounds 16, 22, 28, ...
    if(this.round>=32&&(this.round-32)%11===0&&WORLD.themes.some(q=>q.k==='pyramid'))q.unshift(21);   // Cleopatra awakens atop the pyramid: rounds 32, 43, 54, ...
    if(this.round>=8){const nT=this.round%5===0?1:Math.min(8,1+Math.floor((this.round-8)/3));for(let i=0;i<nT;i++)q.splice(Math.floor(this.rand()*(q.length+1)),0,25);}   // tipsy aliens from round 8: their bottles make you drunk (no damage)
    if(this.round>=25&&(this.round-25)%7===0)q.unshift(24);   // the chainsaw stalker: rounds 25, 32, 39, ...
    if(this.round>=9&&(this.round-9)%7===0&&WORLD.themes.some(q=>q.k==='drivein'))q.unshift(20);   // the movie alien visits the drive-in: rounds 9, 16, 23, ...
    if(this.round>=7&&(this.round-7)%7===0){const np2=1+Math.floor((this.round-7)/20)+(this.players.size>3?1:0);for(let i=0;i<np2;i++)q.unshift(19);}   // the pizza alien: rounds 7, 12, 17, ...
    if(this.round%30===0)q.unshift(26);   // every 30th round a GIANT alien shark
    if(shark){const nsh=1+Math.floor(this.round/39);for(let i=0;i<nsh;i++)q.unshift(18);}   // an alien shark on the beach every 13 rounds
    if(ultimate){q.unshift(17);}
    if(giant){const ng=1+Math.floor(this.round/100);for(let i=0;i<ng;i++)q.unshift(12);}
    else if(boss){const nb=1+Math.floor(this.round/20);for(let i=0;i<nb;i++)q.unshift(4);}
    for(let i=q.length-1;i>=0;i--){if(q[i]===15)q.splice(i,1);else if(q[i]===16)q[i]=0;}   // no rooftop snipers and no hounds any more
    for(const p of this.players.values()){   // everyone who fell comes back at the start of the round
      if(p.st!=='alive'&&!this.vs){
        p.st='alive';p.hp=mhp(p);p.rvProg=0;this.spawnPos(p);
        if(p.money<500)p.money=500;
        this.push('revived',p.id);
      }
    }
    this.vehSwarm=-1;this.vehSwarmN=0;
    if(this.round>=17&&(this.round-17)%10===0){   // special rounds 17, 27, 37 ...: 20 aliens all riding the same vehicle, a better one each time
      const vt=Math.min(CARS.length-1,(this.round-17)/10);
      this.vehSwarm=vt;this.vehSwarmN=20;
      for(let i=0;i<20;i++)q.splice(Math.floor(this.rand()*(q.length+1)),0,vt>=7?1:0);
      this.push('vehswarm',vt);
    }
    this.vehLeft=this.vehSwarm>=0?0:this.round>=VEH_TIERS[0][0]?6:0;this.nested=false;this.queue=q;this.q0=q.length;this.emptyT=0;this.huntNote=0;this.state='fight';this.spawnT=1.5;this.fightT=0;this.loot.fill(true);LOOT.forEach((l,i)=>{if(l.t===2&&this.tapeTaken[i])this.loot[i]=false;});
    this.weather=0;
    if(this.round>=9&&this.rand()<0.45){this.weather=[2,3,4,5,6][Math.floor(this.rand()*5)];this.wxT=0;this.push('weather',this.weather);}
    if(this.round>1&&(this.round-1)%6===0&&WORLD.mboxSpots&&WORLD.mboxSpots.length>1){   // every 6 rounds the mystery box turns up in another building
      let sp=null;for(let t=0;t<20;t++){const c=WORLD.mboxSpots[Math.floor(this.rand()*WORLD.mboxSpots.length)];if(Math.hypot(c.x-this.mbox.x,c.z-this.mbox.z)>6){sp=c;break;}}
      if(sp){this.mbox={x:sp.x,z:sp.z,name:sp.name};this.push('mboxmove',sp.name);}
    }
    this.push('round',this.round,ultimate?3:giant?2:(boss?1:0));
  }
  endRound(){
    this.sides=null;this.state='rest';this.timer=this.round>20?20:12;   // 12 s between rounds, 20 s once past round 20
    if(this.weather){this.weather=0;this.bolts.length=0;this.fires.length=0;this.push('weather',0);}
    for(const p of this.players.values()){
      if(p.st==='alive')p.money+=Math.round(50*this.round/(1+0.15*(this.players.size-1)));
    }
    if(!this.vs)for(const p of this.players.values()){   // co-op: everyone who fell gets back up as soon as the last alien is down
      if(p.st!=='alive'){p.st='alive';p.hp=mhp(p);p.rvProg=0;p.car=-1;this.spawnPos(p);if(p.money<500)p.money=500;this.push('revived',p.id);}
    }
    this.push('clear',this.round);
  }
  resetGame(){
    this.sides=null;
    this.aliens.length=0;this.orbs.length=0;this.cars.length=0;this.queue.length=0;this.clouds.length=0;this.crabs.length=0;this.crabT=0;
    for(const p of this.players.values()){
      p.wo=newWo();p.perks=PERKS.map(()=>false);p.joinRound=1;p.w=0;p.jet=false;p.jl=0;p.oc=0;p.vcd={};p.dd=0;p.rvd=0;p.dn=0;p.dt=0;p.bk=0;p.money=500;p.kills=0;p.hp=100;p.st='alive';p.car=-1;this.spawnPos(p);
    }
    this.loot.fill(true);this.tapeTaken={};this.tapes=0;this.weather=0;this.bolts.length=0;this.fires.length=0;this.mbox=Object.assign({},WORLD.mbox0);this.round=0;this.state=this.online?'wait':'rest';this.timer=6;this.vsWin=null;this.vsKeep=false;this.vsWinner=0;this.vsN=0;this.push('reset');
  }

  pickSides(){
    const n=this.round+1>=8?2:1,a0=this.rand()*Math.PI*2;
    return n===1?[a0]:[a0,a0+Math.PI*(0.7+this.rand()*0.6)];
  }
  hardCap(){const r=this.round;return r<10?40:r<20?60:r<30?Math.round(60+(r-20)*1.5):75;}   // absolute ceiling on live aliens
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
    if(def.stalker){   // hide inside one of the enterable buildings
      const hs=HOUSES[Math.floor(this.rand()*HOUSES.length)];this._hh=hs;
      let hx=hs.x,hz=hs.z;
      for(let i=0;i<30;i++){const tx=hs.x+(this.rand()-0.5)*hs.S*0.55,tz=hs.z+(this.rand()-0.5)*hs.S*0.55;if(!inBuilding(tx,tz,1)){hx=tx;hz=tz;break;}}
      x=hx;z=hz;
    }
    if(t===18||t===26){x=(this.rand()-0.5)*260;z=HALF+40;yy=t===26?32:15;}
    if(t===19){   // the pizza alien always starts inside a restaurant (a diner)
      const dn=HOUSES.filter(h=>h.name==='DINER'||h.name==='PIZZA SHOP'),hs=dn.length?dn[Math.floor(this.rand()*dn.length)]:HOUSES[Math.floor(this.rand()*HOUSES.length)];
      let hx=hs.x,hz=hs.z;
      for(let i=0;i<30;i++){const tx=hs.x+(this.rand()-0.5)*hs.S*0.55,tz=hs.z+(this.rand()-0.5)*hs.S*0.55;if(!inBuilding(tx,tz,1)){hx=tx;hz=tz;break;}}
      x=hx;z=hz;
    }
    if(t===21){   // Cleopatra rules from the very top of the pyramid
      const py=WORLD.themes.find(q=>q.k==='pyramid');
      if(py){x=py.cx;z=py.cz;yy=11.2;}
    }
    if(t===27){const bp=WORLD.themes.find(q=>q.k==='ballpark');if(bp){x=bp.cx+(this.rand()-0.5)*6;z=bp.cz+4;}}   // the slugger waits on the pitcher's mound of the ballpark
    if(t===22){const mr=WORLD.themes.find(q=>q.k==='marina');if(mr){x=mr.cx;z=mr.cz-8;yy=0.7;}}
    if(t===23){const fw=WORLD.themes.find(q=>q.k==='ferris');if(fw){const wp=this.wheelPos(fw);x=wp.x;z=wp.z;yy=wp.y;}}   // he rides a gondola of the crystal wheel
    if(t===20){   // the movie alien steps out of the drive-in screen
      const di=WORLD.themes.find(q=>q.k==='drivein');
      if(di){x=di.cx+(this.rand()-0.5)*24;z=di.cz-20;}
    }
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
    let hp=def.hp*this.hpMul()*(1+0.1*(np-1))*(this.hard?1.5:1);   // +10% alien health per extra player
    if(t===4)hp=2900*(1+0.5*(this.round/5-1))*(1+0.8*(np-1));
    if(t===18)hp=3400*(1+0.35*(this.round/13-1))*(1+0.5*(np-1));
    if(t===26)hp=16000*(1+0.5*(this.round/30-1))*(1+0.7*(np-1));
    if(t===17)hp=190000*(1+0.5*(this.round/50-1))*(1+0.8*(np-1));
    if(t===12)hp=78000*(1+0.5*(this.round/20-1))*(1+0.8*(np-1));
    if((t>=21&&t<=24)||t===27)hp*=1+0.6*(np-1);   // landmark bosses are tougher in co-op too
    const sp=def.sp*(1+soft(0.028*this.round,0.55,0.12))*(0.9+this.rand()*0.25);
    const al={id:this.nid++,t,x,y:yy,z,yaw:0,hp,mhp:hp,sp,r:def.r,cy:def.cy,
      dmg:def.dmg*soft(1+0.025*this.round,2.5,0.2)*(this.hard?1.4:1),cd:1+this.rand()*1.5,tT:0,tgt:tg.id,los:false,ph:this.rand()*6.28,rt:0,vx:0,vz:0,vol:0,stomp:4,dorm:false,far:false,dormT:0};
    if(def.stalker){al.hide=true;al.stT=0;al.hh=this._hh;
      const nApp=t===24?Math.floor((this.round-25)/7):Math.floor((this.round-6)/4);   // how many times this stalker has shown up before
      al.spm=Math.min(1.4,1+0.05*Math.max(0,nApp));al.sp*=al.spm;}   // +5% speed (and speed cap) every appearance, up to +40%
    if((t>=19&&t<=22)||t===27)al.guard=true;   // every landmark boss waits at its spot until a player is in sight
    if(this.round>=9&&!def.boss&&!def.loner&&!def.support&&!def.beach&&this.rand()<Math.min(0.28,0.05+0.012*(this.round-9))){
      al.mut=1+Math.floor(this.rand()*3);
      if(al.mut===2){al.hp*=2.6;al.mhp=al.hp;al.sp*=0.85;}
      else if(al.mut===3){al.sp*=1.5;al.hp*=0.8;al.mhp=al.hp;}
    }
    this.mountVeh(al);
    this.aliens.push(al);
    if(def.stalker)this.push('stalker',al.id,r2(x),r2(z),t);
    if(t===18||t===26)this.push('shark',al.id,r2(x),r2(z),t===26?1:0);
    if(t===19)this.push('pizzaspawn',al.id,r2(x),r2(z));
    if(t===22)this.push('piratespawn',al.id,r2(x),r2(z));
    if(t===23)this.push('carnispawn',al.id,r2(x),r2(z));
    if(t===27)this.push('ballspawn',al.id,r2(x),r2(z));
    if(t===21)this.push('cleospawn',al.id,r2(x),r2(z));
    if(t===20)this.push('moviespawn',al.id,r2(x),r2(z));
    if(t===15)this.push('sniper',al.id,r2(x),r2(z));
  }

  /* some aliens drive vehicles (max 6 a round); the ride gets better as the rounds go on */
  mountVeh(al){
    if(this.vehSwarmN>0&&(al.t===0||al.t===1)&&(this.vehSwarm<7||al.t===1)){   // vehicle swarm round: the next 20 grunts (gunners for the heli / tank) all ride the round's vehicle
      this.vehSwarmN--;const cd=CARS[this.vehSwarm];
      al.veh=this.vehSwarm;al.hp+=cd.hp*0.4;al.mhp=al.hp;
      al.sp=Math.max(al.sp,Math.min(cd.maxS*0.5,16));al.r=Math.max(al.r,cd.rad*0.9);al.cy=Math.max(al.cy,cd.eye*0.6);al.dmg*=1.35;
      return;
    }
    if(!(this.vehLeft>0)||(al.t!==0&&al.t!==1))return;
    const tiers=VEH_TIERS.filter(v=>v[0]<=this.round);if(!tiers.length)return;
    const same=this.queue.filter(x=>x===0||x===1).length;
    if(this.rand()>=this.vehLeft/(1+same))return;
    let vt=(this.rand()<0.4?tiers[tiers.length-1]:tiers[Math.floor(this.rand()*tiers.length)])[1];
    if(vt>=7&&al.t!==1)vt=6;   // only gunners can drive the tank and the helicopter
    const cd=CARS[vt];
    al.veh=vt;al.hp+=cd.hp*0.4;al.mhp=al.hp;
    al.sp=Math.max(al.sp,Math.min(cd.maxS*0.5,16));al.r=Math.max(al.r,cd.rad*0.9);al.cy=Math.max(al.cy,cd.eye*0.6);al.dmg*=1.35;
    this.vehLeft--;
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
    for(let i=0;i<n&&this.aliens.length+list.length<this.hardCap()&&this.queue.length&&!AT[this.queue[0]].fly&&!AT[this.queue[0]].boss&&!AT[this.queue[0]].support&&!AT[this.queue[0]].loner;i++)list.push(this.queue.shift());
    let k=0;
    for(const ty of list){
      this.spawnAlien(ty,x+(this.rand()-0.5)*14,z+(this.rand()-0.5)*14);
      const a=this.aliens[this.aliens.length-1];
      if(BLOCK[cellOf(a.x,a.z)]){a.x=x;a.z=z;}
      a.dorm=true;a.far=true;a.dormT=(this.round>=6?30:55)+this.rand()*20;k++;
    }
    if(!this.nested){this.nested=true;this.push('nest');}
  }
  startTel(a,tp,dx,dz,dist,alive){
    const L=dist||1;let tel=[],T=1.8;
    if(a.t===4){tel=[{k:'c',x:tp.x,z:tp.z,r:10}];T=1.7;}                                   // SLAM: lands where you stand
    else if(a.t===12){
      a.tn=(a.tn|0)+1;
      if(a.tn%2===0&&L<90){tel=[{k:'c',x:a.x,z:a.z,r:50,st:1}];T=6;}                      // STOMP: a giant circle that fills slowly - run out of it
      else{tel=[{k:'l',x:a.x,z:a.z,dx:dx/L,dz:dz/L,w:10,len:500}];T=2.0;}                  // BEAM: a long lane
    }
    else{for(const p of alive){const q=this.targetPos(p);tel.push({k:'c',x:q.x,z:q.z,r:10});for(let i=0;i<2;i++){const an=this.rand()*6.28,rr=8+this.rand()*14;tel.push({k:'c',x:q.x+Math.cos(an)*rr,z:q.z+Math.sin(an)*rr,r:10});}}tel=tel.slice(0,9);T=2.4;}   // METEORS
    a.tel=tel;a.telT=T;a.telD=T;this.push('telwarn',a.t,(a.t===12&&tel[0]&&tel[0].st)?1:0);
  }
  resolveTel(a,alive){
    const stm=a.t===12&&a.tel[0]&&a.tel[0].st;
    const dmg=(a.t===4?70:a.t===12?(stm?230:150):85)*(1+0.02*this.round);
    this.push('telhit',a.t,r2(a.x),r2(a.z));
    if(stm)this.push('stomp',r2(a.x),r2(a.z));
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
  inCasino(p){const c=WORLD.casino;return !!c&&p.car<0&&Math.abs(p.x-c.x)<c.half&&Math.abs(p.z-c.z)<c.half&&p.y<4;}
  hurt(p,dmg,sx,sz){
    if(p.st!=='alive')return;
    if(this.inCasino(p))return;   // the casino is a safe zone
    if(p.car>=0){
      const c=this.cars.find(c=>c.id===p.car);
      if(c){
        c.hp-=dmg*0.96;this.push('carhit',p.id,sx===undefined?0:r2(sx),sz===undefined?0:r2(sz),sx===undefined?0:1);
        if(c.hp<=0){
          this.wreck(c);
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
    this.orbs.push({id:this.nid++,x:ox,y:oy,z:oz,vx:dx/l2*speed,vy:dy/l2*speed,vz:dz/l2*speed,life:a.t===12?10:5,sky:a.t===12?1:0,dmg,big:(a.t===18||a.t===26)?8:(a.t===4||a.t===12||a.t===17)?1:(a.t===19?2:(a.t===20?3:(a.t===21?4:(a.t===22?5:(a.t===23?6:(a.t===25?7:(a.t===27?9:0)))))))});
  }

  /* ---- main tick ---- */
  vsEnd(){   // versus is over: results screen, then back to the waiting room
    const plist=[...this.players.values()];
    if(this.vsWin)this.vsWinner=this.vsWin.id;
    this.vsWin=null;this.state='over';this.timer=10;
    this.best=Math.max(this.best,this.round);
    this.push('over',this.round);this.report(plist);
  }
  tick(dt){
    if(!this.players.size)return;
    dt=Math.min(dt,0.1);
    if(this.vsWin&&this.vsWin.pend){   // the whole game holds still while the winner picks YES / NO
      this.vsWin.t-=dt;if(this.vsWin.t<=0){this.vsEnd();}
      this.snapT-=dt;if(this.snapT<=0){this.snapT=0.05;this.out.all(this.snapshot());}
      return;
    }
    this.time+=dt;
    const plist=[...this.players.values()];

    // versus: nobody gets back up - a fallen player is out for good and spectates the rest
    if(this.vs)for(const p of plist)if(p.st==='down'){p.st='dead';p.hp=0;this.push('died',p.id);}
    // versus: the last one standing wins
    if(this.vs&&!this.vsKeep&&!this.vsWin&&(this.state==='fight'||this.state==='rest')&&this.vsN>=2){
      const alive=plist.filter(p=>p.st==='alive');
      if(alive.length===1){this.vsWin={id:alive[0].id,pend:true,t:30};this.vsWinner=alive[0].id;this.push('vswin',alive[0].id);}
    }
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
        if(p.rvProg>=3){const rvr=plist.find(q=>q.id!==p.id&&q.st==='alive'&&q.rvTarget===p.id);if(rvr)rvr.rvd=(rvr.rvd|0)+1;p.st='alive';p.hp=55;p.rvProg=0;p.car=-1;p.rvTarget=0;p.lastHit=this.time;this.push('revived',p.id);}
        else if(p.bleed<=0&&this.state!=='rest'){p.st='dead';this.push('died',p.id);}
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
      this.fightT=(this.fightT||0)+dt;
      if(!this.queue.length)this.emptyT=(this.emptyT||0)+dt;else this.emptyT=0;
      if(!this.queue.length&&this.emptyT>10){   // only the must-kill specials are left: tell everyone, and after a while a hiding stalker comes out to hunt
        const must=a=>true;
        if(this.aliens.length&&this.aliens.every(a=>must(a)||a.t===15)&&this.aliens.some(must)&&this.aliens.length<=8){
          if(!this.huntNote){this.huntNote=1;this.push('hunt',[...new Set(this.aliens.filter(must).map(a=>a.t))]);}
          if(this.emptyT>45)for(const a of this.aliens)if(a.hide&&AT[a.t].stalker){a.hide=false;this.push('stalk',a.id);}
        }
      }
      if(this.round>=6&&this.emptyT>25&&this.aliens.length<=6){   // safety net: a far-off straggler gets dropped closer so the round can finish
        const al=plist.filter(p=>p.st==='alive');
        if(al.length)for(const a of this.aliens){const D=AT[a.t];if((a.t>=19&&a.t<=24)||D.loner||D.boss||D.giant||D.fly||D.sniper||D.stalker||a.dorm||a.hide||a.reloc)continue;
          let tp=al[0],bd=1e9;for(const p of al){const d=Math.hypot(a.x-p.x,a.z-p.z);if(d<bd){bd=d;tp=p;}}
          if(bd<90)continue;
          for(let k=0;k<12;k++){const an=this.rand()*6.283,x=tp.x+Math.cos(an)*60,z=tp.z+Math.sin(an)*60;if(Math.abs(x)>HALF-8||Math.abs(z)>HALF-8||inBuilding(x,z,1)||groundAt(x,z)>0.5)continue;a.x=x;a.z=z;a.reloc=1;break;}}
      }
      // stuck failsafe: a ground alien that has hardly moved for ~10 s while far from everyone gets dropped back into the fight
      this.stuckT=(this.stuckT||0)+dt;
      if(this.stuckT>=2){
        this.stuckT=0;
        const al=plist.filter(p=>p.st==='alive');
        if(al.length)for(const a of this.aliens){
          const D=AT[a.t];if(D.boss||D.giant||D.fly||D.perch||D.loner||D.sniper||(a.t>=19&&a.t<=24)||a.dorm||a.hide||a.guard)continue;
          let tp=al[0],bd=1e9;for(const p of al){const d=Math.hypot(a.x-p.x,a.z-p.z);if(d<bd){bd=d;tp=p;}}
          if(a.sx===undefined||Math.hypot(a.x-a.sx,a.z-a.sz)>2.5||bd<14){a.sx=a.x;a.sz=a.z;a.stk=0;continue;}
          if(++a.stk<5)continue;   // 5 checks x 2 s
          a.stk=0;a.sx=a.x;a.sz=a.z;
          for(let k=0;k<20;k++){const an=this.rand()*6.283,x=tp.x+Math.cos(an)*(45+this.rand()*30),z=tp.z+Math.sin(an)*(45+this.rand()*30);
            if(Math.abs(x)>HALF-8||Math.abs(z)>HALF-8||inBuilding(x,z,1)||groundAt(x,z)>0.5||BLOCK[cellOf(x,z)])continue;
            a.x=x;a.z=z;a.vx=a.vz=0;a.sx=x;a.sz=z;break;}
        }
      }
      const hardCap=this.hardCap(),cap0=Math.min(hardCap,22+6*(plist.length-1)+Math.floor(this.round*1.5)),cap=this.round%5===0?Math.min(cap0,8+3*(plist.length-1)):this.round>=6?Math.min(cap0,6+2*Math.floor(this.fightT/2.5)+2*(plist.length-1)):cap0;   // later rounds fill up gradually instead of one big rush
      while(this.queue.length&&this.aliens.length<cap&&this.spawnT<=0){
        const nt=this.queue.shift();
        if(((nt>=19&&nt<=24)||nt===14)&&this.aliens.some(o=>o.t===nt))continue;   // that special is already out there waiting
        if(this.round>=1&&!AT[nt].fly&&!AT[nt].boss&&!AT[nt].support&&!AT[nt].loner&&this.rand()<0.22)this.spawnFarGroup(nt);else this.spawnAlien(nt);
        this.spawnT=this.round>=6?Math.min((0.7+this.rand()*0.6)/(1+0.35*(plist.length-1)),Math.max(0.2,40/(this.q0||40))*(0.7+this.rand()*0.6)):Math.max(0.3,1.0-this.round*0.03)*Math.min(1,0.45+0.1*this.round);
      }
      if(!this.queue.length&&this.aliens.length===0)this.endRound();   // EVERY alien must be dead before the round ends: bosses, the pirate captain, the sharks, the stalker, the Butcher and roof snipers alike   // the stalker, the Butcher and every boss (even a hidden or perched one) must be dead before the round can end   // (a rooftop sniper nobody can find for 2.5 min stops holding the round open)   // hidden specials (pizza/movie/Cleopatra) never hold a round open
      else if(plist.every(p=>p.st!=='alive')){
        this.state='over';this.timer=10;
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
    this.updateOrbs(dt,plist);this.updateBeach(dt,plist);
    this.updateCars(dt,plist);
    this.updateFx(dt);

    this.snapT-=dt;
    if(this.snapT<=0){this.snapT=0.05;this.out.all(this.snapshot());}
  }

  updateAliens(dt,plist){
    const alive=plist.filter(p=>p.st==='alive');
    for(const a of this.aliens){
      const def=AT[a.t];
      if(a.t===23){const fw=WORLD.themes.find(q=>q.k==='ferris');if(fw){const wp=this.wheelPos(fw);a.x=wp.x;a.z=wp.z;a.y=wp.y;a.vx=a.vz=0;}}   // he is carried round on his gondola
      a.cd-=dt;a.rt-=dt;a.tT-=dt;a.ph+=dt*3;
      if(a.dorm){
        a.dormT-=dt;
        let near=1e9;for(const p of alive){const d=Math.hypot(p.x-a.x,p.z-a.z);if(d<near)near=d;}
        if(near<85||a.dormT<=0||(this.round>=6&&this.emptyT>4))a.dorm=false;
        else{
          const ang=a.ph*0.12+a.id;a.vx=Math.cos(ang)*1.8;a.vz=Math.sin(ang)*1.8;
          a.x+=a.vx*dt;a.z+=a.vz*dt;pushOut(a,Math.min(a.r,1.8));a.yaw=Math.atan2(a.vx,a.vz);
          continue;
        }
      }
      if(a.tT<=0){
        a.tT=0.4;
        let best=1e9,bp=null;
        for(const p of alive){if(this.inCasino(p))continue;const tp=this.targetPos(p);const d=Math.hypot(tp.x-a.x,tp.z-a.z);if(d<best){best=d;bp=p;}}
        if(bp){a.tgt=bp.id;
          const tp=this.targetPos(bp);
          a.los=best<(a.t===23?220:70)&&rayWorld(a.x,(AT[a.t].perch?a.y:0)+1.5,a.z,(tp.x-a.x)/best,0,(tp.z-a.z)/best,best)>=best-0.5;}
      }
      const tp0=this.players.get(a.tgt);
      if(!tp0||tp0.st!=='alive'){continue;}
      const tp=this.targetPos(tp0);
      const dx=tp.x-a.x,dz=tp.z-a.z,dist=Math.hypot(dx,dz)||1;
      a.yaw=Math.atan2(dx,dz);
      if(def.sniper){this.updateSniper(a,tp0,tp,dx,dz,dist,dt);continue;}
      if(a.guard){   // pizza / movie aliens stay at their spawn until someone comes near
        if(a.t===27?dist<48:(a.los&&dist<70))a.guard=false;else{a.vx=a.vz=0;continue;}   // wakes only once a player is actually in sight
      }
      if(def.stalker&&a.hide){   // hiding: stands still until a player walks into the building it is hiding in
        a.vx=a.vz=0;const hh=a.hh;
        let wake=false;if(hh){for(const q of this.players.values()){if(q.st==='alive'&&Math.abs(q.x-hh.x)<hh.S/2+1&&Math.abs(q.z-hh.z)<hh.S/2+1&&q.y<hh.H){wake=true;break;}}}else wake=a.los&&dist<14;
        if(!wake&&a.los&&dist<20)wake=true;   // or a player looks in through the door
        if(wake){a.hide=false;this.push('stalk',a.id);}
        continue;
      }
      let mx=0,mz=0,speed=a.sp;
      if(def.stalker)speed=(a.enr||dist<16)?a.sp*(def.saw?2.2:2.0):a.sp;
      if(a.slowT>0){a.slowT-=dt;speed*=0.5;}
      if(this.round>=6&&this.emptyT>0&&this.aliens.length<=6&&!def.loner&&!def.boss&&!def.giant&&!def.stalker)speed*=1+Math.min(0.9,this.emptyT/20);   // last few stragglers speed up so a round never drags
      if(this.weather===6)speed*=1.2;   // aurora: aliens are restless
      speed=Math.min(speed,SPEED_CAP*(a.spm||1));   // nothing ever outruns the cap (stalkers' cap rises with their speed boost)
      if(def.beach){   // the shark flies: it cruises over the beach until someone gets close or hurts it, then it hunts anywhere on the map firing lasers
        if(!a.agro&&(dist<130||a.hp<a.mhp-1))a.agro=true;
        const big=a.t===26;
        let gx,gz,sp2,hy;
        if(a.agro){
          const D=big?60:38,rad=Math.hypot(a.x-tp.x,a.z-tp.z)||1;
          if(dist>D+10){gx=tp.x;gz=tp.z;sp2=speed;}
          else{   // circle the target at a distance
            const sgn=(a.id%2?1:-1),px=-(a.z-tp.z)/rad*sgn,pz=(a.x-tp.x)/rad*sgn,pull=(rad-D)*0.08;
            gx=a.x+px*40-(a.x-tp.x)/rad*pull*40;gz=a.z+pz*40-(a.z-tp.z)/rad*pull*40;sp2=speed*0.75;
          }
          hy=Math.max(0,tp0.y-EYE)+(big?34:18)+Math.sin(a.ph*0.5)*3;
        }else{
          if(a.px===undefined||Math.abs(a.x-a.px)<8)a.px=(this.rand()-0.5)*280;
          gx=a.px;gz=HALF+38;sp2=speed*0.35;hy=big?32:15;
        }
        const gl=Math.hypot(gx-a.x,gz-a.z)||1;
        a.vx+=((gx-a.x)/gl*sp2-a.vx)*Math.min(1,dt*4);a.vz+=((gz-a.z)/gl*sp2-a.vz)*Math.min(1,dt*4);
        a.x+=a.vx*dt;a.z+=a.vz*dt;a.y+=(hy-a.y)*Math.min(1,dt*2);
        if(!a.agro)a.z=clamp(a.z,HALF+16,HALF+62);
        a.yaw=Math.atan2(a.vx,a.vz);
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
          if(!(a.los&&dist<45)&&!(tp0.y-EYE>1.2&&tp0.y-EYE<14&&dist<80)||want<0){
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
        if(!def.giant&&!def.perch){
          // ground aliens can jump up low ledges (pyramid steps, crates, curbs) so they can chase you up the pyramid
          let fy=a.fy===undefined?(a.y||0):a.fy;
          pushOut(a,Math.min(a.r,1.8),fy);
          const gr=groundAt(a.x,a.z,fy,0.3);
          a.vy=(a.vy||0)-28*dt;fy+=a.vy*dt;
          if(fy<=gr){fy=gr;a.vy=0;a.gnd=true;}else a.gnd=false;
          const vl=Math.hypot(a.vx,a.vz);
          if(a.gnd&&vl>1.2){
            const ahead=groundAt(a.x+a.vx/vl*(a.r+1.1),a.z+a.vz/vl*(a.r+1.1),fy+2.0,0.3);
            if(ahead>fy+0.7&&ahead<=fy+2.2){a.vy=9.6;a.gnd=false;}
          }
          a.fy=fy;a.y=fy;
        }
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
          else if(def.tipsy)this.push('drunk',tp0.id,10);
          else this.hurt(tp0,a.dmg,a.x,a.z);
        }
      }
      if(a.t===23){   // CARNIVAL BOSS rides the wheel with a sniper rifle: a red line charges for 1.4 s, then one heavy shot
        const ty=tp0.y-EYE*0.35;
        if(a.snT>0){a.snT-=dt;if(a.snT<=0){this.fireOrb(a,tp.x,ty,tp.z,0,150,a.dmg*3.4);a.cd=2.4+this.rand()*0.8;}}
        else if(a.cd<=0&&a.los&&dist<220){a.snT=1.4;this.push('snipe',a.id,tp0.id,1.4);}
      }
      if(def.ranged&&a.t!==23&&a.cd<=0&&(dist<60||a.t===12||(def.beach&&dist<190))){
        const ty=tp0.y-EYE*0.35;
        let seen=a.los;
        if(a.t===12)seen=true;   // Godzilla's blasts reach anywhere on the map
        if(def.fly||def.beach){const d3=Math.hypot(dx,a.y+0.5-ty,dz)||1;seen=rayWorld(a.x,a.y+0.5,a.z,dx/d3,(ty-a.y-0.5)/d3,dz/d3,d3)>=d3-0.5;}
        if(seen){
          if(a.t===17){
            a.cd=2.2;
            for(let i=-4;i<=4;i++){
              const ang=Math.atan2(dx,dz)+i*0.11;
              this.fireOrb(a,a.x+Math.sin(ang)*60,ty,a.z+Math.cos(ang)*60,0.04,50,30*soft(1+0.03*this.round,2.5,0.2));
            }
          }else if(a.t===18||a.t===26){   // ALIEN SHARK: fast lasers
            const big=a.t===26;
            if(!a.agro)a.cd=1;
            else{
              a.cd=big?0.3:0.38;
              for(let i=0;i<(big?2:1);i++)this.fireOrb(a,tp.x+(i?(this.rand()-0.5)*5:0),ty,tp.z,0.02,big?130:115,a.dmg*(big?0.75:0.55));
            }
          }else if(a.t===12){
            a.cd=2.2;
            const rg=Math.max(60,dist);
            for(let i=-4;i<=4;i++){
              const ang=Math.atan2(dx,dz)+i*(dist>150?0.035:0.1);
              this.fireOrb(a,a.x+Math.sin(ang)*rg,ty,a.z+Math.cos(ang)*rg,0.02,95,44*soft(1+0.03*this.round,2.5,0.2));
            }
          }else if(a.t===4){
            a.cd=3.0;
            for(let i=-2;i<=2;i++){
              const ang=Math.atan2(dx,dz)+i*0.16;
              this.fireOrb(a,a.x+Math.sin(ang)*30,ty,a.z+Math.cos(ang)*30,0.04,42,20*soft(1+0.03*this.round,2.5,0.2));
            }
          }else if(a.t===22){      // PIRATE CAPTAIN: cannonballs, three at a time
            a.cd=1.9+this.rand()*0.5;
            for(let i=-2;i<=2;i++){const ang=Math.atan2(dx,dz)+i*0.17;this.fireOrb(a,a.x+Math.sin(ang)*40,ty,a.z+Math.cos(ang)*40,0.05,30,a.dmg);}
          }else if(a.t===21){      // CLEOPATRA: golden bolts from her staff
            a.cd=1.5+this.rand()*0.5;
            for(let i=-2;i<=2;i++){const ang=Math.atan2(dx,dz)+i*0.14;this.fireOrb(a,a.x+Math.sin(ang)*40,ty,a.z+Math.cos(ang)*40,0.04,40,a.dmg);}
          }else if(a.t===20){      // MOVIE ALIEN: a fan of popcorn
            a.cd=2.2+this.rand()*0.6;
            for(let i=-2;i<=2;i++){const ang=Math.atan2(dx,dz)+i*0.14;this.fireOrb(a,a.x+Math.sin(ang)*40,ty,a.z+Math.cos(ang)*40,0.04,30,a.dmg);}
          }else if(a.t===25){      // TIPSY ALIEN: lobs bottles - a hit makes you drunk instead of hurting you
            a.cd=1.7+this.rand()*0.8;
            this.fireOrb(a,tp.x,ty,tp.z,0.07,30,0);
          }else if(a.t===27){      // BASEBALL SLUGGER: fast pitches, every third throw is a three-ball spread
            a.bn=(a.bn||0)+1;const bm=Math.min(1.6,1+0.08*Math.max(0,Math.floor((this.round-17)/10)));   // baseballs get 8% faster every appearance, up to +60%
            if(a.bn%3===0){a.cd=2.0+this.rand()*0.4;for(let i=-1;i<=1;i++){const ang=Math.atan2(dx,dz)+i*0.13;this.fireOrb(a,a.x+Math.sin(ang)*40,ty,a.z+Math.cos(ang)*40,0.03,46*bm,a.dmg*0.8);}}
            else{a.cd=1.1+this.rand()*0.4;this.fireOrb(a,tp.x,ty,tp.z,0.025,58*bm,a.dmg);}
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
          if(a.telT<=0){this.resolveTel(a,alive);a.tel=null;a.atkT=a.t===4?7:a.t===12?6.5:11;}
        }else{
          a.atkT=(a.atkT===undefined?4:a.atkT)-dt;
          if(a.atkT<=0&&(dist<130||a.t===12))this.startTel(a,tp,dx,dz,dist,alive);
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
        if(a.sumT<=0&&this.aliens.length+7<=this.hardCap()){a.sumT=13;this.push('summon',r2(a.x),r2(a.z));
          const kinds=[0,2,5,13,3,0];for(let i=0;i<7;i++){const ang=i/7*6.283,rr=20+this.rand()*8;this.spawnAlien(kinds[i%kinds.length],a.x+Math.cos(ang)*rr,a.z+Math.sin(ang)*rr);}}
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

  /* beach crabs: wander the sand, scuttle away from players, drop a little cash when shot; the pirate ship fires cannons while the pirate captain lives */
  updateBeach(dt,plist){
    const alive=plist.filter(p=>p.st==='alive');
    while(this.crabs.length<12&&this.time>=this.crabT){
      this.crabs.push({id:this.nid++,x:(this.rand()-0.5)*620,z:HALF+22+this.rand()*38,yaw:this.rand()*6.28,hd:this.rand()*6.28,ht:0});
      if(this.crabs.length>=12)break;
    }
    for(const c of this.crabs){
      let near=1e9,np=null;for(const p of alive){const d=Math.hypot(p.x-c.x,p.z-c.z);if(d<near){near=d;np=p;}}
      c.ht-=dt;if(c.ht<=0){c.ht=1+this.rand()*3;c.hd=this.rand()*6.28;}
      let sp=1.2,hx=Math.cos(c.hd),hz=Math.sin(c.hd);
      if(np&&near<14){const l=near||1;hx=(c.x-np.x)/l;hz=(c.z-np.z)/l;sp=9.5;}   // scuttle away
      c.x+=hx*sp*dt;c.z+=hz*sp*dt;
      if(c.x<-340||c.x>340){c.x=clamp(c.x,-340,340);c.hd=Math.PI-c.hd;}
      if(c.z<HALF+20||c.z>HALF+62){c.z=clamp(c.z,HALF+20,HALF+62);c.hd=-c.hd;}
      c.yaw=Math.atan2(hx,hz)+Math.PI/2;
    }
    // pirate ship
    const cap=this.aliens.some(a=>a.t===22);
    if(cap&&this.state==='fight'){
      this.shipT-=dt;
      if(this.shipT<=0){
        const sh=WORLD.beach.ship;let best=null,bd=230;
        for(const p of alive){if(this.inCasino(p)||p.z<HALF+6)continue;const d=Math.hypot(p.x-sh.x,p.z-sh.z);if(d<bd){bd=d;best=p;}}
        this.shipT=3.2+this.rand()*1.5;
        if(best){
          this.push('shipfire',r2(sh.x),r2(sh.z));
          const tq=this.targetPos(best),oy=7,dx=tq.x-sh.x,dy=(best.y-EYE*0.4)-oy,dz=tq.z-sh.z,l=Math.hypot(dx,dy,dz)||1;
          for(let i=0;i<2;i++){const jx=(this.rand()-0.5)*0.06,jz=(this.rand()-0.5)*0.06;
            this.orbs.push({id:this.nid++,x:sh.x+(i?4:-4),y:oy,z:sh.z,vx:(dx/l+jx)*55,vy:dy/l*55,vz:(dz/l+jz)*55,life:6,sky:0,dmg:26*soft(1+0.025*this.round,2.5,0.2),big:5});}
        }
      }
    }
  }
  killCrab(c,p){
    const i=this.crabs.indexOf(c);if(i<0)return;this.crabs.splice(i,1);this.crabT=this.time+14;
    const cash=15+Math.min(60,this.round*3)+Math.floor(this.rand()*20);p.money+=cash;
    this.push('crab',p.id,r2(c.x),r2(c.z),cash);
  }
  updateOrbs(dt,plist){
    for(let i=this.orbs.length-1;i>=0;i--){
      const o=this.orbs[i];
      o.life-=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;
      let dead=o.life<=0||o.y<0||(!o.sky&&inBuilding(o.x,o.z,o.y));
      if(!dead)for(const p of plist){
        if(p.st!=='alive')continue;
        const tp=this.targetPos(p);
        const hr=tp.car?2.6:1.1;
        if(Math.hypot(o.x-tp.x,o.z-tp.z)<hr&&Math.abs(o.y-(tp.car?1.2+(tp.car.y||0):p.y-EYE*0.5))<(tp.car?2.2:2.0)){
          if(o.big===7)this.push('drunk',p.id,10);else this.hurt(p,o.dmg,o.x-o.vx*0.3,o.z-o.vz*0.3);dead=true;break;
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
      }else if(this.weather===5&&alive.length){   // meteor shower: big slow warnings, then a blast that leaves fire on the ground
        this.metT=(this.metT||0)-dt;
        if(this.metT<=0){this.metT=2.6-Math.min(1.2,this.round*0.02);
          const n=1+(alive.length>2?1:0);
          for(let i=0;i<n;i++){const p=alive[Math.floor(this.rand()*alive.length)],a=this.rand()*6.28,d=this.rand()*18;
            const bx=p.x+Math.cos(a)*d,bz=p.z+Math.sin(a)*d;
            this.bolts.push({x:bx,z:bz,t:2.0,m:1});this.push('meteor',r2(bx),r2(bz));}
        }
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
      if(b.t<=0&&b.m){this.bolts.splice(i,1);
        this.push('mstrike',r2(b.x),r2(b.z));
        for(const p of this.players.values()){if(p.st!=='alive')continue;const q=this.targetPos(p);if(Math.hypot(q.x-b.x,q.z-b.z)<10)this.hurt(p,34+this.round*0.5);}
        for(const a of this.aliens.slice()){if(Math.hypot(a.x-b.x,a.z-b.z)<11&&a.hp>0&&!AT[a.t].giant){a.hp-=Math.max(180,a.mhp*0.3);if(a.hp<=0){const o=[...this.players.values()][0];if(o)this.killAlien(a,o);}}}
        this.fires.push({x:b.x,z:b.z,t:6,tk:0});
        continue;
      }
      if(b.t<=0){this.bolts.splice(i,1);
        this.push('strike',r2(b.x),r2(b.z));
        for(const p of this.players.values()){if(p.st!=='alive')continue;const q=this.targetPos(p);if(Math.hypot(q.x-b.x,q.z-b.z)<7)this.hurt(p,38+this.round*0.5);}
        for(const a of this.aliens){if(Math.hypot(a.x-b.x,a.z-b.z)<8&&a.hp>0&&!AT[a.t].giant){a.hp-=Math.max(250,a.mhp*0.4);if(a.hp<=0){const o=[...this.players.values()][0];if(o)this.killAlien(a,o);}}}
      }
    }
    for(let i=this.fires.length-1;i>=0;i--){   // meteor flames burn whoever stands in them
      const f=this.fires[i];f.t-=dt;f.tk-=dt;
      if(f.t<=0){this.fires.splice(i,1);continue;}
      if(f.tk<=0){f.tk=0.5;
        for(const p of this.players.values()){if(p.st!=='alive'||p.car>=0)continue;if(Math.hypot(p.x-f.x,p.z-f.z)<7&&p.y<4)this.hurt(p,5+this.round*0.12);}
        for(const a of this.aliens.slice()){if(a.hp>0&&!AT[a.t].giant&&Math.hypot(a.x-f.x,a.z-f.z)<7){a.hp-=Math.max(8,a.mhp*0.03);if(a.hp<=0){const o=[...this.players.values()][0];if(o)this.killAlien(a,o);}}}
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
    {const C=WORLD.casino;   // the casino is a safe zone: aliens (ground and flying) cannot enter it - they are pushed back out through the nearest wall
      if(C)for(const a of this.aliens){
        const h=C.half+a.r*0.6,dx=a.x-C.x,dz=a.z-C.z;
        if(Math.abs(dx)<h&&Math.abs(dz)<h&&a.y<14){
          const ex=h-Math.abs(dx),ez=h-Math.abs(dz);
          if(ex<ez)a.x=C.x+(dx<0?-h:h);else a.z=C.z+(dz<0?-h:h);
        }
      }}
    for(const a of this.aliens.slice()){
      if(!(a.burn>0)||a.hp<=0)continue;
      a.burn-=dt;a.burnT=(a.burnT||0)-dt;
      if(a.burnT<=0){a.burnT=0.5;const o=this.players.get(a.burnOwn);if(o)this.damageAlien(a,a.burnD*0.5,o,a.x,a.y+a.cy,a.z);}
    }
  }

  updateCars(dt,plist){
    for(let i=this.cars.length-1;i>=0;i--){
      const c=this.cars[i];
      c.pax=(c.pax||[]).filter(id=>{const q=this.players.get(id);return q&&q.st==='alive'&&q.car===c.id;});
      if(c.drv>=0){const q=this.players.get(c.drv);if(!q||q.st!=='alive'||q.car!==c.id)c.drv=-1;}
      if(c.drv<0&&c.pax.length)c.drv=c.pax.shift();   // first one in drives
      for(const id of c.pax){const q=this.players.get(id);q.x=c.x;q.z=c.z;q.y=EYE+(c.y||0);}
      if(CARS[c.t].kind==='heli'){   // gunship ammo: land and sit still for a few seconds to recharge
        const mx=CARS[c.t].ammo;if(c.am===undefined){c.am=mx;c.ch=0;}
        if(c.am<mx&&(c.y||0)<=1.2&&Math.abs(c.sp||0)<2){c.ch+=dt;if(c.ch>=HELI_RECHARGE){c.am=mx;c.ch=0;this.push('heliok',c.id);}}else if((c.y||0)>1.2||Math.abs(c.sp||0)>=2)c.ch=0;
      }
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
            const crush=(cdef.kind==='truck'||cdef.kind==='tank')&&a.t===7;   // the monster truck flattens armored aliens outright
            this.damageAlien(a,crush?a.hp+1:Math.abs(c.sp)*(huge?9:big?(cdef.kind==='truck'||cdef.kind==='tank'?7:4):8)*cdef.ram,p,a.x,a.y+a.cy,a.z);
            c.hp-=1.2*(huge?35:big?(cdef.kind==='truck'||cdef.kind==='tank'?5:10):3);
            this.push('thud',r2(a.x),r2(a.z));
          }
        }
        if(c.hp<=0){
          this.wreck(c);
        }
      }
    }
  }

  snapshot(){
    const ev=this.ev;this.ev=[];
    return{
      t:'snap',tm:r2(this.time),
      rd:{mx:r2(this.mbox.x),mz:r2(this.mbox.z),mn:this.mbox.name,wa:r2(this.wheelAng()),hd:this.hard?1:0,vs:this.vs?1:0,vw:this.vsWinner|0,vp:(this.vsWin&&this.vsWin.pend)?1:0,sd:(this.sides&&(this.state==='rest'||this.state==='fight'))?this.sides.map(r2):0,w:this.weather|0,tp:this.tapes|0,h:Math.min(...this.players.keys()),n:this.round,s:this.state,tm:Math.max(0,Math.round(this.timer*10)/10),left:this.queue.length+this.aliens.length,best:this.best},
      p:[...this.players.values()].map(p=>({id:p.id,n:p.name,c:p.color,x:r2(p.x),y:r2(p.y),z:r2(p.z),yw:r2(p.yaw),pt:r2(p.pitch),
        hp:Math.round(p.hp),mh:mhp(p),pk:p.perks.reduce((m,v,i)=>m|(v?1<<i:0),0),st:p.st,m:p.money,k:p.kills,lv:p.lv,sk:p.sk,ch:p.ch,ex:p.ex,wo:p.wo,w:p.w,jo:p.jet?1:0,jl:p.jl|0,oc:p.oc|0,j:p.jfl,car:p.car,rp:r2(p.rvProg),bl:r2(p.bleed),dd:Math.round(p.dd||0),rv:p.rvd|0,dn:p.dn|0,bk:p.bk|0})),
      a:this.aliens.map(a=>[a.id,a.t,r2(a.x),r2(a.y),r2(a.z),r2(a.yaw),Math.max(0,Math.round(a.hp/a.mhp*100)),Math.round(a.vx*10)/10,a.dorm?1:0,a.burn>0?1:0,a.hide?1:0,a.mut|0,a.tel?{T:r2(a.telT),D:a.telD,s:a.tel.map(q=>q.k==='c'?[0,r2(q.x),r2(q.z),q.r]:[1,r2(q.x),r2(q.z),r2(q.dx),r2(q.dz),q.w,q.len])}:0,a.veh>=0?a.veh+1:0]),
      o:this.orbs.map(o=>[o.id,r2(o.x),r2(o.y),r2(o.z),o.big]),
      cr:this.crabs.map(c=>[c.id,r2(c.x),r2(c.z),r2(c.yaw)]),
      c:this.cars.map(c=>({id:c.id,t:c.t,x:r2(c.x),z:r2(c.z),h:r2(c.h),hp:Math.round(c.hp),d:c.drv,px:c.pax||[],sp:r2(c.sp||0),k:c.k|0,y:r2(c.y||0),am:c.am,ch:c.ch?Math.round(c.ch):0})),
      g:this.clouds.map(c=>[c.id,r2(c.x),r2(c.y),r2(c.z),r2(c.r),r2(c.life)]),
      lo:this.loot.map(v=>v?1:0).join(''),
      ev
    };
  }
}

const API={PERKS,mhp,PADS,MAXLV,xpNeed,SKINS,CSKINS,GARAGE_ITEMS,MAXUP,UPCOST,AMMO_ALL,newWo,EYE,clamp,mulberry32,N,P,HALF,BOUNDS,PLAYER_COLORS,CH_SUITS,CH_HATS,CH_SHADES,CH_SHIRTS,CH_JACKETS,CH_CHAINS,CH_SHOES,CH_FACES,CH_BACKS,CH_LISTS,WPN,DMG_MULT,MAG_MULT,UP_COST,AMMO_COST,CARS,AT,
  genWorld,DISTRICTS,distAt,SEED,WORLD,B,LOOT,HOUSES,JET_COST,MBOX_COST,JET_UP,jetMax,topOf,groundAt,ceilAt,STATIONS:SHOP,GARAGE_SPAWNS,pushOut,inBuilding,rayWorld,raySphere,spreadDirs,BLOCK,cellOf,buildFlow,flowStep,TITLES,BADGES,NAME_COLS,FRAMES,CAMOS,KFX,ACH,EXLISTS,EX_NAMES,itemOpen,achProgress,achRewards,Game};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.NI=API;
})(typeof self!=='undefined'?self:this);
