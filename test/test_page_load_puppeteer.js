// test_page_load_puppeteer.js
// Measures full page load time (including scripts, images, etc.) for all HTML files in the current directory using Puppeteer.
// Usage: node test_page_load_puppeteer.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const N = 10; // Number of runs per file (reduce for speed, increase for accuracy)

// Usage: node test_page_load_puppeteer.js [--remote]
// --remote: use remote address (vikasy.github.io/fllexplore)
const useRemote = process.argv.includes('--remote');
const BASE_URL = useRemote
  ? 'https://vikasy.github.io/fll-explore-team-hub/'
  : 'http://localhost:8000';


async function main() {
  const htmlDir = path.join(__dirname, '..');
  const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
  const results = [];
  const errors = [];
  let browser = null;
  try {
    browser = await puppeteer.launch();
    for (const file of htmlFiles) {
      const url = `${BASE_URL}/${file}`;
      let total = 0;
      console.log(`Testing ${file} (${url}) ...`);
      try {
        for (let i = 0; i < N; i++) {
          const page = await browser.newPage();
          const start = Date.now();
          await page.goto(url, { waitUntil: 'load', timeout: 20000 }); // 20s timeout
          const end = Date.now();
          const loadTime = (end - start) / 1000;
          total += loadTime;
          await page.close();
        }
        const avg = (total / N).toFixed(3);
        console.log(`Average full load time for ${file} over ${N} runs: ${avg} seconds`);
        results.push({ file, url, average_time: Number(avg) });
      } catch (err) {
        console.error(`Error testing ${file}:`, err.message);
        errors.push({ file, url, error: err.message });
      }
      console.log('---');
    }
  } catch (err) {
    console.error('Fatal error launching Puppeteer or running tests:', err.message);
    errors.push({ fatal: true, error: err.message });
  } finally {
    if (browser) await browser.close();
    // Output JSON
    const jsonFile = useRemote ? 'test_page_load_puppeteer_remote.json' : 'test_page_load_puppeteer_local.json';
    const output = { results, errors };
    fs.writeFileSync(path.join(__dirname, jsonFile), JSON.stringify(output, null, 2));
    const errLogFile = jsonFile.replace(/\.json$/, '.json.err.log');
    if (errors.length > 0) {
      fs.writeFileSync(path.join(__dirname, errLogFile), JSON.stringify(errors, null, 2));
      console.log(`Errors encountered. See ${errLogFile} for details.`);
    } else {
      // Remove any stale error log file if it exists
      try {
        fs.unlinkSync(path.join(__dirname, errLogFile));
      } catch (e) { /* ignore if not present */ }
    }
    console.log(`JSON results written to ${jsonFile}`);
  }
}

main();
