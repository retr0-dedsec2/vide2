import { z } from 'zod';

export const RiskSchema = z.enum(['read','prepare','local_write','external_write','send','publish','delete','financial']);
export type Risk = z.infer<typeof RiskSchema>;

export const TargetSchema = z.object({
  type: z.enum(['browser','desktop','file','connector','system']),
  app: z.string().optional(),
  account: z.string().optional(),
  resource: z.string().optional()
});

export const ApprovalSchema = z.object({
  required: z.boolean().default(false),
  approvalId: z.string().optional(),
  contentHash: z.string().optional()
});

export const VerificationSchema = z.object({
  required: z.boolean().default(true),
  expected: z.string().optional(),
  timeoutMs: z.number().int().positive().default(10000)
});

export const BridgeActionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  intent: z.string(),
  target: TargetSchema,
  operation: z.string(),
  arguments: z.record(z.unknown()).default({}),
  risk: RiskSchema,
  approval: ApprovalSchema.default({ required: false }),
  verification: VerificationSchema.default({ required: true })
});
export type BridgeAction = z.infer<typeof BridgeActionSchema>;

export const BridgeResultSchema = z.object({
  actionId: z.string(),
  status: z.enum(['completed','failed','blocked','pending_approval']),
  adapterUsed: z.string().optional(),
  verified: z.boolean().default(false),
  result: z.record(z.unknown()).optional(),
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }).nullable().default(null),
  startedAt: z.string(),
  finishedAt: z.string()
});
export type BridgeResult = z.infer<typeof BridgeResultSchema>;

export type DeviceHello = { type:'hello'; deviceId:string; token:string; capabilities:string[] };
export type RelayCommand = { type:'command'; requestId:string; action:BridgeAction };
export type RelayResult = { type:'result'; requestId:string; result:BridgeResult };
