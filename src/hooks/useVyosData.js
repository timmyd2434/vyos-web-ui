import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { retrieve } from '../services/vyosApi';

/**
 * Hook for fetching VyOS operational and configuration data
 * @param {Array} keys - Query key array
 * @param {Array} command - Command path array
 * @param {string} opType - Operation type ('show' or 'showConfig')
 * @param {Object} options - Additional react-query options
 */
export const useVyosOperational = (keys, command, opType = 'show', options = {}) => {
    const { connection } = useAuth();

    // Context-aware refetch intervals
    // Operational data ('show'): Poll every 15 seconds for live metrics
    // Configuration data ('showConfig'): Don't poll, only refresh after commits
    const defaultRefetchInterval = opType === 'show' ? 15000 : false;

    return useQuery({
        queryKey: keys,
        queryFn: async () => {
            if (!connection) throw new Error("Not connected");

            const response = await retrieve(connection.url, connection.key, {
                op: opType,
                path: command,
            });

            if (!response.success && response.error) {
                console.error("VyOS API Error for:", command, response.error);
                throw new Error(response.error);
            }
            // console.log(`[VyOS] ${opType} ${JSON.stringify(command)} Result:`, response.data);
            return response.data;
        },
        enabled: !!connection,
        refetchInterval: defaultRefetchInterval, // 15s for metrics, false for config
        ...options, // Allow override in specific cases
    });
};
