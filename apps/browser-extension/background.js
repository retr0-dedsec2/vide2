let socket;
function connect(){
  socket=new WebSocket('ws://127.0.0.1:8765');
  socket.onclose=()=>setTimeout(connect,1500);
  socket.onmessage=async e=>{let m;try{m=JSON.parse(e.data)}catch{return}; try{const result=await execute(m.operation,m.args||{}); socket.send(JSON.stringify({requestId:m.requestId,result}));}catch(err){socket.send(JSON.stringify({requestId:m.requestId,error:String(err?.message||err)}));}};
}
connect();
async function activeTab(){const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true}); if(!tab?.id) throw new Error('No active tab'); return tab;}
async function run(func,args=[]){const tab=await activeTab(); const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func,args}); return result;}
async function execute(op,args){
  if(op==='browser.open'){const tab=await chrome.tabs.create({url:String(args.url)}); return {tabId:tab.id,url:tab.url};}
  if(op==='browser.navigate'){const tab=await activeTab(); await chrome.tabs.update(tab.id,{url:String(args.url)}); return {tabId:tab.id,url:String(args.url)};}
  if(op==='browser.read') return run(()=>({url:location.href,title:document.title,text:(document.body?.innerText||'').slice(0,12000)}));
  if(op==='browser.click') return run((selector,text,role)=>{let el=selector?document.querySelector(selector):null; if(!el && text){el=[...document.querySelectorAll('button,a,[role="button"],input[type="submit"]')].find(x=>(x.innerText||x.value||'').trim().includes(text));} if(!el&&role){el=document.querySelector(`[role="${role}"]`)} if(!el) throw new Error('Element not found'); el.click(); return {clicked:true,tag:el.tagName,text:(el.innerText||el.value||'').slice(0,200)};},[args.selector,args.text,args.role]);
  if(op==='browser.type') return run((selector,text)=>{const el=document.querySelector(selector); if(!el) throw new Error('Input not found'); el.focus(); if('value' in el) el.value=text; else el.textContent=text; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return {value:'value' in el?el.value:el.textContent};},[args.selector,String(args.text??'')]);
  if(op==='browser.submit') return run((selector)=>{const el=document.querySelector(selector); if(!el) throw new Error('Form/button not found'); if(el.tagName==='FORM') el.requestSubmit(); else el.click(); return {submitted:true};},[args.selector]);
  throw new Error(`Unsupported browser operation: ${op}`);
}
