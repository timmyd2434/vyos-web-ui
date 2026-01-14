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
            // Clean URL
            const cleanUrl = url.replace(/\/$/, '');

            // Verify connection by fetching basic system info
            const response = await retrieve(cleanUrl, key, {
                op: 'showConfig',
                path: ['system', 'host-name']
            });

            if (response.success === false) {
                throw new Error(response.error || 'Authentication failed');
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
            setError(err.message || "Failed to connect to VyOS router");
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
