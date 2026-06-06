import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const OUTPUT_DIR = './test_assets';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ==========================================
// 1. ROBUST HTML TEMPLATES
// ==========================================

const headInject = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Courier+Prime&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style>
    body { background: white; margin: 0; }
    .sig { font-family: 'Dancing Script', cursive; font-size: 32px; color: #000080; }
    .handwriting { font-family: 'Caveat', cursive; font-size: 24px; color: #1e3a8a; }
    .typewriter { font-family: 'Courier Prime', monospace; font-size: 14px; }
    .stamp { 
      position: absolute; right: 50px; bottom: 20px; 
      color: rgba(220, 38, 38, 0.7); border: 3px solid rgba(220, 38, 38, 0.7); 
      border-radius: 50%; width: 100px; height: 100px; 
      display: flex; align-items: center; justify-content: center; 
      transform: rotate(-15deg); font-weight: bold; font-size: 14px; 
      text-align: center; font-family: Arial, sans-serif;
    }
  </style>
`;

const getPrescriptionHTML = (data) => `
<!DOCTYPE html><html><head>${headInject}</head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; position: relative; min-height: 900px;">
  <div style="border-bottom: 2px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 20px; text-align: center;">
    <h1 style="color: #1d4ed8; margin: 0;">${data.hospital || 'CarePlus Multispecialty Clinic'}</h1>
    <h3 style="margin: 5px 0;">${data.doc || 'Attending Physician'}</h3>
    <p style="margin: 0; color: #555;">Reg. No: <strong>${data.reg || 'Not Provided'}</strong></p>
  </div>
  
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
    <div>
      <p style="margin: 0 0 5px 0;"><strong>Patient:</strong> ${data.name || 'Unknown Patient'}</p>
      <p style="margin: 0;"><strong>Age/Sex:</strong> ${data.age || '35'}/${data.sex || 'M'}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0 0 5px 0;"><strong>Date:</strong> ${data.date || '2024-01-01'}</p>
      <p style="margin: 0;"><strong>ID:</strong> ${data.id || 'N/A'}</p>
    </div>
  </div>

  <div class="${data.isHandwritten ? 'handwriting' : ''}">
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">Diagnosis</h4>
      <p style="font-size: 18px; font-weight: bold; margin: 0; color: #b91c1c;">${data.diag || 'Under Evaluation'}</p>
    </div>

    ${(data.meds || []).length > 0 ? `
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">Rx (Medicines)</h4>
      <ol style="margin: 5px 0 0 20px; padding: 0;">
        ${data.meds.map(med => `<li style="margin-bottom: 5px;">${med}</li>`).join('')}
      </ol>
    </div>` : ''}

    ${(data.procs || []).length > 0 ? `
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">Procedures</h4>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        ${data.procs.map(p => `<li style="margin-bottom: 5px;">${p}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${(data.tests || []).length > 0 ? `
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">Investigations Advised</h4>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        ${data.tests.map(t => `<li style="margin-bottom: 5px;">${t}</li>`).join('')}
      </ul>
    </div>` : ''}
  </div>

  <div style="position: absolute; bottom: 40px; right: 40px; text-align: center;">
    ${data.missingSignature ? '<div style="height: 40px;"></div>' : `<div class="sig">${data.doc || 'Signature'}</div>`}
    <div style="border-top: 1px solid #000; width: 200px; margin-top: 5px; padding-top: 5px; font-size: 12px; font-family: Arial, sans-serif;">Authorized Signature</div>
  </div>
  
  ${data.missingStamp ? '' : '<div class="stamp">HOSPITAL<br>SEAL</div>'}
</body></html>
`;

const getHospitalBillHTML = (data) => {
  const subTotal = data.amt ? (data.amt * 0.82) : 0;
  const gst = data.amt ? (data.amt * 0.18) : 0;
  const total = data.amt || 0;

  return `
<!DOCTYPE html><html><head>${headInject}</head>
<body class="typewriter" style="padding: 40px; color: #000; max-width: 800px; margin: 0 auto; ${data.isBlurry ? 'filter: blur(1px);' : ''}">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin:0;">${data.hospital || 'CITY GENERAL HOSPITAL'}</h2>
    <p style="margin:5px 0;">GSTIN: 29ABCDE1234F1Z5</p>
    <h3 style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-top: 15px;">TAX INVOICE / RECEIPT</h3>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 1px dashed #000; padding-bottom: 15px;">
    <div>
      <p style="margin:2px 0;">Patient: ${data.name || 'Unknown'}</p>
      <p style="margin:2px 0;">Ref By: ${data.doc || 'Self'}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin:2px 0;">Bill No: INV-${Math.floor(Math.random() * 90000) + 10000}</p>
      <p style="margin:2px 0;">Date: ${data.date || '2024-01-01'}</p>
    </div>
  </div>

  <table style="width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 30px;">
    <tr style="border-bottom: 1px dashed #000;">
      <th style="padding: 10px 0;">PARTICULARS</th>
      <th style="padding: 10px 0; text-align: right;">AMOUNT (INR)</th>
    </tr>
    ${(data.lines || []).map(item => `
    <tr>
      <td style="padding: 10px 0;">${item.desc || 'Service'}</td>
      <td style="padding: 10px 0; text-align: right;">${(item.amount || 0).toFixed(2)}</td>
    </tr>
    `).join('')}
    <tr><td colspan="2"><br></td></tr>
    <tr style="border-top: 1px dashed #000;">
      <td style="padding: 10px 0;">Sub Total:</td>
      <td style="padding: 10px 0; text-align: right;">${subTotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0;">GST (18%):</td>
      <td style="padding: 5px 0; text-align: right;">${gst.toFixed(2)}</td>
    </tr>
    <tr style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; font-size: 1.2em; font-weight: bold;">
      <td style="padding: 15px 0;">TOTAL AMOUNT:</td>
      <td style="padding: 15px 0; text-align: right;">${total.toFixed(2)}</td>
    </tr>
  </table>

  <p style="margin-top: 40px;">Payment Mode: ${data.cashless ? 'CASHLESS - PRE-APPROVED' : 'CARD / UPI'}</p>
  
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center;">
      <div class="sig" style="transform: rotate(-3deg); height: 40px; color: #1e3a8a;">
        ${data.name || 'Patient'}
      </div>
      <p style="border-top: 1px solid #000; margin: 0; padding-top: 5px;">Patient Signature</p>
    </div>
    
    <div style="text-align: center;">
      <div class="sig" style="transform: rotate(-5deg); height: 40px; color: #000080;">
        Authorized
      </div>
      <p style="border-top: 1px solid #000; margin: 0; padding-top: 5px;">Cashier Signature</p>
    </div>
  </div>
</body></html>
`;
}

const getDiagnosticReportHTML = (data) => `
<!DOCTYPE html><html><head>${headInject}</head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; background: white;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
    <h2 style="margin:0;">${data.lab_name || 'ACCURA DIAGNOSTICS LAB'}</h2>
    <p style="margin:5px 0; font-size: 12px;">NABL Accreditation No: MC-2093</p>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 30px;">
    <div>
      <p><strong>Patient:</strong> ${data.name || 'Unknown'}</p>
      <p><strong>Ref By:</strong> ${data.doc || 'Self'}</p>
    </div>
    <div style="text-align: right;">
      <p><strong>Date:</strong> ${data.date || '2024-01-01'}</p>
      <p><strong>Report ID:</strong> LAB-${Math.floor(Math.random() * 9000) + 1000}</p>
    </div>
  </div>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="background: #f4f4f4; border-top: 1px solid #000; border-bottom: 1px solid #000;">
      <th style="padding: 10px; text-align: left;">TEST NAME</th>
      <th style="padding: 10px; text-align: left;">RESULT</th>
      <th style="padding: 10px; text-align: left;">NORMAL RANGE</th>
    </tr>
    ${(data.lab_results || []).map(test => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px;">${test.name || 'Test'}</td>
      <td style="padding: 10px; font-weight: bold; color: ${test.isAbnormal ? 'red' : 'black'};">${test.result || '-'}</td>
      <td style="padding: 10px; color: #666;">${test.range || '-'}</td>
    </tr>
    `).join('')}
  </table>
  <div style="margin-top: 60px; text-align: right;">
    <div class="sig" style="color: #000080; height: 40px; transform: rotate(-2deg);">Dr. Pathologist</div>
    <p style="margin: 0; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">MD Pathology</p>
  </div>
</body></html>
`;

const getPharmacyBillHTML = (data) => {
  const total = (data.pharmacy_items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  
  return `
<!DOCTYPE html><html><head>${headInject}</head>
<body class="typewriter" style="padding: 40px; color: #111; max-width: 800px; margin: 0 auto; background: white;">
  <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
    <h2 style="margin:0;">WELLNESS PHARMACY</h2>
    <p style="margin:5px 0; font-size: 12px;">DL No: 20B-KA-12345 | GST: 29PHARM4567A1Z</p>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px;">
    <p><strong>Patient:</strong> ${data.name || 'Unknown'}</p>
    <p><strong>Date:</strong> ${data.date || '2024-01-01'}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
      <th style="padding: 8px 0; text-align: left;">MEDICINE NAME</th>
      <th>BATCH</th>
      <th>EXP</th>
      <th>QTY</th>
      <th style="text-align: right;">AMOUNT</th>
    </tr>
    ${(data.pharmacy_items || []).map(item => `
    <tr>
      <td style="padding: 8px 0;">${item.name || 'Medicine'}</td>
      <td style="text-align: center;">${item.batch || 'B123'}</td>
      <td style="text-align: center;">${item.exp || '12/25'}</td>
      <td style="text-align: center;">${item.qty || 1}</td>
      <td style="text-align: right;">${(item.amount || 0).toFixed(2)}</td>
    </tr>
    `).join('')}
    <tr style="border-top: 1px dashed #000; font-weight: bold;">
      <td colspan="4" style="padding: 10px 0; text-align: right;">NET AMOUNT:</td>
      <td style="padding: 10px 0; text-align: right;">${total.toFixed(2)}</td>
    </tr>
  </table>
  <div style="margin-top: 40px; text-align: right;">
    <div class="sig" style="color: #000080; height: 40px; transform: rotate(-2deg);">Pharmacist</div>
    <p style="margin: 0; border-top: 1px dashed #000; display: inline-block; padding-top: 5px;">Authorized Signature</p>
  </div>
</body></html>
`;
}

// ==========================================
// 2. THOROUGH TEST DATA (All 20 Cases)
// ==========================================

const testCases = [
  // TC001 - TC010: Standard Rules Engine Validation
  {
    id: 'TC001', name: 'Rajesh Kumar', date: '2026-05-30', amt: 1500, doc: 'Dr. Sharma', reg: 'KA/45678/2015', diag: 'Viral fever',
    meds: ['Paracetamol 650mg 1-1-1', 'Vitamin C 500mg 1-0-0'], tests: ['CBC', 'Dengue test'],
    lines: [{desc: 'Consultation Fee', amount: 1000}, {desc: 'Diagnostic Tests', amount: 500}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC002', name: 'Priya Singh', date: '2026-05-30', amt: 12000, doc: 'Dr. Patel', reg: 'MH/23456/2018', diag: 'Tooth decay requiring root canal',
    procs: ['Root canal treatment', 'Teeth whitening'],
    lines: [{desc: 'Root Canal Procedure', amount: 8000}, {desc: 'Teeth Whitening', amount: 4000}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC003', name: 'Amit Verma', date: '2026-05-30', amt: 7500, doc: 'Dr. Gupta', reg: 'DL/34567/2016', diag: 'Gastroenteritis',
    meds: ['Antibiotics', 'Probiotics'],
    lines: [{desc: 'Consultation Fee', amount: 2000}, {desc: 'Medicines', amount: 5500}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC004', name: 'Sneha Reddy', date: '2026-05-30', amt: 2000, doc: 'Unknown Doctor',
    lines: [{desc: 'Consultation', amount: 1500}, {desc: 'Medicines', amount: 500}],
    docsToGen: ['bill'] // INTENTIONAL: Missing RX completely
  },
  {
    id: 'TC005', name: 'Vikram Joshi', date: '2026-05-30', amt: 3000, doc: 'Dr. Mehta', reg: 'GJ/56789/2014', diag: 'Type 2 Diabetes',
    meds: ['Metformin 500mg', 'Glimepiride 1mg'],
    lines: [{desc: 'Consultation', amount: 1000}, {desc: 'Diabetic Medicines', amount: 2000}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC006', name: 'Kavita Nair', date: '2026-05-30', amt: 4000, doc: 'Vaidya Krishnan', reg: 'AYUR/KL/2345/2019', diag: 'Chronic joint pain',
    procs: ['Panchakarma therapy'],
    lines: [{desc: 'Ayurvedic Consultation', amount: 1000}, {desc: 'Therapy Charges', amount: 3000}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC007', name: 'Suresh Patil', date: '2026-05-30', amt: 15000, doc: 'Dr. Rao', reg: 'AP/67890/2017', diag: 'Suspected lumbar disc herniation',
    tests: ['MRI Lumbar Spine'],
    lines: [{desc: 'MRI Scan - Lumbar', amount: 15000}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC008', name: 'Ravi Menon', date: '2026-05-30', amt: 4800, doc: 'Dr. Khan', reg: 'UP/45678/2016', diag: 'Migraine',
    meds: ['Sumatriptan 50mg', 'Propranolol 40mg'],
    lines: [{desc: 'Consultation', amount: 2000}, {desc: 'Medicines', amount: 2800}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC009', name: 'Anita Desai', date: '2026-05-30', amt: 8000, doc: 'Dr. Banerjee', reg: 'WB/34567/2015', diag: 'Obesity - BMI 35',
    procs: ['Bariatric consultation', 'Diet plan setup'],
    lines: [{desc: 'Consultation', amount: 3000}, {desc: 'Diet Plan', amount: 5000}],
    docsToGen: ['rx', 'bill']
  },
  {
    id: 'TC010', name: 'Deepak Shah', date: '2026-05-30', amt: 4500, hosp: 'Apollo Hospitals', doc: 'Dr. Iyer', reg: 'TN/56789/2013', diag: 'Acute bronchitis',
    meds: ['Amoxicillin 500mg', 'Bronchodilator Syrup'], cashless: true,
    lines: [{desc: 'Consultation', amount: 1500}, {desc: 'Medicines', amount: 3000}],
    docsToGen: ['rx', 'bill']
  },

  // TC011 - TC020: Edge Cases (Missing Signatures, Handwritten, Blurry, Missing Reg)
  {
    id: 'TC011', name: 'Arjun Gupta', date: '2026-05-30', amt: 1000, doc: 'Dr. Singh', reg: 'KA/11111/2010', diag: 'Hypertension',
    meds: ['Amlodipine 5mg'], tests: ['Lipid Profile'],
    lines: [{desc: 'Consultation', amount: 1000}], // Bill amt is 1000
    lab_results: [{name: 'Cholesterol', result: '240 mg/dL', range: '< 200 mg/dL', isAbnormal: true}],
    pharmacy_items: [{name: 'Amlodipine 5mg', qty: 30, amount: 1000}], // Pharma amt is 1000
    isHandwritten: true, 
    docsToGen: ['rx', 'bill', 'lab', 'pharma'] // Full 4-doc stack
  },
  {
    id: 'TC012', name: 'Neha Sharma', date: '2026-05-30', amt: 2500, doc: 'Dr. Ali', reg: 'DL/22222/2015', diag: 'Lower Back Pain',
    procs: ['Physiotherapy Session 1'],
    lines: [{desc: 'Physio Treatment', amount: 2500}],
    isBlurry: true, 
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC013', name: 'Rohan Das', date: '2026-05-30', amt: 400, doc: 'Dr. Roy', reg: 'WB/33333/2012', diag: 'Common Cold Follow Up',
    meds: ['Paracetamol 500mg'],
    lines: [{desc: 'Follow up Consultation', amount: 400}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC014', name: 'Meera Reddy', date: '2026-05-30', amt: 12000, doc: 'Dr. Unregistered', reg: '', diag: 'Pregnancy Routine Checkup',
    missingReg: true, 
    tests: ['Ultrasound Abdomen'],
    lines: [{desc: 'Maternity Scan', amount: 12000}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC015', name: 'Vikash Jain', date: '2026-05-30', amt: 4500, doc: 'Dr. Bose', reg: 'MH/55555/2019', diag: 'Vision Blurriness',
    procs: ['Eye Test', 'Prescription Glasses'],
    lines: [{desc: 'Consultation', amount: 1000}, {desc: 'Frames & Lenses', amount: 3500}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC016', name: 'Pooja Tiwari', date: '2026-05-30', amt: 1000, doc: 'Dr. Kapoor', reg: 'UP/66666/2021', diag: 'Skin Infection',
    meds: ['Antibiotic Ointment', 'Steroids'],
    lines: [{desc: 'Consultation', amount: 1000}],
    pharmacy_items: [
      {name: 'Inhaler Type A', qty: 1, amount: 800},
      {name: 'Steroid Tabs', qty: 10, amount: 200}
    ],
    missingSignature: true, missingStamp: true, 
    docsToGen: ['rx', 'bill', 'pharma'] // Testing Pharmacy Bill specifically
  },
  {
    id: 'TC017', name: 'Sanjay Kumar', date: '2026-05-30', amt: 50000, doc: 'Dr. Verma', reg: 'UP/77777/2020', diag: 'Cardiac Checkup',
    tests: ['ECG', 'TMT', 'Echo'],
    lines: [{desc: 'Executive Cardiac Package', amount: 50000}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC018', name: 'Lakshmi N', date: '2026-05-30', amt: 3000, doc: 'Dr. Chawla', reg: 'TN/88888/2011', diag: 'Hair Loss',
    procs: ['PRP Therapy'],
    lines: [{desc: 'PRP Hair Treatment (Cosmetic)', amount: 3000}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC019', name: 'Imran Shaikh', date: '2026-05-30', amt: 2200, doc: 'Dr. Pillai', reg: 'KL/99999/2016', diag: 'Hypertension',
    meds: ['Amlodipine 5mg'],
    lines: [{desc: 'Consultation', amount: 1200}, {desc: 'BP Meds', amount: 1000}],
    docsToGen: ['rx', 'bill'] 
  },
  {
    id: 'TC020', name: 'Tarun M', date: '2026-05-30', amt: 15000, hosp: 'Fortis Healthcare', doc: 'Dr. Sen', reg: 'DL/10101/2014', diag: 'Accidental Injury',
    procs: ['X-Ray', 'Dressing', 'Stitches'], cashless: true,
    lines: [{desc: 'ER Consultation', amount: 3000}, {desc: 'Procedures', amount: 12000}],
    docsToGen: ['rx', 'bill'] 
  }
];

// ==========================================
// 3. SECURE GENERATION ENGINE
// ==========================================

async function generate() {
  console.log('🚀 Launching Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'] 
  });

  for (const tc of testCases) {
    const dir = path.join(OUTPUT_DIR, tc.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0); 
    await page.setViewport({ width: 800, height: 1000 });

    if (tc.docsToGen.includes('rx')) {
      const html = getPrescriptionHTML(tc);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluateHandle('document.fonts.ready');
      await page.screenshot({ path: path.join(dir, `${tc.id}_Prescription.jpg`), type: 'jpeg', quality: 90 });
    }

    if (tc.docsToGen.includes('bill')) {
      const html = getHospitalBillHTML(tc);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluateHandle('document.fonts.ready');
      await page.screenshot({ path: path.join(dir, `${tc.id}_Hospital_Bill.jpg`), type: 'jpeg', quality: 90 });
    }

    // New additions for Lab and Pharmacy
    if (tc.docsToGen.includes('lab')) {
      const html = getDiagnosticReportHTML(tc);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluateHandle('document.fonts.ready');
      await page.screenshot({ path: path.join(dir, `${tc.id}_Lab_Report.jpg`), type: 'jpeg', quality: 90 });
    }

    if (tc.docsToGen.includes('pharma')) {
      const html = getPharmacyBillHTML(tc);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluateHandle('document.fonts.ready');
      await page.screenshot({ path: path.join(dir, `${tc.id}_Pharmacy_Bill.jpg`), type: 'jpeg', quality: 90 });
    }

    console.log(`✅ Fully Generated: ${tc.id} - ${tc.name} (${tc.docsToGen.length} documents)`);
    await page.close();
  }

  await browser.close();
  console.log('\n🎉 Successfully generated all bulletproof documents in /test_assets!');
}

generate();