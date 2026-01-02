import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { configure } from '../services/vyosApi';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
    const { connection } = useAuth();
    const [pendingChanges, setPendingChanges] = useState([]);
    const [isCommitting, setIsCommitting] = useState(false);
    const [lastError, setLastError] = useState(null);

    const addChange = (description, ops) => {
        // ops can be a single op object or array of ops
        const newOps = Array.isArray(ops) ? ops : [ops];
        const change = {
            id: Date.now() + Math.random(),
            description,
            ops: newOps,
            timestamp: new Date().toISOString()
        };
        setPendingChanges(prev => [...prev, change]);
    };

    const removeChange = (id) => {
        setPendingChanges(prev => prev.filter(c => c.id !== id));
    };

    const discardAll = () => {
        setPendingChanges([]);
        setLastError(null);
    };

    const commit = async () => {
        if (pendingChanges.length === 0) return;

        setIsCommitting(true);
        setLastError(null);

        try {
            // Flatten all ops
            const allOps = pendingChanges.flatMap(c => c.ops);

            // Execute all changes
            // Note: In a real VyOS API we might validly send these as a batch
            // For now, we iterate, but batching is preferred if supported by the endpoint wrapper

            // We will assume our 'configure' helper can take a list of ops if modified, 
            // OR we just send them sequentially. 
            // The VyOS HTTP API usually expects ONE 'data' object which can be a list of commands.
            // Let's assume we can send the array of ops if we adjust the service slightly, 
            // OR we just send multiple requests. Sending multiple requests is safer for error reporting per-item 
            // but violates "transactional" atomicity if one fails halfway.

            // Best approach for Atomic Commit: Send ALL ops in one request if possible.
            // If the API supports it.

            // Let's assume we send them one by one for this prototype to ensure feedback.
            // But we will optimize later.

            for (const op of allOps) {
                const res = await configure(connection.url, connection.key, op);
                if (!res.success) {
                    throw new Error(`Failed to execute: ${JSON.stringify(op.path)} - ${res.error}`);
                }
            }

            // Explicit Save if needed? User usually requests "Save" separately.
            // We'll clear changes on success.
            setPendingChanges([]);
            return true;
        } catch (err) {
            console.error(err);
            setLastError(err.message);
            return false;
        } finally {
            setIsCommitting(false);
        }
    };

    const saveConfig = async () => {
        // Calls 'save' op
        try {
            const res = await configure(connection.url, connection.key, { op: 'save' });
            if (!res.success) throw new Error(res.error);
            return true;
        } catch (err) {
            setLastError(err.message);
            return false;
        }
    };

    return (
        <ConfigContext.Provider value={{
            pendingChanges,
            addChange,
            removeChange,
            discardAll,
            commit,
            saveConfig,
            isCommitting,
            lastError
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
