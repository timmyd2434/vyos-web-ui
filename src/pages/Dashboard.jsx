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
    const { data: systemData, isLoading: sysLoading } = useVyosOperational(['system', 'info'], ['version']);
    const { data: interfacesData, isLoading: ifLoading } = useVyosOperational(['interfaces', 'summary'], ['interfaces']);

    // Mock data for initial UI dev (replace with parsing logic later)
    const cpuUsage = "12%";
    const memUsage = "2.4 / 8 GB";
    const diskUsage = "45%";
    const uptime = systemData?.uptime || "Unknown";

    const ifCount = interfacesData ? Object.keys(interfacesData).length : 0;
    // Count 'up' interfaces
    // Note: parsing depends on actual JSON structure from VyOS

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Overview</h1>
                    <p className="text-slate-400">Real-time router metrics</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        {systemData?.version || "VyOS 1.4-rolling"}
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
                    subtext="4 Cores"
                />
                <StatCard
                    title="Memory"
                    value={memUsage}
                    icon={Activity}
                    color="emerald"
                    subtext="30% Used"
                />
                <StatCard
                    title="Storage"
                    value={diskUsage}
                    icon={HardDrive}
                    color="purple"
                    subtext="/boot"
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
                <div className="p-6">
                    {ifLoading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-800 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm">
                            {/* Placeholder for table */}
                            {!interfacesData && <p>No interface data available or connection failed.</p>}
                            {interfacesData && (
                                <pre className="font-mono text-xs bg-black/30 p-4 rounded-lg overflow-auto max-h-60">
                                    {JSON.stringify(interfacesData, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
