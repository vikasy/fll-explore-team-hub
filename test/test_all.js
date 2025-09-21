// test/test_all.js
// Runs all test scripts and creates a combined summary JSON
// Usage: node test_all.js [--remote]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = __dirname;
const useRemote = process.argv.includes('--remote');

function runScript(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: TEST_DIR });
  } catch (e) {
    console.error(`Error running: ${cmd}`);
  }
}

// Run all tests
console.log('Running test_html_network_time.sh...');
runScript(`./test_html_network_time.sh${useRemote ? ' --remote' : ''}`);

console.log('Running test_page_load_puppeteer.js...');
runScript(`node test_page_load_puppeteer.js${useRemote ? ' --remote' : ''}`);

console.log('Running test_lighthouse_audit.js...');
runScript(`node test_lighthouse_audit.js${useRemote ? ' --remote' : ''}`);

// Collect all JSON results
const results = {};

// HTML network time
const netJson = useRemote ? 'test_html_network_time_remote.json' : 'test_html_network_time_local.json';
if (fs.existsSync(path.join(TEST_DIR, netJson))) {
  results.html_network_time = JSON.parse(fs.readFileSync(path.join(TEST_DIR, netJson), 'utf8'));
}

// Puppeteer load time
const puppeteerJson = useRemote ? 'test_page_load_puppeteer_remote.json' : 'test_page_load_puppeteer_local.json';
if (fs.existsSync(path.join(TEST_DIR, puppeteerJson))) {
  results.page_load_puppeteer = JSON.parse(fs.readFileSync(path.join(TEST_DIR, puppeteerJson), 'utf8'));
}

// Lighthouse summary
if (fs.existsSync(path.join(TEST_DIR, 'test_lighthouse_summary.json'))) {
  results.lighthouse = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'test_lighthouse_summary.json'), 'utf8'));
}


// Write combined summary
const summaryFile = useRemote ? 'test_all_summary_remote.json' : 'test_all_summary_local.json';
fs.writeFileSync(path.join(TEST_DIR, summaryFile), JSON.stringify(results, null, 2));
console.log(`Combined summary written to ${summaryFile}`);

// Cleanup: remove __lh_temp* files
const tempFiles = fs.readdirSync(TEST_DIR).filter(f => f.startsWith('__lh_temp'));
for (const file of tempFiles) {
  try {
    fs.unlinkSync(path.join(TEST_DIR, file));
    console.log(`Removed temp file: ${file}`);
  } catch (e) {
    console.warn(`Could not remove temp file: ${file}`);
  }
}
