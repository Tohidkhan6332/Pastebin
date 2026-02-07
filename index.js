const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Routers
const qrRouter = require('./qr');
const codeRouter = require('./pair');

// Increase timeout for Vercel (maximum 60 seconds)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Use routers
app.use('/qr', qrRouter);
app.use('/code', codeRouter);

// Serve static files FIRST
app.use(express.static(__dirname));

// Static HTML routes (should come after static)
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// API health check (fast response)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'STARK-MD Pairing Platform'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'main.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Please try again later'
  });
});

// Vercel-compatible export
module.exports = app;

// Local development server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ STARK-MD Server running on http://localhost:${PORT}`);
  });
}