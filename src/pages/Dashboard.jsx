import clsx from 'clsx';
import { Activity, Cpu, HardDrive, Network } from 'lucide-react';
import { useVyosOperational } from '../hooks/useVyosData';

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

    // Attempt to get interface structure - Using showConfig to get JSON tree
    const { data: interfacesData, isLoading: ifLoading } = useVyosOperational(['interfaces', 'summary'], ['interfaces'], 'showConfig');

    // Helpher to flatten: similar to Interfaces.jsx but streamlined
    const flattenInterfaces = (data) => {
        if (!data || typeof data !== 'object') return [];
        const flat = [];
        Object.keys(data).forEach(type => {
            // Check if data[type] is an object before iterating
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

    const interfaces = flattenInterfaces(interfacesData);
    const ifCount = interfaces.length;

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
                    {ifLoading ? (
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
                                            {Array.isArray(iface.address) ? iface.address[0] : (iface.address || "-")}
                                            {Array.isArray(iface.address) && iface.address.length > 1 && <span className="text-xs ml-1 opacity-50">+{iface.address.length - 1}</span>}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={clsx(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                (!iface.disable && iface.disable !== '')
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                            )}>
                                                {(!iface.disable && iface.disable !== '') ? "UP" : "DISABLED"}
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
