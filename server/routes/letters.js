const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const db = require('../db');
const { generateReleaseLetter, generateAllLetters, LETTERS_DIR } = require('../pdfGenerator');

// Build full form object needed for PDF generation
function getFullForm(formId) {
  const form = db.prepare(`
    SELECT f.*, e.name as employee_name, e.id_number, e.employer, e.employer_id,
           e.start_date, e.end_date, e.is_controlling_shareholder
    FROM forms f JOIN employees e ON e.id = f.employee_id
    WHERE f.id = ?
  `).get(formId);
  if (!form) return null;
  form.signatures = db.prepare('SELECT * FROM signatures WHERE form_id = ?').all(formId);
  form.pension_funds = db.prepare('SELECT * FROM pension_funds WHERE form_id = ? ORDER BY fund_name').all(formId);
  return form;
}

// POST /api/letters/:form_id/generate — generate all release letters for a form
router.post('/:form_id/generate', async (req, res) => {
  const form = getFullForm(req.params.form_id);
  if (!form) return res.status(404).json({ error: 'טופס לא נמצא' });

  try {
    const results = await generateAllLetters(form);
    if (results.length === 0) {
      return res.status(400).json({ error: 'אין קופות עם הנחיה מוגדרת לייצור מכתבים' });
    }
    res.json({
      generated: results.map(r => ({
        fund_id: r.fund_id,
        fund_name: r.fund_name,
        filename: path.basename(r.filePath),
        url: `/api/letters/${form.id}/download/${path.basename(r.filePath)}`,
      })),
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'שגיאה בהפקת PDF: ' + err.message });
  }
});

// POST /api/letters/:form_id/generate/:fund_id — generate one letter
router.post('/:form_id/generate/:fund_id', async (req, res) => {
  const form = getFullForm(req.params.form_id);
  if (!form) return res.status(404).json({ error: 'טופס לא נמצא' });

  const fund = (form.pension_funds || []).find(f => f.id === req.params.fund_id);
  if (!fund) return res.status(404).json({ error: 'קרן לא נמצאת' });

  try {
    const filePath = await generateReleaseLetter(form, fund);
    const filename = path.basename(filePath);
    res.json({
      fund_id: fund.id,
      fund_name: fund.fund_name,
      filename,
      url: `/api/letters/${form.id}/download/${filename}`,
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'שגיאה בהפקת PDF: ' + err.message });
  }
});

// GET /api/letters/:form_id/download/:filename — download generated letter
router.get('/:form_id/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(LETTERS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'קובץ לא נמצא' });
  res.download(filePath, filename);
});

// POST /api/letters/:form_id/send — send letters by email
// Body: { recipients: [{email, name, role}], fund_ids?: string[] }
router.post('/:form_id/send', async (req, res) => {
  const form = getFullForm(req.params.form_id);
  if (!form) return res.status(404).json({ error: 'טופס לא נמצא' });

  const { smtp, recipients, fund_ids } = req.body;
  if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
    return res.status(400).json({ error: 'נדרש: smtp.host, smtp.user, smtp.pass' });
  }
  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'נדרש לפחות נמען אחד' });
  }

  // Generate letters first (or use existing)
  let fundsToSend = (form.pension_funds || []).filter(f => f.instruction);
  if (fund_ids && fund_ids.length > 0) {
    fundsToSend = fundsToSend.filter(f => fund_ids.includes(f.id));
  }

  if (fundsToSend.length === 0) {
    return res.status(400).json({ error: 'אין קופות עם הנחיה לשליחה' });
  }

  try {
    // Generate all needed PDFs
    const letterPaths = [];
    for (const fund of fundsToSend) {
      const filePath = await generateReleaseLetter(form, fund);
      letterPaths.push({ fund_name: fund.fund_name, filePath });
    }

    // Build transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 587,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    const sent = [];
    for (const recipient of recipients) {
      const attachments = letterPaths.map(lp => ({
        filename: `מכתב_שחרור_${lp.fund_name}_${form.form_number}.pdf`,
        path: lp.filePath,
        contentType: 'application/pdf',
      }));

      await transporter.sendMail({
        from: `"מערכת 161" <${smtp.user}>`,
        to: recipient.email,
        subject: `מכתב שחרור פיצויים — ${form.employee_name} | טופס ${form.form_number}`,
        html: buildEmailHtml(form, letterPaths),
        attachments,
      });

      sent.push({ email: recipient.email, attachments: attachments.length });
    }

    res.json({ sent, letters: letterPaths.length });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'שגיאה בשליחת מייל: ' + err.message });
  }
});

function buildEmailHtml(form, letterPaths) {
  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>מכתב שחרור פיצויים</h2>
      <p>מצ"ב מכתב/י שחרור פיצויים עבור <strong>${form.employee_name}</strong>
         (ת.ז. ${form.id_number}), טופס מספר <strong>${form.form_number}</strong>.</p>
      <p>מעסיק: ${form.employer}</p>
      <h3>קופות:</h3>
      <ul>
        ${letterPaths.map(lp => `<li>${lp.fund_name}</li>`).join('')}
      </ul>
      <hr/>
      <p style="font-size:12px; color:#888;">
        מסמך זה הופק אוטומטית ממערכת ניהול טופס 161.
      </p>
    </div>
  `;
}

module.exports = router;
