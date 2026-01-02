import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { retrieve } from '../services/vyosApi';

export const useVyosOperational = (keys, command, opType = 'show') => {
    const { connection } = useAuth();

    return useQuery({
        queryKey: keys,
        queryFn: async () => {
            if (!connection) throw new Error("Not connected");

            const response = await retrieve(connection.url, connection.key, {
                op: opType,
                path: command,
                // Some versions do not support format: json for 'show', but 1.4+ usually does for config?
                // Let's try without format first or verify documentation.
                // Actually, op: "show" usually returns text.
                // op: "showConfig" usually returns JSON if we ask?
            });

            if (!response.success && response.error) {
                console.error("VyOS API Error for:", command, response.error);
                throw new Error(response.error);
            }
            console.log(`[VyOS] ${opType} ${JSON.stringify(command)} Result:`, response.data);
            return response.data;
        },
        enabled: !!connection,
        refetchInterval: 5000, // Auto-refresh every 5s
    });
};
