const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  let browser;

  try {
    console.log('🚀 Starting Playwright...');

    // =========================================================
    // 1. CHECK AUTH FILE
    // =========================================================
    const authPath = path.join(__dirname, 'auth.json');

    if (!fs.existsSync(authPath)) {
      throw new Error(
        'auth.json not found. Keep auth.json in the same folder as this script.'
      );
    }

    // =========================================================
    // 2. CREATE DOWNLOAD FOLDER
    // =========================================================
    const downloadDir = path.join(__dirname, 'downloads');

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // =========================================================
    // 3. LAUNCH BROWSER
    // =========================================================
    browser = await chromium.launch({
      headless: false,
      slowMo: 500
    });

    // =========================================================
    // 4. LOAD SAVED LOGIN SESSION
    // =========================================================
    const context = await browser.newContext({
      storageState: authPath,
      acceptDownloads: true
    });

    const page = await context.newPage();

    // =========================================================
    // 5. OPEN SHIPSY
    // =========================================================
    console.log('🌐 Opening Shipsy...');

    await page.goto(
      'https://fk.portal.gam.shipsy.io/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    await page.waitForTimeout(3000);

    // =========================================================
    // 6. LOGIN VIA GOOGLE
    // =========================================================
    console.log('🔐 Continuing with saved login session...');

    const loginButton = page.getByRole('button', {
      name: 'Login via Google'
    });

    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

    // =========================================================
    // 7. OPEN ZIPPEE CENTRAL REPORTING
    // =========================================================
    console.log('📊 Opening Zippee Central Reporting...');

    await page.getByRole('link', {
      name: 'Zippee Central Reporting'
    }).click();

    await page.waitForTimeout(2000);

    // =========================================================
    // 8. CLICK IMAGE / MENU ICON
    // =========================================================
    console.log('📂 Opening menu...');

    await page.getByRole('img').nth(1).click();

    await page.waitForTimeout(1000);

    // =========================================================
    // 9. OPEN ANALYTICS
    // =========================================================
    console.log('📈 Opening Analytics...');

    await page.getByText('Analytics').click();

    await page.waitForTimeout(1500);

    // =========================================================
    // 10. OPEN BUSINESS INTELLIGENCE
    // =========================================================
    console.log('📉 Opening Business Intelligence...');

    await page.getByRole('link', {
      name: 'Business Intelligence NEW'
    }).click();

    // =========================================================
    // 11. WAIT FOR ANALYTICS IFRAME
    // =========================================================
    console.log('⏳ Waiting for analytics iframe...');

    const iframeSelector =
      'iframe[title="persistent-iframe-generic-analytics"]';

    await page.waitForSelector(iframeSelector, {
      state: 'attached',
      timeout: 60000
    });

    const analyticsFrame = page
      .locator(iframeSelector)
      .contentFrame();

    await page.waitForTimeout(5000);

    // =========================================================
    // 12. EXPAND REPORT MENU
    // =========================================================
    console.log('📂 Expanding report menu...');

    await analyticsFrame
      .getByRole('img', { name: 'caret-right' })
      .locator('svg')
      .click();

    await page.waitForTimeout(1000);

    // =========================================================
    // 13. OPEN WORKER CHECK-IN REPORT
    // =========================================================
    console.log('👷 Opening Worker check-in report...');

    await analyticsFrame
      .getByText('Worker check-in report')
      .click();

    await page.waitForTimeout(3000);

    // =========================================================
    // 14. OPEN WORKDATE FILTER
    // =========================================================
    console.log('📅 Opening Workdate filter...');

    await analyticsFrame
      .getByRole('button', {
        name: 'Workdate caret-down'
      })
      .click();

    await page.waitForTimeout(1000);

    // =========================================================
    // 15. SELECT TODAY
    // =========================================================
    console.log('📆 Selecting Today...');

    await analyticsFrame
      .getByRole('button', {
        name: 'Today'
      })
      .click();

    await page.waitForTimeout(500);

    // =========================================================
    // 16. APPLY DATE SELECTION
    // =========================================================
    console.log('✅ Applying date selection...');

    await analyticsFrame
      .getByRole('button', {
        name: 'Apply down'
      })
      .click();

    await page.waitForTimeout(1000);

    // =========================================================
    // 17. APPLY FILTER
    // =========================================================
    console.log('🔎 Applying filter...');

    await analyticsFrame
      .getByText('Apply Filter')
      .click();

    // Wait for report refresh
    await page.waitForTimeout(5000);

    // =========================================================
    // 18. CLICK DOWNLOAD ICON
    // =========================================================
    console.log('⬇️ Opening download menu...');

    await analyticsFrame
      .locator('.anticon.anticon-download > svg')
      .click();

    await page.waitForTimeout(1000);

    // =========================================================
    // 19. SELECT CSV
    // =========================================================
    console.log('📄 Selecting CSV...');

    await analyticsFrame
      .getByText('CSV')
      .first()
      .click();

    // Give Shipsy time to prepare export
    await page.waitForTimeout(3000);

    // =========================================================
    // 20. OPEN DOWNLOAD STATUS
    // =========================================================
    console.log('⏳ Opening download status...');

    await analyticsFrame
      .getByText('Click here to see the status')
      .click();

    await page.waitForTimeout(2000);

    // =========================================================
    // 21. DOWNLOAD DATA FILE FROM SHIPSY
    // =========================================================
    console.log('⬇️ Downloading Shipsy report...');

    const downloadButton = analyticsFrame
      .getByLabel('Download Data File')
      .first();

    await downloadButton.waitFor({
      state: 'visible',
      timeout: 60000
    });

    const downloadPromise = page.waitForEvent('download', {
      timeout: 60000
    });

    await downloadButton.click();

    const download = await downloadPromise;

    // =========================================================
    // 22. SAVE DOWNLOADED SHIPSY FILE
    // =========================================================
    const suggestedFilename = download.suggestedFilename();

    const savePath = path.join(
      downloadDir,
      suggestedFilename
    );

    await download.saveAs(savePath);

    console.log('✅ Shipsy download completed successfully!');
    console.log(`📁 File saved at: ${savePath}`);

    // Confirm file exists
    if (!fs.existsSync(savePath)) {
      throw new Error(
        `Downloaded Shipsy file not found at: ${savePath}`
      );
    }

    await page.waitForTimeout(2000);

    // =========================================================
    // 23. OPEN UNIQUE RIDER REPORT PAGE
    // =========================================================
    console.log('🌐 Opening Unique Rider Report page...');

    const reportPage = await context.newPage();

    await reportPage.goto(
      'https://harshit3867.github.io/StrategicAnalyticalSuiteZippee/Myntra_unique_rider.html',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    console.log('✅ Unique Rider Report page opened');

    await reportPage.waitForTimeout(3000);

    // =========================================================
    // 24. FIND CHOOSE FILE INPUT
    // =========================================================
    console.log('📁 Finding Choose File input...');

    const fileInput = reportPage.locator(
      'input[type="file"]'
    );

    await fileInput.waitFor({
      state: 'attached',
      timeout: 30000
    });

    // =========================================================
    // 25. UPLOAD DOWNLOADED SHIPSY FILE
    // =========================================================
    console.log('📤 Uploading downloaded Shipsy file...');

    await fileInput.setInputFiles(savePath);

    console.log('✅ Shipsy file selected successfully');

    await reportPage.waitForTimeout(2000);

    // =========================================================
    // 26. CLICK GENERATE REPORT
    // =========================================================
    console.log('⚙️ Clicking Generate Report...');

    const generateButton = reportPage.getByRole(
      'button',
      {
        name: 'Generate Report',
        exact: true
      }
    );

    await generateButton.waitFor({
      state: 'visible',
      timeout: 30000
    });

    await generateButton.click();

    console.log('✅ Generate Report clicked');

    // Wait for CSV processing and table generation
    await reportPage.waitForTimeout(5000);

    // =========================================================
    // 27. CLICK DOWNLOAD REPORT
    // =========================================================
    console.log('⬇️ Clicking Download Report...');

    const reportDownloadButton = reportPage.getByRole(
      'button',
      {
        name: 'Download Report',
        exact: true
      }
    );

    await reportDownloadButton.waitFor({
      state: 'visible',
      timeout: 30000
    });

    // =========================================================
    // 28. WAIT FOR FINAL REPORT DOWNLOAD
    // =========================================================
    console.log('⏳ Waiting for final report download...');

    const finalDownloadPromise = reportPage.waitForEvent(
      'download',
      {
        timeout: 60000
      }
    );

    await reportDownloadButton.click();

    const finalDownload = await finalDownloadPromise;

    // =========================================================
    // 29. SAVE FINAL GENERATED REPORT
    // =========================================================
    const finalFilename =
      finalDownload.suggestedFilename();

    const finalSavePath = path.join(
      downloadDir,
      finalFilename
    );

    await finalDownload.saveAs(finalSavePath);

    // =========================================================
    // 30. SUCCESS MESSAGE
    // =========================================================
    console.log('');
    console.log('🎉 FULL AUTOMATION COMPLETED!');
    console.log('================================');
    console.log('✅ Shipsy login completed');
    console.log('✅ Worker check-in report opened');
    console.log('✅ Today filter applied');
    console.log('✅ Shipsy CSV downloaded');
    console.log('✅ CSV uploaded to Unique Rider Report');
    console.log('✅ Generate Report clicked');
    console.log('✅ Final report downloaded');
    console.log('================================');
    console.log(`📁 Shipsy file: ${savePath}`);
    console.log(`📁 Final report: ${finalSavePath}`);

    // =========================================================
    // 31. KEEP BROWSER OPEN BRIEFLY
    // =========================================================
    await reportPage.waitForTimeout(5000);

  } catch (error) {
    console.error('');
    console.error('❌ AUTOMATION FAILED!');
    console.error('================================');
    console.error(error);
    console.error('================================');

  } finally {
    if (browser) {
      console.log('🔒 Closing browser...');
      await browser.close();
    }
  }
})();