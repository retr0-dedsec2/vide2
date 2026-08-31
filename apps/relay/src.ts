import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { BridgeActionSchema, type RelayCommand, type RelayResult, type DeviceHello } from '@bridge/protocol';

const PORT = Number(process.env.PORT ?? 8787);
const API_TOKEN = process.env.BRIDGE_MCP_TOKEN ?? 'change-me';
const DEVICE_TOKEN = process.env.BRIDGE_DEVICE_TOKEN ?? 'change-me';
const devices = new Map<string,{ws:WebSocket, capabilities:string[], lastSeen:number}>();
const pending = new Map<string,{resolve:(v:any)=>void,reject:(e:any)=>void,timer:NodeJS.Timeout}>();

function json(res:http.ServerResponse,status:number,data:any){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));}
function authorized(req:http.IncomingMessage){ return req.headers.authorization === `Bearer ${API_TOKEN}`; }
async function body(req:http.IncomingMessage){ let s=''; for await (const c of req) s += c; return s ? JSON.parse(s) : {}; }

const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  if(url.pathname==='/health') return json(res,200,{ok:true});
  if(!authorized(req)) return json(res,401,{error:'unauthorized'});
  if(req.method==='GET' && url.pathname==='/api/status') return json(res,200,{ok:true,devices:devices.size});
  if(req.method==='GET' && url.pathname==='/api/devices') return json(res,200,[...devices].map(([deviceId,d])=>({deviceId,capabilities:d.capabilities,lastSeen:d.lastSeen,online:d.ws.readyState===WebSocket.OPEN})));
  if(req.method==='POST' && url.pathname==='/api/actions'){
    try{
      const b=await body(req); const action=BridgeActionSchema.parse(b.action); const d=devices.get(String(b.deviceId));
      if(!d || d.ws.readyState!==WebSocket.OPEN) return json(res,404,{error:'device_offline'});
      const requestId=randomUUID();
      const result=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('action_timeout'));},30000);
        pending.set(requestId,{resolve,reject,timer});
        const cmd:RelayCommand={type:'command',requestId,action}; d.ws.send(JSON.stringify(cmd));
      });
      return json(res,200,result);
    }catch(e:any){ return json(res,400,{error:e.message}); }
  }
  json(res,404,{error:'not_found'});
});

const wss = new WebSocketServer({server,path:'/ws'});
wss.on('connection',(ws)=>{
  let deviceId:string|undefined;
  ws.on('message',(buf)=>{
    let msg:any; try{msg=JSON.parse(buf.toString())}catch{return}
    if(msg.type==='hello'){
      const h=msg as DeviceHello;
      if(h.token!==DEVICE_TOKEN){ws.close(1008,'bad token');return;}
      deviceId=h.deviceId; devices.set(h.deviceId,{ws,capabilities:h.capabilities,lastSeen:Date.now()});
      ws.send(JSON.stringify({type:'hello_ack',deviceId:h.deviceId})); return;
    }
    if(msg.type==='result'){
      const rr=msg as RelayResult; const p=pending.get(rr.requestId); if(p){clearTimeout(p.timer);pending.delete(rr.requestId);p.resolve(rr.result);}
    }
  });
  ws.on('close',()=>{ if(deviceId) devices.delete(deviceId); });
});
server.listen(PORT,()=>console.log(`Bridge Relay http://localhost:${PORT}`));
