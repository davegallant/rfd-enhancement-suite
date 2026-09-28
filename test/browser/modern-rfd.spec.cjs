const { test, expect } = require('playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const sources = ['js/theme/settings.js','js/theme/dom.js','js/theme/adapters.js','js/theme/list.js','js/theme/thread.js','js/theme/controller.js','js/theme/bootstrap.js'];
for (const pageType of ['list-card', 'thread-rich', 'search']) for (const width of [390, 768, 1440]) {
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
    await page.goto(pageType === 'search' ? 'https://forums.redflagdeals.com/search.php?keywords=anker&sr=threads' : pageType === 'list-card' ? 'https://forums.redflagdeals.com/hot-deals-f9/' : 'https://forums.redflagdeals.com/example-1/');
    // Install representative site handlers before the extension enhances replies.
    if (pageType === 'thread-rich') await page.evaluate(() => {
      document.querySelectorAll('.ellipses_menu_button').forEach(button => button.addEventListener('click', () => {
        const open = button.classList.toggle('active');
        button.setAttribute('aria-expanded', String(open));
      }));
      document.querySelectorAll('.upvote_button').forEach(button => button.addEventListener('click', () => {
        button.nextElementSibling.textContent = Number(button.nextElementSibling.textContent) + 1;
      }));
    });
    for (const source of sources) await page.addScriptTag({ path:resolve(source) });
    await page.addStyleTag({ content:'#site_content .forums_layout > .primary_content { width: calc(100% - 320px); float: left; } .with_sidebar .primary_content { padding-right: 21.875rem; width: 100%; } #site_content .forums_layout > .sidebar_content { width: 300px; float: right; }' });
    await page.addStyleTag({ path:resolve('css/forum-theme.css') });
    await expect(page.locator('html')).toHaveAttribute('data-rfdm-enabled','true');
    if (width === 1440) {
      expect((await page.locator('#site_content').boundingBox()).width).toBeGreaterThanOrEqual(1390);
      expect((await page.locator('.primary_content').boundingBox()).width).toBeGreaterThanOrEqual(1300);
      const content = await page.locator(pageType === 'search' ? '#search_results' : pageType === 'list-card' ? '#forum-topics' : '#thread').boundingBox();
      if (pageType === 'list-card') {
        const parent = await page.locator('.primary_content').boundingBox();
        expect(Math.abs(content.x - parent.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(content.width - parent.width)).toBeLessThanOrEqual(1);
      } else {
        expect(content.width).toBeGreaterThanOrEqual(1390);
        expect(content.x).toBeLessThanOrEqual(25);
      }
      await expect(page.locator('#trending_hotdeals_threads')).toBeHidden();
    }
    if (pageType !== 'search') await expect(page.locator('[data-rfdm-role="deal-row"], [data-rfdm-role="post"]')).not.toHaveCount(0);
    if (pageType === 'search') {
      await expect(page.locator('input[name="keywords"]')).toBeVisible();
      await expect(page.locator('.sidebar_content')).toBeHidden();
      await expect(page.locator('#site_footer')).toBeHidden();
      await expect(page.locator('#header_billboard_bottom')).toBeHidden();
      await expect(page.locator('#footer_leaderboard')).toBeHidden();
      await page.evaluate(() => window.RFDModern.settings.save({ enabled: false, hideFooter: false }));
      await expect(page.locator('#site_footer')).toBeVisible();
      await expect(page.locator('#header_billboard_bottom')).toBeVisible();
      await expect(page.locator('.sidebar_content')).toBeHidden();
      await page.evaluate(() => window.RFDModern.settings.save({ hideFooter: true, clutterEnabled: false }));
      await expect(page.locator('#site_footer')).toBeVisible();
      await expect(page.locator('.sidebar_content')).toBeVisible();
      await expect(page.locator('#footer_leaderboard')).toBeVisible();
      await page.evaluate(() => window.RFDModern.settings.save({ clutterEnabled: true }));
      await expect(page.locator('#site_footer')).toBeHidden();
    }
    if (pageType === 'list-card') {
      const row = page.locator('[data-rfdm-role="deal-row"]').first();
      expect(await row.evaluate(el => getComputedStyle(el).listStyleType)).toBe('none');
      expect((await row.boundingBox()).height).toBeLessThan(160);
      const score = row.locator('.votes');
      for (const [text, colour] of [['+1', 'rgb(24, 115, 59)'], ['0', 'rgb(102, 102, 102)'], ['-1', 'rgb(186, 48, 48)']]) {
        await score.evaluate((el, value) => { el.textContent = value; }, text);
        await expect(score).toHaveCSS('color', colour);
      }
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await expect(score).toHaveCSS('color', 'rgb(255, 139, 133)');
      await score.evaluate(el => { el.textContent = '+1'; });
      await expect(score).toHaveCSS('color', 'rgb(110, 211, 151)');
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    }
    if (pageType === 'thread-rich' && width === 390) await page.evaluate(() => {
      const row = document.querySelector('.post_content table tr');
      for (let i = 0; i < 60; i++) { const cell = document.createElement('td'); cell.textContent = 'Wide'; row.append(cell); }
    });
    if (pageType === 'thread-rich' && width === 390) {
      const tableScroll = await page.locator('.post_content table').evaluate(el => el.scrollWidth - el.clientWidth);
      expect(tableScroll).toBeGreaterThan(0);
    }
    if (pageType === 'thread-rich') {
      const replies = page.locator('article.thread_post:not(.thread_original_post)');
      await expect(replies).toHaveCount(2);
      for (const reply of await replies.all()) {
        const geometry = await reply.evaluate(el => {
          const rect = selector => el.querySelector(selector).getBoundingClientRect();
          const author = rect('.post_profilearea'), date = rect('.post_dateline'), body = rect('.post_body'), actions = rect('.actionbar_wrapper');
          return { overlap: author.left < date.right && author.right > date.left && author.top < date.bottom && author.bottom > date.top,
            bodyBelow: body.top >= Math.max(author.bottom, date.bottom), actionGap: actions.top - body.bottom,
            inset: body.left - el.getBoundingClientRect().left, bodyWidth: body.width, postWidth: el.clientWidth,
            background: getComputedStyle(el.querySelector('.post_body')).backgroundImage };
        });
        expect(geometry.overlap).toBe(false);
        expect(geometry.bodyBelow).toBe(true);
        expect(geometry.actionGap).toBeGreaterThanOrEqual(-0.01); // Firefox rounds adjacent edges separately.
        expect(geometry.inset).toBeGreaterThanOrEqual(15);
        expect(geometry.postWidth - geometry.bodyWidth).toBeLessThanOrEqual(42);
        expect(geometry.background).toBe('none');
        await expect(reply.locator('.profile_numposts')).toBeHidden();
        await expect(reply.locator('blockquote blockquote')).toBeHidden();
      }
      const first = replies.first();
      await first.getByRole('button', { name: 'Upvote', exact: true }).click();
      await expect(first.locator('.total_count')).toHaveText('9');
      await first.getByRole('button', { name: 'More', exact: true }).click();
      await expect(first.getByRole('link', { name: 'Report', exact: true })).toBeVisible();
      const menu = await first.locator('.ellipses_menu_content').boundingBox();
      expect(menu.x).toBeGreaterThanOrEqual(0);
      expect(menu.x + menu.width).toBeLessThanOrEqual(width);
      await first.getByRole('button', { name: 'More', exact: true }).click();
      await page.evaluate(() => window.RFDModern.settings.save({ compactProfiles: false }));
      await expect(first.locator('.profile_numposts')).toBeVisible();
      await page.evaluate(() => window.RFDModern.settings.save({ compactProfiles: true }));
      const cite = first.locator('cite');
      await expect(cite).toHaveCSS('font-size', '13px');
      await expect(cite).toHaveCSS('font-style', 'normal');
      const quote = first.locator('blockquote').first();
      const lightBackground = await quote.evaluate(el => getComputedStyle(el).backgroundColor);
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      expect(await quote.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(lightBackground);
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
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
      await expect(page.locator('#p4 .post_body')).toHaveCSS('padding-left', '212px');
      await expect(page.locator('#p4 .post_dateline')).toHaveCSS('background-color', 'rgb(204, 0, 0)');
      await expect(page.locator('.signature')).toBeHidden();
      await page.evaluate(() => window.RFDModern.settings.save({clutterEnabled:false}));
      await expect(page.locator('.signature')).toBeVisible();
    }
  });
}
