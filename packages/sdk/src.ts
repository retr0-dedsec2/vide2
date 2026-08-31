import type { BridgeAction, BridgeResult } from '@bridge/protocol';
export class BridgeClient {
  constructor(private baseUrl:string, private token:string) {}
  async status(){ return this.get('/api/status'); }
  async devices(){ return this.get('/api/devices'); }
  async execute(deviceId:string, action:BridgeAction): Promise<BridgeResult> {
    const r = await fetch(`${this.baseUrl}/api/actions`, {method:'POST', headers:this.headers(), body:JSON.stringify({deviceId,action})});
    if(!r.ok) throw new Error(await r.text());
    return r.json() as any;
  }
  private async get(path:string){ const r=await fetch(this.baseUrl+path,{headers:this.headers()}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
  private headers(){ return {'content-type':'application/json','authorization':`Bearer ${this.token}`}; }
}
