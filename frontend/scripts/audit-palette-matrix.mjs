import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
const palettes=process.env.PALETTE_TEST_IDS?.split(',')??['original','blue-lime','violet-coral','green-turquoise'];
const themes=process.env.PALETTE_TEST_THEME?[process.env.PALETTE_TEST_THEME]:['dark','light'];
const viewports=process.env.DESIGN_VIEWPORTS??'[[1216,552],[768,1024],[390,844],[360,640]]';
const root=process.env.PALETTE_MATRIX_OUTPUT??'demo-output/palettes/matrix';
await mkdir(root,{recursive:true});
process.env.DESIGN_STATES='data';
process.env.DESIGN_ROUTES??='/,/login,/dashboard,/configuration,/students,/tesoreria/ingresos,/tesoreria/gastos,/tesoreria/aportes,/notifications';
process.env.DESIGN_VIEWPORTS=viewports;
const original=await readFile(new URL('./audit-frontend-design.mjs',import.meta.url),'utf8');
const summaries=[];

async function validatePalettePage(page, palette, theme, path, width, output) {
 const root=page.locator('html');
 const {expect}=await import('@playwright/test');
 await expect(root).toHaveAttribute('data-palette',palette);
 await expect(root).toHaveAttribute('data-theme',theme);
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 const storage=await page.evaluate(()=>({palette:localStorage.getItem('app-palette'),theme:localStorage.getItem('app-theme')}));
 expect(storage).toEqual({palette,theme});
 const chrome=await page.evaluate(()=>({meta:document.querySelector('meta[name="theme-color"]').content,bg:getComputedStyle(document.documentElement).backgroundColor}));
 expect(chrome.meta).toBe(chrome.bg);
 if(path==='/dashboard'){
  await page.locator('[aria-controls="dashboard-annual-quota"]').click();
  await page.locator('.annual-quota-donut .recharts-sector').first().waitFor({state:'visible'});
  await page.screenshot({path:output+'/chart-'+width+'.png',fullPage:true});
 }
 if(path==='/students'){
  await page.getByTestId('delete-btn-AL-00000001').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await page.locator('.modal-confirm-container').boundingBox()).width).toBeLessThanOrEqual(280);
  await page.screenshot({path:output+'/confirm-'+width+'.png'});
  await page.keyboard.press('Escape');
 }
 if(path==='/notifications'){
  await page.locator('.notification-contact').first().click();
  await expect(page.locator('.chat-bubble').first()).toBeVisible();
  await page.locator('.notification-recipient-summary').click();
  await page.getByRole('checkbox',{name:'Seleccionar todos los apoderados',exact:true}).check();
  await page.getByRole('button',{name:'Crear notificación',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:output+'/notification-'+width+'.png',fullPage:true});
  await page.keyboard.press('Escape');
 }
 if(path==='/configuration'){
  // Changes happen through the real UI, with no navigation or page reload.
  const marker=await page.evaluate(()=>{window.__paletteNavigationMarker=crypto.randomUUID();return window.__paletteNavigationMarker;});
  const index=['original','blue-lime','violet-coral','green-turquoise'].indexOf(palette);
  const next=['original','blue-lime','violet-coral','green-turquoise'][(index+1)%4];
  const previousBackground=await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor);
  await page.locator(`input[name="app-palette"][value="${next}"]`).check();
  await expect(root).toHaveAttribute('data-palette',next);
  expect(await page.evaluate(()=>window.__paletteNavigationMarker)).toBe(marker);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).not.toBe(previousBackground);
  await expect(root).toHaveAttribute('data-theme',theme);
  await page.reload();
  await expect(root).toHaveAttribute('data-palette',next);
  await page.locator(`input[name="app-palette"][value="${palette}"]`).check();
  await page.locator('input[name="app-theme"][value="system"]').check();
  await page.emulateMedia({colorScheme:'dark'});await expect(root).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'});await expect(root).toHaveAttribute('data-theme','light');
  await expect(root).toHaveAttribute('data-palette',palette);
  await page.locator(`input[name="app-theme"][value="${theme}"]`).check();
  await page.reload();
  await expect(root).toHaveAttribute('data-palette',palette);
  await expect(page.locator(`input[name="app-palette"][value="${palette}"]`)).toBeChecked();
  await expect(root).toHaveAttribute('data-theme',theme);
  // Native radio keyboard behavior and a visible focus ring.
  const selected=page.locator(`input[name="app-palette"][value="${palette}"]`);
  await selected.focus();await page.keyboard.press('ArrowRight');
  await expect(root).toHaveAttribute('data-palette',next);
  const outline=await page.locator('.palette-option').filter({has:page.locator('input:checked')}).evaluate(el=>getComputedStyle(el).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(3);
  await page.locator(`input[name="app-palette"][value="${palette}"]`).check();
 }
 return {path,width,palette,theme,bg:chrome.bg};
}

for(const palette of palettes)for(const theme of themes){
 const output=`${root}/${palette}-${theme}`;
 await mkdir(output,{recursive:true});process.env.DESIGN_OUTPUT=output;process.env.DESIGN_THEME=theme;
 let source=original.replace('browser.newContext({ viewport:',"browser.newContext({serviceWorkers:'block', viewport:");
 // Seed once per new document, but never overwrite a choice made by the reload test.
 source=source.replace("localStorage.setItem('app-theme',theme);",`if(!localStorage.getItem('app-theme'))localStorage.setItem('app-theme',theme);if(!localStorage.getItem('app-palette'))localStorage.setItem('app-palette',${JSON.stringify(palette)});`);
 source=source.replace("  await context.route('**/tesoreria/api/v1/**'","  await context.routeWebSocket('**',socket=>socket.close());\n  await context.route('**/tesoreria/api/v1/**'");
 const notifications=['INFO','IMPORTANT','URGENT'].map((type,i)=>({id:i+1,title:'Prueba '+type,message:'Mensaje de prueba '+type,type,createdAt:`2026-10-20T1${i}:00:00Z`,recipients:[{deliveryId:i+1,userId:88,name:'Apoderado de prueba',email:'guardian@example.test',read:i===0,readAt:null,profileImageType:'INITIALS',profileImageUrl:null}]}));
 source=source.replace("else if(path.endsWith('/resumen-financiero'))",`else if(path.endsWith('/notifications/sent')) body=${JSON.stringify(notifications)};\n   else if(path.endsWith('/resumen-financiero'))`);
 const injection=`const paletteResult=await (${validatePalettePage.toString()})(page,${JSON.stringify(palette)},${JSON.stringify(theme)},path,width,output);await writeFile(\`\${output}/\${path.replaceAll('/','_')}-\${width}-palette.json\`,JSON.stringify(paletteResult));\n`;
 source=source.replace('   const metrics=await page.evaluate',injection+'   const metrics=await page.evaluate');
 const runner=new URL(`./.palette-matrix-${palette}-${theme}.mjs`,import.meta.url);
 try{
  await writeFile(runner,source);await import(runner.href);
  const results=JSON.parse(await readFile(output+'/results.json','utf8'));
  summaries.push({palette,theme,views:results.length,errors:results.filter(r=>r.errors.length||r.scrollWidth>r.width)});
 }finally{await unlink(runner).catch(()=>{});}
}
await writeFile(root+'/summary-'+themes.join('-')+'.json',JSON.stringify(summaries,null,2));
console.log(JSON.stringify({paletteMatrix:summaries},null,2));
if(summaries.some(s=>s.errors.length))process.exitCode=1;
