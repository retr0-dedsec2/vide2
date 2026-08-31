import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { BridgeClient } from '@bridge/sdk';
import { BridgeActionSchema } from '@bridge/protocol';

const client=new BridgeClient(process.env.BRIDGE_RELAY_URL ?? 'http://localhost:8787',process.env.BRIDGE_MCP_TOKEN ?? 'change-me');
const server=new McpServer({name:'bridge-core',version:'0.1.0'});
const text=(x:any)=>({content:[{type:'text' as const,text:JSON.stringify(x,null,2)}]});
server.tool('bridge_status','Get Bridge relay/device status',{},async()=>text(await client.status()));
server.tool('bridge_devices','List connected Bridge devices',{},async()=>text(await client.devices()));
server.tool('bridge_execute','Execute a structured Bridge action',{deviceId:z.string(),intent:z.string(),targetType:z.enum(['browser','desktop','file','connector','system']),app:z.string().optional(),operation:z.string(),arguments:z.record(z.any()).default({}),risk:z.enum(['read','prepare','local_write','external_write','send','publish','delete','financial']),approvalId:z.string().optional(),contentHash:z.string().optional(),expected:z.string().optional()},async(input)=>{
  const action=BridgeActionSchema.parse({id:randomUUID(),sessionId:randomUUID(),intent:input.intent,target:{type:input.targetType,app:input.app},operation:input.operation,arguments:input.arguments,risk:input.risk,approval:{required:['external_write','send','publish','delete'].includes(input.risk),approvalId:input.approvalId,contentHash:input.contentHash},verification:{required:true,expected:input.expected}});
  return text(await client.execute(input.deviceId,action));
});
server.tool('bridge_approve','Approve one exact pending action hash for 15 minutes',{deviceId:z.string(),approvalId:z.string(),contentHash:z.string()},async(input)=>{
  const action=BridgeActionSchema.parse({id:randomUUID(),sessionId:randomUUID(),intent:'Grant explicit approval',target:{type:'system',app:'bridge'},operation:'approvals.grant',arguments:{approvalId:input.approvalId,contentHash:input.contentHash},risk:'prepare',approval:{required:false},verification:{required:false}});
  return text(await client.execute(input.deviceId,action));
});
await server.connect(new StdioServerTransport());
