import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Reuse the project's authenticated fixtures and interactions; never contact the API.
// The runner is removed in finally, including when a browser assertion fails.
const phase = process.argv[2] ?? 'verify';
const mutation = phase.startsWith('mutation');
const themeAtStart=await readFile(new URL('../src/shared/style/theme.css',import.meta.url),'utf8');
const output = `demo-output/color-system/${phase}`;
await mkdir(output, { recursive: true });
process.env.DESIGN_OUTPUT = output;
process.env.DESIGN_STATES = 'data';
process.env.DESIGN_ROUTES ??= '/,/login,/dashboard,/configuration,/students,/tesoreria/ingresos,/tesoreria/gastos,/tesoreria/aportes,/notifications';
process.env.DESIGN_VIEWPORTS ??= '[[1216,552],[768,1024],[390,844],[360,640]]';
let source = await readFile(new URL('./audit-frontend-design.mjs', import.meta.url), 'utf8');
source=source.replace('browser.newContext({ viewport:', "browser.newContext({ serviceWorkers:'block', viewport:");
source=source.replace("  await context.route('**/tesoreria/api/v1/**'", "  await context.routeWebSocket('**', socket=>socket.close());\n  await context.route('**/tesoreria/api/v1/**'");
if(mutation) {
  const notifications=['INFO','IMPORTANT','URGENT'].map((type,index)=>({id:index+1,title:`Prueba ${type}`,message:`Mensaje de prueba ${type}`,type,createdAt:`2026-10-20T1${index}:00:00Z`,recipients:[{deliveryId:index+1,userId:88,name:'Apoderado de prueba',email:'guardian@example.test',read:index===0,readAt:null,profileImageType:'INITIALS',profileImageUrl:null}]}));
  source=source.replace("else if(path.endsWith('/resumen-financiero'))",`else if(path.endsWith('/notifications/sent')) body=${JSON.stringify(notifications)};\n   else if(path.endsWith('/resumen-financiero'))`);
}
async function probePalette(page, output, path, width) {
  const rootState=await page.evaluate(()=>({style:document.documentElement.getAttribute('style'),bases:Object.fromEntries(['neutral-light','neutral-dark','primary','accent','success','warning','error','info'].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue('--base-'+k)]))}));
  const groups={dashboard:'.business-dashboard',cards:'[class*="card"], [class*="summary"], .flow-ribbon',navigation:'.sidebar, .sidebar a',buttons:'button',forms:'input, select, textarea',tables:'table, th, td',charts:'.recharts-wrapper svg *, [class*="donut"]',modals:'[role="dialog"], [role="dialog"] *',notifications:'.notifications-page, .notifications-admin, .notification-chat-panel',states:'[role="alert"], [role="status"], [class*="badge"], [class*="status"]',home:'.public-home',auth:'.auth-card, .login-page, form',configuration:'.settings-page, .configuration-page'};
  const sample=()=>page.evaluate(groups=>Object.fromEntries(Object.entries(groups).map(([name,selector])=>[name,[...document.querySelectorAll(selector)].map(el=>{const s=getComputedStyle(el);return ['color','backgroundColor','borderTopColor','fill','stroke','boxShadow','backgroundImage','accentColor'].map(k=>s[k]).join('|');})])),groups);
  let dialog;
  try {
    if(path==='/login')await page.getByRole('button',{name:'Ingresar',exact:true}).click();
    if(path==='/dashboard'){
      await page.locator('[aria-controls="dashboard-annual-quota"]').click();
      await page.locator('.annual-quota-donut .recharts-sector').first().waitFor({state:'visible'});
    }
    if(path==='/students')await page.getByTestId('delete-btn-AL-00000001').click();
    if(path==='/tesoreria/ingresos')await page.getByRole('button',{name:'Registrar ingreso',exact:true}).click();
    if(path==='/tesoreria/gastos')await page.getByRole('button',{name:'Registrar egreso',exact:true}).click();
    if(path==='/notifications'){
      await page.locator('.notification-contact').first().click();
      await page.locator('.notification-recipient-summary').click();
      await page.getByRole('checkbox',{name:'Seleccionar todos los apoderados',exact:true}).check();
      await page.getByRole('button',{name:'Crear notificación',exact:true}).click();
    }
    dialog=await page.getByRole('dialog').count();
    const before=await sample();
    // Diagnostic values only: not a supported/new product palette.
    await page.evaluate(()=>{
      const values={'neutral-light':'#d9d2cf','neutral-dark':'#292235',primary:'#713e68',accent:'#cda949',success:'#53b783',warning:'#e7a348',error:'#dd6f83',info:'#6d9be8'};
      for(const [key,value] of Object.entries(values))document.documentElement.style.setProperty('--base-'+key,value);
    });
    await page.waitForTimeout(200);
    const after=await sample();
    const affected=Object.fromEntries(Object.entries(before).map(([name,values])=>[name,{sampled:values.length,changed:values.filter((v,i)=>v!==after[name][i]).length}]));
    const unchangedControls=await page.evaluate(({groups,before})=>['buttons','forms'].flatMap(group=>[...document.querySelectorAll(groups[group])].flatMap((el,i)=>{
      const s=getComputedStyle(el);const value=['color','backgroundColor','borderTopColor','fill','stroke','boxShadow','backgroundImage','accentColor'].map(k=>s[k]).join('|');
      return value===before[group][i]?[{group,tag:el.tagName,type:el.getAttribute('type'),classes:el.getAttribute('class'),color:s.color,background:s.backgroundColor,accent:s.accentColor}]:[];
    })),{groups,before});
    if(!affected.buttons.changed)throw new Error(`Palette did not affect buttons on ${path}`);
    if(dialog && !affected.modals.changed)throw new Error(`Palette did not affect dialog on ${path}`);
    const semanticStates=await page.evaluate(()=>{
      const probe=document.createElement('span');document.body.append(probe);
      const colors=['success','warning','error','info'].map(name=>{probe.style.color=`var(--color-${name})`;return getComputedStyle(probe).color;});
      probe.remove();return colors;
    });
    if(new Set(semanticStates).size!==4)throw new Error('Semantic states collapsed after changing bases');
    await page.screenshot({path:`${output}/${path.replaceAll('/','_')}-${width}-mutation.png`,fullPage:true});
    return {path,width,affected,semanticStates,unchangedControls};
  } finally {
    await page.evaluate(state=>{
      if(state.style===null)document.documentElement.removeAttribute('style');else document.documentElement.setAttribute('style',state.style);
      for(const [key,value] of Object.entries(state.bases))if(getComputedStyle(document.documentElement).getPropertyValue('--base-'+key)!==value)throw new Error('Failed to restore '+key);
    },rootState);
    if(dialog)await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }
}
const injection = `
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
   if(path==='/' && await page.locator('.home-community').count()){
     await page.waitForFunction(()=>['heart','camera','staff'].every(name=>document.querySelector('.home-community__'+name+'-icon div svg')),{},{timeout:15000});
   }
   ${phase.startsWith('exports') ? `
   if(path==='/dashboard'){
     page.on('console',message=>{if(message.type()==='error')console.log('Export console: '+message.text());});
     const downloadPromise=page.waitForEvent('download',{timeout:60000}).catch(()=>null);
     await page.getByRole('button',{name:'Capturar dashboard completo',exact:true}).click();
     const download=await downloadPromise;
     if(!download){await page.screenshot({path:output+'/export-error.png',fullPage:true});throw new Error('No dashboard download: '+await page.locator('body').innerText());}
     await download.saveAs(output+'/dashboard-export.png');
     const html=await page.evaluate(async()=>{
       const {buildStandSalesReport}=await import('/src/presentation/pages/stand/standSalesReport.ts');
       return buildStandSalesReport({name:'Stand de prueba',eventName:'Evento de prueba',date:'2026-10-22',responsible:'Responsable de prueba'},[],new Date('2026-10-22T12:00:00Z'));
     });
     const printPage=await context.newPage();await printPage.setContent(html);await printPage.emulateMedia({media:'print'});
     await expect(printPage.locator('body')).toHaveCSS('color','rgb(23, 42, 56)');
     await printPage.pdf({path:output+'/stand-report.pdf',format:'A4',printBackground:true});await printPage.close();
     await page.mouse.move(0,0);
   }` : ''}
   ${mutation ? `const paletteProbe=await (${probePalette.toString()})(page,output,path,width);await writeFile(\`\${output}/\${path.replaceAll('/','_')}-\${width}-mutation.json\`,JSON.stringify({...paletteProbe,restored:true},null,2));` : ''}
   const colorSnapshot=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
     const properties=['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke'];
     return [...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length && !el.closest('#app-boot-loader')).map(el=>{
       const style=getComputedStyle(el);
       return {tag:el.tagName,classes:el.getAttribute('class'),colors:Object.fromEntries(properties.map(p=>[p,CSS.supports('color',style[p])?rgba(style[p]):style[p]]))};
     });
   });
   await writeFile(\`\${output}/\${path.replaceAll('/','_')}-\${width}-colors.json\`,JSON.stringify(colorSnapshot));
`;
const runner = new URL(`./.audit-color-runner-${phase}.mjs`, import.meta.url);
const { unlink } = await import('node:fs/promises');
try {
  await writeFile(runner, source.replace('   const metrics=await page.evaluate', injection + '\n   const metrics=await page.evaluate'));
  await import(`${runner.href}?phase=${phase}`);
  if (!phase.startsWith('baseline') && !mutation) {
    const { readdir } = await import('node:fs/promises');
    const baseline = `demo-output/color-system/baseline-${process.env.DESIGN_THEME ?? 'dark'}`;
    const comparison = [];
    for (const name of (await readdir(output)).filter(name => name.endsWith('-colors.json'))) {
      const before = JSON.parse(await readFile(`${baseline}/${name}`, 'utf8'));
      const after = JSON.parse(await readFile(`${output}/${name}`, 'utf8'));
      const changes = [];
      if (before.length !== after.length) changes.push({reason:'element-count',before:before.length,after:after.length});
      for (let i=0; i<Math.min(before.length,after.length); i++) {
        if (before[i].tag!==after[i].tag || before[i].classes!==after[i].classes) continue;
        for (const [property, value] of Object.entries(before[i].colors)) {
          const current=after[i].colors[property];
          if(Array.isArray(value) && Array.isArray(current)) {
            if(value.some((channel,j)=>Math.abs(channel-current[j])>1)) changes.push({i,tag:before[i].tag,classes:before[i].classes,property,before:value,after:current});
          } else if(value!==current) changes.push({i,property,before:value,after:current});
        }
      }
      comparison.push({name,elements:after.length,changes});
    }
    await writeFile(`${output}/comparison.json`, JSON.stringify(comparison,null,2));
    const failed=comparison.filter(view=>view.changes.length);
    console.log(JSON.stringify({colorComparison:{views:comparison.length,failed:failed.map(v=>({name:v.name,changes:v.changes.length,examples:v.changes.slice(0,2)}))}}));
    if(failed.length)process.exitCode=1;
  }
} finally {
  await unlink(runner).catch(() => {});
  const themeAfter=await readFile(new URL('../src/shared/style/theme.css',import.meta.url),'utf8');
  await writeFile(`${output}/source-restoration.json`,JSON.stringify({sourceUnchanged:themeAtStart===themeAfter}));
  if(themeAtStart!==themeAfter)process.exitCode=1;
}
