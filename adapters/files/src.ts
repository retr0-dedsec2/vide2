import { promises as fs } from 'node:fs';
import path from 'node:path';

function normalize(p:string){return path.resolve(p.replace(/%USERNAME%/gi,process.env.USERNAME ?? ''));}
export class FilesAdapter {
  roots:string[];
  constructor(roots=(process.env.BRIDGE_ALLOWED_ROOTS ?? '').split(';').filter(Boolean)){this.roots=roots.map(normalize)}
  private assertAllowed(p:string){const n=normalize(p); if(!this.roots.some(r=>n.toLowerCase().startsWith(r.toLowerCase()))) throw new Error('Path outside allowlist'); return n;}
  async execute(operation:string,args:any){
    switch(operation){
      case 'files.list': {const p=this.assertAllowed(args.path); return {path:p,entries:await fs.readdir(p,{withFileTypes:true}).then(x=>x.map(e=>({name:e.name,isDirectory:e.isDirectory()})))};}
      case 'files.read': {const p=this.assertAllowed(args.path); return {path:p,content:await fs.readFile(p,'utf8')};}
      case 'files.write': {const p=this.assertAllowed(args.path); await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,String(args.content ?? ''),'utf8'); return {path:p,size:(await fs.stat(p)).size};}
      case 'files.move': {const from=this.assertAllowed(args.from),to=this.assertAllowed(args.to); await fs.rename(from,to); return {from,to,exists:true};}
      case 'files.copy': {const from=this.assertAllowed(args.from),to=this.assertAllowed(args.to); await fs.copyFile(from,to); return {from,to,exists:true};}
      default: throw new Error(`Unsupported file operation: ${operation}`);
    }
  }
}
