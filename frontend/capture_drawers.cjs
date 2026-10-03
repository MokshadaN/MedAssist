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

    // A. Open Medicine Info Drawer
    const medBtn = await page.$('header button'); // Medicine Info button
    if (medBtn) {
      await medBtn.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/05_Patient_Medicine_Lookup.png' });
      console.log('Captured 05_Patient_Medicine_Lookup.png');

      const medInput = await page.$('input[placeholder*="Search medication name"]');
      if (medInput) {
        await medInput.type('Paracetamol');
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/05_Patient_Medicine_Lookup_Searched.png' });
        console.log('Captured 05_Patient_Medicine_Lookup_Searched.png');
      }

      const closeMedBtn = await page.$('#close-medicine-drawer-btn');
      if (closeMedBtn) await closeMedBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // B. Open Notifications Drawer
    const notifBtn = await page.$('button[title="Notifications"]');
    if (notifBtn) {
      await notifBtn.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/06_Patient_Notifications.png' });
      console.log('Captured 06_Patient_Notifications.png');

      const closeNotifBtn = await page.$('#close-notifications-drawer-btn');
      if (closeNotifBtn) await closeNotifBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // C. Open Emergency QR Modal
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Show QR Code')) {
        await b.click();
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/07_Patient_Emergency_QR_Modal.png' });
        console.log('Captured 07_Patient_Emergency_QR_Modal.png');

        const closeQRBtn = await page.$('#close-qr-modal-btn');
        if (closeQRBtn) await closeQRBtn.click();
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }

    // D. Select Doctor and Begin Intake
    const select = await page.$('select');
    if (select) {
      const optVal = await page.evaluate(s => s.options[1]?.value || '', select);
      if (optVal) {
        await page.select('select', optVal);
        await new Promise(r => setTimeout(r, 400));
      }
      
      const btns = await page.$$('button');
      for (const b of btns) {
        const text = await page.evaluate(el => el.innerText, b);
        if (text.includes('Begin Intake')) {
          await b.click();
          await new Promise(r => setTimeout(r, 1200));
          await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/08_Patient_Clinical_Intake_Modal.png' });
          console.log('Captured 08_Patient_Clinical_Intake_Modal.png');
          break;
        }
      }
    }

    await browser.close();
    console.log('All detailed modal & drawer screens captured successfully!');
  } catch (err) {
    console.error('Drawer capture error:', err);
  }
})();
