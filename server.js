/* NEON INVASION - multiplayer server
   Run:  npm install   then   node server.js
   Serves the game files AND hosts the WebSocket rooms on the same port. */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const NI=require('./shared.js');

const PORT=process.env.PORT||8080;
const MAX_PER_ROOM=8,MAX_ROOMS=60;
const FILES={'/':'index.html','/index.html':'index.html','/game.html':'game.html','/shared.js':'shared.js','/song.mp3':'song.mp3'};
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp3':'audio/mpeg'};

const scoreHits=new Map();
const server=http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
  if(url.startsWith('/api/')){handleApi(req,res,url);return;}
  if(url==='/health'){res.writeHead(200);res.end('ok');return;}
  if(url==='/score'){
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
    if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return;}
    if(req.method!=='POST'){res.writeHead(405,cors);res.end();return;}
    const ip=req.socket.remoteAddress||'?',now=Date.now();
    const hits=(scoreHits.get(ip)||[]).filter(t=>now-t<60000);
    if(hits.length>=10){res.writeHead(429,cors);res.end('slow down');return;}
    hits.push(now);scoreHits.set(ip,hits);
    let body='';req.on('data',d=>{body+=d;if(body.length>2000)req.destroy();});
    req.on('end',()=>{
      try{
        const m=JSON.parse(body),rounds=Math.floor(+m.rounds),kills=Math.floor(+m.kills)||0;
        if(!(rounds>0)||rounds>300||kills<0||kills>200000)throw new Error('bad');
        recordLB([{name:cleanName(m.name,0)==='PLAYER0'?'PLAYER':cleanName(m.name,0),rounds,kills,lv:Math.min(99,Math.max(1,Math.floor(+m.lv)||1))}]);
        res.writeHead(200,{...cors,'Content-Type':'application/json'});res.end(JSON.stringify(topLB(10)));
      }catch(e){res.writeHead(400,cors);res.end('bad score');}
    });
    return;
  }
  if(url==='/leaderboard'){
    res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'});
    res.end(JSON.stringify(topLB(25)));return;
  }
  let f=FILES[url];
  if(!f){const mm=/^\/(?:radio\/)?([a-z0-9]{1,3}\.mp3)$/.exec(url);   // songs can sit beside index.html or inside a radio/ folder
    if(mm)f=fs.existsSync(path.join(__dirname,mm[1]))?mm[1]:'radio/'+mm[1];}
  if(!f){res.writeHead(404);res.end('not found');return;}
  const fp=path.join(__dirname,f);
  fs.stat(fp,(err,st)=>{
    if(err){res.writeHead(404);res.end('missing '+f);return;}
    const type=TYPES[path.extname(f)]||'application/octet-stream';
    const range=req.headers.range;
    if(range){ // audio needs range support (Safari)
      const m=/bytes=(\d*)-(\d*)/.exec(range)||[];
      const start=m[1]?parseInt(m[1],10):0,end=m[2]?parseInt(m[2],10):st.size-1;
      res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1});
      fs.createReadStream(fp,{start,end}).pipe(res);
    }else{
      res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});
      fs.createReadStream(fp).pipe(res);
    }
  });
});

/* ---------------- leaderboard (rounds survived) ----------------
   Saved to leaderboard.json next to server.js. NOTE: free hosts like Render wipe local files when the server
   restarts or redeploys. To keep the board forever, set the optional env vars UPSTASH_REDIS_REST_URL and
   UPSTASH_REDIS_REST_TOKEN (free Upstash Redis database) and the board is stored there instead. */
