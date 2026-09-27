const { test, expect } = require('playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const sources = ['js/theme/settings.js','js/theme/dom.js','js/theme/adapters.js','js/theme/list.js','js/theme/thread.js','js/theme/controller.js','js/theme/bootstrap.js'];
for (const pageType of ['list-card', 'thread-rich']) for (const width of [390, 768, 1440]) {
  test(`${pageType} at ${width}px keeps content accessible`, async ({ page }) => {
    await page.setViewportSize({width, height:900});
    await page.addInitScript(() => {
      const data = {};
      const listeners = [];
      window.chrome = { storage: { local: {
        async get(keys) { const names = Array.isArray(keys) ? keys : [keys]; return Object.fromEntries(names.filter(k => k in data).map(k => [k,data[k]])); },
        async set(patch) { const changes={}; for(const [k,v] of Object.entries(patch)) {changes[k]={oldValue:data[k],newValue:v};data[k]=v;} listeners.forEach(fn=>fn(changes,'local')); },
        async remove(keys) { keys.forEach(k=>delete data[k]); }
      }, onChanged: { addListener(fn){listeners.push(fn)}, removeListener(fn){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)} } }, runtime: {onMessage:{addListener(){},removeListener(){}}} };
    });
    await page.route('**/*', route => {
      if (route.request().isNavigationRequest()) route.fulfill({status:200, contentType:'text/html', body:readFileSync(`test/fixtures/rfd/${pageType}.html`,'utf8')});
      else route.abort();
    });
    await page.goto(pageType === 'list-card' ? 'https://forums.redflagdeals.com/hot-deals-f9/' : 'https://forums.redflagdeals.com/example-1/');
    for (const source of sources) await page.addScriptTag({ path:resolve(source) });
    await page.addStyleTag({ content:'#site_content .forums_layout > .primary_content { width: calc(100% - 320px); float: left; } .with_sidebar .primary_content { padding-right: 21.875rem; width: 100%; } #site_content .forums_layout > .sidebar_content { width: 300px; float: right; }' });
    await page.addStyleTag({ path:resolve('css/forum-theme.css') });
    await expect(page.locator('html')).toHaveAttribute('data-rfdm-enabled','true');
    if (width === 1440) {
      expect((await page.locator('#site_content').boundingBox()).width).toBeGreaterThanOrEqual(1390);
      expect((await page.locator('.primary_content').boundingBox()).width).toBeGreaterThanOrEqual(1300);
      const content = await page.locator(pageType === 'list-card' ? '#forum-topics' : '#thread').boundingBox();
      if (pageType === 'list-card') {
        expect(content.width).toBeGreaterThanOrEqual(1100);
        expect(content.width).toBeLessThanOrEqual(1280);
      } else {
        expect(content.width).toBeGreaterThanOrEqual(1390);
        expect(content.x).toBeLessThanOrEqual(25);
      }
      await expect(page.locator('#trending_hotdeals_threads')).toBeHidden();
    }
    await expect(page.locator('[data-rfdm-role="deal-row"], [data-rfdm-role="post"]')).not.toHaveCount(0);
    if (pageType === 'list-card') {
      const row = page.locator('[data-rfdm-role="deal-row"]').first();
      expect(await row.evaluate(el => getComputedStyle(el).listStyleType)).toBe('none');
      expect((await row.boundingBox()).height).toBeLessThan(160);
    }
    if (pageType === 'thread-rich' && width === 390) await page.evaluate(() => {
      const row = document.querySelector('.post_content table tr');
      for (let i = 0; i < 60; i++) { const cell = document.createElement('td'); cell.textContent = 'Wide'; row.append(cell); }
    });
    if (pageType === 'thread-rich' && width === 390) {
      const tableScroll = await page.locator('.post_content table').evaluate(el => el.scrollWidth - el.clientWidth);
      expect(tableScroll).toBeGreaterThan(0);
    }
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(scroll).toBeLessThanOrEqual(1);
    await page.screenshot({path:`test-results/${pageType}-${width}.png`,fullPage:true});
    if (pageType === 'list-card' && width === 1440) {
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); });
      await expect(page.locator('html')).not.toHaveAttribute('data-rfdm-theme');
      await page.evaluate(() => window.RFDModern.settings.save({enabled:false}));
      await expect(page.locator('html')).not.toHaveAttribute('data-rfdm-enabled','true');
      await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
      await expect(page.locator('.sidebar_content')).toBeHidden();
    }
    if (pageType === 'thread-rich' && width === 1440) {
      await page.evaluate(() => window.RFDModern.settings.save({enabled:false}));
      await expect(page.locator('.signature')).toBeHidden();
      await page.evaluate(() => window.RFDModern.settings.save({clutterEnabled:false}));
      await expect(page.locator('.signature')).toBeVisible();
    }
  });
}
