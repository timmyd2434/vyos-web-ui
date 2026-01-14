import axios from 'axios';

// VyOS API endpoints
const ENDPOINTS = {
    RETRIEVE: '/retrieve',
    CONFIGURE: '/configure',
    GENERATE: '/generate', // 1.4+
    SHOW: '/show',         // Some versions
};

/**
 * Determines if we should use the development proxy server
 * @returns {boolean}
 */
const useProxy = () => {
    return import.meta.env.DEV; // true in development mode
};

/**
 * Makes a request through the proxy server or directly to the router
 * @param {string} url - Router base URL (e.g., https://192.168.0.29)
 * @param {string} endpoint - API endpoint (e.g., /retrieve)
 * @param {FormData} formData - Request data
 * @returns {Promise}
 */
const makeRequest = async (url, endpoint, formData) => {
    if (useProxy()) {
        // Development mode: use proxy server
        const targetUrl = `${url}${endpoint}`;

        // Convert FormData to plain object for JSON transmission
        const formDataObj = {};
        for (const [key, value] of formData.entries()) {
            formDataObj[key] = value;
        }

        const response = await axios.post('http://localhost:3001/api/proxy', {
            targetUrl,
            method: 'POST',
            formData: formDataObj,
        });

        return response;
    } else {
        // Production mode: direct connection to router
        const client = axios.create({
            baseURL: url,
            timeout: 15000,
            validateStatus: (status) => status < 500,
        });
        return await client.post(endpoint, formData);
    }
};

/**
 * Sleep utility for retry backoff
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<any>}
 */
const retryWithBackoff = async (fn, maxAttempts = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on authentication errors or bad requests
            if (error.response?.status === 401 || error.response?.status === 400) {
                throw error;
            }

            // Don't retry if this was the last attempt
            if (attempt === maxAttempts) {
                break;
            }

            // Only retry on network errors or timeouts
            const isRetriable =
                error.code === 'ECONNABORTED' ||
                error.code === 'ERR_NETWORK' ||
                error.code === 'ETIMEDOUT' ||
                !error.response; // No response = network issue

            if (!isRetriable) {
                throw error;
            }

            // Exponential backoff: 2^attempt * 1000ms (2s, 4s, 8s)
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`Request failed, retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})...`);
            await sleep(backoffMs);
        }
    }

    throw lastError;
};

/**
 * Executes a 'retrieve' (show) command with automatic retry on network failures
 * @param {string} url - Router URL
 * @param {string} key - API Key
 * @param {object} opData - Operation data (e.g. { op: "showConfig", path: [] })
 */
export const retrieve = async (url, key, opData) => {
    return retryWithBackoff(async () => {
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(opData));
            formData.append('key', key);

            // VyOS 1.5+: 'show' operational commands must go to /show, 'showConfig' goes to /retrieve
            const endpoint = (opData && opData.op === 'show') ? ENDPOINTS.SHOW : ENDPOINTS.RETRIEVE;

            const response = await makeRequest(url, endpoint, formData);
            return response.data;
        } catch (error) {
            console.error("VyOS Retrieve Error:", error);

            // Handle specific VyOS 400 error for empty configuration paths
            if (error.response && error.response.status === 400) {
                const errData = error.response.data;
                const errMsg = errData?.error || '';
                if (typeof errMsg === 'string' && errMsg.includes('Configuration under specified path is empty')) {
                    console.warn("VyOS returned 400 for empty path, treating as null result.");
                    return { success: true, data: null };
                }
            }

            // Enhance error messages for common issues
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - router may be slow or unreachable. Check connectivity.');
            }
            if (error.code === 'ERR_NETWORK') {
                throw new Error('Network error - unable to reach router. Verify URL and network connection.');
            }

            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            } else if (error.request) {
                console.error("No response received");
            }
            throw error;
        }
    });
};

/**
 * Executes a 'configure' (set/delete) command with automatic retry on network failures
 * @param {string} url - Router URL
 * @param {string} key - API Key
 * @param {object} opData - Operation data
 */
export const configure = async (url, key, opData) => {
    return retryWithBackoff(async () => {
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(opData));
            formData.append('key', key);

            const response = await makeRequest(url, ENDPOINTS.CONFIGURE, formData);
            return response.data;
        } catch (error) {
            console.error("VyOS Configure Error:", error);
            console.error("Command:", JSON.stringify(opData, null, 2));

            // Enhance error messages for common issues
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - configuration command took too long. Router may be busy.');
            }
            if (error.code === 'ERR_NETWORK') {
                throw new Error('Network error - unable to reach router during configuration.');
            }

            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("VyOS Response:", error.response.data);
            }
            throw error;
        }
    });
};

// Generic post wrapper if needed
export const rawPost = async (url, endpoint, key, data) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('key', key);

    const response = await makeRequest(url, endpoint, formData);
    return response.data;
}
