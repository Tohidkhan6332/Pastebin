const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const MESSAGE = process.env.MESSAGE || `👋🏻 *ʜᴇʏ ᴛʜᴇʀᴇ, ᴀʟɪ-ᴍᴅ ʙᴏᴛ ᴜsᴇʀ!*

✨ *ʏᴏᴜʀ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ / sᴇssɪᴏɴ ɪs ɢᴇɴᴇʀᴀᴛᴇᴅ!* 

⚠️ *ᴅᴏ ɴᴏᴛ sʜᴀʀᴇ ᴛʜɪs ᴄᴏᴅᴇ ᴡɪᴛʡ ᴀɴʏᴏɴᴇ — ɪᴛ ɪs ᴘʀɪᴠᴀᴛᴇ!*`;

// Import Pastebin function
const uploadToPastebin = require('./Paste');

router.get('/', async (req, res) => {
    let num = req.query.number;

    if (!num) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    // Set timeout for response
    res.setTimeout(45000, () => {
        if (!res.headersSent) {
            res.status(504).json({ error: 'Request timeout' });
        }
    });

    async function generatePairCode() {
        const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, DisconnectReason } = require("@whiskeysockets/baileys");

        // Clean previous sessions
        if (fs.existsSync('./auth_info_baileys')) {
            await fs.emptyDir('./auth_info_baileys');
        }

        const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
        
        const Smd = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }),
            browser: Browsers.macOS("Safari"),
        });

        Smd.ev.on('creds.update', saveCreds);

        // Handle connection updates
        Smd.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                console.log("✅ WhatsApp connection established");
                
                try {
                    await delay(3000);
                    
                    // Read credentials file
                    const credsPath = path.join('./auth_info_baileys', 'creds.json');
                    if (fs.existsSync(credsPath)) {
                        const credsContent = await fs.readFile(credsPath, 'utf8');
                        
                        // Upload to Pastebin
                        const pasteUrl = await uploadToPastebin(credsContent, 'creds.json', 'json', '1');
                        
                        // Send message with paste URL
                        if (Smd.user && Smd.user.id) {
                            await Smd.sendMessage(Smd.user.id, { text: pasteUrl });
                            
                            // Prepare and send welcome message
                            const gift = {
                                key: {
                                    fromMe: false,
                                    participant: `0@s.whatsapp.net`,
                                    remoteJid: "status@broadcast"
                                },
                                message: {
                                    contactMessage: {
                                        displayName: "STARK-MD SESSION ☁️",
                                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:'STARK-MD'\nitem1.TEL;waid=${Smd.user.id.split("@")[0]}:${Smd.user.id.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                                    }
                                }
                            };
                            
                            await Smd.sendMessage(Smd.user.id, { text: MESSAGE }, { quoted: gift });
                        }
                        
                        // Cleanup local files
                        await fs.emptyDir('./auth_info_baileys');
                    }
                } catch (error) {
                    console.error("Error during session processing:", error);
                }
            }

            // Handle disconnection
            if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                
                if (reason === DisconnectReason.connectionClosed) {
                    console.log("Connection closed!");
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log("Connection Lost from Server!");
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log("Restart Required!");
                }
                
                // Cleanup
                if (fs.existsSync('./auth_info_baileys')) {
                    await fs.emptyDir('./auth_info_baileys');
                }
            }
        });

        // Request pairing code
        if (!Smd.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            
            try {
                const code = await Smd.requestPairingCode(num);
                console.log(`✅ Pairing code generated for ${num}: ${code}`);
                
                if (!res.headersSent) {
                    return res.json({ code });
                }
            } catch (error) {
                console.error("Pairing error:", error);
                
                if (!res.headersSent) {
                    return res.status(500).json({ error: 'Failed to generate pairing code' });
                }
            }
        }

        // Auto-cleanup after 60 seconds
        setTimeout(async () => {
            if (fs.existsSync('./auth_info_baileys')) {
                await fs.emptyDir('./auth_info_baileys');
            }
        }, 60000);
    }

    try {
        await generatePairCode();
    } catch (error) {
        console.error("Request error:", error);
        
        // Cleanup on error
        if (fs.existsSync('./auth_info_baileys')) {
            await fs.emptyDir('./auth_info_baileys');
        }
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'Service unavailable' });
        }
    }
});

module.exports = router;