import {chromium, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

// Browser regression checks; every API response is simulated.
const base=process.env.DESIGN_BASE_URL??'http://127.0.0.1:5174';
const browser=await chromium.launch();
const results=[];
try {
 for(const [width,height] of [[1216,552],[900,700],[768,1024],[390,844],[360,640]]) {
  const mobile=width<=768;
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',hasTouch:mobile});
  await context.routeWebSocket('**',socket=>socket.close());
  const user={id:77,nombre:'Prueba de navegación',correo:'audit@example.test',rol:'ADMIN',enabled:true,accountNonLocked:true,emailVerifiedAt:'2026-01-01',profileImageType:'INITIALS'};
  const token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user.correo,exp:2000000000})).toString('base64url')}.test`;
  await context.addInitScript(()=>localStorage.setItem('treasury.app-tour.dismissed','true'));
  await context.route('**/tesoreria/api/v1/**',route=>{
   const path=new URL(route.request().url()).pathname;
   return route.fulfill({json:path.endsWith('/auth/refresh')?{token,user,csrfToken:'audit'}:path.endsWith('/auth/me')?user:path.endsWith('/configuracion-general/curso')?{course:'1A',schoolYear:2026,history:[]}:[]});
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/configuration');
  const sidebar=page.locator('#app-sidebar');
  const treasury=page.locator('[aria-controls="treasury-submenu"]');
  const academic=page.locator('[aria-controls="academic-submenu"]');
  await expect(sidebar).toHaveAttribute('data-state',mobile?'hidden':'icons');
  if(mobile) await page.locator('.sidebar-state-toggle').tap();
  await treasury.click();
  await expect(treasury).toHaveAttribute('aria-expanded','true');
  await page.locator('a[href="/tesoreria/stands"]').click();
  await expect(page).toHaveURL(/\/tesoreria\/stands$/);
  await expect(sidebar).toHaveAttribute('data-state',mobile?'hidden':'expanded');
  if(!mobile) {
   await expect(treasury).toHaveAttribute('aria-expanded','true');
   await page.mouse.move(500,100);
   await expect(sidebar).toHaveAttribute('data-state','icons');
   await expect(treasury).toHaveAttribute('aria-expanded','false');
   await academic.hover();
   await expect(page.getByRole('tooltip')).toHaveText('Calendario Académico');
   await academic.click();
   await expect(academic).toHaveAttribute('aria-expanded','true');
   await expect(page.getByRole('tooltip')).toHaveCount(0);
   await page.mouse.move(500,100);
   await expect(sidebar).toHaveAttribute('data-state','icons');
   await expect(page.getByRole('tooltip')).toHaveCount(0);
   // Clicking a persistent trigger must not leave its tooltip behind on exit.
   const toggle=page.locator('.sidebar-state-toggle');
   await toggle.click();
   await page.mouse.move(500,100);
   await expect(page.getByRole('tooltip')).toHaveCount(0);
  } else {
   await page.locator('.sidebar-state-toggle').tap();
   await academic.tap();
   await expect(academic).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');
   await expect(sidebar).toHaveAttribute('data-state','hidden');
   await expect(page.locator('.sidebar-state-toggle')).toBeFocused();
   expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  }
  expect(errors).toEqual([]);
  results.push({width,height,mobile,errors});
  await context.close();
 }
 await mkdir('demo-output/sidebar',{recursive:true});
 await writeFile('demo-output/sidebar/results.json',JSON.stringify({base,results},null,2));
 console.log(JSON.stringify({sidebarChecks:results}));
} finally {await browser.close();}
