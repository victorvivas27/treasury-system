import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'demo-output/frontend-audit/contrast';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results=[];
const luminance = color => {
  const values=color.startsWith('#') ? color.slice(1).match(/.{2}/g).map(v=>parseInt(v,16)) : color.match(/[\d.]+/g).slice(0,3).map(Number);
  const linear=values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return linear.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (values[1]+.05)/(values[0]+.05);};
for(const theme of ['dark','light'])for(const [width,height]of[[1216,552],[390,844]]){
 const context=await browser.newContext({viewport:{width,height},locale:'es-CL',reducedMotion:'reduce'});
 await context.addInitScript(theme=>localStorage.setItem('app-theme',theme),theme);
 await context.route('**/tesoreria/api/v1/**',route=>route.fulfill({status:401,json:{}}));
 const page=await context.newPage();
 await page.goto((process.env.DESIGN_BASE_URL??'http://127.0.0.1:5174')+'/login');
 await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();
 await expect(page.getByText(/Fortaleza orientativa/)).toHaveCount(0);
 const tokens=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   const probe=document.createElement('span');document.body.append(probe);
   const resolved=key=>{
     probe.style.color=`var(${key})`;
     context.clearRect(0,0,1,1);context.fillStyle=getComputedStyle(probe).color;context.fillRect(0,0,1,1);
     return `rgb(${[...context.getImageData(0,0,1,1).data].slice(0,3).join(' ')})`;
   };
   const tokens=Object.fromEntries(['--color-bg','--color-surface','--text-main','--text-muted','--color-accent','--color-error','--color-success','--color-info','--color-warning','--color-danger-surface','--text-on-accent','--focus-ring'].map(key=>[key,resolved(key)]));
   probe.remove();return tokens;
 });
 const pairs=[];
 for(const background of ['--color-bg','--color-surface'])for(const text of ['--text-main','--text-muted','--color-accent','--color-error','--color-success','--color-info','--color-warning']){
   const ratio=contrast(tokens[text],tokens[background]);pairs.push({text,background,ratio});expect(ratio,`${theme}: ${text} on ${background}`).toBeGreaterThanOrEqual(4.5);
 }
 expect(contrast('#ffffff',tokens['--color-danger-surface'])).toBeGreaterThanOrEqual(4.5);
 expect(contrast(tokens['--text-on-accent'],tokens['--color-accent'])).toBeGreaterThanOrEqual(4.5);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await expect(page.getByLabel('Correo',{exact:true})).toBeFocused();
 await expect(page.locator('#login-correo-error')).toBeVisible();
 await expect(page.locator('#login-password-error')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const errorStyle=await page.locator('#login-correo-error').evaluate(el=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
   const context=canvas.getContext('2d');context.fillStyle=getComputedStyle(el).color;context.fillRect(0,0,1,1);
   return {color:`rgb(${[...context.getImageData(0,0,1,1).data].slice(0,3).join(' ')})`,opacity:getComputedStyle(el).opacity};
 });
 expect(Number(errorStyle.opacity)).toBe(1);
 expect(contrast(errorStyle.color,tokens['--color-surface'])).toBeGreaterThanOrEqual(4.5);
 await page.screenshot({path:`${output}/login-${theme}-${width}.png`,fullPage:true});
 results.push({theme,width,height,pairs});
 await context.close();
}
await browser.close();
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({views:results.length,minimumTextContrast:Math.min(...results.flatMap(r=>r.pairs.map(p=>p.ratio)))}));
