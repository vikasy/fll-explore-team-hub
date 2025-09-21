// test_lighthouse_audit.js
// Runs Lighthouse audits for all HTML files in the current directory (localhost or remote)
// Usage: node test_lighthouse_audit.js [--remote]

const { execSync } = require('child_process');
const fs = require('fs');

const useRemote = process.argv.includes('--remote');
const BASE_URL = useRemote
  ? 'https://vikasy.github.io/fll-explore-team-hub'
  : 'http://localhost:8000';
let htmlFiles;
if (useRemote) {
  htmlFiles = ['index.html', 'parent_conversation.html', 'team_media.html'];
} else {
  htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
}

const tempJsons = [];
for (const file of htmlFiles) {
  const url = `${BASE_URL}/${file}`;
  const tempJson = `__lh_temp_${file.replace(/\W/g, '_')}.json`;
  tempJsons.push(tempJson);
  console.log(`\nRunning Lighthouse audit for: ${url}`);
  try {
    execSync(`npx lighthouse \"${url}\" --quiet --chrome-flags='--headless --no-sandbox' --output json --output-path=${tempJson.replace('.json','')}`, { stdio: 'inherit' });
    console.log(`Lighthouse JSON report saved to ${tempJson}`);
  } catch (e) {
    console.error(`Lighthouse audit failed for ${url}`);
  }
}

// Combine all temp JSONs into summary
const summaryScript = 'lighthouse_summary.js';
execSync(`node ${summaryScript}`);

// Remove temp JSONs
for (const tempJson of tempJsons) {
  try { fs.unlinkSync(tempJson); } catch (e) { /* ignore */ }
}
console.log('Only lighthouse_summary.json and lighthouse_summary.html remain.');
