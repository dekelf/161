const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/employees', require('./routes/employees'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/documents', require('./routes/documents'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
