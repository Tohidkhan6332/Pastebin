const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Routers
const qrRouter = require('./qr');
const codeRouter = require('./pair');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use routers
app.use('/qr', qrRouter);
app.use('/code', codeRouter);

// Static HTML routes
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// API health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'STARK-MD Pairing Platform'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel-compatible export
module.exports = app;

// Local development server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ STARK-MD Server running on http://localhost:${PORT}`);
  });
}