const LB_FILE=process.env.LB_FILE||path.join(__dirname,'leaderboard.json');
const UP_URL=process.env.UPSTASH_REDIS_REST_URL,UP_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN;
let lb=[],lbTimer=null;
async function upstash(cmd){
  const r=await fetch(UP_URL,{method:'POST',headers:{Authorization:'Bearer '+UP_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd)});
  return r.json();
}
async function loadLB(){
  try{
    if(UP_URL&&UP_TOKEN){const j=await upstash(['GET','ni_leaderboard']);if(j&&j.result)lb=JSON.parse(j.result);console.log('leaderboard loaded from Upstash:',lb.length,'entries');}
    else if(fs.existsSync(LB_FILE)){lb=JSON.parse(fs.readFileSync(LB_FILE,'utf8'));console.log('leaderboard loaded:',lb.length,'entries');}
  }catch(e){console.error('could not load leaderboard',e.message);lb=[];}
  if(!Array.isArray(lb))lb=[];
}
function saveLB(){
  clearTimeout(lbTimer);
  lbTimer=setTimeout(async()=>{
    const json=JSON.stringify(lb);
    try{
      if(UP_URL&&UP_TOKEN)await upstash(['SET','ni_leaderboard',json]);
      else fs.writeFileSync(LB_FILE,json);
    }catch(e){console.error('could not save leaderboard',e.message);}
  },500);
}
const sortLB=()=>lb.sort((a,b)=>b.r-a.r||b.k-a.k||a.t-b.t);
function recordLB(list){
  let changed=false;
  for(const e of list){
    if(!(e.rounds>0))continue;
    const key=String(e.name).toUpperCase();
    const old=lb.find(x=>x.n.toUpperCase()===key);
    const entry={n:e.name,r:e.rounds,k:e.kills|0,l:e.lv|0,t:Date.now()};
    if(!old){lb.push(entry);changed=true;}
    else if(entry.r>old.r||(entry.r===old.r&&entry.k>old.k)){Object.assign(old,entry);changed=true;}
  }
  if(changed){sortLB();if(lb.length>200)lb.length=200;saveLB();}
}
const topLB=n=>lb.slice(0,n).map(x=>({n:x.n,r:x.r,k:x.k,l:x.l}));
loadLB();


/* ---------------- accounts, cloud saves and friends ----------------
   Optional name + password accounts: they keep your level and outfit online and unlock the friends list.
   Stored in accounts.json next to server.js, or in Upstash Redis when UPSTASH_REDIS_REST_URL / TOKEN are set
   (use Upstash on free hosts like Render - local files are wiped on every restart there). */
