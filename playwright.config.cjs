const { defineConfig } = require('playwright/test');
module.exports = defineConfig({ testDir:'test/browser', testMatch:'*.spec.cjs', timeout:30000, use:{ headless:true }, projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}}], reporter:'line' });
