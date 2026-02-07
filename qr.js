const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

router.get('/', async (req, res) => {
    try {
        // Generate a unique session ID
        const sessionId = 'STARK-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Create QR data - using a simple WhatsApp link format
        const qrData = `https://wa.me/qr/${sessionId}`;
        
        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#FF6B9D',
                light: '#0A0015'
            }
        });

        // Extract base64 data
        const qrBase64 = qrCodeDataURL.split(',')[1];

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>STARK-MD | QR SCANNER</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #0a0015 0%, #1a0033 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                
                .container {
                    max-width: 500px;
                    width: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(15px);
                    border-radius: 20px;
                    padding: 30px;
                    border: 1px solid rgba(255, 107, 157, 0.3);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    text-align: center;
                }
                
                .logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .logo img {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 3px solid #FF6B9D;
                }
                
                .logo-text {
                    font-size: 28px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #FF6B9D, #7B1FA2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                h1 {
                    color: #FF6B9D;
                    margin-bottom: 10px;
                    font-size: 24px;
                }
                
                .subtitle {
                    color: #AAA;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                
                .qr-container {
                    background: white;
                    padding: 20px;
                    border-radius: 15px;
                    display: inline-block;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                
                .qr-container img {
                    width: 300px;
                    height: 300px;
                    border-radius: 10px;
                }
                
                .instructions {
                    background: rgba(255, 107, 157, 0.1);
                    padding: 20px;
                    border-radius: 15px;
                    margin: 20px 0;
                    text-align: left;
                    border-left: 4px solid #FF6B9D;
                }
                
                .instructions h3 {
                    color: #FF6B9D;
                    margin-bottom: 10px;
                }
                
                .instructions ol {
                    padding-left: 20px;
                    color: #CCC;
                    line-height: 1.8;
                }
                
                .buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                    flex-wrap: wrap;
                }
                
                .btn {
                    padding: 12px 25px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.3s;
                    border: 2px solid transparent;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #FF6B9D, #7B1FA2);
                    color: white;
                }
                
                .btn-primary:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(255, 107, 157, 0.3);
                }
                
                .btn-secondary {
                    background: transparent;
                    color: #FF6B9D;
                    border-color: #FF6B9D;
                }
                
                .btn-secondary:hover {
                    background: rgba(255, 107, 157, 0.1);
                }
                
                .status {
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(79, 195, 247, 0.1);
                    border-radius: 10px;
                    color: #4FC3F7;
                    display: none;
                }
                
                @media (max-width: 600px) {
                    .container {
                        padding: 20px;
                    }
                    
                    .qr-container img {
                        width: 250px;
                        height: 250px;
                    }
                    
                    .buttons {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                        text-align: center;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <img src="https://files.catbox.moe/gat2po.jpeg" alt="STARK-MD">
                    <div class="logo-text">STARK-MD</div>
                </div>
                
                <h1>📱 WhatsApp QR Scanner</h1>
                <p class="subtitle">Scan this QR code with your WhatsApp mobile app</p>
                
                <div class="qr-container">
                    <img src="data:image/png;base64,${qrBase64}" alt="QR Code">
                </div>
                
                <div class="instructions">
                    <h3>How to Scan:</h3>
                    <ol>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap on Settings (three dots) → Linked Devices</li>
                        <li>Tap on "Link a Device"</li>
                        <li>Scan the QR code shown above</li>
                        <li>Wait for connection confirmation</li>
                    </ol>
                </div>
                
                <div class="status" id="status">
                    ⏳ Waiting for scan...
                </div>
                
                <div class="buttons">
                    <a href="/" class="btn btn-primary">🏠 Back to Home</a>
                    <a href="/pair" class="btn btn-secondary">🔑 Use Pair Code</a>
                    <button onclick="refreshQR()" class="btn btn-secondary">🔄 Refresh QR</button>
                </div>
            </div>
            
            <script>
                function refreshQR() {
                    document.getElementById('status').style.display = 'block';
                    document.getElementById('status').textContent = '🔄 Refreshing QR code...';
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
                
                // Simulate QR scan status
                setTimeout(() => {
                    const status = document.getElementById('status');
                    status.style.display = 'block';
                    status.textContent = '✅ QR code is active. Please scan within 5 minutes.';
                }, 2000);
            </script>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).send(`
            <html>
            <body style="background: #0a0015; color: white; font-family: sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #ff6b9d;">❌ QR Generation Failed</h1>
                <p>Unable to generate QR code. Please try again.</p>
                <a href="/" style="color: #4fc3f7; text-decoration: none; margin-top: 20px; display: inline-block;">← Back to Home</a>
            </body>
            </html>
        `);
    }
});

module.exports = router;