const { chromium } = require('playwright');
const path = require('path');

(async () => {

    const browser = await chromium.launch({
    headless: false
});
    const context = await browser.newContext({
        storageState: 'auth.json',
        acceptDownloads: true
    });

    const page = await context.newPage();

    // =====================================================
    // STEP 1: FETCH ACTIVE RIDERS + IDLE RIDERS + BF
    // =====================================================

    console.log("Fetching Rider Data...");

    await page.goto(
        'https://fk.portal.gam.shipsy.io/ops/od/dispatch-screen',
        {
            waitUntil: "domcontentloaded"
        }
    );

    await page.waitForSelector('text=No. of Active Riders');

    const stores = [
        "Kalyan Nagar_mnow",
        "Basaveshwar Nagar_mnow",
        "Jakkur_mnow",
        "Begur_mnow",
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

        console.log(`Fetching: ${store}`);

        await page.locator('[class*="storeSearch"]').first().click();

const storeInput = page
    .locator('[class*="storeSearch"] input')
    .first();

await storeInput.waitFor({
    state: "visible",
    timeout: 5000
});

await storeInput.fill(store);

// Small wait for dropdown suggestions to load
await page.waitForTimeout(500);

const suggestion = page
    .locator(`text=${store}`)
    .first();

await suggestion.waitFor({
    state: "visible",
    timeout: 10000
});

await suggestion.click();

// Wait for selected store rider data to refresh properly
await page.waitForTimeout(2000);
        // Active Riders
        const activeRiders = await page
            .locator('text=No. of Active Riders')
            .locator('xpath=preceding-sibling::*[1]')
            .innerText();

        // Banner Factor
        const bannerFactor = await page
            .locator('text=Banner Factor')
            .locator('xpath=preceding-sibling::*[1]')
            .innerText();

        // Idle Riders
        const idleRiders = await page
            .locator('text=In Store')
            .nth(1)
            .locator('xpath=following-sibling::*[1]')
            .innerText();

        // Left side In Store
        const leftInStoreText = await page
            .locator('text=In Store')
            .first()
            .locator('xpath=following-sibling::*[1]')
            .innerText();

        // Left side Unassigned
        const unassignedText = await page
            .locator('text=Unassigned')
            .first()
            .locator('xpath=following-sibling::*[1]')
            .innerText();

        const pendingOrders =
            parseInt(leftInStoreText.trim()) +
            parseInt(unassignedText.trim());

        results.push({
            store: store,
            active: activeRiders.trim(),
            idle: idleRiders.trim(),
            banner: bannerFactor.trim(),
            pending: pendingOrders
        });

        console.log({
            store: store,
            active: activeRiders.trim(),
            idle: idleRiders.trim(),
            banner: bannerFactor.trim(),
            pending: pendingOrders
        });
    }

    console.log("✅ All Rider Data Fetched");

    // =====================================================
    // PRINT SAME RAW OUTPUT AS FIRST SCRIPT
    // =====================================================

    let rawText = "";

    for (let r of results) {

        rawText += `Switching to: ${r.store}\n`;
        rawText += `Store: ${r.store}\n`;
        rawText += `Active: ${r.active}\n`;
        rawText += `Idle: ${r.idle}\n`;
        rawText += `Banner: ${r.banner}\n`;
        rawText += `Pending: ${r.pending}\n`;
        rawText += `----------------------\n`;
    }

    console.log("\n===== RIDER OUTPUT =====\n");
    console.log(rawText);

    // =====================================================
    // STEP 2: OPEN MYNTRA REPORTING PAGE
    // =====================================================

    console.log("Opening Myntra Reporting Page...");

    await page.goto(
        'https://fk.portal.gam.shipsy.io/ops/od/reporting',
        {
            waitUntil: "domcontentloaded"
        }
    );

    // =====================================================
// PART 2 ONLY - CONTROLLED SLOW SPEED
// =====================================================

// Select Hub
await page.getByText('Nizampet_mnow, 66864_MNOW').click();
await page.waitForTimeout(3000);

// Search Myntra
await page.locator('#hubSearch').fill('myn');
await page.waitForTimeout(3000);

// Select Myntra Hub
await page.getByText('MYNTRA_ZIPPEE, MYNTRA_ZIPPEE').click();
await page.waitForTimeout(5000);

// Open Actions
await page.getByRole('button', { name: 'Actions' }).click();
await page.waitForTimeout(3000);

// Click Download menu option
await page.getByText('Download', { exact: true }).click();
await page.waitForTimeout(3000);

// Click Download All
await page.getByText('Download All', { exact: true }).click();

console.log("Waiting for Download Dump modal...");

// Wait specifically for the modal
const downloadModal = page.getByText('Download Dump', {
    exact: true
});

await downloadModal.waitFor({
    state: "visible",
    timeout: 30000
});

// Give modal time to fully render
await page.waitForTimeout(5000);

console.log("Download Dump modal ready");

// Get the visible modal
const modal = page.locator('[role="dialog"]').filter({
    hasText: 'Download Dump'
});

// Click Download button INSIDE modal only
const modalDownloadButton = modal.getByRole('button', {
    name: 'Download',
    exact: true
});

await modalDownloadButton.waitFor({
    state: "visible",
    timeout: 30000
});

// Additional safety delay
await page.waitForTimeout(3000);

console.log("Clicking final Download button...");

await modalDownloadButton.click();

console.log("Report request submitted");

// Important: allow request/navigation to finish
await page.waitForTimeout(8000);

console.log("Waiting for report to become COMPLETE...");
while (true) {

    // Refresh the page
    await page.reload({
        waitUntil: "domcontentloaded"
    });

    await page.waitForTimeout(3000);

    // Read the status of the FIRST row
    const status = await page
        .locator("tbody tr:not(.ant-table-measure-row)")
        .first()
        .locator("td")
        .nth(3)          // Status column
        .textContent();

    console.log("Current Status:", status);

    if (status && status.trim() === "COMPLETE") {
        console.log("✅ Report is COMPLETE");
        break;
    }

    console.log("Still RECEIVED... Checking again in 10 seconds.");

    await page.waitForTimeout(10000);
}

console.log("Searching for first download icon...");

// Wait until the first download icon is visible
// Wait for the download icon in the first row
// Wait until the first row appears
// Wait for the first REAL row (skip the hidden measurement row)
const firstRow = page.locator("tbody tr:not(.ant-table-measure-row)").first();

await firstRow.waitFor({
    state: "visible",
    timeout: 120000
});

const downloadPromise = page.waitForEvent("download");

// Click the download icon in that row
await firstRow.getByRole("link").click();
const download = await downloadPromise;

await download.saveAs("downloads/Myntra_Report.xlsx");

console.log("✅ Download Finished");

// =====================================================
// OPEN SASA HOURLY REPORT PAGE
// =====================================================

console.log("Opening Store Projected Orders page...");

await page.goto(
    "https://harshit3867.github.io/StrategicAnalyticalSuiteZippee/Hourly_6july.html",
    {
        waitUntil: "domcontentloaded"
    }
);

console.log("✅ Store Projected Orders page opened");

// =====================================================
// UPLOAD DOWNLOADED MYNTRA REPORT
// =====================================================

const filePath = path.join(
    __dirname,
    "downloads",
    "Myntra_Report.xlsx"
);

console.log("Uploading file:", filePath);

// Upload file into Choose File input
await page.locator('input[type="file"]').setInputFiles(filePath);

console.log("✅ File selected successfully");

await page.waitForTimeout(3000);

// =====================================================
// CLICK SUBMIT BUTTON
// =====================================================

await page.getByRole("button", { name: "Submit" }).click();

await page.waitForTimeout(3000);

console.log("✅ Submit button clicked");

// =====================================================
// WAIT FOR FINAL TABLE TO APPEAR
// =====================================================

console.log("Waiting for generated table...");

await page.waitForTimeout(3000);

const tableRows = page.locator("tbody tr");

await tableRows.first().waitFor({
    state: "visible",
    timeout: 120000
});

console.log("✅ Generated table is visible");

// =====================================================
// FILL ACTUAL RIDERS + IDLE RIDER + BF
// =====================================================

console.log("Filling Rider Data into table...");

for (const rider of results) {

    // Convert:
    // Kalyan Nagar_mnow
    // into:
    // kalyan nagar mnow

    const normalizedStore = rider.store
        .replace(/_/g, " ")
        .trim()
        .toLowerCase();

    console.log(`Searching table row for: ${normalizedStore}`);

    const rows = page.locator("tbody tr");

    const rowCount = await rows.count();

    let matched = false;

    for (let i = 0; i < rowCount; i++) {

        const row = rows.nth(i);

        const rowText = (
            await row.innerText()
        )
            .trim()
            .toLowerCase();

        if (rowText.includes(normalizedStore)) {

            const inputs = row.locator('input');

            const inputCount = await inputs.count();

            if (inputCount >= 3) {

                // Actual Riders
                await inputs.nth(0).fill(
                    rider.active
                );

                // Idle Rider
                await inputs.nth(1).fill(
                    rider.idle
                );

                // BF
                await inputs.nth(2).fill(
                    rider.banner
                );

                console.log(
                    `✅ Filled ${rider.store} | ` +
                    `Actual=${rider.active} | ` +
                    `Idle=${rider.idle} | ` +
                    `BF=${rider.banner}`
                );

                matched = true;

                break;
            }
        }
    }

    if (!matched) {

        console.log(
            `⚠️ Store row not found: ${rider.store}`
        );
    }
}

console.log("✅ All Rider Data Filled Successfully");

// =====================================================
// CLICK FINAL TABLE BUTTON
// =====================================================

console.log("Clicking Final Table button...");

await page.getByRole("button", { name: "Final Table" }).click();

console.log("✅ Final Table button clicked");
console.log("✅ Final Report Created Successfully");

// =====================================================
// CLICK DOWNLOAD BUTTON AND SAVE FINAL REPORT
// =====================================================

console.log("Waiting for Download button...");

const finalDownloadButton = page.getByRole("button", {
    name: /Download/i
});

await finalDownloadButton.waitFor({
    state: "visible",
    timeout: 120000
});

console.log("Clicking Download button...");

// Start waiting for download BEFORE clicking
const finalDownloadPromise = page.waitForEvent("download");

await finalDownloadButton.click();

const finalDownload = await finalDownloadPromise;

// Save final report
const finalReportPath = path.join(
    process.env.USERPROFILE,
    "Downloads",
    finalDownload.suggestedFilename()
);

await finalDownload.saveAs(finalReportPath);

console.log("✅ Final Report Downloaded Successfully");
console.log("📁 Saved at:", finalReportPath);

// Keep browser open
// await browser.close();

})();