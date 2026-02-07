const axios = require('axios');

// Multiple Pastebin API keys (used one after another if one fails)
const API_KEYS = [
    "EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL",
    "CNJgmfg9X745hcnMQ7FE-nDxytt6w8xK",
    "c7Jo_q9xvCMAQsj1qihjLJBMBY2Er5--",
    "KpoS0JysNXgUSgCWH2hr__2OG7aJ30S_",
    "furii3L3ijdpwYB-vZ_jej7CxvNjFESk",
    "PS0uqmRdEQ3mSqNWD28lccEmQMz-eu7",
    "9L_JkdEp6u4yAa3Dwi9gnYxvZ2_HrXj-",
    "44649d0b013cfc04c3a7bcadad511ef7",
    "478d52a29c7e952ba116d09bd9625fde",
    "dec737f4cfa5817b78bb5e16e23eda1d",
    "51d707c74e0ad8797b70ae27b3e6f846"
];

/**
 * Uploads content to Pastebin
 * @param {string} content - Text content to upload
 * @param {string} title - Paste title
 * @param {string} format - Syntax format
 * @param {string} privacy - 0=public, 1=unlisted, 2=private
 * @returns {Promise<string>} Custom paste URL
 */
async function uploadToPastebin(content, title = 'creds.json', format = 'json', privacy = '1') {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));
    let lastError = null;

    for (let i = 0; i < API_KEYS.length; i++) {
        const API_KEY = API_KEYS[i];
        console.log(`⚙️ Attempting upload with API key ${i + 1}/${API_KEYS.length}...`);

        try {
            // Prepare the request data
            const postData = new URLSearchParams();
            postData.append('api_dev_key', API_KEY);
            postData.append('api_option', 'paste');
            postData.append('api_paste_code', content);
            postData.append('api_paste_name', title);
            postData.append('api_paste_format', format);
            postData.append('api_paste_private', privacy);
            postData.append('api_paste_expire_date', 'N');

            // Make the request to Pastebin API
            const response = await axios.post('https://pastebin.com/api/api_post.php', postData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });

            const result = response.data;

            // Check if the response is a valid URL
            if (result.startsWith('https://pastebin.com/')) {
                console.log('✅ Original Pastebin URL:', result);
                
                // Extract paste ID and create custom URL
                const pasteId = result.replace('https://pastebin.com/', '');
                const customUrl = `STARK-MD≈${pasteId}`;
                
                console.log('🔗 Custom URL:', customUrl);
                return customUrl;
            } else {
                // API returned an error
                console.error(`❌ Pastebin API error: ${result}`);
                
                // Check for rate limiting
                if (result.includes('rate limit') || result.includes('Too many')) {
                    console.log('⚠️ Rate limit detected. Waiting 5 seconds before retry...');
                    await delay(5000);
                }
                
                lastError = new Error(result);
            }

        } catch (error) {
            lastError = error;
            console.error(`❌ Error with API key ${i + 1}:`, error.message);

            // Handle rate-limit or network error
            if (error.message.includes('timeout') || error.message.includes('network')) {
                console.log('⚠️ Network/timeout error. Retrying...');
                await delay(2000);
            }
        }

        // Try next key if available
        if (i < API_KEYS.length - 1) {
            console.log(`↻ Retrying with next API key...\n`);
            await delay(1500);
        }
    }

    // All keys failed - use fallback
    console.log('⚠️ All Pastebin API keys failed. Using fallback method.');
    
    // Fallback: Create a local ID and store content in memory (for demo)
    const fallbackId = 'FALLBACK_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    const customUrl = `STARK-MD≈${fallbackId}`;
    
    // Store in temporary variable (for demo purposes)
    // In production, you should use a database or file storage
    global.tempStorage = global.tempStorage || {};
    global.tempStorage[fallbackId] = content;
    
    console.log('🔗 Fallback URL generated:', customUrl);
    return customUrl;
}

// Function to retrieve content from fallback storage
function getFromFallbackStorage(pasteId) {
    if (global.tempStorage && global.tempStorage[pasteId]) {
        return global.tempStorage[pasteId];
    }
    return null;
}

module.exports = uploadToPastebin;
module.exports.getFromFallbackStorage = getFromFallbackStorage;