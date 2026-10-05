/* NEON INVASION - multiplayer server
   Run:  npm install   then   node server.js
   Serves the game files AND hosts the WebSocket rooms on the same port. */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const NI=require('./shared.js');

const PORT=process.env.PORT||8080;
const MAX_PER_ROOM=8,MAX_ROOMS=60;
const FILES={'/':'index.html','/index.html':'index.html','/shared.js':'shared.js','/song.mp3':'song.mp3'};
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp3':'audio/mpeg'};

const scoreHits=new Map();
const server=http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
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
  const f=FILES[url];
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
      r.game.addPlayer(pid,cleanName(m.name,pid));
      r.game.setProfile(pid,m.lv,m.sk,m.ck,m.ch);
      ws.send(JSON.stringify({t:'joined',id:pid,room:r.code}));
      console.log(`[${r.code}] player ${pid} joined (${r.clients.size} in room)`);
      return;
    }
    room.game.onMsg(pid,m);
  });
  ws.on('close',()=>{
    if(!room)return;
    room.clients.delete(pid);room.game.removePlayer(pid);
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
