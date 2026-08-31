import type { BridgeAction, Risk } from '@bridge/protocol';
export type PermissionDecision = 'allow'|'deny'|'require_approval';

const defaults: Record<Risk, PermissionDecision> = {
  read:'allow', prepare:'allow', local_write:'allow', external_write:'require_approval',
  send:'require_approval', publish:'require_approval', delete:'require_approval', financial:'deny'
};

export class PermissionEngine {
  constructor(private overrides: Record<string, PermissionDecision> = {}) {}
  decide(action: BridgeAction): PermissionDecision {
    const app = action.target.app ?? action.target.type;
    const key = `${app}.${action.operation}`;
    return this.overrides[key] ?? defaults[action.risk];
  }
}
