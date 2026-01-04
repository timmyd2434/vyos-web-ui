import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Shield, Check, X } from 'lucide-react';
import Modal from './Modal';
import clsx from 'clsx';
import { useConfig } from '../context/ConfigContext';
import { useVyosOperational } from '../hooks/useVyosData';

export default function ChainEditor({ chain, onBack }) {
    const { stageCommand } = useConfig();

    // Fetch fresh data for this chain so we can auto-update after commits
    const { data: chainData, isLoading, refetch } = useVyosOperational(
        ['firewall', ...chain.chainPath],
        ['firewall', ...chain.chainPath],
        'showConfig',
        { refetchInterval: false }
    );

    // Use fetched data if available, otherwise fall back to passed data
    const currentData = chainData || chain.rawData;

    // Parse rules from chain data
    const rules = Object.entries(currentData.rule || {})
        .map(([num, data]) => ({ number: parseInt(num), ...data }))
        .sort((a, b) => a.number - b.number);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        number: '',
        action: 'accept',
        protocol: 'all',
        sourceAddress: '',
        sourcePort: '',
        destAddress: '',
        destPort: '',
        description: '',
        states: []
    });

    const handleEdit = (rule) => {
        setEditingRule(rule);

        // Parse state - can be array or object with keys
        const states = [];
        if (rule.state) {
            if (Array.isArray(rule.state)) {
                states.push(...rule.state);
            } else if (typeof rule.state === 'object') {
                states.push(...Object.keys(rule.state));
            } else {
                states.push(rule.state);
            }
        }

        setFormData({
            number: rule.number,
            action: rule.action || 'accept',
            protocol: rule.protocol || 'all',
            sourceAddress: rule.source?.address || '',
            sourcePort: rule.source?.port || '',
            destAddress: rule.destination?.address || '',
            destPort: rule.destination?.port || '',
            description: rule.description || '',
            states: states
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingRule(null);
        const lastNum = rules.length > 0 ? rules[rules.length - 1].number : 0;
        setFormData({
            number: lastNum + 10,
            action: 'accept',
            protocol: 'all',
            sourceAddress: '',
            sourcePort: '',
            destAddress: '',
            destPort: '',
            description: '',
            states: []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (ruleNumber) => {
        if (!confirm(`Delete rule ${ruleNumber}?`)) return;

        const basePath = ['firewall', ...chain.chainPath, 'rule', ruleNumber.toString()];
        stageCommand({ op: 'delete', path: basePath });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate: VyOS requires protocol (tcp/udp) if ports are specified
        const hasPort = formData.sourcePort || formData.destPort;
        if (hasPort && formData.protocol === 'all') {
            alert('Protocol cannot be "All" when specifying ports.\n\nPlease select TCP or UDP.');
            return;
        }

        // Build commands for the rule
        const basePath = ['firewall', ...chain.chainPath, 'rule', formData.number.toString()];
        const commands = [];

        // Action (required)
        commands.push({ op: 'set', path: [...basePath, 'action', formData.action] });

        // Description
        if (formData.description) {
            commands.push({ op: 'set', path: [...basePath, 'description', formData.description] });
        } else if (editingRule?.description) {
            commands.push({ op: 'delete', path: [...basePath, 'description'] });
        }

        // Protocol - MUST be set BEFORE ports if ports are specified
        if (formData.protocol && formData.protocol !== 'all') {
            commands.push({ op: 'set', path: [...basePath, 'protocol', formData.protocol] });
        } else if (editingRule?.protocol && !hasPort) {
            // Only delete protocol if no ports are specified
            commands.push({ op: 'delete', path: [...basePath, 'protocol'] });
        }

        // Connection States (established, related, new, invalid)
        // Don't delete if we're setting new values - VyOS will replace them
        // Only delete if user has removed all states
        if (formData.states.length > 0) {
            // Just SET the states - VyOS will replace existing ones
            formData.states.forEach(state => {
                commands.push({ op: 'set', path: [...basePath, 'state', state] });
            });
        } else if (editingRule?.state) {
            // User removed all states - delete the node
            commands.push({ op: 'delete', path: [...basePath, 'state'] });
        }

        // Source Address
        if (formData.sourceAddress) {
            commands.push({ op: 'set', path: [...basePath, 'source', 'address', formData.sourceAddress] });
        } else if (editingRule?.source?.address) {
            commands.push({ op: 'delete', path: [...basePath, 'source', 'address'] });
        }

        // Source Port (only if protocol is set)
        if (formData.sourcePort) {
            commands.push({ op: 'set', path: [...basePath, 'source', 'port', formData.sourcePort] });
        } else if (editingRule?.source?.port) {
            commands.push({ op: 'delete', path: [...basePath, 'source', 'port'] });
        }

        // Destination Address
        if (formData.destAddress) {
            commands.push({ op: 'set', path: [...basePath, 'destination', 'address', formData.destAddress] });
        } else if (editingRule?.destination?.address) {
            commands.push({ op: 'delete', path: [...basePath, 'destination', 'address'] });
        }

        // Destination Port (only if protocol is set)
        if (formData.destPort) {
            commands.push({ op: 'set', path: [...basePath, 'destination', 'port', formData.destPort] });
        } else if (editingRule?.destination?.port) {
            commands.push({ op: 'delete', path: [...basePath, 'destination', 'port'] });
        }

        // Stage all commands
        commands.forEach(cmd => stageCommand(cmd));

        setIsModalOpen(false);
    };

    const toggleState = (state) => {
        setFormData(prev => ({
            ...prev,
            states: prev.states.includes(state)
                ? prev.states.filter(s => s !== state)
                : [...prev.states, state]
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{chain.name}</h2>
                    <p className="text-slate-400 text-sm">{chain.description} • {rules.length} rules configured</p>
                </div>
                <div className={`px - 3 py - 1.5 rounded - lg text - sm font - bold uppercase ${chain.defaultAction === 'accept'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    } `}>
                    Default: {chain.defaultAction}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-end">
                <button
                    onClick={handleAdd}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Rule</span>
                </button>
            </div>

            {/* Rules Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="px-4 py-3 w-16">#</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Protocol</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Destination</th>
                            <th className="px-4 py-3">State</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {rules.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-4 py-12 text-center">
                                    <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500">No rules configured in this chain.</p>
                                    <p className="text-slate-600 text-xs mt-1">Click "Add Rule" to create your first firewall rule.</p>
                                </td>
                            </tr>
                        )}
                        {rules.map(rule => {
                            // Parse states for display
                            const ruleStates = [];
                            if (rule.state) {
                                if (Array.isArray(rule.state)) {
                                    ruleStates.push(...rule.state);
                                } else if (typeof rule.state === 'object') {
                                    ruleStates.push(...Object.keys(rule.state));
                                } else {
                                    ruleStates.push(rule.state);
                                }
                            }

                            return (
                                <tr key={rule.number} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-3 font-mono text-slate-300 font-medium">{rule.number}</td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-xs font-bold uppercase",
                                            rule.action === 'accept' ? "bg-emerald-500/10 text-emerald-400" :
                                                rule.action === 'drop' ? "bg-red-500/10 text-red-400" :
                                                    rule.action === 'reject' ? "bg-orange-500/10 text-orange-400" :
                                                        "bg-blue-500/10 text-blue-400"
                                        )}>
                                            {rule.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-300">{rule.protocol || 'all'}</td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                        <div>{rule.source?.address || 'any'}</div>
                                        {rule.source?.port && <div className="text-slate-600">:{rule.source.port}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                        <div>{rule.destination?.address || 'any'}</div>
                                        {rule.destination?.port && <div className="text-slate-600">:{rule.destination.port}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {ruleStates.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {ruleStates.map(state => (
                                                    <span key={state} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                                                        {state}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{rule.description || "-"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="text-blue-400 hover:text-blue-300 mx-1 p-1"
                                            title="Edit rule"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.number)}
                                            className="text-slate-600 hover:text-red-400 mx-1 p-1"
                                            title="Delete rule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRule ? `Edit Rule ${editingRule.number} ` : "Add Rule"}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Rule Number */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Rule Number</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.number}
                                onChange={e => setFormData({ ...formData, number: e.target.value })}
                                disabled={!!editingRule}
                                required
                            />
                        </div>

                        {/* Action */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Action</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.action}
                                onChange={e => setFormData({ ...formData, action: e.target.value })}
                            >
                                <option value="accept">Accept</option>
                                <option value="drop">Drop</option>
                                <option value="reject">Reject</option>
                                <option value="jump">Jump</option>
                            </select>
                        </div>

                        {/* Protocol */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Protocol</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.protocol}
                                onChange={e => setFormData({ ...formData, protocol: e.target.value })}
                            >
                                <option value="all">All</option>
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                            </select>
                        </div>

                        {/* Connection State */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Connection State</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['established', 'related', 'new', 'invalid'].map(state => (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={() => toggleState(state)}
                                        className={clsx(
                                            "px-3 py-1 rounded text-xs font-medium transition-colors",
                                            formData.states.includes(state)
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        )}
                                    >
                                        {state}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Source Address */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Source Address</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-sm"
                                value={formData.sourceAddress}
                                onChange={e => setFormData({ ...formData, sourceAddress: e.target.value })}
                                placeholder="192.168.1.0/24 or 0.0.0.0/0 for any"
                            />
                        </div>

                        {/* Source Port */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Source Port</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-sm"
                                value={formData.sourcePort}
                                onChange={e => setFormData({ ...formData, sourcePort: e.target.value })}
                                placeholder="80, 443, 1-1024"
                            />
                        </div>

                        {/* Destination Address */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Destination Address</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-sm"
                                value={formData.destAddress}
                                onChange={e => setFormData({ ...formData, destAddress: e.target.value })}
                                placeholder="0.0.0.0/0 for any"
                            />
                        </div>

                        {/* Destination Port */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Destination Port</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-sm"
                                value={formData.destPort}
                                onChange={e => setFormData({ ...formData, destPort: e.target.value })}
                                placeholder="80, 443, 1-1024"
                            />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="e.g., Allow established connections"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 bg-slate-800 rounded text-slate-300 font-medium hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 rounded text-white font-medium hover:bg-blue-500"
                        >
                            Stage Rule
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
