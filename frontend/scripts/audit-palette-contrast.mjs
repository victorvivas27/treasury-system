import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch();
const output='demo-output/palettes';
await mkdir(output,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1216,height:552},serviceWorkers:'block'});
 await context.route('**/tesoreria/api/v1/**',route=>route.fulfill({status:401,json:{}}));
 const page=await context.newPage();
 await page.goto((process.env.DESIGN_BASE_URL??'http://127.0.0.1:5174')+'/login');
 await page.getByRole('heading',{name:'Iniciar sesión'}).waitFor();
 const report=await page.evaluate(()=>{
  const root=document.documentElement;
  const original={theme:root.dataset.theme,palette:root.dataset.palette};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const probe=document.createElement('span');document.body.append(probe);
  const rgba=key=>{
   probe.style.color=`var(${key})`;ctx.clearRect(0,0,1,1);ctx.fillStyle=getComputedStyle(probe).color;ctx.fillRect(0,0,1,1);
   return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);
  };
  const lum=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const [lo,hi]=[lum(a),lum(b)].sort((a,b)=>a-b);return(hi+.05)/(lo+.05);};
  const over=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
  const cases=[];
  for(const palette of ['original','blue-lime','violet-coral','green-turquoise'])for(const theme of ['dark','light']){
   root.dataset.palette=palette;root.dataset.theme=theme;
   const names=['color-bg','color-surface','text-main','text-muted','color-accent','color-primary','color-success','color-warning','color-error','color-info','text-on-accent','text-on-primary','text-on-info','color-danger-surface','focus-ring',...['accent','success','warning','error','info'].map(k=>`color-${k}-soft`),...['blue','green','orange','pink','sky','violet'].map(k=>`palette-${k}`)];
   const tokens=Object.fromEntries(names.map(k=>[k,rgba('--'+k)]));
   const pairs=[];
   for(const bg of ['color-bg','color-surface'])for(const text of ['text-main','text-muted','color-accent','color-success','color-warning','color-error','color-info'])pairs.push({text,bg,ratio:contrast(tokens[text],tokens[bg]),minimum:4.5});
   for(const bg of ['color-bg','color-surface'])for(const category of ['blue','green','orange','pink','sky','violet'])pairs.push({text:`palette-${category}`,bg,ratio:contrast(tokens[`palette-${category}`],tokens[bg]),minimum:4.5});
   pairs.push({text:'text-on-accent',bg:'color-accent',ratio:contrast(tokens['text-on-accent'],tokens['color-accent']),minimum:4.5});
   pairs.push({text:'text-on-primary',bg:'color-primary',ratio:contrast(tokens['text-on-primary'],tokens['color-primary']),minimum:4.5});
   pairs.push({text:'text-on-info',bg:'color-info',ratio:contrast(tokens['text-on-info'],tokens['color-info']),minimum:4.5});
   pairs.push({text:'white',bg:'color-danger-surface',ratio:contrast([255,255,255],tokens['color-danger-surface']),minimum:4.5});
   for(const bg of ['color-bg','color-surface'])pairs.push({text:'focus-ring',bg,ratio:contrast(tokens['focus-ring'],tokens[bg]),minimum:3});
   for(const state of ['accent','success','warning','error','info'])pairs.push({text:`color-${state}`,bg:`color-${state}-soft/surface`,ratio:contrast(tokens[`color-${state}`],over(tokens[`color-${state}-soft`],tokens['color-surface'])),minimum:4.5});
   cases.push({palette,theme,tokens,pairs,failures:pairs.filter(p=>p.ratio<p.minimum)});
  }
  root.dataset.palette='original';root.dataset.theme='light';
  const lch=key=>{probe.style.color=`oklch(from var(${key}) l c h)`;return getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);};
  const seed=lch('--base-info'),target=lch('--color-info');
  const infoRecipe={l:target[0]/seed[0],c:target[1]/seed[1],h:target[2]-seed[2]};
  probe.remove();root.dataset.theme=original.theme;root.dataset.palette=original.palette;
  return {cases,infoRecipe};
 });
 await writeFile(output+'/contrast.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({infoRecipe:report.infoRecipe,cases:report.cases.map(c=>({palette:c.palette,theme:c.theme,minimum:Math.min(...c.pairs.map(p=>p.ratio)),failures:c.failures}))},null,2));
 if(report.cases.some(c=>c.failures.length))process.exitCode=1;
 await context.close();
}finally{await browser.close();}
