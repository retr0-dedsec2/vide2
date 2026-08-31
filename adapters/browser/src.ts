import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
export class BrowserAdapter {
  private socket?:WebSocket; private pending=new Map<string,{resolve:(v:any)=>void,reject:(e:any)=>void,timer:NodeJS.Timeout}>();
  constructor(port=8765){
    const wss=new WebSocketServer({port,host:'127.0.0.1'});
    wss.on('connection',ws=>{this.socket=ws; ws.on('message',b=>{let m:any;try{m=JSON.parse(b.toString())}catch{return}; const p=this.pending.get(m.requestId);if(p){clearTimeout(p.timer);this.pending.delete(m.requestId);m.error?p.reject(new Error(m.error)):p.resolve(m.result)}}); ws.on('close',()=>{if(this.socket===ws)this.socket=undefined;});});
    console.log(`Browser adapter listening ws://127.0.0.1:${port}`);
  }
  connected(){return this.socket?.readyState===WebSocket.OPEN}
  async execute(operation:string,args:any){
    if(!this.connected()) throw new Error('Browser extension not connected');
    const requestId=randomUUID();
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('browser_timeout'));},15000);this.pending.set(requestId,{resolve,reject,timer});this.socket!.send(JSON.stringify({requestId,operation,args}));});
  }
}
