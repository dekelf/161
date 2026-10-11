const express = require('express');
const router = express.Router();

// PDF generation is handled client-side via form161-pdf.js
router.all('*', (req, res) => {
  res.status(501).json({ error: 'הפקת PDF נעשית בצד הלקוח — השתמשי בform161-pdf.js' });
});

module.exports = router;
