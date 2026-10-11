const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('רק PDF ותמונות מותרות'));
  }
});

// POST upload document
router.post('/:form_id/upload', upload.single('file'), (req, res) => {
  const form = db.prepare('SELECT id FROM forms WHERE id = ?').get(req.params.form_id);
  if (!form) return res.status(404).json({ error: 'טופס לא נמצא' });

  const { doc_type } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO documents (id, form_id, filename, original_name, doc_type, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.form_id, req.file.filename, req.file.originalname, doc_type || 'other', req.file.size);

  res.status(201).json({ id, filename: req.file.filename, original_name: req.file.originalname });
});

// GET download document
router.get('/file/:doc_id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.doc_id);
  if (!doc) return res.status(404).json({ error: 'לא נמצא' });

  const filePath = path.join(UPLOADS_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'קובץ לא קיים' });

  res.download(filePath, doc.original_name);
});

// DELETE document
router.delete('/file/:doc_id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.doc_id);
  if (!doc) return res.status(404).json({ error: 'לא נמצא' });

  const filePath = path.join(UPLOADS_DIR, doc.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.doc_id);

  res.json({ success: true });
});

module.exports = router;
