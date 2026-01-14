import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { configure } from '../services/vyosApi';
import { useQueryClient } from '@tanstack/react-query';
import { validateCommand } from '../utils/commandValidator';
import { parseVyOSError } from '../utils/errorParser';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
    const { connection } = useAuth();
    const queryClient = useQueryClient();
    const [pendingChanges, setPendingChanges] = useState([]);
    const [isCommitting, setIsCommitting] = useState(false);
    const [lastError, setLastError] = useState(null);

    const addChange = (arg1, arg2) => {
        let description = 'Configuration Change';
        let ops;

        if (arg2) {
            // Called as (description, ops)
            description = arg1;
            ops = arg2;
        } else {
            // Called as (ops) only
            ops = arg1;
            // Generate basic description
            const firstOp = Array.isArray(ops) ? ops[0] : ops;
            if (firstOp && firstOp.path) {
                const pathStr = firstOp.path.length > 2 ? '...' + firstOp.path.slice(-2).join(' ') : firstOp.path.join(' ');
                description = `${firstOp.op.toUpperCase()} ${pathStr}`;
            }
        }

        const newOps = Array.isArray(ops) ? ops : [ops];

        // Validate all operations before staging
        for (const op of newOps) {
            const validation = validateCommand(op);
            if (!validation.valid) {
                const errorMsg = `Invalid command: ${validation.errors.join(', ')}`;
                console.error(errorMsg, op);
                throw new Error(errorMsg);
            }
        }

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
            // Flatten all ops into a single array
            const allOps = pendingChanges.flatMap(c => c.ops);

            // VyOS HTTP API supports batching multiple commands in a single request
            // This is CRITICAL for interdependent required fields (e.g., DNS forwarding's
            // listen-address and allow-from must both be present before committing)

            // Send all commands as a batch (array) in a single API call
            const res = await configure(connection.url, connection.key, allOps);

            if (!res.success) {
                throw new Error(`Failed to commit configuration: ${res.error}`);
            }

            // Clear changes on success
            setPendingChanges([]);

            // Invalidate all queries to trigger automatic refetch
            // This ensures all components show updated data after commits
            queryClient.invalidateQueries();

            return true;
        } catch (err) {
            console.error(err);
            // Use enhanced error parser for user-friendly messages
            const friendlyError = parseVyOSError(err);
            setLastError(friendlyError);
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
            const friendlyError = parseVyOSError(err);
            setLastError(friendlyError);
            return false;
        }
    };

    return (
        <ConfigContext.Provider value={{
            pendingChanges,
            addChange,           // Export both names for consistency
            stageCommand: addChange,
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
