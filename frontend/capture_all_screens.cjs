const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'screen UIs');
const BASE_URL = 'http://127.0.0.1:5173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const EXECUTABLE_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginApi(email, password) {
  return new Promise((resolve, reject) => {
    const postData = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const req = http.request('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token);
        } catch (e) {
          reject(new Error(`Login failed for ${email}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function capture() {
  console.log(`Target Screenshot Directory: ${OUTPUT_DIR}`);
  console.log(`Using browser executable: ${EXECUTABLE_PATH}`);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get tokens
  console.log('Fetching JWT tokens from backend...');
  const patientToken = await loginApi('jane.doe@example.com', 'password123');
  const doctorToken = await loginApi('dr.smith@example.com', 'password123');
  console.log('Patient Token:', patientToken ? 'Obtained' : 'Failed');
  console.log('Doctor Token:', doctorToken ? 'Obtained' : 'Failed');

  const browser = await puppeteer.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--hide-scrollbars',
    ],
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // 1. AUTH SCREEN - LOGIN
    // -------------------------------------------------------------
    console.log('1/18 Capturing: 01_Auth_Login_Screen.png');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_Auth_Login_Screen.png'), fullPage: true });

    // -------------------------------------------------------------
    // 2. AUTH SCREEN - REGISTER PATIENT
    // -------------------------------------------------------------
    console.log('2/18 Capturing: 02_Auth_Register_Patient.png');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.tab'));
      const ptTab = buttons.find((b) => b.textContent.includes('Patient'));
      if (ptTab) ptTab.click();
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_Auth_Register_Patient.png'), fullPage: true });

    // -------------------------------------------------------------
    // 3. AUTH SCREEN - REGISTER DOCTOR
    // -------------------------------------------------------------
    console.log('3/18 Capturing: 03_Auth_Register_Doctor.png');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.tab'));
      const drTab = buttons.find((b) => b.textContent.includes('Doctor'));
      if (drTab) drTab.click();
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_Auth_Register_Doctor.png'), fullPage: true });

    // -------------------------------------------------------------
    // 4. PATIENT DASHBOARD OVERVIEW
    // -------------------------------------------------------------
    console.log('4/18 Capturing: 04_Patient_Dashboard_Overview.png');
    await page.evaluate((token) => {
      localStorage.setItem('medassist_token', token);
    }, patientToken);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_Patient_Dashboard_Overview.png'), fullPage: true });

    // -------------------------------------------------------------
    // 5. PATIENT HEALTH METRICS CHART
    // -------------------------------------------------------------
    console.log('5/18 Capturing: 05_Patient_Health_Metrics_Chart.png');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_Patient_Health_Metrics_Chart.png'), fullPage: false });

    // -------------------------------------------------------------
    // 6. PATIENT CLINICAL INTAKE AI ASSISTANT (ACTIVE SESSION)
    // -------------------------------------------------------------
    console.log('6/18 Capturing: 06_Patient_Clinical_Intake_AI_Assistant.png');
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);

    // Select doctor with native setter
    await page.evaluate(() => {
      const sel = document.querySelector('select');
      if (sel && sel.options.length > 1) {
        const val = sel.options[1].value;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        nativeSetter.call(sel, val);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(600);

    // Click Begin Intake
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Begin Intake'));
      if (btn) btn.click();
    });
    await sleep(2500);

    // Type a response in intake chat
    const chatInput = await page.$('.chat-compose textarea');
    if (chatInput) {
      await page.type('.chat-compose textarea', 'I have had mild shortness of breath and cough after jogging yesterday.');
      await sleep(300);
      await page.evaluate(() => {
        const sendBtn = document.querySelector('.chat-compose button[type="submit"]');
        if (sendBtn) sendBtn.click();
      });
      await sleep(2500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_Patient_Clinical_Intake_AI_Assistant.png'), fullPage: true });

    // Close intake modal/section
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Close Session'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);

    // -------------------------------------------------------------
    // 7. PATIENT PRESCRIPTIONS & REMINDERS
    // -------------------------------------------------------------
    console.log('7/18 Capturing: 07_Patient_Prescriptions_and_Reminders.png');
    await page.evaluate(() => {
      window.scrollTo(0, 380);
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_Patient_Prescriptions_and_Reminders.png'), fullPage: false });

    // -------------------------------------------------------------
    // 8. PATIENT LAB REPORTS ANALYSIS
    // -------------------------------------------------------------
    console.log('8/18 Capturing: 08_Patient_Lab_Reports_Analysis.png');
    await page.evaluate(() => {
      window.scrollTo(0, 720);
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_Patient_Lab_Reports_Analysis.png'), fullPage: false });

    // -------------------------------------------------------------
    // 9. PATIENT VISIT TIMELINE INTERACTION
    // -------------------------------------------------------------
    console.log('9/18 Capturing: 09_Patient_Visit_Timeline.png');
    await page.evaluate(() => {
      const timelineDot = document.querySelector('.timeline-item-node, .timeline-dot');
      if (timelineDot) timelineDot.click();
      window.scrollTo(0, 980);
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_Patient_Visit_Timeline.png'), fullPage: false });

    // -------------------------------------------------------------
    // 10. PATIENT MEDICINE LOOKUP BOX
    // -------------------------------------------------------------
    console.log('10/18 Capturing: 10_Patient_Medicine_Lookup_Box.png');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const medBtn = document.querySelector('#medicine-infobox-btn');
      if (medBtn) medBtn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_Patient_Medicine_Lookup_Box.png'), fullPage: true });

    // -------------------------------------------------------------
    // 11. PATIENT MEDICINE DETAIL VIEW (Paracetamol)
    // -------------------------------------------------------------
    console.log('11/18 Capturing: 11_Patient_Medicine_Detail_View.png');
    await page.evaluate(() => {
      const input = document.querySelector('#medicine-search-input');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'Paracetamol');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(600);
    await page.evaluate(() => {
      const item = document.querySelector('.medicine-result-item');
      if (item) item.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_Patient_Medicine_Detail_View.png'), fullPage: true });

    // Close medicine box
    await page.evaluate(() => {
      const medBtn = document.querySelector('#medicine-infobox-btn');
      if (medBtn) medBtn.click();
    });
    await sleep(400);

    // -------------------------------------------------------------
    // 12. PATIENT NOTIFICATIONS DRAWER
    // -------------------------------------------------------------
    console.log('12/18 Capturing: 12_Patient_Notifications_Drawer.png');
    await page.evaluate(() => {
      const notifBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Notifications'));
      if (notifBtn) notifBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '12_Patient_Notifications_Drawer.png'), fullPage: true });

    // Close notifications
    await page.evaluate(() => {
      const notifBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Notifications'));
      if (notifBtn) notifBtn.click();
    });
    await sleep(400);

    // -------------------------------------------------------------
    // 13. PATIENT EMERGENCY QR MODAL
    // -------------------------------------------------------------
    console.log('13/18 Capturing: 13_Patient_Emergency_QR_Modal.png');
    await page.evaluate(() => {
      const qrBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Show Emergency QR'));
      if (qrBtn) qrBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '13_Patient_Emergency_QR_Modal.png'), fullPage: true });

    // -------------------------------------------------------------
    // 14. PUBLIC EMERGENCY PROFILE VIEW
    // -------------------------------------------------------------
    console.log('14/18 Capturing: 14_Public_Emergency_Profile_View.png');
    const rawPublicUrl = await page.evaluate(() => {
      const textEl = document.querySelector('.profile-sidebar div[style*="word-break"]');
      return textEl ? textEl.textContent.trim() : null;
    });

    if (rawPublicUrl) {
      const localPublicUrl = rawPublicUrl.replace(/^http:\/\/[^/]+/, BASE_URL);
      console.log(`Navigating to public emergency URL: ${localPublicUrl}`);
      await page.goto(localPublicUrl, { waitUntil: 'networkidle0' });
      await sleep(800);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '14_Public_Emergency_Profile_View.png'), fullPage: true });
    }

    // -------------------------------------------------------------
    // 15. DOCTOR CLINICAL DASHBOARD (Switch to Doctor)
    // -------------------------------------------------------------
    console.log('15/18 Capturing: 15_Doctor_Clinical_Dashboard.png');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.evaluate((token) => {
      localStorage.setItem('medassist_token', token);
    }, doctorToken);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '15_Doctor_Clinical_Dashboard.png'), fullPage: true });

    // -------------------------------------------------------------
    // 16. DOCTOR PATIENT REVIEW & SOAP TRIAGE (Select Jane Doe)
    // -------------------------------------------------------------
    console.log('16/18 Capturing: 16_Doctor_Patient_Review_SOAP_Triage.png');
    await page.evaluate(() => {
      const ptButtons = Array.from(document.querySelectorAll('.list-row'));
      const janeBtn = ptButtons.find((b) => b.textContent.includes('Jane Doe') || b.textContent.includes('jane.doe'));
      if (janeBtn) {
        janeBtn.click();
      } else if (ptButtons.length > 0) {
        ptButtons[0].click();
      }
    });
    await sleep(1500);
    await page.evaluate(() => {
      const visitButtons = Array.from(document.querySelectorAll('.timeline-item'));
      if (visitButtons.length > 0) visitButtons[0].click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '16_Doctor_Patient_Review_SOAP_Triage.png'), fullPage: true });

    // -------------------------------------------------------------
    // 17. DOCTOR PRESCRIPTION BUILDER STUDIO
    // -------------------------------------------------------------
    console.log('17/18 Capturing: 17_Doctor_Prescription_Studio.png');
    await page.evaluate(() => {
      const rxBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Create ID') || b.textContent.includes('Prescription loaded'));
      if (rxBtn) rxBtn.click();
      window.scrollTo(0, 1050);
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '17_Doctor_Prescription_Studio.png'), fullPage: false });

    // -------------------------------------------------------------
    // 18. DOCTOR SCHEDULE FOLLOW-UP SECTION
    // -------------------------------------------------------------
    console.log('18/18 Capturing: 18_Doctor_Schedule_FollowUp.png');
    await page.evaluate(() => {
      window.scrollTo(0, 1450);
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '18_Doctor_Schedule_FollowUp.png'), fullPage: false });

    console.log('🎉 ALL 18 SCREENSHOTS CAPTURED AND SAVED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

capture();
