// lighthouse_summary.js
// Combines all Lighthouse JSON reports into one summary JSON and HTML file
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.')
  .filter(f => f.startsWith('lh-') && f.endsWith('.report.json'));

const importantAudits = [
  'first-contentful-paint',
  'speed-index',
  'largest-contentful-paint',
  'interactive',
  'total-blocking-time',
  'cumulative-layout-shift',
  'uses-optimized-images',
  'uses-responsive-images',
  'uses-text-compression',
  'unused-javascript',
  'render-blocking-resources',
  'uses-long-cache-ttl',
  'uses-http2'
];

const summary = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = data.finalUrl;
  const categories = data.categories;
  const audits = data.audits;
  const perfDetails = {};
  for (const auditId of importantAudits) {
    if (audits[auditId]) {
      perfDetails[auditId] = {
        score: audits[auditId].score,
        displayValue: audits[auditId].displayValue,
        details: audits[auditId].details && audits[auditId].details.items ? audits[auditId].details.items : undefined
      };
    }
  }
  summary.push({
    file,
    url,
    performance: categories.performance.score,
    accessibility: categories.accessibility.score,
    bestPractices: categories['best-practices'].score,
    seo: categories.seo.score,
    pwa: categories.pwa ? categories.pwa.score : undefined,
    performanceDetails: perfDetails
  });
}

// Save summary JSON
fs.writeFileSync('test_lighthouse_summary.json', JSON.stringify(summary, null, 2));

console.log('Wrote test_lighthouse_summary.json');