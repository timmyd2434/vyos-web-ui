import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { retrieve } from '../services/vyosApi';

export const useVyosOperational = (keys, command) => {
    const { connection } = useAuth();

    return useQuery({
        queryKey: keys,
        queryFn: async () => {
            if (!connection) throw new Error("Not connected");
            // Use 'show' op for operational mode commands
            // Note: Command structure varies by VyOS version. Assuming 1.4 API structure.
            // If path is array: { op: 'show', path: [...] }
            const response = await retrieve(connection.url, connection.key, {
                op: 'show',
                path: command
            });

            if (!response.success && response.error) {
                // Some endpoints return success: false but with data? rarely.
                throw new Error(response.error);
            }
            return response.data;
        },
        enabled: !!connection,
        refetchInterval: 5000, // Auto-refresh every 5s
    });
};
