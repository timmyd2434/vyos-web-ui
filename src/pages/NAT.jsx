import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { ArrowRightLeft, Plus, Trash2, Edit, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import NatRuleEditor from '../components/NatRuleEditor';
import clsx from 'clsx';

export default function NAT() {
    const { data: natConfig, isLoading, error } = useVyosOperational(
        ['nat'],
        ['nat'],
        'showConfig'
    );

    const { addChange } = useConfig();

    const [activeTab, setActiveTab] = useState('source'); // 'source' | 'destination'
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Parse NAT rules from VyOS config
    const parseNatRules = (data, type) => {
        if (!data || typeof data !== 'object') return [];

        const rules = [];
        const typeData = data?.[type]?.rule;

        if (!typeData || typeof typeData !== 'object') return [];

        Object.entries(typeData).forEach(([ruleNumber, ruleConfig]) => {
            if (ruleConfig && typeof ruleConfig === 'object') {
                const rule = {
                    number: ruleNumber,
                    description: ruleConfig.description || '',
                    disabled: ruleConfig.disable === '' || ruleConfig.disable === true,

                    // Interface
                    interface: type === 'source'
                        ? ruleConfig['outbound-interface']?.name
                        : ruleConfig['inbound-interface']?.name,

                    // Source filters
                    sourceAddress: ruleConfig.source?.address,
                    sourcePort: ruleConfig.source?.port,

                    // Destination filters
                    destinationAddress: ruleConfig.destination?.address,
                    destinationPort: ruleConfig.destination?.port,

                    // Protocol
                    protocol: ruleConfig.protocol,

                    // Translation
                    translationAddress: ruleConfig.translation?.address,
                    translationPort: ruleConfig.translation?.port,

                    // Metadata
                    type
                };

                rules.push(rule);
            }
        });

        // Sort by rule number
        return rules.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    };

    const sourceRules = parseNatRules(natConfig, 'source');
    const destinationRules = parseNatRules(natConfig, 'destination');
    const currentRules = activeTab === 'source' ? sourceRules : destinationRules;

    // Handlers
    const openCreateRule = () => {
        setEditingRule(null);
        setEditorOpen(true);
    };

    const openEditRule = (rule) => {
        setEditingRule(rule);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditingRule(null);
    };

    const handleDeleteRule = (rule) => {
        if (!confirm(`Delete ${rule.type === 'source' ? 'Source' : 'Destination'} NAT rule ${rule.number}?`)) return;

        const ops = [{
            op: 'delete',
            path: ['nat', rule.type, 'rule', rule.number]
        }];

        addChange(`Delete ${rule.type} NAT rule ${rule.number}`, ops);
    };

    const handleSaveRule = (ruleData) => {
        const { number, type, description, interface: iface, sourceAddress, sourcePort,
            destinationAddress, destinationPort, protocol, translationAddress, translationPort } = ruleData;

        const ops = [];
        const basePath = ['nat', type, 'rule', number];

        // If editing, delete old rule first if number changed
        if (editingRule && editingRule.number !== number) {
            ops.push({
                op: 'delete',
                path: ['nat', editingRule.type, 'rule', editingRule.number]
            });
        }

        // Interface (required)
        if (iface) {
            const interfaceKey = type === 'source' ? 'outbound-interface' : 'inbound-interface';
            ops.push({
                op: 'set',
                path: [...basePath, interfaceKey, 'name', iface]
            });
        }

        // Translation address (required)
        if (translationAddress) {
            ops.push({
                op: 'set',
                path: [...basePath, 'translation', 'address', translationAddress]
            });
        }

        // Protocol - MUST be set before ports
        if (protocol && protocol !== 'all') {
            ops.push({
                op: 'set',
                path: [...basePath, 'protocol', protocol]
            });
        }

        // Source address
        if (sourceAddress) {
            ops.push({
                op: 'set',
                path: [...basePath, 'source', 'address', sourceAddress]
            });
        }

        // Source port (only if protocol is set)
        if (sourcePort && protocol && protocol !== 'all') {
            ops.push({
                op: 'set',
                path: [...basePath, 'source', 'port', sourcePort]
            });
        }

        // Destination address
        if (destinationAddress) {
            ops.push({
                op: 'set',
                path: [...basePath, 'destination', 'address', destinationAddress]
            });
        }

        // Destination port (only if protocol is set)
        if (destinationPort && protocol && protocol !== 'all') {
            ops.push({
                op: 'set',
                path: [...basePath, 'destination', 'port', destinationPort]
            });
        }

        // Translation port (DNAT only)
        if (type === 'destination' && translationPort) {
            ops.push({
                op: 'set',
                path: [...basePath, 'translation', 'port', translationPort]
            });
        }

        // Description (optional, set last)
        if (description) {
            ops.push({
                op: 'set',
                path: [...basePath, 'description', description]
            });
        }

        const description_text = editingRule
            ? `Edit ${type} NAT rule ${number}`
            : `Add ${type} NAT rule ${number}`;

        addChange(description_text, ops);
        closeEditor();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Network Address Translation</h1>
                    <p className="text-slate-400">Configure Source NAT (masquerade) and Destination NAT (port forwarding)</p>
                </div>
                <button
                    onClick={openCreateRule}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add NAT Rule
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('source')}
                    className={clsx(
                        "px-4 py-3 font-medium transition-colors relative",
                        activeTab === 'source'
                            ? "text-blue-400"
                            : "text-slate-400 hover:text-slate-300"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" />
                        Source NAT
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                            {sourceRules.length}
                        </span>
                    </div>
                    {activeTab === 'source' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('destination')}
                    className={clsx(
                        "px-4 py-3 font-medium transition-colors relative",
                        activeTab === 'destination'
                            ? "text-blue-400"
                            : "text-slate-400 hover:text-slate-300"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4" />
                        Destination NAT
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                            {destinationRules.length}
                        </span>
                    </div>
                    {activeTab === 'destination' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                </button>
            </div>

            {/* Rules List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        Loading NAT rules...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-slate-400">
                        <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No NAT configuration found</p>
                        <p className="text-sm mt-2">Click "Add NAT Rule" to create your first NAT rule</p>
                    </div>
                ) : currentRules.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No {activeTab === 'source' ? 'Source' : 'Destination'} NAT rules configured</p>
                        <p className="text-sm mt-2">
                            {activeTab === 'source'
                                ? 'Source NAT (SNAT) translates the source address of outbound packets'
                                : 'Destination NAT (DNAT) forwards incoming traffic to internal hosts (port forwarding)'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {currentRules.map((rule) => (
                            <div
                                key={`${rule.type}-${rule.number}`}
                                className={clsx(
                                    "p-4 hover:bg-slate-800/50 transition-colors",
                                    rule.disabled && "opacity-50"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        {/* Rule Header */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-blue-400 font-mono font-semibold">
                                                #{rule.number}
                                            </span>
                                            {rule.description && (
                                                <span className="text-white font-medium">
                                                    {rule.description}
                                                </span>
                                            )}
                                            {rule.disabled && (
                                                <span className="px-2 py-1 bg-orange-900/30 text-orange-400 rounded text-xs font-medium">
                                                    DISABLED
                                                </span>
                                            )}
                                        </div>

                                        {/* Rule Details */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                            {/* Interface */}
                                            {rule.interface && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">
                                                        {rule.type === 'source' ? 'Out:' : 'In:'}
                                                    </span>
                                                    <span className="text-cyan-400 font-mono">
                                                        {rule.interface}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Source */}
                                            {(rule.sourceAddress || rule.sourcePort) && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">From:</span>
                                                    <span className="text-slate-300 font-mono">
                                                        {rule.sourceAddress || 'any'}
                                                        {rule.sourcePort && `:${rule.sourcePort}`}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Destination */}
                                            {(rule.destinationAddress || rule.destinationPort) && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">To:</span>
                                                    <span className="text-slate-300 font-mono">
                                                        {rule.destinationAddress || 'any'}
                                                        {rule.destinationPort && `:${rule.destinationPort}`}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Protocol */}
                                            {rule.protocol && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">Protocol:</span>
                                                    <span className="text-purple-400 font-mono uppercase text-xs font-semibold">
                                                        {rule.protocol}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Translation */}
                                            <div className="flex items-center gap-1.5">
                                                <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                                                <span className="text-green-400 font-mono">
                                                    {rule.translationAddress}
                                                    {rule.translationPort && `:${rule.translationPort}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditRule(rule)}
                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                            title="Edit rule"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRule(rule)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                            title="Delete rule"
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

            {/* Rule Editor */}
            {editorOpen && (
                <NatRuleEditor
                    isOpen={editorOpen}
                    onClose={closeEditor}
                    onSave={handleSaveRule}
                    rule={editingRule}
                    natType={activeTab}
                    existingRules={currentRules}
                />
            )}
        </div>
    );
}
