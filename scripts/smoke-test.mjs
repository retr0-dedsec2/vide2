const base=process.env.BRIDGE_RELAY_URL||'http://localhost:8787'; const token=process.env.BRIDGE_MCP_TOKEN||'change-me';
const h={authorization:`Bearer ${token}`};
console.log('status',await fetch(base+'/api/status',{headers:h}).then(r=>r.json()));
console.log('devices',await fetch(base+'/api/devices',{headers:h}).then(r=>r.json()));
