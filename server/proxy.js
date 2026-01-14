import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Accept self-signed certificates
});

/**
 * Dynamic proxy endpoint
 * Accepts router URL and proxies the request to bypass CORS
 */
app.post('/api/proxy', async (req, res) => {
    try {
        const { targetUrl, method = 'POST', formData } = req.body;

        if (!targetUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing targetUrl in request body'
            });
        }

        console.log(`[Proxy] ${method} ${targetUrl}`);

        // Make request to VyOS router
        const response = await axios({
            method: method,
            url: targetUrl,
            data: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            httpsAgent: httpsAgent,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });

        // Forward the response from VyOS back to frontend
        res.json(response.data);

    } catch (error) {
        console.error('[Proxy] Error:', error.message);

        // Handle different error types
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Connection refused - router may be offline or URL is incorrect',
            });
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                error: 'Connection timeout - router is not responding',
            });
        }

        if (error.code === 'ENOTFOUND') {
            return res.status(404).json({
                success: false,
                error: 'Router not found - check the IP address',
            });
        }

        // Generic error
        res.status(500).json({
            success: false,
            error: error.message || 'Proxy error occurred',
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'VyOS Proxy Server Running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✅ VyOS Proxy Server running on http://localhost:${PORT}`);
    console.log(`   Bypassing CORS and SSL certificate issues for development`);
    console.log(`   Frontend can now connect to any VyOS router dynamically\n`);
});
