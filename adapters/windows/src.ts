import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
const ps=(script:string)=>exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true}).then(r=>r.stdout.trim());
const q=(s:string)=>`'${s.replace(/'/g,"''")}'`;
export class WindowsAdapter {
  async execute(operation:string,args:any){
    switch(operation){
      case 'desktop.apps': {
        const out=await ps(`Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Id,ProcessName,MainWindowTitle | ConvertTo-Json -Compress`);
        return {windows: out ? JSON.parse(out) : []};
      }
      case 'desktop.open_app': await ps(`Start-Process ${q(String(args.path ?? args.app))}`); return {opened:true};
      case 'desktop.focus_window': {
        const title=String(args.title); const out=await ps(`$p=Get-Process | Where-Object {$_.MainWindowTitle -like '*${title.replace(/'/g,"''")}*'} | Select-Object -First 1; if($p){$ws=New-Object -ComObject WScript.Shell; $ok=$ws.AppActivate($p.Id); Write-Output $ok}else{Write-Output $false}`);
        return {focused:out.toLowerCase().includes('true')};
      }
      case 'desktop.type': {
        const text=String(args.text ?? '').replace(/[+^%~()\[\]{}]/g,'{$&}');
        await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(${q(text)})`); return {typed:true,length:String(args.text??'').length};
      }
      case 'desktop.hotkey': {
        const keys=String(args.keys); await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(${q(keys)})`); return {sent:true,keys};
      }
      default: throw new Error(`Unsupported desktop operation: ${operation}`);
    }
  }
}
