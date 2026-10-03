const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      defaultViewport: { width: 1440, height: 1000 }
    });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle0' });

    // 1. Fill Login
    await page.type('input[type="email"]', 'jane.doe@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for patient dashboard to load
    await page.waitForFunction(() => document.querySelector('aside') !== null || document.body.innerText.includes('Jane Doe'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1200));

    // 1. Capture Patient Dashboard Full Page
    await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/04_Patient_Dashboard_Full.png', fullPage: true });
    console.log('Captured 04_Patient_Dashboard_Full.png');

    // 2. Open Medicine Info Drawer
    const medBtn = await page.$('#medicine-infobox-btn');
    if (medBtn) {
      await medBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/05_Patient_Medicine_Lookup.png' });
      console.log('Captured 05_Patient_Medicine_Lookup.png');
      
      // Close medicine drawer
      const closeDrawerBtn = await page.$('button[aria-label="Close"]');
      if (closeDrawerBtn) await closeDrawerBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // 3. Open Notifications Drawer
    const notifBtn = await page.$('button[aria-label="Notifications"]');
    if (notifBtn) {
      await notifBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/06_Patient_Notifications.png' });
      console.log('Captured 06_Patient_Notifications.png');

      const closeNotifBtn = await page.$('button[aria-label="Close"]');
      if (closeNotifBtn) await closeNotifBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // 4. Click Show QR Code
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Show QR Code') || text.includes('Emergency ID')) {
        await b.click();
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/07_Patient_Emergency_QR.png' });
        console.log('Captured 07_Patient_Emergency_QR.png');
        
        // Close modal
        const closeBtn = await page.$('button[aria-label="Close"]');
        if (closeBtn) await closeBtn.click();
        await new Promise(r => setTimeout(r, 400));
        break;
      }
    }

    // 5. Open AI Consultation Intake Modal
    const intakeButtons = await page.$$('button');
    for (const b of intakeButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Begin Intake') || text.includes('Consultation') || text.includes('Start Assessment')) {
        await b.click();
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/08_Patient_Clinical_Intake_Modal.png' });
        console.log('Captured 08_Patient_Clinical_Intake_Modal.png');
        break;
      }
    }

    await browser.close();
    console.log('All patient screens captured successfully!');
  } catch (err) {
    console.error('Puppeteer capture error:', err);
  }
})();
