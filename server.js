// ============================================================
// HLS LIVE STREAM PROXY SERVER
// Fixes CORS, Token Auth, and URL Expiry Issues
// ============================================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(__dirname));

// ============================================================
// PROXY ENDPOINT - M3U8 STREAM
// ============================================================
app.get('/api/proxy/stream', async (req, res) => {
    try {
        const { url, token } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        console.log('📡 Proxying M3U8:', url.substring(0, 80) + '...');

        // Setup headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.physicswallah.com/',
            'Origin': 'https://www.physicswallah.com'
        };

        // Add token if provided
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch M3U8
        const response = await axios.get(url, {
            headers: headers,
            responseType: 'text',
            timeout: 30000,
            validateStatus: (status) => status < 500
        });

        if (response.status !== 200) {
            console.error('❌ M3U8 fetch failed:', response.status);
            return res.status(response.status).json({ 
                error: 'Stream fetch failed',
                status: response.status 
            });
        }

        // Process M3U8 content
        let m3u8Content = response.data;
        
        // Get base URL for relative paths
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'))}`;

        // Replace segment URLs with proxy URLs
        m3u8Content = m3u8Content.split('\n').map(line => {
            // Skip comments and empty lines
            if (line.startsWith('#') || line.trim().length === 0) {
                return line;
            }

            // Process segment URLs
            let segmentUrl;
            if (line.startsWith('http://') || line.startsWith('https://')) {
                segmentUrl = line.trim();
            } else {
                segmentUrl = `${baseUrl}/${line.trim()}`;
            }

            // Return proxied URL
            const proxiedUrl = `/api/proxy/segment?url=${encodeURIComponent(segmentUrl)}`;
            return token ? `${proxiedUrl}&token=${encodeURIComponent(token)}` : proxiedUrl;
        }).join('\n');

        console.log('✅ M3U8 proxied successfully');

        // Send response
        res.set({
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.send(m3u8Content);

    } catch (error) {
        console.error('❌ M3U8 Proxy Error:', error.message);
        res.status(500).json({ 
            error: 'Proxy failed', 
            message: error.message,
            details: error.response?.data || 'No additional details'
        });
    }
});

// ============================================================
// PROXY ENDPOINT - VIDEO SEGMENTS
// ============================================================
app.get('/api/proxy/segment', async (req, res) => {
    try {
        const { url, token } = req.query;

        if (!url) {
            return res.status(400).send('URL parameter required');
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.physicswallah.com/',
            'Origin': 'https://www.physicswallah.com'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch video segment
        const response = await axios.get(url, {
            headers: headers,
            responseType: 'stream',
            timeout: 30000
        });

        // Set response headers
        res.set({
            'Content-Type': response.headers['content-type'] || 'video/MP2T',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000',
            'Accept-Ranges': 'bytes'
        });

        // Pipe the stream
        response.data.pipe(res);

    } catch (error) {
        console.error('❌ Segment Proxy Error:', error.message);
        res.status(500).send('Segment fetch failed');
    }
});

// ============================================================
// HEALTH CHECK ENDPOINT
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'Live Stream Proxy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: '2.0.0'
    });
});

// ============================================================
// STATIC FILE ROUTES
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/player.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'player.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'player.html'));
});

// ============================================================
// CATCH-ALL ROUTE
// ============================================================
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path 
    });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log('\n');
    console.log('🚀 ========================================');
    console.log('🎥  LIVE STREAM PROXY SERVER');
    console.log('🚀 ========================================');
    console.log(`📡  Port: ${PORT}`);
    console.log(`🌐  URL: http://localhost:${PORT}`);
    console.log(`🔐  CORS: Enabled`);
    console.log(`🔄  Proxy: Active`);
    console.log(`✅  Status: Running`);
    console.log('🚀 ========================================');
    console.log('\n');
});

// ============================================================
// ERROR HANDLING
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    process.exit(0);
});