const crypto=require('crypto');
const ACC_FILE=process.env.ACC_FILE||path.join(__dirname,'accounts.json');
let accFile={},accTimer=null;
const accCache=new Map();   // NAME -> account (kept in memory, written through)
try{if(!(UP_URL&&UP_TOKEN)&&fs.existsSync(ACC_FILE)){accFile=JSON.parse(fs.readFileSync(ACC_FILE,'utf8'))||{};console.log('accounts loaded:',Object.keys(accFile).length);}}catch(e){console.error('could not load accounts',e.message);}
async function accGet(key){
  if(accCache.has(key))return accCache.get(key);
  let a=null;
  if(UP_URL&&UP_TOKEN){try{const j=await upstash(['GET','ni_acct:'+key]);if(j&&j.result)a=JSON.parse(j.result);}catch(e){console.error('acct get',e.message);}}
  else a=accFile[key]||null;
  if(a)accCache.set(key,a);
  return a;
}
function accSave(a){
  const key=a.name.toUpperCase();accCache.set(key,a);
  if(UP_URL&&UP_TOKEN){upstash(['SET','ni_acct:'+key,JSON.stringify(a)]).catch(e=>console.error('acct save',e.message));}
  else{accFile[key]=a;clearTimeout(accTimer);accTimer=setTimeout(()=>{try{fs.writeFileSync(ACC_FILE,JSON.stringify(accFile));}catch(e){console.error('could not save accounts',e.message);}},700);}
}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const hashPw=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString('hex');
const lvOf=xp=>{let L=1,x=Math.max(0,xp|0);while(L<NI.MAXLV&&x>=NI.xpNeed(L)){x-=NI.xpNeed(L);L++;}return L;};
const presence=new Map();   // NAME -> {t, st, round}   (solo play and menu heartbeats)
const roomAccts=new Map();  // ws -> NAME for players inside online rooms
function cleanAcctName(n){
  n=String(n||'').replace(/[^\w\-]/g,'').trim().slice(0,12).toUpperCase();
  const sq=n.replace(/[^A-Z]/g,'');
  if(n.length<3||BAD.some(b=>sq.includes(b))||/^PLAYER\d*$/.test(n))return '';
  return n;
}
const apiHits=new Map();
function apiLimited(ip,max){const now=Date.now(),h=(apiHits.get(ip)||[]).filter(t=>now-t<60000);if(h.length>=max)return true;h.push(now);apiHits.set(ip,h);return false;}
async function authed(m){
  if(!m||typeof m.name!=='string'||typeof m.token!=='string')return null;
  const a=await accGet(String(m.name).toUpperCase());
  if(!a)return null;const h=sha(m.token);
  return a.toks&&a.toks.includes(h)?a:null;
}
const profOf=a=>({name:a.name,xp:a.xp|0,skin:a.skin|0,car:a.car|0,ch:a.ch||[],ex:a.ex||[],ach:a.ach||[],st:a.st||null,dex:a.dex||[],best:a.best|0});
function whereIs(name){
  for(const r of rooms.values())for(const [w,n] of roomAccts)if(n===name&&r.clients&&[...r.clients.values()].includes(w))return{st:'room',room:r.code,round:r.game.round|0,state:r.game.state,pl:r.clients.size};
  const p=presence.get(name);
  if(p&&Date.now()-p.t<45000)return{st:p.st,round:p.round|0};
  return{st:'off'};
}
async function friendList(a){
  const out=[];
  for(const n of a.friends||[]){const f=await accGet(n);if(!f)continue;out.push({n:f.name,l:lvOf(f.xp),...whereIs(f.name.toUpperCase()),best:f.best|0,ex:f.ex||[]});}
  out.sort((x,y)=>(x.st==='off')-(y.st==='off')||y.l-x.l);
  return{friends:out,incoming:(a.inReq||[]).slice(0,20),outgoing:(a.outReq||[]).slice(0,20)};
}
async function handleApi(req,res,url){
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const J=(code,obj)=>{res.writeHead(code,{...cors,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return;}
  if(req.method!=='POST'){J(405,{err:'POST only'});return;}
  const ip=req.socket.remoteAddress||'?';
  const authUrl=url==='/api/login'||url==='/api/register';
  if(apiLimited(ip+(authUrl?'a':url==='/api/sync'?'s':'f'),authUrl?12:url==='/api/sync'?30:40)){J(429,{err:'Slow down a little.'});return;}
  let body='';req.on('data',d=>{body+=d;if(body.length>4000)req.destroy();});
  req.on('end',async()=>{
    let m;try{m=JSON.parse(body||'{}');}catch(e){J(400,{err:'bad request'});return;}
    try{
      if(url==='/api/register'){
        const name=cleanAcctName(m.name),pw=String(m.pass||'');
        if(!name){J(400,{err:'Pick a name of 3-12 letters or numbers.'});return;}
        if(pw.length<4||pw.length>40){J(400,{err:'Password must be 4-40 characters.'});return;}
        if(await accGet(name)){J(409,{err:'That name is taken.'});return;}
        const salt=crypto.randomBytes(12).toString('hex'),token=crypto.randomBytes(20).toString('hex');
        const a={name,salt,hash:hashPw(pw,salt),toks:[sha(token)],xp:Math.max(0,Math.min(2000000,m.xp|0)),skin:m.skin|0,car:m.car|0,ch:Array.isArray(m.ch)?m.ch.slice(0,12).map(v=>v|0):[],ex:Array.isArray(m.ex)?m.ex.slice(0,6).map(v=>Math.max(0,Math.min(99,v|0))):[],ach:Array.isArray(m.ach)?m.ach.filter(x=>typeof x==='string'&&NI.ACH.some(q=>q.id===x)):[],st:null,friends:[],inReq:[],outReq:[],best:0,created:Date.now()};
        accSave(a);J(200,{token,prof:profOf(a),...await friendList(a)});return;
      }
      if(url==='/api/login'){
        const name=String(m.name||'').replace(/[^\w\-]/g,'').toUpperCase(),a=await accGet(name);
        if(!a||hashPw(String(m.pass||''),a.salt)!==a.hash){J(401,{err:'Wrong name or password.'});return;}
        const token=crypto.randomBytes(20).toString('hex');a.toks=[...(a.toks||[]).slice(-4),sha(token)];accSave(a);
        J(200,{token,prof:profOf(a),...await friendList(a)});return;
      }
      const a=await authed(m);
      if(!a){J(401,{err:'Please log in again.'});return;}
      if(url==='/api/sync'){   // heartbeat: save progress, report where I am, get my friends
        if(m.prof&&typeof m.prof==='object'){
          const p=m.prof;
          if(Number.isFinite(+p.xp)&&+p.xp>(a.xp|0))a.xp=Math.min(2000000,Math.floor(+p.xp));
          a.skin=p.skin|0;a.car=p.car|0;if(Array.isArray(p.ch))a.ch=p.ch.slice(0,12).map(v=>v|0);
          if(Array.isArray(p.ex))a.ex=p.ex.slice(0,6).map(v=>Math.max(0,Math.min(99,v|0)));
          if(Array.isArray(p.ach)){const set=new Set(a.ach||[]);for(const x of p.ach)if(typeof x==='string'&&NI.ACH.some(q=>q.id===x))set.add(x);a.ach=[...set];}
          if(Array.isArray(p.dex)){const ds=new Set(a.dex||[]);for(const v of p.dex)if(Number.isInteger(v)&&v>=0&&v<40)ds.add(v);a.dex=[...ds].sort((x,y)=>x-y);}
          if(p.st&&typeof p.st==='object'){const o=a.st||{wk:[]},c=(v,mx)=>Math.max(0,Math.min(mx,Math.floor(+v)||0));
            for(const k of ['k','rv','bo','br','cr','rk','gm','rt','dn','dd'])o[k]=Math.max(o[k]|0,c(p.st[k],k==='dd'?5e9:5e6));o.pt=Math.max(o.pt|0,c(p.st.pt,3e8));o.mn=Math.max(o.mn|0,c(p.st.mn,5e10));o.ak=[];for(let i=0;i<40;i++)o.ak[i]=Math.max((a.st&&a.st.ak&&a.st.ak[i])|0,c(p.st.ak&&p.st.ak[i],5e6));
            o.wk=[];for(let i=0;i<12;i++)o.wk[i]=Math.max((a.st&&a.st.wk&&a.st.wk[i])|0,c(p.st.wk&&p.st.wk[i],5e6));o.bk=[];for(let i=0;i<32;i++)o.bk[i]=Math.max((a.st&&a.st.bk&&a.st.bk[i])|0,c(p.st.bk&&p.st.bk[i],5e6));a.st=o;}
          if(Number.isFinite(+p.best)&&+p.best>(a.best|0))a.best=Math.min(300,Math.floor(+p.best));
          accSave(a);
        }
        presence.set(a.name.toUpperCase(),{t:Date.now(),st:m.st==='solo'?'solo':'menu',round:Math.min(500,m.round|0)});
        J(200,{prof:profOf(a),...await friendList(a)});return;
      }
      if(url==='/api/friend'){
        const op=String(m.op||''),tn=String(m.target||'').replace(/[^\w\-]/g,'').toUpperCase(),me=a.name.toUpperCase();
        const has=(arr,n)=>(arr||[]).some(x=>x.toUpperCase()===n),drop=(arr,n)=>(arr||[]).filter(x=>x.toUpperCase()!==n);
        const t=await accGet(tn);
        if(!t||tn===me){J(404,{err:'No player with that name.'});return;}
        t.friends=t.friends||[];t.inReq=t.inReq||[];t.outReq=t.outReq||[];a.friends=a.friends||[];a.inReq=a.inReq||[];a.outReq=a.outReq||[];
        if(op==='add'||op==='accept'){
          if(has(a.friends,tn)){J(200,{msg:'Already friends.',...await friendList(a)});return;}
          if(has(a.inReq,tn)||has(t.outReq,me)){   // they asked first: it is mutual now
            a.inReq=drop(a.inReq,tn);t.outReq=drop(t.outReq,me);a.friends.push(t.name);t.friends.push(a.name);accSave(a);accSave(t);J(200,{msg:'You are now friends with '+t.name+'.',...await friendList(a)});return;
          }
          if(a.friends.length>=50){J(400,{err:'Friend list is full (50).'});return;}
          if(!has(t.inReq,me)){t.inReq.push(a.name);if(t.inReq.length>30)t.inReq.shift();}
          if(!has(a.outReq,tn))a.outReq.push(t.name);
          accSave(a);accSave(t);J(200,{msg:'Request sent to '+t.name+'.',...await friendList(a)});return;
        }
        if(op==='decline'||op==='cancel'){a.inReq=drop(a.inReq,tn);a.outReq=drop(a.outReq,tn);t.outReq=drop(t.outReq,me);t.inReq=drop(t.inReq,me);accSave(a);accSave(t);J(200,{...await friendList(a)});return;}
        if(op==='remove'){a.friends=drop(a.friends,tn);t.friends=drop(t.friends,me);accSave(a);accSave(t);J(200,{...await friendList(a)});return;}
        J(400,{err:'bad op'});return;
      }
      J(404,{err:'unknown'});
    }catch(e){console.error('api error',e);J(500,{err:'server error'});}
  });
}

const wss=new WebSocketServer({server,maxPayload:8192});
const rooms=new Map();   // code -> {code, game, clients:Map(id->ws), nid}

function makeCode(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ';
  for(;;){let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];if(!rooms.has(c))return c;}
}
const BAD=['FUCK','SHIT','BITCH','CUNT','NIGGER','NIGGA','FAGGOT','RAPE','NAZI','HITLER','WHORE','SLUT'];
function cleanName(n,pid){
  n=String(n||'').replace(/[^\w \-]/g,'').trim().slice(0,12).toUpperCase();
  const squashed=n.replace(/[^A-Z]/g,'');
  if(!n||BAD.some(b=>squashed.includes(b)))return 'PLAYER'+pid;
  return n;
}
function getRoom(code,create){
  code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  if(!code)code=makeCode();
  let r=rooms.get(code);
  if(!r){
    if(!create||rooms.size>=MAX_ROOMS)return null;
    r={code,clients:new Map(),nid:1};
    r.game=new NI.Game({all:m=>{const s=JSON.stringify(m);for(const w of r.clients.values())if(w.readyState===1)w.send(s);}},{online:true});
    r.game.onRecord=list=>{
      recordLB(list);
      const s=JSON.stringify({t:'lb',top:topLB(10)});
      for(const w of r.clients.values())if(w.readyState===1)w.send(s);
    };
    rooms.set(code,r);
  }
  return r;
}

wss.on('connection',ws=>{
  let room=null,pid=0;
  ws.on('message',data=>{
    let m;try{m=JSON.parse(data);}catch(e){return;}
    if(!m||typeof m!=='object')return;
    if(!room){
      if(m.t!=='join')return;
      const r=getRoom(m.room,true);
      if(!r){ws.send(JSON.stringify({t:'err',msg:'Server is full. Try again later.'}));return;}
      if(r.clients.size>=MAX_PER_ROOM){ws.send(JSON.stringify({t:'err',msg:'That room is full (8 players max).'}));return;}
      room=r;pid=r.nid++;r.clients.set(pid,ws);
      let pname=cleanName(m.name,pid),plv=m.lv;
      if(m.acct&&m.tok){authed({name:m.acct,token:m.tok}).then(a=>{if(!a)return;roomAccts.set(ws,a.name.toUpperCase());a.last=Date.now();}).catch(()=>{});}
      r.game.addPlayer(pid,pname);
      r.game.setProfile(pid,plv,m.sk,m.ck,m.ch,m.ex,m.ach);
      ws.send(JSON.stringify({t:'joined',id:pid,room:r.code}));
      console.log(`[${r.code}] player ${pid} joined (${r.clients.size} in room)`);
      return;
    }
    room.game.onMsg(pid,m);
  });
  ws.on('close',()=>{
    if(!room)return;
    roomAccts.delete(ws);room.clients.delete(pid);room.game.removePlayer(pid);
    console.log(`[${room.code}] player ${pid} left (${room.clients.size} in room)`);
    if(!room.clients.size){rooms.delete(room.code);console.log(`[${room.code}] closed`);}
  });
  ws.on('error',()=>{});
});

let last=Date.now();
setInterval(()=>{
  const now=Date.now(),dt=(now-last)/1000;last=now;
  for(const r of rooms.values()){try{r.game.tick(dt);}catch(e){console.error('tick error',e);}}
},33);

server.listen(PORT,()=>{
  console.log(`NEON INVASION server on http://localhost:${PORT}`);
  console.log('Open that address in your browser. Friends on your network can use http://<your-ip>:'+PORT);
});
