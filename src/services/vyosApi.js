import axios from 'axios';

// VyOS API endpoints
const ENDPOINTS = {
    RETRIEVE: '/retrieve',
    CONFIGURE: '/configure',
    GENERATE: '/generate', // 1.4+
    SHOW: '/show',         // Some versions
};

/**
 * Creates a configured Axios instance
 * @param {string} baseUrl - The base URL of the router (e.g., https://192.168.1.1)
 * @returns {import('axios').AxiosInstance}
 */
const createClient = (baseUrl) => {
    return axios.create({
        baseURL: baseUrl,
        // Do NOT set Content-Type manually for FormData, axios/browser handles it with boundary
    });
};

/**
 * Executes a 'retrieve' (show) command
 * @param {string} url - Router URL
 * @param {string} key - API Key
 * @param {object} opData - Operation data (e.g. { op: "showConfig", path: [] })
 */
export const retrieve = async (url, key, opData) => {
    try {
        const formData = new FormData();
        formData.append('data', JSON.stringify(opData));
        formData.append('key', key);

        // VyOS 1.5+: 'show' operational commands must go to /show, 'showConfig' goes to /retrieve
        const endpoint = (opData && opData.op === 'show') ? ENDPOINTS.SHOW : ENDPOINTS.RETRIEVE;

        const response = await axios.post(`${url}${endpoint}`, formData);
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

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else if (error.request) {
            console.error("No response received");
        }
        throw error;
    }
};

/**
 * Executes a 'configure' (set/delete) command
 * @param {string} url - Router URL
 * @param {string} key - API Key
 * @param {object} opData - Operation data
 */
export const configure = async (url, key, opData) => {
    try {
        const formData = new FormData();
        formData.append('data', JSON.stringify(opData));
        formData.append('key', key);

        const response = await axios.post(`${url}${ENDPOINTS.CONFIGURE}`, formData);
        return response.data;
    } catch (error) {
        console.error("VyOS Configure Error:", error);
        console.error("Command:", JSON.stringify(opData, null, 2));
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("VyOS Response:", error.response.data);
        }
        throw error;
    }
};

// Generic post wrapper if needed
export const rawPost = async (url, endpoint, key, data) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('key', key);
    const response = await axios.post(`${url}${endpoint}`, formData);
    return response.data;
}
