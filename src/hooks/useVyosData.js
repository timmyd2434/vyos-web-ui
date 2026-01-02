import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { retrieve } from '../services/vyosApi';

export const useVyosOperational = (keys, command, opType = 'show', options = {}) => {
    const { connection } = useAuth();

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
        refetchInterval: 5000, // Default to 5s, can be overridden by options
        ...options, // Merge custom options
    });
};
