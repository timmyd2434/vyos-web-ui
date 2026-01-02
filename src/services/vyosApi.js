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

        const response = await axios.post(`${url}${ENDPOINTS.RETRIEVE}`, formData);
        return response.data;
    } catch (error) {
        console.error("VyOS Retrieve Error:", error);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            console.error("Headers:", error.response.headers);
        } else if (error.request) {
            console.error("No response received. Request:", error.request);
        } else {
            console.error("Error setting up request:", error.message);
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
    const formData = new FormData();
    formData.append('data', JSON.stringify(opData));
    formData.append('key', key);

    const response = await axios.post(`${url}${ENDPOINTS.CONFIGURE}`, formData);
    return response.data;
};

// Generic post wrapper if needed
export const rawPost = async (url, endpoint, key, data) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('key', key);
    const response = await axios.post(`${url}${endpoint}`, formData);
    return response.data;
}
