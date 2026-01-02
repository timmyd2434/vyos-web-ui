import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Plus, ArrowLeft, Save, Trash2, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import clsx from 'clsx';
import { useConfig } from '../context/ConfigContext';

export default function RuleBuilder({ rulesetName, rulesetData, onBack }) {
    const { addChange } = useConfig();

    // Rules parsing:
    // rulesetData.rule is an object: { "10": { ... }, "20": { ... } }
    // We want an array sorted by rule number
    const rules = Object.entries(rulesetData.rule || {})
        .map(([num, data]) => ({ number: parseInt(num), ...data }))
        .sort((a, b) => a.number - b.number);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        number: '',
        action: 'accept',
        protocol: 'all',
        source: '',
        destination: '',
        description: ''
    });

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            number: rule.number,
            action: rule.action || 'accept',
            protocol: rule.protocol || 'all',
            source: rule.source?.address || '',
            destination: rule.destination?.address || '',
            description: rule.description || ''
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingRule(null);
        // Find next available rule number (e.g. +10)
        const lastNum = rules.length > 0 ? rules[rules.length - 1].number : 0;
        setFormData({
            number: lastNum + 10,
            action: 'accept',
            protocol: 'tcp',
            source: '',
            destination: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct Path: ['firewall', 'name', rulesetName, 'rule', number, '...']
        const basePath = ['firewall', 'name', rulesetName, 'rule', formData.number];

        try {
            const ops = [];

            // Basic fields
            ops.push({ op: 'set', path: [...basePath, 'action', formData.action] });
            ops.push({ op: 'set', path: [...basePath, 'protocol', formData.protocol] });
            if (formData.description) ops.push({ op: 'set', path: [...basePath, 'description', formData.description] });

            // Source/Dest
            if (formData.source) ops.push({ op: 'set', path: [...basePath, 'source', 'address', formData.source] });
            // Removed: else if (editingRule) { /* handle delete? */ }

            if (formData.destination) ops.push({ op: 'set', path: [...basePath, 'destination', 'address', formData.destination] });

            addChange(`Update Rule ${formData.number} in ${rulesetName}`, ops);

            setIsModalOpen(false);
            // Removed: We need to trigger a refetch in parent, but for now we rely on auto-refetch
            // Removed: or we could pass a refetch callback.
            // Removed: Ideally we optimistic update or force refetch.
            // Removed: Let's rely on parent passing a refresh function or the hook's interval for simplicity in this MVP.
        } catch (err) {
            console.error("Failed to save rule", err);
            alert("Failed to save rule: " + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-white">Ruleset: {rulesetName}</h2>
                    <p className="text-slate-400 text-sm">Managing {rules.length} rules</p>
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="px-4 py-3 w-16">#</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Protocol</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Destination</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {rules.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                    No rules found in this ruleset.
                                </td>
                            </tr>
                        )}
                        {rules.map(rule => (
                            <tr key={rule.number} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-4 py-3 font-mono text-slate-300">{rule.number}</td>
                                <td className="px-4 py-3">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-xs font-bold uppercase",
                                        rule.action === 'accept' ? "bg-emerald-500/10 text-emerald-400" :
                                            rule.action === 'drop' ? "bg-red-500/10 text-red-400" :
                                                "bg-yellow-500/10 text-yellow-400"
                                    )}>
                                        {rule.action}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-300">{rule.protocol}</td>
                                <td className="px-4 py-3 text-slate-400">{rule.source?.address || "Any"}</td>
                                <td className="px-4 py-3 text-slate-400">{rule.destination?.address || "Any"}</td>
                                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{rule.description || "-"}</td>
                                <td className="px-4 py-3 text-right">
                                    {/* Actions */}
                                    <button onClick={() => handleEdit(rule)} className="text-blue-400 hover:text-blue-300 mx-1">Edit</button>
                                    <button className="text-slate-600 hover:text-red-400 mx-1">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRule ? `Edit Rule ${editingRule.number}` : "Add Rule"}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Protocol</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.protocol}
                                onChange={e => setFormData({ ...formData, protocol: e.target.value })}
                                placeholder="tcp, udp, all"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Source Address</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value })}
                                placeholder="192.168.1.0/24"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Destination Address</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.destination}
                                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                placeholder="0.0.0.0/0"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded text-white font-medium hover:bg-blue-500">
                            Stage Rule
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
