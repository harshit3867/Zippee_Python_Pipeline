const { chromium } = require('playwright');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

(async () => {

  const TELEGRAM_BOT_TOKEN = "8540247081:AAE4awK6XzaHqXHaFizgV0Mq54Z1TlfV0zI";
  const TELEGRAM_CHAT_ID = "1280088419";

  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    storageState: 'auth.json',
    acceptDownloads: true
  });

  const page = await context.newPage();

  await page.goto('https://fk.portal.gam.shipsy.io/ops/od/dispatch-screen');
  await page.waitForSelector('text=No. of Active Riders');

  const stores = [
    "Kalyan Nagar_mnow",
    "Basaveshwar Nagar_mnow",
    "Jakkur_mnow",
    "Begur_mnow",
    "Thyagaraja Nagar_mnow",
    "Brookfield_mnow",
    "Hulimavu_mnow",
    "Sarjapur Road_mnow",
    "Manikonda_mnow",
    "Gachibowli_mnow",
    "Attapur_mnow",
    "Nizampet_mnow"
  ];

  const results = [];

  for (let store of stores) {

    await page.locator('[class*="storeSearch"]').first().click();
    await page.waitForTimeout(1000);

    const storeInput = page.locator('[class*="storeSearch"] input').first();
    await storeInput.fill('');
    await storeInput.type(store, { delay: 100 });

    const suggestion = page.locator(`text=${store}`).first();
    await suggestion.waitFor({ timeout: 5000 });
    await suggestion.click();

    await page.waitForSelector('text=No. of Active Riders');

    const activeRiders = await page.locator('text=No. of Active Riders')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();

    const bannerFactor = await page.locator('text=Banner Factor')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();

    const idleRiders = await page.locator('text=In Store')
      .nth(1)
      .locator('xpath=following-sibling::*[1]')
      .innerText();
    const checkedOut = await page.locator('text=Checked Out')
  .locator('xpath=following-sibling::*[1]')
  .innerText();
      // ===== Extract Left Panel Pending Orders =====

// Left side In Store (first one)
const leftInStoreText = await page.locator('text=In Store')
  .first()
  .locator('xpath=following-sibling::*[1]')
  .innerText();

// Left side Unassigned
const unassignedText = await page.locator('text=Unassigned')
  .first()
  .locator('xpath=following-sibling::*[1]')
  .innerText();

// Convert to number and calculate
const pendingOrders =
  parseInt(leftInStoreText.trim()) +
  parseInt(unassignedText.trim());
    results.push({
  store,
  active: activeRiders.trim(),
  idle: idleRiders.trim(),
  checkedOut: checkedOut.trim(),
  banner: bannerFactor.trim(),
  pending: pendingOrders
});
  }

  // ================== OPEN SASA ==================
  const sasaPage = await context.newPage();
  await sasaPage.goto('https://harshit3867.github.io/SASA/mnow_rider_auto.html');
  await sasaPage.waitForTimeout(3000);

  let rawText = "";
  for (let r of results) {
    rawText += `Switching to: ${r.store}\n`;
    rawText += `Store: ${r.store}\n`;
    rawText += `Active: ${r.active}\n`;
rawText += `Idle: ${r.idle}\n`;
rawText += `CheckedOut: ${r.checkedOut}\n`;
rawText += `Banner: ${r.banner}\n`;
rawText += `Pending: ${r.pending}\n`;
    rawText += `----------------------\n`;
  }

  await sasaPage.locator('textarea').fill(rawText);
  await sasaPage.getByText('Generate Reports').click();

  console.log("📊 Report Generated");

  await sasaPage.waitForTimeout(5000);

  // ================== DOWNLOAD BOTH REPORTS ==================
  const downloadPromises = [];

  for (let i = 0; i < 2; i++) {
    downloadPromises.push(
      sasaPage.waitForEvent('download')
    );
  }

  await sasaPage.getByText('Download Both Reports').click();

  const downloads = await Promise.all(downloadPromises);

  const savedFiles = [];

  for (const download of downloads) {
    const filePath = path.join(__dirname, download.suggestedFilename());
    await download.saveAs(filePath);
    savedFiles.push(filePath);
    console.log("⬇ Downloaded:", download.suggestedFilename());
  }

  // ================== SEND TO TELEGRAM ==================

  async function sendTelegram(filePath) {
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('document', fs.createReadStream(filePath));

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      form,
      { headers: form.getHeaders() }
    );
  }

  const today = new Date().toLocaleDateString();

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      text: `📊 MNow Rider Reports – ${today}`
    }
  );

  for (const file of savedFiles) {
    await sendTelegram(file);
    console.log("📨 Sent to Telegram:", path.basename(file));
  }

  console.log("✅ All reports sent to Telegram");

  await browser.close();

})();