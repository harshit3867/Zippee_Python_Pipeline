const { chromium } = require('playwright');
const readline = require('readline');

(async () => {

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://fk.portal.gam.shipsy.io/login');

  console.log("👉 Please login manually using Google.");
  console.log("👉 After login is fully complete and dashboard is visible,");
  console.log("👉 Come back to this terminal and press ENTER.");

  // Wait for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise(resolve => {
    rl.question("Press ENTER to save session... ", () => {
      resolve();
    });
  });

  rl.close();

  // Save session AFTER user confirmation
  await context.storageState({ path: 'auth.json' });

  console.log("✅ Session saved successfully!");

  await browser.close();

})();