const { chromium } = require('playwright');
const { spawn } = require('node:child_process');

(async () => {
  const server = spawn('node', ['dev.cjs'], { env: { ...process.env, DND_SESSION_SECRET: 'test' } });
  let serverReady = false;
  server.stdout.on('data', d => { if (d.toString().includes('Game ready')) serverReady = true; });
  
  while(!serverReady) await new Promise(r => setTimeout(r, 100));

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const violations = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
      violations.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    if (err.message.includes('Content Security Policy')) {
      violations.push(err.message);
    }
  });

  const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; media-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none';";
  
  await page.route('**/*', async route => {
    const response = await route.fetch();
    const headers = response.headers();
    if (response.headers()['content-type']?.includes('text/html')) {
        headers['content-security-policy'] = csp;
    }
    route.fulfill({
      response,
      headers
    });
  });

  console.log('Navigating to landing page...');
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');

  console.log('Creating character...');
  await page.fill('#name', 'Rowan');
  await page.click('button.primary.embark');
  await page.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 500));

  console.log('Checking map/tactical UI and other elements...');
  // It won't have real AI responses without keys, but we can open modals
  try { await page.click('#map'); } catch {}
  try { await page.click('#potion'); } catch {}
  
  // Also check classic route
  console.log('Checking classic route...');
  await page.goto('http://localhost:3000/classic.html');
  await page.waitForLoadState('networkidle');
  await page.fill('#name', 'Rowan');
  await page.click('button.primary.embark');
  await page.waitForLoadState('networkidle');
  
  await browser.close();
  server.kill();

  if (violations.length > 0) {
    console.error('CSP Violations Found:');
    for (const v of violations) console.error('-', v);
    process.exit(1);
  } else {
    console.log('No CSP violations detected.');
  }
})();
