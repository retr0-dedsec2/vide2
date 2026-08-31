import WebSocket from 'ws';
import { createHash } from 'node:crypto';
import { BridgeActionSchema, type BridgeAction, type BridgeResult, type RelayCommand, type RelayResult } from '@bridge/protocol';
import { PermissionEngine } from '@bridge/permissions';
import { Journal } from '@bridge/journal';
import { verify } from '@bridge/verification';
import { BrowserAdapter } from '@bridge/browser-adapter';
import { FilesAdapter } from '@bridge/files-adapter';
import { WindowsAdapter } from '@bridge/windows-adapter';

const relayWs=process.env.BRIDGE_RELAY_WS ?? 'ws://localhost:8787/ws';
const deviceId=process.env.BRIDGE_DEVICE_ID ?? 'windows-pc';
const token=process.env.BRIDGE_DEVICE_TOKEN ?? 'change-me';
const permission=new PermissionEngine();
const journal=new Journal();
const browser=new BrowserAdapter();
const files=new FilesAdapter();
const windows=new WindowsAdapter();
const approvals=new Map<string,{hash:string,expires:number}>();

function hashAction(a:BridgeAction){return createHash('sha256').update(JSON.stringify({target:a.target,operation:a.operation,arguments:a.arguments})).digest('hex');}
function result(action:BridgeAction,status:BridgeResult['status'],startedAt:string,extra:Partial<BridgeResult>):BridgeResult{return {actionId:action.id,status,verified:false,error:null,startedAt,finishedAt:new Date().toISOString(),...extra};}

async function executeAction(action:BridgeAction):Promise<BridgeResult>{
  const startedAt=new Date().toISOString();
  try{
    if(action.operation==='approvals.grant'){
      const approvalId=String(action.arguments.approvalId); const hash=String(action.arguments.contentHash); approvals.set(approvalId,{hash,expires:Date.now()+15*60_000});
      return result(action,'completed',startedAt,{verified:true,adapterUsed:'permission',result:{approvalId,granted:true}});
    }
    const decision=permission.decide(action);
    if(decision==='deny') return result(action,'blocked',startedAt,{error:{code:'PERMISSION_DENIED',message:'Action denied by policy'}});
    if(decision==='require_approval'){
      const approvalId=action.approval.approvalId; const grant=approvalId?approvals.get(approvalId):undefined; const h=hashAction(action);
      if(!grant || grant.expires<Date.now() || grant.hash!==h) return result(action,'pending_approval',startedAt,{error:{code:'APPROVAL_REQUIRED',message:'Explicit approval required',details:{contentHash:h}}});
    }
    let adapterUsed=''; let before:any=null; let after:any=null;
    if(action.target.type==='browser'){adapterUsed='browser'; before=await browser.execute('browser.read',{mode:'summary'}); after=await browser.execute(action.operation,action.arguments);}
    else if(action.target.type==='file'){adapterUsed='files'; after=await files.execute(action.operation,action.arguments);}
    else if(action.target.type==='desktop'){adapterUsed='windows'; after=await windows.execute(action.operation,action.arguments);}
    else throw new Error(`No adapter for target ${action.target.type}`);
    const v=action.verification.required ? verify({operation:action.operation,before,after,expected:action.verification.expected}) : {ok:true,reason:'Verification disabled'};
    const r=result(action,v.ok?'completed':'failed',startedAt,{adapterUsed,verified:v.ok,result:{after,verification:v},error:v.ok?null:{code:'VERIFICATION_FAILED',message:v.reason}});
    journal.write({id:action.id,intent:action.intent,target:action.target,adapter:adapterUsed,risk:action.risk,approval:action.approval,beforeState:before,operation:action.operation,afterState:after,verified:v.ok,result:r.result,error:r.error});
    return r;
  }catch(e:any){ const r=result(action,'failed',startedAt,{error:{code:'EXECUTION_ERROR',message:e?.message ?? String(e)}}); journal.write({id:action.id,intent:action.intent,target:action.target,risk:action.risk,approval:action.approval,operation:action.operation,verified:false,error:r.error}); return r; }
}

function connect(){
  const ws=new WebSocket(relayWs);
  ws.on('open',()=>ws.send(JSON.stringify({type:'hello',deviceId,token,capabilities:['browser','desktop','files','approvals']})));
  ws.on('message',async b=>{let m:any;try{m=JSON.parse(b.toString())}catch{return}; if(m.type!=='command')return; const cmd=m as RelayCommand; const action=BridgeActionSchema.parse(cmd.action); const r=await executeAction(action); const rr:RelayResult={type:'result',requestId:cmd.requestId,result:r}; ws.send(JSON.stringify(rr));});
  ws.on('close',()=>setTimeout(connect,2000)); ws.on('error',()=>{});
}
connect();
console.log(`Bridge daemon ${deviceId} connecting to ${relayWs}`);
