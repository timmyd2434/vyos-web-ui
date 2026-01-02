import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Shield, Plus, Filter, Info } from 'lucide-react';
import RuleBuilder from '../components/RuleBuilder';

export default function Firewall() {
    const { data: config, isLoading, refetch } = useVyosOperational(
        ['firewall', 'config'],
        ['firewall']
    );

    const [selectedRuleset, setSelectedRuleset] = useState(null);

    // We'll need to parse the config to get rulesets
    // Structure: { firewall: { name: { "WAN-IN": { rule: { ... } } } } } => firewall.name

    const getRulesets = (data) => {
        if (!data?.name) return [];
        return Object.entries(data.name).map(([name, config]) => ({
            name,
            description: config.description || '',
            defaultAction: config['default-action'] || 'drop',
            rules: Object.keys(config.rule || {}).length,
            rawData: config, // Pass raw config to builder
        }));
    };

    const rulesets = getRulesets(config);

    if (selectedRuleset) {
        return (
            <RuleBuilder
                rulesetName={selectedRuleset.name}
                rulesetData={selectedRuleset.rawData}
                onBack={() => {
                    setSelectedRuleset(null);
                    refetch(); // refresh data when returning
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Firewall</h1>
                    <p className="text-slate-400">Rulesets and Traffic Filtering</p>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
                    <Plus className="w-4 h-4" />
                    <span>Add Ruleset</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && <div className="text-slate-500">Loading firewall configuration...</div>}

                {!isLoading && rulesets.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
                        <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">No Rulesets Defined</h3>
                        <p className="text-slate-500 mt-2">Create a firewall ruleset to start filtering traffic.</p>
                    </div>
                )}

                {rulesets.map((rs) => (
                    <div
                        key={rs.name}
                        onClick={() => setSelectedRuleset(rs)}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{rs.name}</h3>
                                <p className="text-sm text-slate-400">{rs.description || "No description"}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase ${rs.defaultAction === 'accept' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                Default: {rs.defaultAction}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <div className="flex items-center">
                                <Filter className="w-4 h-4 mr-2" />
                                {rs.rules} Rules
                            </div>
                            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                Manage Rules &rarr;
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
