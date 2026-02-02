// ========== CONFIGURATION ==========
const CONFIG = {
    playerPage: 'player.html',
    tokenFile: 'config/token.json',
    minUrlLength: 20,
    maxUrlLength: 2000
};

// ========== DOM ELEMENTS ==========
const elements = {
    streamUrl: document.getElementById('streamUrl'),
    authToken: document.getElementById('authToken'),
    generateBtn: document.getElementById('generateBtn'),
    result: document.getElementById('result'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('errorMessage'),
    generatedLink: document.getElementById('generatedLink'),
    copyBtn: document.getElementById('copyBtn'),
    openBtn: document.getElementById('openBtn'),
    resetBtn: document.getElementById('resetBtn')
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Validate M3U8 URL
 */
function validateUrl(url) {
    if (!url || url.trim().length === 0) {
        return { valid: false, message: '❌ Please enter a stream URL' };
    }

    if (url.length < CONFIG.minUrlLength) {
        return { valid: false, message: '❌ URL is too short' };
    }

    if (url.length > CONFIG.maxUrlLength) {
        return { valid: false, message: '❌ URL is too long' };
    }

    // Check if URL contains .m3u8
    if (!url.includes('.m3u8')) {
        return { valid: false, message: '❌ Invalid M3U8 URL format' };
    }

    // Check if URL starts with http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { valid: false, message: '❌ URL must start with http:// or https://' };
    }

    return { valid: true };
}

/**
 * Encode stream data to Base64
 */
function encodeStreamData(streamUrl, token) {
    const data = {
        url: streamUrl.trim(),
        token: token ? token.trim() : null,
        timestamp: Date.now(),
        generated: new Date().toISOString()
    };

    // Convert to Base64
    const jsonString = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    
    // URL-safe Base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate player URL with encrypted parameters
 */
function generatePlayerUrl(streamUrl, token) {
    const encodedData = encodeStreamData(streamUrl, token);
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    return `${baseUrl}${CONFIG.playerPage}?stream=${encodedData}`;
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.error.style.display = 'block';
    elements.result.style.display = 'none';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        elements.error.style.display = 'none';
    }, 5000);
}

/**
 * Show success result
 */
function showResult(generatedUrl) {
    elements.generatedLink.value = generatedUrl;
    elements.result.style.display = 'block';
    elements.error.style.display = 'none';
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalText = elements.copyBtn.textContent;
        elements.copyBtn.textContent = '✅ Copied!';
        elements.copyBtn.style.background = '#10b981';
        
        setTimeout(() => {
            elements.copyBtn.textContent = originalText;
            elements.copyBtn.style.background = '';
        }, 2000);
        
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            elements.copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                elements.copyBtn.textContent = '📋 Copy';
            }, 2000);
            
            return true;
        } catch (err) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

/**
 * Load token from file (if exists)
 */
async function loadSavedToken() {
    try {
        const response = await fetch(CONFIG.tokenFile);
        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                elements.authToken.value = data.token;
                console.log('✅ Token loaded from file');
            }
        }
    } catch (err) {
        console.log('ℹ️ No saved token found');
    }
}

/**
 * Reset form
 */
function resetForm() {
    elements.streamUrl.value = '';
    elements.authToken.value = '';
    elements.result.style.display = 'none';
    elements.error.style.display = 'none';
    elements.streamUrl.focus();
}

// ========== EVENT HANDLERS ==========

/**
 * Handle Generate Button Click
 */
elements.generateBtn.addEventListener('click', () => {
    const streamUrl = elements.streamUrl.value;
    const token = elements.authToken.value;

    // Validate URL
    const validation = validateUrl(streamUrl);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Disable button during generation
    elements.generateBtn.disabled = true;
    elements.generateBtn.textContent = '⏳ Generating...';

    // Simulate processing
    setTimeout(() => {
        try {
            const generatedUrl = generatePlayerUrl(streamUrl, token);
            showResult(generatedUrl);
            
            // Log success
            console.log('✅ Link generated successfully');
            console.log('Stream URL:', streamUrl);
            console.log('Generated Link:', generatedUrl);
            
        } catch (err) {
            showError('❌ Error generating link. Please try again.');
            console.error('Generation error:', err);
        } finally {
            elements.generateBtn.disabled = false;
            elements.generateBtn.textContent = '🔗 Generate Live Link';
        }
    }, 500);
});

/**
 * Handle Copy Button Click
 */
elements.copyBtn.addEventListener('click', async () => {
    const link = elements.generatedLink.value;
    const success = await copyToClipboard(link);
    
    if (!success) {
        showError('❌ Failed to copy. Please copy manually.');
    }
});

/**
 * Handle Open Button Click
 */
elements.openBtn.addEventListener('click', () => {
    const link = elements.generatedLink.value;
    window.open(link, '_blank');
});

/**
 * Handle Reset Button Click
 */
elements.resetBtn.addEventListener('click', resetForm);

/**
 * Handle Enter key in textareas
 */
elements.streamUrl.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        elements.generateBtn.click();
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎥 Live Stream Link Generator Initialized');
    
    // Load saved token if exists
    loadSavedToken();
    
    // Focus on stream URL input
    elements.streamUrl.focus();
    
    // Check for URL parameters (for pre-filling)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        elements.streamUrl.value = decodeURIComponent(urlParams.get('url'));
    }
});

// ========== ERROR HANDLING ==========
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
