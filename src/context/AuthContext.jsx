import { createContext, useContext, useState, useEffect } from 'react';
import { retrieve } from '../services/vyosApi';
import { parseVersion, detectFeatures } from '../utils/versionHelpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [connection, setConnection] = useState(() => {
        // Use sessionStorage instead of localStorage for better security
        // Credentials will clear when browser tab closes
        const stored = sessionStorage.getItem('vyos_connection');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (url, key) => {
        setLoading(true);
        setError(null);
        try {
            // Clean and normalize URL
            let cleanUrl = url.trim();

            // Auto-prepend https:// if no protocol specified
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
            }

            // Remove trailing slash
            cleanUrl = cleanUrl.replace(/\/$/, '');

            // Verify connection by fetching basic system info
            const response = await retrieve(cleanUrl, key, {
                op: 'showConfig',
                path: ['system', 'host-name']
            });

            if (!response || response.success === false) {
                throw new Error(response?.error || 'Authentication failed - Unable to connect to router');
            }

            // Detect VyOS version and available features
            let version = 'Unknown';
            let features = detectFeatures('Unknown');

            try {
                const versionResponse = await retrieve(cleanUrl, key, {
                    op: 'show',
                    path: ['version']
                });

                if (versionResponse && versionResponse.data) {
                    version = parseVersion(versionResponse);
                    features = detectFeatures(version);
                    console.log('Detected VyOS version:', version);
                    console.log('Available features:', features);
                }
            } catch (versionErr) {
                // Version detection failed, continue with defaults
                console.warn('Could not detect VyOS version, using defaults:', versionErr);
            }

            const connData = {
                url: cleanUrl,
                key,
                version,
                features
            };
            setConnection(connData);
            sessionStorage.setItem('vyos_connection', JSON.stringify(connData));
            return true;
        } catch (err) {
            console.error("Login failed:", err);

            // Enhanced error messages for common issues
            let errorMessage = err.message || 'Failed to connect to VyOS router';

            // SSL/Certificate errors
            if (err.message?.includes('ERR_CERT') || err.message?.includes('certificate')) {
                errorMessage = 'SSL Certificate Error: Your router uses a self-signed certificate. '
                    + 'Please visit ' + url + ' in a new tab, click "Advanced", then "Proceed" to trust the certificate, '
                    + 'then try logging in again.';
            }
            // Network timeout
            else if (err.message?.includes('timeout') || err.message?.includes('ECONNABORTED')) {
                errorMessage = 'Connection timeout: Unable to reach router. '
                    + 'Verify the IP address is correct and the router is powered on.';
            }
            // Network unreachable
            else if (err.message?.includes('ERR_NETWORK') || err.message?.includes('Network error')) {
                errorMessage = 'Network error: Cannot reach ' + url + '. '
                    + 'Ensure you are connected to the same network as the router.';
            }
            // Authentication/API errors   
            else if (err.response?.status === 401) {
                errorMessage = 'Authentication failed: Invalid API key. '
                    + 'Please check your API key and try again.';
            }
            else if (err.response?.status === 404) {
                errorMessage = 'API not found: The VyOS HTTP API may not be enabled on this router. '
                    + 'Enable it with: set service https api';
            }

            setError(errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setConnection(null);
        sessionStorage.removeItem('vyos_connection');
    };

    return (
        <AuthContext.Provider value={{ connection, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
