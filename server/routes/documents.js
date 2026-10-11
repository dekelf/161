const express = require('express');
const router = express.Router();

// File upload coming soon
router.all('*', (req, res) => {
  res.status(501).json({ error: 'העלאת קבצים עוד לא זמינה בגרסה זו' });
});

module.exports = router;
