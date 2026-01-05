import { useState, useEffect } from 'react';
import Modal from './Modal';

export default function PolicyRuleEditor({ isOpen, onClose, onSave, rule, policyType }) {
    const isEditing = !!rule;

    const [formData, setFormData] = useState({
        number: '',
        description: '',
        action: 'table',
        sourceAddress: '',
        destinationAddress: '',
        protocol: 'all',
        destinationPort: '',
        table: '100',
        mark: ''
    });

    useEffect(() => {
        if (rule) {
            setFormData({
                number: rule.number,
                description: rule.description || '',
                action: rule.set?.table ? 'table' : rule.action?.drop ? 'drop' : 'table',
                sourceAddress: rule.source?.address || '',
                destinationAddress: rule.destination?.address || '',
                protocol: rule.protocol || 'all',
                destinationPort: rule.destination?.port || '',
                table: rule.set?.table || '100',
                mark: rule.set?.mark || ''
            });
        } else {
            // Auto-generate next rule number
            setFormData(prev => ({
                ...prev,
                number: ''
            }));
        }
    }, [rule]);

    const handleSubmit = () => {
        if (!formData.number) {
            alert('Rule number is required');
            return;
        }

        if (formData.action === 'table' && !formData.table) {
            alert('Table number is required for table action');
            return;
        }

        onSave(formData);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${isEditing ? 'Edit' : 'Add'} Policy Rule`}
            size="large"
        >
            <div className="p-6 space-y-4">
                {/* Rule Number and Description */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Rule Number *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="999999"
                            value={formData.number}
                            onChange={(e) => updateField('number', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Description
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Route LAN traffic to ISP1"
                        />
                    </div>
                </div>

                {/* Match Criteria */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">Match Criteria</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Source Address
                            </label>
                            <input
                                type="text"
                                value={formData.sourceAddress}
                                onChange={(e) => updateField('sourceAddress', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="192.168.1.0/24"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Destination Address
                            </label>
                            <input
                                type="text"
                                value={formData.destinationAddress}
                                onChange={(e) => updateField('destinationAddress', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.0.0.0/0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Protocol
                            </label>
                            <select
                                value={formData.protocol}
                                onChange={(e) => updateField('protocol', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All</option>
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                                <option value="tcp_udp">TCP + UDP</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Destination Port
                            </label>
                            <input
                                type="text"
                                value={formData.destinationPort}
                                onChange={(e) => updateField('destinationPort', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="80 or 1000-2000"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-blue-300">Action</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Action Type *
                        </label>
                        <select
                            value={formData.action}
                            onChange={(e) => updateField('action', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="table">Set Routing Table</option>
                            <option value="mark">Set Packet Mark</option>
                            <option value="drop">Drop Packet</option>
                        </select>
                    </div>

                    {formData.action === 'table' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Routing Table *
                            </label>
                            <input
                                type="text"
                                value={formData.table}
                                onChange={(e) => updateField('table', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="100"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Custom routing table number (1-200)
                            </p>
                        </div>
                    )}

                    {formData.action === 'mark' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Packet Mark *
                            </label>
                            <input
                                type="text"
                                value={formData.mark}
                                onChange={(e) => updateField('mark', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="100"
                            />
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <div className="p-3 bg-slate-800 rounded text-xs text-slate-400">
                    <strong className="text-slate-300">Note:</strong> Rules are matched from lowest to highest number.
                    For multi-WAN setups, create custom routing tables with static routes before applying policies.
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                    >
                        {isEditing ? 'Save Changes' : 'Add Rule'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
