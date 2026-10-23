import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 await page.goto(process.env.DESIGN_BASE_URL??'http://127.0.0.1:5174/');
 const inventory=JSON.parse(await readFile(new URL('./fixtures/color-reference.json',import.meta.url),'utf8'));
 const report=await page.evaluate(inventory=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const probe=document.createElement('span');document.body.append(probe);
  const failures=[];
  for(const item of inventory){
   probe.style.color=`var(${item.name})`;
   const color=getComputedStyle(probe).color;
   ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
   const actual=[...ctx.getImageData(0,0,1,1).data];const expected=item.rgba.map((v,i)=>i===3?Math.round(v*255):v);
   // Canvas unpremultiplication can differ by one byte at low alpha.
   if(actual.some((v,i)=>Math.abs(v-expected[i])>(i<3?Math.ceil(1/Math.max(item.rgba[3],.01)):1)))failures.push({name:item.name,color,actual,expected});
  }
  probe.remove();
  return {recipes:inventory.length,failures,svg:[...document.querySelectorAll('svg path')].slice(0,25).map(e=>({fill:getComputedStyle(e).fill,attribute:e.getAttribute('fill'),color:getComputedStyle(e).color}))};
 },inventory);
 await mkdir('demo-output/color-system',{recursive:true});
 await writeFile('demo-output/color-system/recipes.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({recipes:report.recipes,failures:report.failures}));
 if(report.failures.length)process.exitCode=1;
} finally {await browser.close();}
