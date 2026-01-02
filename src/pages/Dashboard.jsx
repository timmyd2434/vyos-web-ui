import clsx from 'clsx';
import { Activity, Cpu, HardDrive, Network } from 'lucide-react';
import { useVyosOperational } from '../hooks/useVyosData';
import { parseShowInterfaces } from '../utils/parsers';

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
    // 1.5 API handling: 'show system image' or 'show version'
    const { data: versionData } = useVyosOperational(['system', 'version'], ['version']);

    // For 1.5, getting structured generic system stats (CPU/RAM) via API is tricky without specific "show" commands that return JSON.
    // We will leave placeholders but mark them as N/A until we implement specific parsers.
    const cpuUsage = "N/A";
    const memUsage = "N/A";
    const diskUsage = "N/A";

    // 1. Config Data (Source of Truth for existence)
    const { data: configData, isLoading: configLoading } = useVyosOperational(['interfaces', 'summary'], ['interfaces'], 'showConfig');

    // 2. Operational Data (Source of Truth for Real IP / Link State)
    // We treat this as "enhancement" data. If it fails or parses poorly, we fall back to config.
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
    const opInterfaces = parseShowInterfaces(opData);

    // Merge: Config + Op
    const interfaces = flattenConfig(configData).map(conf => {
        // Find matching operational data
        const op = opInterfaces.find(o => o.name === conf.name);

        return {
            ...conf,
            // Use Op address if available and valid, otherwise Config address
            displayAddress: (op && op.address && op.address.length > 0) ? op.address : conf.address,
            // Use Op state (u/u) if available, otherwise config 'disable' check
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
                        {/* Try to extract version string if raw text returned */}
                        {JSON.stringify(versionData) || "VyOS 1.5"}
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
                    subtext="Waiting for implementation"
                />
                <StatCard
                    title="Memory"
                    value={memUsage}
                    icon={Activity}
                    color="emerald"
                    subtext="Waiting for implementation"
                />
                <StatCard
                    title="Storage"
                    value={diskUsage}
                    icon={HardDrive}
                    color="purple"
                    subtext="Waiting for implementation"
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
        </div>
    );
}
