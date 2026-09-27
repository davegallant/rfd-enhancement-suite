const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripRedirect } = require('./js/stripRedirect.js');
const rules = require('./redirects.json');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

test('preserves seller, variant, unknown parameters, and fragments after ref paths', () => {
  assert.equal(stripRedirect('https://www.amazon.ca/Product/dp/B0TEST/ref=sr_1_1?tag=rfd&th=1&psc=1&smid=SELLER&custom=yes#reviews', rules),
    'https://www.amazon.ca/Product/dp/B0TEST?th=1&psc=1&smid=SELLER&custom=yes#reviews');
});

test('unwraps Amazon destinations once without losing encoded shopping values', () => {
  const destination = 'https://www.amazon.ca/Product/dp/B0TEST?tag=rfd&th=1&smid=SELLER&custom=a%26b%3Dc%2520#reviews';
  assert.equal(stripRedirect(`https://www.amazon.ca/gp/redirect.html?tag=rfd&location=${encodeURIComponent(destination)}&ie=UTF8`, rules),
    'https://www.amazon.ca/Product/dp/B0TEST?th=1&smid=SELLER&custom=a%26b%3Dc%2520#reviews');
});

test('removes repeated tracking parameters while preserving query encoding', () => {
  assert.equal(stripRedirect('https://www.amazon.com/Product/dp/B0TEST?tag=one&custom=a%26b%3Dc%2520&tag=two&ref_=x&th=1#details', rules),
    'https://www.amazon.com/Product/dp/B0TEST?custom=a%26b%3Dc%2520&th=1#details');
});

test('does not mistake lookalike hosts or Amazon URLs in query values for Amazon links', () => {
  for (const input of [
    'https://notamazon.ca/dp/B0TEST?tag=rfd',
    'https://amazon.ca.example.com/dp/B0TEST?tag=rfd',
    'https://example.com/?next=https://www.amazon.ca/dp/B0TEST?tag=rfd',
  ]) assert.equal(stripRedirect(input, rules), input);
});
test('affiliate wrappers match only their own hostnames', () => {
  for (const input of [
    'https://evil.example/path/go.redirectingat.com/?url=https%3A%2F%2Fshop.example%2Fitem',
    'https://go.redirectingat.com.evil.example/?url=https%3A%2F%2Fshop.example%2Fitem',
    'https://evil.example/?next=https%3A%2F%2Fwww.awin1.com%2F&p=https%3A%2F%2Fshop.example%2Fitem',
  ]) assert.equal(stripRedirect(input, rules), input);
});

test('preserves search keywords while removing product search tracking consistently', () => {
  assert.equal(stripRedirect('https://www.amazon.ca/s?keywords=coffee&tag=rfd', rules),
    'https://www.amazon.ca/s?keywords=coffee');
  assert.equal(stripRedirect('https://www.amazon.ca/dp/B0TEST?keywords=coffee&crid=123&dib=x&th=1', rules),
    'https://www.amazon.ca/dp/B0TEST?th=1');
});

test('RFD subId1 cleanup preserves encoded values and fragments after Amazon cleanup', () => {
  assert.equal(stripRedirect('https://www.amazon.ca/dp/B0TEST?tag=rfd&custom=a%26b%3Dc%2520&subId1=rfd#reviews', rules),
    'https://www.amazon.ca/dp/B0TEST?custom=a%26b%3Dc%2520#reviews');
  assert.equal(stripRedirect('https://shop.com/a%26b&subId1=rfd#reviews', rules),
    'https://shop.com/a%26b#reviews');
});

test('the generated userscript preserves shopping parameters too', () => {
  const link = { href: 'https://www.amazon.ca/Product/dp/B0TEST/ref=sr_1?tag=rfd&th=1&custom=a%26b#reviews' };
  vm.runInNewContext(readFileSync('script.js', 'utf8'), {
    URL, URLSearchParams, console, document: { querySelectorAll: () => [link] },
  });
  assert.equal(link.href, 'https://www.amazon.ca/Product/dp/B0TEST?th=1&custom=a%26b#reviews');
});
