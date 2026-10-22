import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.DESIGN_BASE_URL ?? 'http://127.0.0.1:5174';
const interactive = process.argv.includes('--interactions');
const output = process.env.DESIGN_OUTPUT ?? (interactive ? 'demo-output/frontend-interactions' : 'demo-output/frontend-audit');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const year = new Date().getFullYear();
const long = 'María de los Ángeles González Fernández de la Fuente';
const user = { id: 77, nombre: long, correo: 'audit@example.test', rol: 'ADMIN', enabled: true, accountNonLocked: true, emailVerifiedAt: '2026-01-01', profileImageType: 'INITIALS' };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
const family = { familyId: 1, familyCode: 'FAM-00000001', studentName: long, primaryGuardian: long, course: '1A' };
const alumno = { alumnoId: 1, codigo: 'AL-00000001', activo: true, nombre: long, curso: '1A', genero: 'FEMENINO' };
const guardian = { apoderadoId: 1, codigo: 'AP-00000001', activo: true, nombre: long, email: 'correo.extremadamente.largo@example.test', telefono: '+56912345678', relacion: { parentesco: 'Madre', esPrincipal: true } };
const finances = { schoolYear: year, feeIncome: 140000, otherIncome: 100000, totalIncome: 240000, totalExpenses: 30000, availableBalance: 210000 };
const quotas = { totalFamilies: 3, annualFamilies: 2, twoInstallmentFamilies: 1, pendingObligations: 2, paidObligations: 4, collectedAmount: 140000, pendingAmount: 70000 };
const summary = { totalFamilies: 3, cepaPaid: 2, cepaPending: 1, solidarityPaid: 1, solidarityPending: 2, fullyPaid: 1, withPending: 2 };
const overview = { quotas, finances, courseComposition: { masculino: 12, femenino: 15, otros: 1 }, monthlyCashFlow: [], obligationStatus: [], expensesByCategory: [], expensesByDescription: [], recentMovements: Array.from({length:12},(_,i)=>({id:i+1,type:'INGRESO',description:'Recaudación para actividades escolares y materiales del curso',amount:100000,date:`${year}-${String(i+1).padStart(2,'0')}-15`,status:'ACTIVE'})), auditTrail: [] };
const routes = process.env.DESIGN_ROUTES?.split(',') ?? ['/dashboard','/tesoreria/pagos','/tesoreria/ingresos','/tesoreria/gastos','/tesoreria/aportes','/tesoreria/cuotas','/tesoreria/reportes','/students','/parents','/family','/users','/login'];
for (const [width,height] of (process.env.DESIGN_VIEWPORTS ? JSON.parse(process.env.DESIGN_VIEWPORTS) : [[1216,552],[768,1024],[390,844],[360,640],[608,276],[900,700]])) {
 for (const state of (interactive ? ['data'] : process.env.DESIGN_STATES?.split(',') ?? ['data','empty','error','loading','permission'])) {
  const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce', deviceScaleFactor:width===608?2:1, locale:'es-CL' });
  let current = '';
  await context.addInitScript(theme=>{localStorage.setItem('treasury.app-tour.dismissed','true');localStorage.setItem('app-theme',theme);}, process.env.DESIGN_THEME ?? 'dark');
  await context.route('**/tesoreria/api/v1/**',async route=>{
   const path = new URL(route.request().url()).pathname;
   const auth = path.includes('/auth/');
   if (auth && current==='/login') return route.fulfill({status:401,json:{}});
   const account = {...user,rol: state==='permission' || current==='/tesoreria/pagos' ? 'USER' : 'ADMIN'};
   if(path.endsWith('/auth/refresh')) return route.fulfill({json:{token,user:account,csrfToken:'audit'}});
   if(path.endsWith('/auth/me')) return route.fulfill({json:account});
   if(state==='loading') await new Promise(resolve=>setTimeout(resolve,1500));
   if(state==='error' && !path.includes('/configuracion-general/curso')) return route.fulfill({status:500,json:{message:'Error de prueba'}});
   let body=[];
   const empty=state==='empty';
   if(path.endsWith('/configuracion-general/curso')) body={course:'1A',schoolYear:year,history:[]};
   else if(path.endsWith('/mensaje-directiva')) body={heading:'Directiva',title:'Bienvenidas las familias',message:'Información del curso',signature:'La directiva'};
   else if(path.endsWith('/dashboard/overview')) body=empty?{...overview,quotas:{...quotas,totalFamilies:0},recentMovements:[]}:overview;
   else if(path.endsWith('/resumen-financiero')) body=finances;
   else if(path.endsWith('/aportes/resumen')) body=empty?{...summary,totalFamilies:0}:summary;
   else if(path.endsWith('/aportes')) body=empty?[]:[family];
   else if(path.endsWith('/cuotas/page')) body={families:empty?[]:[family],plans:[],obligations:[],dashboard:quotas};
   else if(path.endsWith('/configuraciones')) body=[{id:1,year,annualAmount:70000,allowedMode:'AMBAS',annualDueDate:`${year}-12-01`,firstDueDate:`${year}-06-01`,secondDueDate:`${year}-12-01`}];
   else if(path.endsWith('/alumnos/AL-00000001')) body=alumno;
   else if(path.endsWith('/apoderados/AP-00000001')) body=guardian;
   else if(path.endsWith('/familias/1')) body={familiaId:1,codigoFamilia:'FAM-00000001',activo:true,alumno,apoderados:[guardian]};
   else if(path.endsWith('/mis-pagos')) body={schoolYear:year,annualAmount:70000,totalAmount:70000,allowedMode:'AMBAS',studentName:long,selectedMode:'ANUAL',paidAmount:0,bankAccount:null,installments:empty?[]:[{id:1,concept:'Cuota anual',amount:70000,dueDate:`${year}-12-01`,status:'PENDIENTE',history:[]}]};
   else if(path.endsWith('/cuenta-bancaria')) body={};
   else if(path.endsWith('/disponibilidad')) body={enabled:false};
   else if(path.endsWith('/ingresos')) body=empty?[]:[{id:1,description:'Rifa para actividades y materiales escolares del curso con descripción extensa',amount:100000,incomeDate:`${year}-10-19`,status:'ACTIVE',category:'RAFFLE',registeredBy:long}];
   else if(path.endsWith('/egresos')) body=empty?[]:[{id:1,description:'Materiales escolares y colaciones para reunión de familias',amount:30000,expenseDate:`${year}-10-19`,status:'ACTIVE',category:'MATERIALS',registeredBy:long}];
   else if(/\/(alumnos|apoderados|familias|usuarios|users)$/.test(path)) {
    const content=empty?[]:path.endsWith('/alumnos')?[alumno]:path.endsWith('/apoderados')?[guardian]:path.endsWith('/familias')?[{familiaId:1,codigoFamilia:'FAM-00000001',activo:true,alumno,apoderados:[guardian]}]:[user];
    body={content,totalElements:content.length,totalPages:1,page:0,number:0,size:10,first:true,last:true,empty};
   }
   return route.fulfill({json:body});
  });
  const page=await context.newPage();let errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const path of routes){
   current=path; errors=[];
   await page.goto(base+path);
   await page.locator('#app-boot-loader').waitFor({state:'hidden',timeout:15000});
   await page.waitForTimeout(state==='loading'?100:400);
   const skip=page.getByRole('button',{name:'Omitir',exact:true});if(await skip.isVisible())await skip.click();
   if (state==='data') await page.locator('.app-loader').waitFor({state:'hidden',timeout:10000});
   if (path === '/dashboard' && state === 'data') {
     const amounts = page.locator('.flow-ribbon-total strong');
     for (const amount of await amounts.all()) {
       expect(await amount.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
       expect(await amount.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
     }
   }
   if (interactive && state === 'data') {
   if (path === '/students') {
     const trigger = page.getByTestId('delete-btn-AL-00000001');
     await trigger.click();
     const dialog = page.getByRole('dialog');
     await expect(dialog).toBeVisible();
     const box = await page.locator('.modal-confirm-container').boundingBox();
     expect(box.width).toBeLessThanOrEqual(280);
     expect(box.x).toBeGreaterThanOrEqual(0);
     expect(box.y).toBeGreaterThanOrEqual(0);
     expect(box.x + box.width).toBeLessThanOrEqual(width);
     expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
     expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
     await page.keyboard.press('Shift+Tab');
     expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
     await page.screenshot({path:`${output}/confirm-${width}.png`});
     await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
     await expect(trigger).toBeFocused();
   }
   if (path === '/tesoreria/aportes') {
     const trigger = page.getByRole('button',{name:'Gestionar aportes'});
     await trigger.click();
     const dialog = page.getByRole('dialog');
     await expect(dialog).toBeVisible();
     expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(320);
     expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
     await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
     await expect(trigger).toBeFocused();
     await page.getByRole('button',{name:'Filtros',exact:true}).click();
     await expect(page.getByRole('dialog')).toBeVisible();
     await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
   }
   if (['/tesoreria/ingresos','/tesoreria/gastos'].includes(path)) {
     const income=path.endsWith('/ingresos');
     const trigger=page.getByRole('button',{name:income?'Registrar ingreso':'Registrar egreso',exact:true});
     await trigger.click();
     const dialog=page.getByRole('dialog');
     await expect(dialog).toBeVisible();
     expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(320);
     expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
     const category=dialog.getByRole('combobox').first();
     await category.focus(); await page.keyboard.press('ArrowDown');
     await expect(dialog.getByRole('listbox')).toBeVisible();
     await page.keyboard.press('Escape');
     await expect(dialog).toBeVisible();
     await dialog.getByRole('button',{name:income?'Guardar ingreso':'Guardar egreso',exact:true}).scrollIntoViewIfNeeded();
     await expect(dialog.getByRole('button',{name:income?'Guardar ingreso':'Guardar egreso',exact:true})).toBeVisible();
     await page.screenshot({path:`${output}/form-${income?'income':'expense'}-${width}.png`});
     await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
     await expect(trigger).toBeFocused();
   }
   if (path === '/tesoreria/cuotas') {
     const trigger = page.locator('.annual-config-trigger');
     await trigger.click();
     const dialog = page.getByRole('dialog');
     await expect(dialog).toBeVisible();
     const form = dialog.locator('form');
     expect((await form.boundingBox()).width).toBeLessThanOrEqual(320);
     expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
     await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
     await expect(trigger).toBeFocused();
   }
   }
   const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent),status:[...document.querySelectorAll('[role="alert"],[role="status"]')].map(e=>e.textContent)}));
   const result={path,state,width,height,actualPath:new URL(page.url()).pathname,errors:[...errors],...metrics};results.push(result);
   if(state==='data' || state==='error' && width===360)await page.screenshot({path:`${output}/${path.replaceAll('/','_')}-${state}-${width}.png`,fullPage:true});
   console.log(JSON.stringify({path,state,width,overflow:metrics.scrollWidth>width,errors}));
  }
  await context.close();
 }
}
await browser.close();
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
const forbidden = ['/tesoreria/aportes','/tesoreria/cuotas','/tesoreria/reportes','/students','/parents','/family','/users'];
const failures=results.filter(r=>r.errors.length || r.scrollWidth>r.width || (r.state==='permission' && forbidden.includes(r.path) && r.actualPath===r.path));
console.log(JSON.stringify({views:results.length,failures},null,2));
if(failures.length)process.exitCode=1;
