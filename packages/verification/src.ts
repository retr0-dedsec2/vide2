export type VerifyInput = { operation:string; before:any; after:any; expected?:string };
export function verify({operation,before,after,expected}: VerifyInput): {ok:boolean; reason:string} {
  if (after == null) return { ok:false, reason:'No after-state returned' };
  if (operation === 'browser.navigate') {
    const ok = typeof after.url === 'string' && after.url.length > 0 && after.url !== before?.url;
    return { ok, reason: ok ? 'URL changed' : 'Navigation not confirmed' };
  }
  if (operation === 'browser.type') {
    const ok = after.value !== undefined;
    return { ok, reason: ok ? 'Input value observed after typing' : 'No input value observed' };
  }
  if (expected && JSON.stringify(after).includes(expected)) return {ok:true, reason:'Expected state found'};
  return { ok:true, reason:'Action returned an after-state' };
}
