import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Shield, Plus, Filter, ChevronRight, Lock, Upload, Download, AlertTriangle } from 'lucide-react';
import ChainEditor from '../components/ChainEditor';

export default function Firewall() {
    // Query the new VyOS 1.5+ structure
    const { data: ipv4Data, isLoading: ipv4Loading, refetch: refetchIpv4 } = useVyosOperational(
        ['firewall', 'ipv4'],
        ['firewall', 'ipv4'],
        'showConfig',
        { refetchInterval: false }
    );

    const [selectedChain, setSelectedChain] = useState(null);

    // Parse base chains from VyOS data
    const getBaseChains = (data) => {
        if (!data) return [];

        const chains = [];

        // Forward filter (transit traffic)
        if (data.forward?.filter) {
            chains.push({
                id: 'forward-filter',
                name: 'Forward Filter',
                description: 'Filter transit traffic passing through the router',
                icon: Filter,
                chainPath: ['ipv4', 'forward', 'filter'],
                defaultAction: data.forward.filter['default-action'] || 'accept',
                rules: Object.keys(data.forward.filter.rule || {}).length,
                rawData: data.forward.filter,
                type: 'base'
            });
        }

        // Input filter (traffic to router)
        if (data.input?.filter) {
            chains.push({
                id: 'input-filter',
                name: 'Input Filter',
                description: 'Filter traffic destined for the router itself',
                icon: Download,
                chainPath: ['ipv4', 'input', 'filter'],
                defaultAction: data.input.filter['default-action'] || 'accept',
                rules: Object.keys(data.input.filter.rule || {}).length,
                rawData: data.input.filter,
                type: 'base'
            });
        }

        // Output filter (traffic from router)
        if (data.output?.filter) {
            chains.push({
                id: 'output-filter',
                name: 'Output Filter',
                description: 'Filter traffic originating from the router',
                icon: Upload,
                chainPath: ['ipv4', 'output', 'filter'],
                defaultAction: data.output.filter['default-action'] || 'accept',
                rules: Object.keys(data.output.filter.rule || {}).length,
                rawData: data.output.filter,
                type: 'base'
            });
        }

        return chains;
    };

    // Parse custom chains
    const getCustomChains = (data) => {
        if (!data?.name) return [];

        return Object.entries(data.name).map(([chainName, config]) => ({
            id: `custom-${chainName}`,
            name: chainName,
            description: config.description || 'Custom firewall chain',
            icon: Lock,
            chainPath: ['ipv4', 'name', chainName],
            defaultAction: config['default-action'] || 'drop',
            rules: Object.keys(config.rule || {}).length,
            rawData: config,
            type: 'custom'
        }));
    };

    const baseChains = getBaseChains(ipv4Data);
    const customChains = getCustomChains(ipv4Data);

    // If viewing a specific chain, show the editor
    if (selectedChain) {
        return (
            <ChainEditor
                chain={selectedChain}
                onBack={() => {
                    setSelectedChain(null);
                    refetchIpv4();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Firewall</h1>
                    <p className="text-slate-400">IPv4 packet filtering and traffic control</p>
                </div>
            </div>

            {/* Warning if no firewall configured */}
            {baseChains.length === 0 && customChains.length === 0 && !ipv4Loading && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-yellow-500 font-medium">No Firewall Configured</h3>
                        <p className="text-yellow-500/80 text-sm mt-1">
                            Your router is currently accepting all traffic. Configure firewall rules to secure your network.
                            Start by creating rules in the Forward Filter to control transit traffic.
                        </p>
                    </div>
                </div>
            )}

            {/* Base Chains Section */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Base Firewall Chains</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {ipv4Loading && (
                        <div className="col-span-full text-slate-500 text-center py-8">
                            Loading firewall configuration...
                        </div>
                    )}

                    {baseChains.length === 0 && !ipv4Loading && (
                        <div className="col-span-full py-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
                            <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No Base Chains Configured</h3>
                            <p className="text-slate-500 mt-2 text-sm">
                                Base chains will appear here once you configure firewall rules in VyOS.
                            </p>
                        </div>
                    )}

                    {baseChains.map((chain) => {
                        const Icon = chain.icon;
                        return (
                            <div
                                key={chain.id}
                                onClick={() => setSelectedChain(chain)}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all group cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-blue-500/10 p-3 rounded-lg">
                                        <Icon className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${chain.defaultAction === 'accept'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400'
                                        }`}>
                                        {chain.defaultAction}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">{chain.name}</h3>
                                <p className="text-sm text-slate-400 mb-4">{chain.description}</p>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center text-slate-500">
                                        <Filter className="w-4 h-4 mr-2" />
                                        {chain.rules} {chain.rules === 1 ? 'Rule' : 'Rules'}
                                    </div>
                                    <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                        Manage
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom Chains Section */}
            {customChains.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Custom Chains</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {customChains.map((chain) => {
                            const Icon = chain.icon;
                            return (
                                <div
                                    key={chain.id}
                                    onClick={() => setSelectedChain(chain)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-purple-500/10 p-3 rounded-lg">
                                            <Icon className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${chain.defaultAction === 'accept'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {chain.defaultAction}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2">{chain.name}</h3>
                                    <p className="text-sm text-slate-400 mb-4">{chain.description}</p>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-slate-500">
                                            <Filter className="w-4 h-4 mr-2" />
                                            {chain.rules} {chain.rules === 1 ? 'Rule' : 'Rules'}
                                        </div>
                                        <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                            Manage
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
