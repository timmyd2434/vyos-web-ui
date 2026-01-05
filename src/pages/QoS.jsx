import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Gauge, Plus, Trash2, Edit, Network, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import QosPolicyEditor from '../components/QosPolicyEditor';
import clsx from 'clsx';

export default function QoS() {
    const { data: qosConfig, isLoading, error } = useVyosOperational(
        ['qos'],
        ['qos'],
        'showConfig'
    );

    const { addChange } = useConfig();

    const [activeTab, setActiveTab] = useState('policies'); // 'policies' | 'interfaces'
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [selectedPolicyType, setSelectedPolicyType] = useState('shaper');

    // Parse QoS policies
    const parsePolicies = (data) => {
        if (!data || typeof data !== 'object') return [];

        const policies = [];
        const policyData = data?.policy;

        if (!policyData || typeof policyData !== 'object') return [];

        // Policy types: shaper, fq-codel, limiter, etc.
        Object.entries(policyData).forEach(([policyType, policiesOfType]) => {
            if (policiesOfType && typeof policiesOfType === 'object') {
                Object.entries(policiesOfType).forEach(([policyName, policyConfig]) => {
                    policies.push({
                        name: policyName,
                        type: policyType,
                        config: policyConfig
                    });
                });
            }
        });

        return policies;
    };

    // Parse interface assignments
    const parseInterfaceAssignments = (data) => {
        if (!data || typeof data !== 'object') return [];

        const assignments = [];
        const interfaceData = data?.interface;

        if (!interfaceData || typeof interfaceData !== 'object') return [];

        Object.entries(interfaceData).forEach(([interfaceName, ifaceConfig]) => {
            if (ifaceConfig && typeof ifaceConfig === 'object') {
                if (ifaceConfig.egress) {
                    assignments.push({
                        interface: interfaceName,
                        direction: 'egress',
                        policy: ifaceConfig.egress
                    });
                }
                if (ifaceConfig.ingress) {
                    assignments.push({
                        interface: interfaceName,
                        direction: 'ingress',
                        policy: ifaceConfig.ingress
                    });
                }
            }
        });

        return assignments;
    };

    const policies = parsePolicies(qosConfig);
    const interfaceAssignments = parseInterfaceAssignments(qosConfig);

    // Find where a policy is applied
    const getPolicyUsage = (policyName) => {
        return interfaceAssignments.filter(a => a.policy === policyName);
    };

    // Handlers
    const openCreatePolicy = (policyType) => {
        setSelectedPolicyType(policyType);
        setEditingPolicy(null);
        setEditorOpen(true);
    };

    const openEditPolicy = (policy) => {
        setEditingPolicy(policy);
        setSelectedPolicyType(policy.type);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditingPolicy(null);
    };

    const handleDeletePolicy = (policy) => {
        const usage = getPolicyUsage(policy.name);

        if (usage.length > 0) {
            const usageStr = usage.map(u => `${u.interface} (${u.direction})`).join(', ');
            if (!confirm(`This policy is applied to: ${usageStr}.\n\nDelete anyway? This will remove the policy from those interfaces.`)) {
                return;
            }

            // Remove interface assignments first
            const ops = usage.map(u => ({
                op: 'delete',
                path: ['qos', 'interface', u.interface, u.direction]
            }));

            // Then delete the policy
            ops.push({
                op: 'delete',
                path: ['qos', 'policy', policy.type, policy.name]
            });

            addChange(`Delete QoS policy ${policy.name} and remove from interfaces`, ops);
        } else {
            if (!confirm(`Delete QoS policy "${policy.name}"?`)) return;

            const ops = [{
                op: 'delete',
                path: ['qos', 'policy', policy.type, policy.name]
            }];

            addChange(`Delete QoS policy ${policy.name}`, ops);
        }
    };

    const handleDeleteAssignment = (assignment) => {
        if (!confirm(`Remove ${assignment.policy} from ${assignment.interface} ${assignment.direction}?`)) return;

        const ops = [{
            op: 'delete',
            path: ['qos', 'interface', assignment.interface, assignment.direction]
        }];

        addChange(`Remove QoS from ${assignment.interface} ${assignment.direction}`, ops);
    };

    const getPolicyTypeColor = (type) => {
        const colors = {
            'shaper': 'text-blue-400',
            'fq-codel': 'text-green-400',
            'limiter': 'text-orange-400',
            'priority-queue': 'text-purple-400',
            'fair-queue': 'text-cyan-400',
            'network-emulator': 'text-pink-400',
            'drop-tail': 'text-gray-400'
        };
        return colors[type] || 'text-slate-400';
    };

    const getPolicyTypeLabel = (type) => {
        const labels = {
            'shaper': 'Shaper',
            'fq-codel': 'FQ-CoDel',
            'limiter': 'Limiter',
            'priority-queue': 'Priority Queue',
            'fair-queue': 'Fair Queue',
            'network-emulator': 'Network Emulator',
            'drop-tail': 'Drop Tail'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Quality of Service (QoS)</h1>
                    <p className="text-slate-400">Configure traffic policies and bandwidth management</p>
                </div>
                <div className="relative group">
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Policy
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>

                    {/* Dropdown menu for policy types */}
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="p-2">
                            <button
                                onClick={() => openCreatePolicy('shaper')}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded transition-colors"
                            >
                                <span className="font-medium text-blue-400">Shaper</span>
                                <p className="text-xs text-slate-400 mt-0.5">Bandwidth limiting & traffic shaping</p>
                            </button>
                            <button
                                onClick={() => openCreatePolicy('fq-codel')}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded transition-colors"
                            >
                                <span className="font-medium text-green-400">FQ-CoDel</span>
                                <p className="text-xs text-slate-400 mt-0.5">Fair queuing with controlled delay</p>
                            </button>
                            <button
                                onClick={() => openCreatePolicy('limiter')}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded transition-colors"
                            >
                                <span className="font-medium text-orange-400">Limiter</span>
                                <p className="text-xs text-slate-400 mt-0.5">Ingress policing & rate limiting</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('policies')}
                    className={clsx(
                        "px-4 py-3 font-medium transition-colors relative",
                        activeTab === 'policies'
                            ? "text-blue-400"
                            : "text-slate-400 hover:text-slate-300"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        Policies
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                            {policies.length}
                        </span>
                    </div>
                    {activeTab === 'policies' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('interfaces')}
                    className={clsx(
                        "px-4 py-3 font-medium transition-colors relative",
                        activeTab === 'interfaces'
                            ? "text-blue-400"
                            : "text-slate-400 hover:text-slate-300"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        Interface Assignments
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                            {interfaceAssignments.length}
                        </span>
                    </div>
                    {activeTab === 'interfaces' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        Loading QoS configuration...
                    </div>
                ) : activeTab === 'policies' ? (
                    policies.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No QoS policies configured</p>
                            <p className="text-sm mt-2">Create a policy to manage traffic and bandwidth</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {policies.map((policy) => {
                                const usage = getPolicyUsage(policy.name);
                                return (
                                    <div
                                        key={`${policy.type}-${policy.name}`}
                                        className="p-4 hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                {/* Policy Header */}
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx("font-semibold", getPolicyTypeColor(policy.type))}>
                                                        {getPolicyTypeLabel(policy.type)}
                                                    </span>
                                                    <span className="text-white font-medium">
                                                        {policy.name}
                                                    </span>
                                                    {usage.length > 0 && (
                                                        <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">
                                                            {usage.length} interface{usage.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Policy Details */}
                                                {policy.config.bandwidth && (
                                                    <div className="text-sm text-slate-400">
                                                        Bandwidth: <span className="text-slate-300">{policy.config.bandwidth}</span>
                                                    </div>
                                                )}

                                                {/* Where it's applied */}
                                                {usage.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        <span className="text-slate-500">Applied to:</span>
                                                        {usage.map((u, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono text-xs"
                                                            >
                                                                {u.interface}
                                                                {u.direction === 'egress' ? (
                                                                    <ArrowUpRight className="w-3 h-3 text-blue-400" />
                                                                ) : (
                                                                    <ArrowDownLeft className="w-3 h-3 text-orange-400" />
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditPolicy(policy)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                                    title="Edit policy"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePolicy(policy)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                                    title="Delete policy"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    // Interface Assignments Tab
                    interfaceAssignments.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No QoS policies applied to interfaces</p>
                            <p className="text-sm mt-2">Create and edit policies to apply them to interfaces</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {interfaceAssignments.map((assignment, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Network className="w-5 h-5 text-cyan-400" />

                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-white font-medium">
                                                    {assignment.interface}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {assignment.direction === 'egress' ? (
                                                        <>
                                                            <ArrowUpRight className="w-4 h-4 text-blue-400" />
                                                            <span className="text-xs text-slate-500 uppercase">Egress</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowDownLeft className="w-4 h-4 text-orange-400" />
                                                            <span className="text-xs text-slate-500 uppercase">Ingress</span>
                                                        </>
                                                    )}
                                                </div>

                                                <ChevronRight className="w-4 h-4 text-slate-600" />

                                                <span className="text-slate-300">
                                                    {assignment.policy}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteAssignment(assignment)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                            title="Remove assignment"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Policy Editor */}
            {editorOpen && (
                <QosPolicyEditor
                    isOpen={editorOpen}
                    onClose={closeEditor}
                    policy={editingPolicy}
                    policyType={selectedPolicyType}
                    existingPolicies={policies}
                />
            )}
        </div>
    );
}
