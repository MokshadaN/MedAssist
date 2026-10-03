const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      defaultViewport: { width: 1440, height: 950 }
    });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle0' });

    // 1. Log In
    await page.type('input[type="email"]', 'jane.doe@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.innerText.includes('Jane Doe') || document.body.innerText.includes('health overview'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1200));

    // Screen 1: Dashboard Main
    await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/04_Patient_Dashboard_Main.png' });
    console.log('Captured 04_Patient_Dashboard_Main.png');

    // Screen 2: Medicine Info Drawer
    const medBtn = await page.$('#medicine-infobox-btn');
    if (medBtn) {
      await medBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/05_Patient_Medicine_Lookup.png' });
      console.log('Captured 05_Patient_Medicine_Lookup.png');

      await page.click('#close-medicine-drawer-btn');
      await new Promise(r => setTimeout(r, 400));
    }

    // Screen 3: Notifications Drawer
    const notifBtn = await page.$('#patient-notifications-btn');
    if (notifBtn) {
      await notifBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/06_Patient_Notifications.png' });
      console.log('Captured 06_Patient_Notifications.png');

      await page.click('#close-notifications-drawer-btn');
      await new Promise(r => setTimeout(r, 400));
    }

    // Screen 4: Emergency QR Modal
    const qrBtn = await page.$('#patient-show-qr-btn');
    if (qrBtn) {
      await qrBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/07_Patient_Emergency_QR_Modal.png' });
      console.log('Captured 07_Patient_Emergency_QR_Modal.png');

      await page.click('#close-qr-modal-btn');
      await new Promise(r => setTimeout(r, 400));
    }

    // Screen 5: Clinical Intake Modal
    const select = await page.$('#doctor-select-dropdown');
    if (select) {
      const optVal = await page.evaluate(s => s.options[1]?.value || '', select);
      if (optVal) {
        await page.select('#doctor-select-dropdown', optVal);
        await new Promise(r => setTimeout(r, 300));
      }
      const intakeBtn = await page.$('#begin-intake-btn');
      if (intakeBtn) {
        await intakeBtn.click();
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/08_Patient_Clinical_Intake_Modal.png' });
        console.log('Captured 08_Patient_Clinical_Intake_Modal.png');
      }
    }

    await browser.close();
    console.log('All 5 screens captured perfectly!');
  } catch (err) {
    console.error('Error in capture_all_screens:', err);
  }
})();
