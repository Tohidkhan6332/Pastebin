const express = require('express');
const router = express.Router();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const fs = require("fs-extra");
const path = require('path');

// Import Pastebin function
const uploadToPastebin = require('./Paste');

const MESSAGE = process.env.MESSAGE || `
🌐 *ʜᴇʏ ᴛʜᴇʀᴇ, sᴛᴀʀᴋ-ᴍᴅ ʙᴏᴛ ᴜsᴇʀ! 👋🏻*

✨ *ʏᴏᴜʀ sᴇssɪᴏɴ ɪs ɢᴇɴᴇʀᴀᴛᴇᴅ!* 🔐

⚠️ *ᴅᴏ ɴᴏᴛ sʜᴀʀᴇ ʏᴏᴜʀ sᴇssɪᴏɴ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ — ɪᴛ ɪs ᴘʀɪᴠᴀᴛᴇ!*`;

router.get('/', async (req, res) => {
    // Clean previous sessions
    if (fs.existsSync('./auth_info_baileys')) {
        await fs.emptyDir('./auth_info_baileys');
    }

    const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, DisconnectReason } = require("@whiskeysockets/baileys");

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const Smd = makeWASocket({
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state
    });

    let qrSent = false;

    Smd.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        // Handle QR code generation
        if (qr && !qrSent) {
            qrSent = true;
            try {
                const qrBuffer = await toBuffer(qr);
                const qrBase64 = qrBuffer.toString('base64');

                const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>STARK-MD | QR SCAN</title>
                    <style>
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                            background: linear-gradient(135deg, #0a0015 0%, #1a0033 100%); 
                            color: #fff; 
                            font-family: 'Inter', sans-serif; 
                            margin: 0; 
                        }
                        .container { 
                            text-align: center; 
                            padding: 30px;
                            background: rgba(0, 0, 0, 0.7);
                            border-radius: 20px;
                            backdrop-filter: blur(15px);
                            border: 1px solid rgba(255, 107, 157, 0.3);
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                            max-width: 400px;
                            width: 90%;
                        }
                        img { 
                            width: 280px; 
                            height: 280px; 
                            margin: 20px auto;
                            border-radius: 15px;
                            box-shadow: 0 10px 40px rgba(255, 107, 157, 0.3);
                            border: 2px solid rgba(255, 255, 255, 0.1);
                        }
                        h1 { 
                            margin-bottom: 10px; 
                            font-size: 28px; 
                            color: #ff6b9d;
                            text-shadow: 0 0 10px rgba(255, 107, 157, 0.5);
                        }
                        p { 
                            font-size: 16px; 
                            color: #ccc;
                            margin-bottom: 25px;
                            line-height: 1.6;
                        }
                        .link { 
                            color: #4fc3f7; 
                            text-decoration: none; 
                            font-weight: bold;
                            padding: 10px 20px;
                            border: 1px solid rgba(79, 195, 247, 0.3);
                            border-radius: 8px;
                            transition: all 0.3s;
                        }
                        .link:hover {
                            background: rgba(79, 195, 247, 0.1);
                            text-decoration: none;
                            box-shadow: 0 0 15px rgba(79, 195, 247, 0.3);
                        }
                        .instructions {
                            background: rgba(255, 107, 157, 0.1);
                            padding: 15px;
                            border-radius: 10px;
                            margin: 20px 0;
                            border-left: 4px solid #ff6b9d;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>📱 Scan QR Code</h1>
                        <div class="instructions">
                            <p>1. Open WhatsApp on your phone</p>
                            <p>2. Go to Settings → Linked Devices</p>
                            <p>3. Tap on "Link a Device"</p>
                            <p>4. Scan this QR code</p>
                        </div>
                        <img src="data:image/png;base64,${qrBase64}" alt="WhatsApp QR Code"/>
                        <p>Session will be generated after scanning.</p>
                        <p><a href="/" class="link">← Back to Home</a></p>
                    </div>
                </body>
                </html>
                `;
                
                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'text/html');
                    res.send(html);
                }
            } catch (error) {
                console.error("QR generation error:", error);
                if (!res.headersSent) {
                    res.status(500).send("Error generating QR Code");
                }
            }
        }

        // Handle successful connection
        if (connection === "open") {
            console.log("✅ WhatsApp connected successfully");
            
            try {
                await delay(3000);
                
                // Read and upload credentials
                const credsPath = path.join('./auth_info_baileys', 'creds.json');
                if (fs.existsSync(credsPath)) {
                    const credsContent = await fs.readFile(credsPath, 'utf8');
                    
                    // Upload to Pastebin
                    const pasteUrl = await uploadToPastebin(credsContent, 'creds.json', 'json', '1');
                    
                    // Send session to user
                    if (Smd.user && Smd.user.id) {
                        await Smd.sendMessage(Smd.user.id, { text: pasteUrl });
                        await Smd.sendMessage(Smd.user.id, { text: MESSAGE });
                    }
                }
                
                // Cleanup
                await fs.emptyDir('./auth_info_baileys');
                
            } catch (error) {
                console.error("Session processing error:", error);
            }
        }

        // Handle disconnection
        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log("Connection closed:", reason);
            
            // Cleanup
            if (fs.existsSync('./auth_info_baileys')) {
                await fs.emptyDir('./auth_info_baileys');
            }
        }

        Smd.ev.on('creds.update', saveCreds);
    });

    // Auto-cleanup after 2 minutes
    setTimeout(async () => {
        if (fs.existsSync('./auth_info_baileys')) {
            await fs.emptyDir('./auth_info_baileys');
        }
    }, 120000);
});

module.exports = router;