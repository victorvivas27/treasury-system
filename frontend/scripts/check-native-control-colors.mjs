import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const theme=await readFile('src/shared/style/theme.css','utf8');
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 for(const mode of ['dark','light']){
  await page.setContent(`<html data-theme="${mode}" style="color-scheme:${mode}"><head><style>${theme}</style></head><body><input type="checkbox" checked style="width:20px;height:20px"></body></html>`);
  const control=page.locator('input');
  const png=await control.screenshot();
  const colors=await page.evaluate(async data=>{
   const img=new Image();img.src=data;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   const bytes=ctx.getImageData(0,0,img.width,img.height).data;const colors={};
   for(let i=0;i<bytes.length;i+=4){const rgb=Array.from(bytes.slice(i,i+3));if(Math.max(...rgb)-Math.min(...rgb)>20){const hex='#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');colors[hex]=(colors[hex]??0)+1;}}
   return Object.entries(colors).sort((a,b)=>b[1]-a[1]);
  },'data:image/png;base64,'+png.toString('base64'));
  const hex=colors[0][0];
  const recipe=await page.evaluate(hex=>{
    const probe=document.createElement('span');document.body.append(probe);
    const channels=color=>{probe.style.color=`oklch(from ${color} l c h)`;return getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);};
    const base=channels('#3b82f6'),target=channels(hex);probe.remove();
    return `oklch(from var(--base-info) calc(l * ${target[0]/base[0]}) calc(c * ${target[1]/base[1]}) calc(h + ${target[2]-base[2]}))`;
  },hex);
  await control.evaluate(el=>el.style.accentColor='var(--control-accent)');
  const explicit=await control.screenshot();
  console.log(JSON.stringify({mode,hex,recipe,identicalPng:png.equals(explicit),colors:colors.slice(0,3)}));
  if(!png.equals(explicit))process.exitCode=1;
 }
}finally{await browser.close();}
