// Export the email header from the app artwork; no browser is needed at runtime.
// Run from the repository root: node scripts/build-invitation-banner.cjs
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const frontendRequire = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = frontendRequire('@playwright/test');
const passwordChanged = process.argv.includes('--password-changed');
const passwordReset = process.argv.includes('--password-reset');
const title = passwordReset ? 'Restablece tu<br>contraseña' : passwordChanged ? 'Contraseña<br>modificada' : 'Te damos<br>la bienvenida';
const filename = passwordReset ? 'password-reset.png' : passwordChanged ? 'password-changed.png' : 'principal_login.png';
(async () => {
 const artwork = fs.readFileSync(path.join(root, 'frontend/src/assets/community-icons/principal_login.webp')).toString('base64');
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1060, height: 440 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
   *{box-sizing:border-box}body{margin:0;width:1060px;height:440px;background:#13365a;font-family:Arial,sans-serif}
   .banner{position:relative;width:100%;height:100%;overflow:hidden;background:#13365a}
   img{position:absolute;width:100%;height:100%;object-fit:cover;object-position:center 55%}
   .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,27,52,.9),rgba(8,27,52,.65) 38%,rgba(8,27,52,.06) 78%)}
   h1{position:absolute;left:52px;top:116px;margin:0;color:white;font-size:58px;line-height:1.1;font-weight:700;letter-spacing:-1px;text-shadow:0 2px 8px rgba(0,0,0,.2)}
  </style></head><body><div class="banner"><img src="data:image/webp;base64,${artwork}" alt=""><div class="shade"></div><h1>${title}</h1></div></body></html>`);
  await page.locator('img').evaluate(image => image.decode());
  await page.screenshot({path:path.join(root,'backend/src/main/resources/email',filename)});
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
