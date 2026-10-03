const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      defaultViewport: { width: 1440, height: 900 }
    });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle0' });

    // 1. Capture Login
    await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/01_Auth_Login_Final.png' });
    console.log('Captured 01_Auth_Login_Final.png');

    // 2. Switch to Patient Register
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Patient')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/02_Auth_Patient_Register_Final.png' });
    console.log('Captured 02_Auth_Patient_Register_Final.png');

    // 3. Switch to Doctor Register
    const docButtons = await page.$$('button');
    for (const b of docButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Doctor')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'd:/PROJECTS/MED_ASSIST/MedAssist/screenUI_new/03_Auth_Doctor_Register_Final.png' });
    console.log('Captured 03_Auth_Doctor_Register_Final.png');

    await browser.close();
  } catch (err) {
    console.error('Puppeteer capture error:', err.message);
  }
})();
