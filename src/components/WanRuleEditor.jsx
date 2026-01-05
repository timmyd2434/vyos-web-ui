import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Plus, Trash2 } from 'lucide-react';

export default function WanRuleEditor({ isOpen, onClose, onSave, rule, availableInterfaces }) {
    const isEditing = !!rule;

    const [formData, setFormData] = useState({
        number: '',
        description: '',
        inboundInterface: '',
        interfaces: []
    });

    useEffect(() => {
        if (rule) {
            // Parse existing rule
            const interfaces = [];
            if (rule.interface && typeof rule.interface === 'object') {
                Object.entries(rule.interface).forEach(([name, config]) => {
                    interfaces.push({
                        name,
                        weight: config?.weight || '1'
                    });
                });
            }

            setFormData({
                number: rule.number,
                description: rule.description || '',
                inboundInterface: rule['inbound-interface'] || '',
                interfaces
            });
        } else {
            setFormData({
                number: '',
                description: '',
                inboundInterface: '',
                interfaces: []
            });
        }
    }, [rule]);

    const handleSubmit = () => {
        if (!formData.number) {
            alert('Rule number is required');
            return;
        }

        if (!formData.inboundInterface) {
            alert('Inbound interface (LAN) is required');
            return;
        }

        if (formData.interfaces.length === 0) {
            alert('At least one WAN interface is required');
            return;
        }

        onSave(formData);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addInterface = () => {
        if (availableInterfaces.length === 0) {
            alert('No WAN interfaces configured. Please configure interface health checks first.');
            return;
        }

        setFormData(prev => ({
            ...prev,
            interfaces: [...prev.interfaces, { name: availableInterfaces[0].name, weight: '1' }]
        }));
    };

    const removeInterface = (index) => {
        setFormData(prev => ({
            ...prev,
            interfaces: prev.interfaces.filter((_, idx) => idx !== index)
        }));
    };

    const updateInterface = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            interfaces: prev.interfaces.map((iface, idx) =>
                idx === index ? { ...iface, [field]: value } : iface
            )
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${isEditing ? 'Edit' : 'Add'} Load Balancing Rule`}
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
                            max="9999"
                            value={formData.number}
                            onChange={(e) => updateField('number', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100"
                            disabled={isEditing}
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
                            placeholder="LAN to Multi-WAN"
                        />
                    </div>
                </div>

                {/* Inbound Interface (LAN) */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Inbound Interface (LAN) *
                    </label>
                    <input
                        type="text"
                        value={formData.inboundInterface}
                        onChange={(e) => updateField('inboundInterface', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="eth2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        The LAN interface where traffic originates
                    </p>
                </div>

                {/* WAN Interfaces */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-300">WAN Interfaces *</h3>
                        <button
                            type="button"
                            onClick={addInterface}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500 transition-colors"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Interface
                        </button>
                    </div>

                    {formData.interfaces.length === 0 ? (
                        <div className="text-center text-slate-400 py-4 text-sm">
                            No WAN interfaces added. Click "Add Interface" to add one.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.interfaces.map((iface, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-800 rounded">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">
                                            Interface
                                        </label>
                                        <select
                                            value={iface.name}
                                            onChange={(e) => updateInterface(index, 'name', e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {availableInterfaces.map((ai) => (
                                                <option key={ai.name} value={ai.name}>
                                                    {ai.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-24">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">
                                            Weight
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="255"
                                            value={iface.weight}
                                            onChange={(e) => updateInterface(index, 'weight', e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeInterface(index)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors self-end"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        <strong>Weight:</strong> Higher weights receive more traffic. For example, weight 2 receives twice as much traffic as weight 1.
                    </p>
                </div>

                {/* Help Text */}
                <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-slate-300">
                    <strong className="text-blue-400">Configuration Required:</strong> Make sure WAN interfaces are configured with health checks:
                    <code className="block mt-1 text-blue-400 bg-slate-900/50 p-2 rounded">
                        set load-balancing wan interface-health eth0 nexthop 'dhcp'<br />
                        set load-balancing wan interface-health eth1 nexthop 'dhcp'
                    </code>
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
