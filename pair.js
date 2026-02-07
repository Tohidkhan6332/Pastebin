const express = require('express');
const router = express.Router();
const { exec } = require("child_process");
const fs = require('fs-extra');
const path = require('path');

// Simple in-memory storage for sessions
const activeSessions = new Map();

router.get('/', async (req, res) => {
    const num = req.query.number;
    
    if (!num) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    // Clean phone number
    const cleanNumber = num.replace(/[^0-9]/g, '');
    
    if (cleanNumber.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Set response timeout (Vercel max 60 seconds)
    res.setTimeout(55000, () => {
        if (!res.headersSent) {
            res.status(504).json({ error: 'Request timeout. Please try again.' });
        }
    });

    try {
        // Generate a simple pairing code (for demo)
        // In production, you would integrate with Baileys here
        
        // Generate 8-digit code
        const code = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // Store session temporarily
        activeSessions.set(code, {
            number: cleanNumber,
            timestamp: Date.now(),
            status: 'pending'
        });

        console.log(`✅ Generated code ${code} for ${cleanNumber}`);
        
        // Send success response immediately
        res.json({ 
            code: code,
            message: 'Code generated successfully',
            instructions: 'Open WhatsApp → Linked Devices → Enter this code'
        });

        // Clean old sessions
        cleanupSessions();

    } catch (error) {
        console.error('Pair code generation error:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Service temporarily unavailable',
                code: 'DEMO-' + Math.floor(1000 + Math.random() * 9000)
            });
        }
    }
});

// Cleanup function
function cleanupSessions() {
    const now = Date.now();
    for (const [code, session] of activeSessions.entries()) {
        if (now - session.timestamp > 5 * 60 * 1000) { // 5 minutes
            activeSessions.delete(code);
        }
    }
}

// Session status endpoint
router.get('/status/:code', (req, res) => {
    const code = req.params.code;
    const session = activeSessions.get(code);
    
    if (!session) {
        return res.json({ status: 'expired' });
    }
    
    res.json({
        status: session.status,
        number: session.number,
        age: Date.now() - session.timestamp
    });
});

module.exports = router;