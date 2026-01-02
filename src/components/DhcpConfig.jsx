import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Network, Plus, Trash2, Edit, ChevronDown, ChevronRight, Server } from 'lucide-react';
import clsx from 'clsx';

export default function DhcpConfig() {
    const { data, isLoading, refetch } = useVyosOperational(
        ['service', 'dhcp-server', 'shared-network-name'],
        ['service', 'dhcp-server'],
        'showConfig'
    );

    // State for expanded networks
    const [expanded, setExpanded] = useState({});

    const toggleExpand = (name) => {
        setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Transform data object to array
    const networks = data ? Object.entries(data).map(([name, config]) => ({
        name,
        description: config.description || '',
        subnets: config.subnet ? Object.entries(config.subnet).map(([cidr, subConfig]) => ({
            cidr,
            ...subConfig
        })) : []
    })) : [];

    if (isLoading) {
        return <div className="text-slate-500 py-8 text-center">Loading DHCP configuration...</div>;
    }

    if (networks.length === 0) {
        return (
            <div className="text-center py-12">
                <Server className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No DHCP Networks Configured</h3>
                <p className="text-slate-500 mt-2 mb-6">Create a shared network to start serving IP addresses.</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium inline-flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Network
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white">Shared Networks</h2>
                <button className="px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-sm font-medium flex items-center">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Network
                </button>
            </div>

            <div className="space-y-4">
                {networks.map((net) => (
                    <div key={net.name} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                        {/* Network Header */}
                        <div
                            className="px-4 py-3 bg-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-700/80 transition-colors"
                            onClick={() => toggleExpand(net.name)}
                        >
                            <div className="flex items-center">
                                {expanded[net.name] ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />}
                                <Network className="w-5 h-5 text-blue-400 mr-3" />
                                <div>
                                    <h3 className="font-medium text-white">{net.name}</h3>
                                    {net.description && <p className="text-xs text-slate-400">{net.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">
                                    {net.subnets.length} Subnets
                                </span>
                            </div>
                        </div>

                        {/* Subnets List */}
                        {expanded[net.name] && (
                            <div className="p-4 space-y-3 bg-slate-900/30">
                                {net.subnets.length === 0 && (
                                    <div className="text-sm text-slate-500 italic px-2">No subnets defined.</div>
                                )}
                                {net.subnets.map(subnet => (
                                    <div key={subnet.cidr} className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center group">
                                        <div className="flex items-center">
                                            <div className="mr-3 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-mono">
                                                {subnet.cidr}
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">
                                                    Range: {subnet.range ? Object.values(subnet.range).map(r => `${r.start}-${r.stop}`).join(', ') : 'None'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Gateway: {subnet['default-router'] || '-'} | DNS: {subnet['name-server'] || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-400">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-2 border border-dashed border-slate-700 rounded text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 text-sm transition-all flex items-center justify-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Subnet to {net.name}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
