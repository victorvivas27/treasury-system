import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DESIGN_BASE_URL??'http://127.0.0.1:5174';
const output='demo-output/palettes/bootstrap';await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[];
const readPaint=page=>page.evaluate(()=>{
 const bg=getComputedStyle(document.documentElement).backgroundColor;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle=bg;ctx.fillRect(0,0,1,1);
 return {bg,meta:document.querySelector('meta[name="theme-color"]').content,rgba:[...ctx.getImageData(0,0,1,1).data]};
});
try{
 const scenarios=[];
 for(const palette of ['original','blue-lime','violet-coral','green-turquoise'])for(const theme of ['dark','light'])scenarios.push({stored:palette,palette,theme,preference:theme});
 for(const stored of [null,'invalid','toString','__proto__'])scenarios.push({stored,palette:'original',theme:'light',preference:'light'});
 for(const theme of ['dark','light'])scenarios.push({stored:'violet-coral',palette:'violet-coral',theme,preference:'system'});
 for(const scenario of scenarios){
  const context=await browser.newContext({viewport:{width:1216,height:552},serviceWorkers:'block',colorScheme:scenario.theme});
  await context.addInitScript(({stored,preference})=>{
   if(stored!==null)localStorage.setItem('app-palette',stored);
   localStorage.setItem('app-theme',preference);
  },scenario);
  await context.route('**/tesoreria/api/v1/**',route=>route.fulfill({status:401,json:{}}));
  // Require a correct first paint even without React and the main application CSS.
  const blocked=route=>route.abort();
  await context.route('**/src/main.tsx*',blocked);
  await context.route('**/src/shared/style/global.css*',blocked);
  await context.route('**/assets/*.js',blocked);
  await context.route('**/assets/*.css',blocked);
  const page=await context.newPage();
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-palette',scenario.palette);
  await expect(page.locator('html')).toHaveAttribute('data-theme',scenario.theme);
  expect(await page.locator('#root').innerHTML()).toBe('');
  const initial=await readPaint(page);
  expect(initial.meta).toBe(initial.bg);
  expect(initial.bg).not.toBe('rgba(0, 0, 0, 0)');
  await context.unroute('**/src/main.tsx*',blocked);await context.unroute('**/src/shared/style/global.css*',blocked);
  await context.unroute('**/assets/*.js',blocked);await context.unroute('**/assets/*.css',blocked);
  await page.reload();await page.getByRole('heading',{name:'Iniciar sesión'}).waitFor();
  const restored=await readPaint(page);
  // Minification rounds OKLCH coefficients; compare rendered pixels, not CSS strings.
  expect(restored.rgba.every((channel,index)=>Math.abs(channel-initial.rgba[index])<=1)).toBe(true);
  expect(restored.meta).toBe(restored.bg);
  await expect(page.locator('html')).toHaveAttribute('data-palette',scenario.palette);
  results.push({...scenario,bg:initial.bg});await context.close();
 }
 for(const theme of ['dark','light']){
  const valid=results.filter(r=>r.theme===theme && r.stored===r.palette && r.preference===theme);
  expect(new Set(valid.map(r=>r.bg)).size).toBe(4);
 }
 await writeFile(output+'/results.json',JSON.stringify({base,results},null,2));
 console.log(JSON.stringify({bootstrapCases:results.length,distinctBackgroundsPerMode:4}));
}finally{await browser.close();}
