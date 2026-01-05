import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { GitBranch, Plus, Trash2, Edit, List } from 'lucide-react';
import PolicyRuleEditor from '../components/PolicyRuleEditor';
import clsx from 'clsx';

export default function PolicyRouting() {
    const { data: policyConfig, isLoading, error, refetch } = useVyosOperational(
        ['policy'],
        ['policy'],
        'showConfig'
    );

    const { addChange, commit } = useConfig();

    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Parse policy route configurations
    const parsePolicies = (data) => {
        if (!data || typeof data !== 'object') return [];

        const policies = [];

        // IPv4 policies
        if (data.route && typeof data.route === 'object') {
            Object.entries(data.route).forEach(([policyName, policyConfig]) => {
                policies.push({
                    name: policyName,
                    type: 'route',
                    config: policyConfig,
                    rules: parseRules(policyConfig.rule)
                });
            });
        }

        // IPv6 policies
        if (data.route6 && typeof data.route6 === 'object') {
            Object.entries(data.route6).forEach(([policyName, policyConfig]) => {
                policies.push({
                    name: policyName,
                    type: 'route6',
                    config: policyConfig,
                    rules: parseRules(policyConfig.rule)
                });
            });
        }

        return policies;
    };

    const parseRules = (rulesData) => {
        if (!rulesData || typeof rulesData !== 'object') return [];

        return Object.entries(rulesData).map(([ruleNum, ruleConfig]) => ({
            number: ruleNum,
            ...ruleConfig
        })).sort((a, b) => parseInt(a.number) - parseInt(b.number));
    };

    const policies = parsePolicies(policyConfig);

    // Handlers
    const handleCreatePolicy = () => {
        const name = prompt('Enter policy name:');
        if (!name) return;

        const type = confirm('IPv6 policy? (Cancel for IPv4)') ? 'route6' : 'route';

        const ops = [{
            op: 'set',
            path: ['policy', type, name]
        }];

        addChange(`Create ${type === 'route6' ? 'IPv6' : 'IPv4'} policy ${name}`, ops);
    };

    const handleDeletePolicy = (policy) => {
        if (!confirm(`Delete policy "${policy.name}"?`)) return;

        const ops = [{
            op: 'delete',
            path: ['policy', policy.type, policy.name]
        }];

        addChange(`Delete policy ${policy.name}`, ops);

        if (selectedPolicy?.name === policy.name) {
            setSelectedPolicy(null);
        }
    };

    const handleCreateRule = () => {
        if (!selectedPolicy) {
            alert('Select a policy first');
            return;
        }

        setEditingRule(null);
        setEditorOpen(true);
    };

    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setEditorOpen(true);
    };

    const handleDeleteRule = (rule) => {
        if (!confirm(`Delete rule ${rule.number}?`)) return;

        const ops = [{
            op: 'delete',
            path: ['policy', selectedPolicy.type, selectedPolicy.name, 'rule', rule.number]
        }];

        addChange(`Delete rule ${rule.number} from ${selectedPolicy.name}`, ops);
    };

    const handleSaveRule = async (ruleData) => {
        const { number, description, action, sourceAddress, destinationAddress,
            protocol, destinationPort, table, mark } = ruleData;

        const ops = [];
        const basePath = ['policy', selectedPolicy.type, selectedPolicy.name, 'rule', number];

        // Description
        if (description) {
            ops.push({
                op: 'set',
                path: [...basePath, 'description', description]
            });
        }

        // Source address
        if (sourceAddress) {
            ops.push({
                op: 'set',
                path: [...basePath, 'source', 'address', sourceAddress]
            });
        }

        // Destination address
        if (destinationAddress) {
            ops.push({
                op: 'set',
                path: [...basePath, 'destination', 'address', destinationAddress]
            });
        }

        // Protocol
        if (protocol && protocol !== 'all') {
            ops.push({
                op: 'set',
                path: [...basePath, 'protocol', protocol]
            });
        }

        // Destination port
        if (destinationPort) {
            ops.push({
                op: 'set',
                path: [...basePath, 'destination', 'port', destinationPort]
            });
        }

        // Actions
        if (action === 'drop') {
            ops.push({
                op: 'set',
                path: [...basePath, 'action', 'drop']
            });
        } else if (action === 'table' && table) {
            ops.push({
                op: 'set',
                path: [...basePath, 'set', 'table', table]
            });
        } else if (action === 'mark' && mark) {
            ops.push({
                op: 'set',
                path: [...basePath, 'set', 'mark', mark]
            });
        }

        const description_text = editingRule
            ? `Edit rule ${number}`
            : `Add rule ${number} to ${selectedPolicy.name}`;

        addChange(description_text, ops);

        // Commit the changes immediately and refetch
        const success = await commit();
        if (success) {
            // Wait a moment for VyOS to process, then refetch
            setTimeout(() => {
                refetch();
            }, 500);
        }

        setEditorOpen(false);
        setEditingRule(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Policy-Based Routing</h1>
                    <p className="text-slate-400">Route traffic based on source, destination, and other criteria</p>
                </div>
                <button
                    onClick={handleCreatePolicy}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Policy
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Policies List */}
                <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <List className="w-5 h-5 mr-2 text-blue-400" />
                        Policies
                    </h2>

                    {isLoading ? (
                        <div className="text-center text-slate-400 py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            Loading...
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">No policies configured</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {policies.map((policy) => (
                                <div
                                    key={`${policy.type}-${policy.name}`}
                                    onClick={() => setSelectedPolicy(policy)}
                                    className={clsx(
                                        "p-3 rounded-lg cursor-pointer transition-colors",
                                        selectedPolicy?.name === policy.name
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-medium">{policy.name}</div>
                                            <div className="text-xs opacity-75">
                                                {policy.type === 'route6' ? 'IPv6' : 'IPv4'} • {policy.rules.length} rules
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePolicy(policy);
                                            }}
                                            className="p-1 hover:bg-red-600/20 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rules List */}
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl">
                    {selectedPolicy ? (
                        <>
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">{selectedPolicy.name}</h2>
                                    <p className="text-sm text-slate-400">{selectedPolicy.rules.length} rules configured</p>
                                </div>
                                <button
                                    onClick={handleCreateRule}
                                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Rule
                                </button>
                            </div>

                            <div className="p-4">
                                {selectedPolicy.rules.length === 0 ? (
                                    <div className="text-center text-slate-400 py-12">
                                        <p>No rules configured</p>
                                        <p className="text-sm mt-2">Click "Add Rule" to create your first rule</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-800">
                                        {selectedPolicy.rules.map((rule) => (
                                            <div
                                                key={rule.number}
                                                className="p-4 hover:bg-slate-800/50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-blue-400 font-mono font-semibold">
                                                                #{rule.number}
                                                            </span>
                                                            {rule.description && (
                                                                <span className="text-white font-medium">
                                                                    {rule.description}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 text-sm text-slate-400">
                                                            {rule.source?.address && (
                                                                <div>Source: <span className="text-slate-300 font-mono">{rule.source.address}</span></div>
                                                            )}
                                                            {rule.destination?.address && (
                                                                <div>Destination: <span className="text-slate-300 font-mono">{rule.destination.address}</span></div>
                                                            )}
                                                            {rule.protocol && (
                                                                <div>Protocol: <span className="text-purple-400 uppercase">{rule.protocol}</span></div>
                                                            )}
                                                            {rule.set?.table && (
                                                                <div>Action: <span className="text-green-400">Set table {rule.set.table}</span></div>
                                                            )}
                                                            {rule.action?.drop && (
                                                                <div>Action: <span className="text-red-400">Drop</span></div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEditRule(rule)}
                                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRule(rule)}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                            <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">Select a policy to view its rules</p>
                            <p className="text-sm mt-2">Or create a new policy to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Rule Editor */}
            {editorOpen && selectedPolicy && (
                <PolicyRuleEditor
                    isOpen={editorOpen}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingRule(null);
                    }}
                    onSave={handleSaveRule}
                    rule={editingRule}
                    policyType={selectedPolicy.type}
                />
            )}
        </div>
    );
}
