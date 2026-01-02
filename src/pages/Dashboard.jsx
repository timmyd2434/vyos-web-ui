import clsx from 'clsx';
import { Activity, Cpu, HardDrive, Network } from 'lucide-react';
import { useVyosOperational } from '../hooks/useVyosData';
import { parseShowInterfaces, parseVersion, parseCpu, parseMemory, parseStorage } from '../utils/parsers';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
            </div>
        </div>
        <div className="flex items-baseline">
            <h2 className="text-3xl font-bold text-white mr-2">{value}</h2>
            <span className="text-xs text-slate-500">{subtext}</span>
        </div>
    </div>
);

export default function Dashboard() {
    // Queries
    // Version Info
    const { data: versionRaw } = useVyosOperational(['system', 'image'], ['version'], 'show');
    const versionDisplay = parseVersion(versionRaw);

    // System Stats (Text Parsing)
    const { data: cpuRaw } = useVyosOperational(['system', 'cpu'], ['system', 'cpu'], 'show');
    const { data: memRaw } = useVyosOperational(['system', 'memory'], ['system', 'memory'], 'show');
    // Try 'system storage usage' -> likely mapped to ['system', 'storage'] if that works, or we iterate.
    // Let's guess ['system', 'storage'] maps to 'show system storage' which is valid in 1.5? OR 'disk'.
    // If 'show system storage' is invalid, we might need a better guess. 'show system storage usage' 
    // likely map is ['system', 'storage', 'usage']
    const { data: storageRaw } = useVyosOperational(['system', 'storage', 'usage'], ['system', 'storage'], 'show');

    const cpuUsage = parseCpu(cpuRaw);
    const memUsage = parseMemory(memRaw);
    const diskUsage = parseStorage(storageRaw);

    // 1. Config Data (Source of Truth for existence)
    const { data: configData, isLoading: configLoading } = useVyosOperational(['interfaces', 'summary'], ['interfaces'], 'showConfig');

    // 2. Operational Data (Source of Truth for Real IP / Link State)
    const { data: opData } = useVyosOperational(['interfaces', 'operational'], ['interfaces'], 'show');

    // Helper to flatten Config JSON
    const flattenConfig = (data) => {
        if (!data || typeof data !== 'object') return [];
        const flat = [];
        Object.keys(data).forEach(type => {
            if (data[type] && typeof data[type] === 'object') {
                Object.keys(data[type]).forEach(name => {
                    flat.push({
                        type,
                        name,
                        ...data[type][name]
                    });
                });
            }
        });
        return flat;
    };

    // Parse Op Data
    // ... rest of code
    const opInterfaces = parseShowInterfaces(opData);

    const interfaces = flattenConfig(configData).map(conf => {
        const op = opInterfaces.find(o => o.name === conf.name);
        return {
            ...conf,
            displayAddress: (op && op.address && op.address.length > 0) ? op.address : conf.address,
            displayState: op ? op.statusLine : (!conf.disable ? 'UP' : 'DISABLED'),
            isOpUp: op ? (op.state === 'up') : (!conf.disable),
        };
    });

    const ifCount = interfaces.length;
    const isLoading = configLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Overview</h1>
                    <p className="text-slate-400">Real-time router metrics</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        {versionDisplay}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="CPU Usage"
                    value={cpuUsage}
                    icon={Cpu}
                    color="blue"
                    subtext={cpuUsage !== "N/A" ? "Load Load" : "Monitoring"}
                />
                <StatCard
                    title="Memory"
                    value={memUsage}
                    icon={Activity}
                    color="emerald"
                    subtext={memUsage !== "N/A" ? "Used RAM" : "Monitoring"}
                />
                <StatCard
                    title="Storage"
                    value={diskUsage}
                    icon={HardDrive}
                    color="purple"
                    subtext={diskUsage !== "N/A" ? "Disk /" : "Monitoring"}
                />
                <StatCard
                    title="Interfaces"
                    value={ifCount.toString()}
                    icon={Network}
                    color="orange"
                    subtext="Total Configured"
                />
            </div>

            {/* Interface List Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-medium text-white">Interface Status</h3>
                </div>
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-6 animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-800 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
                                    <th className="px-6 py-4">Interface</th>
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {interfaces.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-6 text-center text-slate-500">
                                            No interfaces found.
                                        </td>
                                    </tr>
                                )}
                                {interfaces.map((iface) => (
                                    <tr key={iface.name} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3 font-medium text-white">
                                            {iface.name}
                                            <span className="ml-2 text-xs font-normal text-slate-500 uppercase tracking-wider">{iface.type}</span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-400 font-mono text-sm">
                                            {Array.isArray(iface.displayAddress)
                                                ? iface.displayAddress.join(', ')
                                                : (iface.displayAddress || "-")}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={clsx(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                iface.isOpUp
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                            )}>
                                                {String(iface.displayState).toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {/* Debugging Raw Op Data */}
            <div className="bg-black/50 p-4 rounded text-xs font-mono text-green-400 overflow-auto max-h-40 space-y-4">
                <div>
                    <strong className="text-white block">Debug - CPU Raw:</strong>
                    <pre>{typeof cpuRaw === 'string' ? cpuRaw : JSON.stringify(cpuRaw)}</pre>
                </div>
                <div>
                    <strong className="text-white block">Debug - Memory Raw:</strong>
                    <pre>{typeof memRaw === 'string' ? memRaw : JSON.stringify(memRaw)}</pre>
                </div>
                <div>
                    <strong className="text-white block">Debug - Storage Raw:</strong>
                    <pre>{typeof storageRaw === 'string' ? storageRaw : JSON.stringify(storageRaw)}</pre>
                </div>
                <div>
                    <strong className="text-white block">Debug - Interfaces Op Data:</strong>
                    <pre>{typeof opData === 'string' ? opData : JSON.stringify(opData)}</pre>
                </div>
            </div>
        </div>
    );
}
