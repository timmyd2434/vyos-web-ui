import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Activity, Plus, Trash2, Edit, Network } from 'lucide-react';
import WanRuleEditor from '../components/WanRuleEditor';
import clsx from 'clsx';

export default function LoadBalancing() {
    const queryClient = useQueryClient();

    const { data: lbConfig, isLoading, error, refetch } = useVyosOperational(
        ['load-balancing'],
        ['load-balancing'],
        'showConfig'
    );

    const { addChange, commit } = useConfig();

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Parse load balancing config
    const parseConfig = (data) => {
        if (!data || !data.wan) return { interfaces: [], rules: [] };

        const interfaces = [];
        const rules = [];

        // Parse interfaces
        if (data.wan?.['interface-health']) {
            Object.entries(data.wan['interface-health']).forEach(([ifaceName, ifaceConfig]) => {
                interfaces.push({
                    name: ifaceName,
                    nexthop: ifaceConfig.nexthop,
                    failureCount: ifaceConfig['failure-count'] || '1',
                    successCount: ifaceConfig['success-count'] || '1',
                    tests: ifaceConfig.test || {}
                });
            });
        }

        // Parse rules
        if (data.wan?.rule) {
            Object.entries(data.wan.rule).forEach(([ruleNum, ruleConfig]) => {
                rules.push({
                    number: ruleNum,
                    ...ruleConfig
                });
            });
            rules.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        }

        return { interfaces, rules };
    };

    const { interfaces, rules } = parseConfig(lbConfig);

    // Handlers
    const handleDeleteInterface = async (iface) => {
        if (!confirm(`Remove interface ${iface.name} from load balancing?`)) return;

        const ops = [{
            op: 'delete',
            path: ['load-balancing', 'wan', 'interface-health', iface.name]
        }];

        addChange(`Remove ${iface.name} from WAN load balancing`, ops);

        const success = await commit();
        if (success) await refetch();
    };

    const handleDeleteRule = async (rule) => {
        if (!confirm(`Delete rule ${rule.number}?`)) return;

        const ops = [{
            op: 'delete',
            path: ['load-balancing', 'wan', 'rule', rule.number]
        }];

        addChange(`Delete WAN load balancing rule ${rule.number}`, ops);

        const success = await commit();
        if (success) await refetch();
    };

    const handleSaveRule = async (ruleData) => {
        const { number, description, inboundInterface, interfaces: ruleInterfaces } = ruleData;

        const ops = [];
        const basePath = ['load-balancing', 'wan', 'rule', number];

        if (description) {
            ops.push({
                op: 'set',
                path: [...basePath, 'description', description]
            });
        }

        if (inboundInterface) {
            ops.push({
                op: 'set',
                path: [...basePath, 'inbound-interface', inboundInterface]
            });
        }

        // Add interfaces with optional weight
        if (ruleInterfaces && ruleInterfaces.length > 0) {
            ruleInterfaces.forEach(iface => {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'interface', iface.name]
                });

                if (iface.weight && iface.weight !== '1') {
                    ops.push({
                        op: 'set',
                        path: [...basePath, 'interface', iface.name, 'weight', iface.weight]
                    });
                }
            });
        }

        const desc = editingRule
            ? `Edit WAN LB rule ${number}`
            : `Create WAN LB rule ${number}`;

        addChange(desc, ops);

        const success = await commit();
        if (success) await refetch();

        setEditorOpen(false);
        setEditingRule(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">WAN Load Balancing</h1>
                    <p className="text-slate-400">Distribute traffic across multiple WAN connections with failover</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRule(null);
                        setEditorOpen(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                </button>
            </div>

            {/* Interfaces Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Network className="w-5 h-5 mr-2 text-green-400" />
                    WAN Interfaces
                </h2>

                {isLoading ? (
                    <div className="text-center text-slate-400 py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        Loading...
                    </div>
                ) : interfaces.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No interfaces configured</p>
                        <p className="text-sm mt-2">Configure interface health checks using CLI:</p>
                        <code className="text-xs text-blue-400 mt-2 block">
                            set load-balancing wan interface-health eth0 nexthop 'dhcp'
                        </code>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {interfaces.map((iface) => (
                            <div
                                key={iface.name}
                                className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Network className="w-5 h-5 text-cyan-400" />
                                        <span className="font-mono font-semibold text-white">{iface.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteInterface(iface)}
                                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Nexthop:</span>
                                        <span className="text-slate-300 font-mono">{iface.nexthop}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Failure/Success:</span>
                                        <span className="text-slate-300">{iface.failureCount} / {iface.successCount}</span>
                                    </div>
                                    {Object.keys(iface.tests).length > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Health checks:</span>
                                            <span className="text-green-400">{Object.keys(iface.tests).length} configured</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rules Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Load Balancing Rules</h2>
                    <span className="text-sm text-slate-400">{rules.length} rules configured</span>
                </div>

                <div className="p-4">
                    {rules.length === 0 ? (
                        <div className="text-center text-slate-400 py-12">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No rules configured</p>
                            <p className="text-sm mt-2">Click "Add Rule" to create your first load balancing rule</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {rules.map((rule) => (
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
                                                {rule['inbound-interface'] && (
                                                    <div>
                                                        Inbound: <span className="text-cyan-400 font-mono">{rule['inbound-interface']}</span>
                                                    </div>
                                                )}
                                                {rule.interface && (
                                                    <div>
                                                        WAN Interfaces: {' '}
                                                        {typeof rule.interface === 'object'
                                                            ? Object.entries(rule.interface).map(([name, config], idx) => (
                                                                <span key={name} className="text-green-400 font-mono">
                                                                    {name}
                                                                    {config?.weight && ` (weight: ${config.weight})`}
                                                                    {idx < Object.keys(rule.interface).length - 1 && ', '}
                                                                </span>
                                                            ))
                                                            : <span className="text-green-400 font-mono">{rule.interface}</span>
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingRule(rule);
                                                    setEditorOpen(true);
                                                }}
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
            </div>

            {/* Rule Editor */}
            {editorOpen && (
                <WanRuleEditor
                    isOpen={editorOpen}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingRule(null);
                    }}
                    onSave={handleSaveRule}
                    rule={editingRule}
                    availableInterfaces={interfaces}
                />
            )}
        </div>
    );
}
