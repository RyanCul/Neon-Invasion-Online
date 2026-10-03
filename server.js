/* NEON SHORES: INVASION - multiplayer server
   Run:  npm install   then   node server.js
   Serves the game files AND hosts the WebSocket rooms on the same port. */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const NI=require('./shared.js');

const PORT=process.env.PORT||8080;
const MAX_PER_ROOM=8,MAX_ROOMS=60;
const FILES={'/':'index.html','/index.html':'index.html','/shared.js':'shared.js','/song.mp3':'song.mp3'};
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp3':'audio/mpeg'};

const server=http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
  if(url==='/health'){res.writeHead(200);res.end('ok');return;}
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

const wss=new WebSocketServer({server,maxPayload:8192});
const rooms=new Map();   // code -> {code, game, clients:Map(id->ws), nid}

function makeCode(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ';
  for(;;){let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];if(!rooms.has(c))return c;}
}
function getRoom(code,create){
  code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  if(!code)code=makeCode();
  let r=rooms.get(code);
  if(!r){
    if(!create||rooms.size>=MAX_ROOMS)return null;
    r={code,clients:new Map(),nid:1};
    r.game=new NI.Game({all:m=>{const s=JSON.stringify(m);for(const w of r.clients.values())if(w.readyState===1)w.send(s);}},{online:true});
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
      r.game.addPlayer(pid,m.name);
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
  console.log(`NEON SHORES: INVASION server on http://localhost:${PORT}`);
  console.log('Open that address in your browser. Friends on your network can use http://<your-ip>:'+PORT);
});
