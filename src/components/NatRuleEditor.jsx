import { useState, useEffect } from 'react';
import Modal from './Modal';
import clsx from 'clsx';

export default function NatRuleEditor({ isOpen, onClose, onSave, rule, natType, existingRules }) {
    const isEditing = !!rule;

    const [formData, setFormData] = useState({
        number: '',
        description: '',
        interface: '',
        sourceAddress: '',
        sourcePort: '',
        destinationAddress: '',
        destinationPort: '',
        protocol: 'all',
        translationAddress: '',
        translationPort: '',
        type: natType
    });

    // Populate form when editing
    useEffect(() => {
        if (rule) {
            setFormData({
                number: rule.number,
                description: rule.description || '',
                interface: rule.interface || '',
                sourceAddress: rule.sourceAddress || '',
                sourcePort: rule.sourcePort || '',
                destinationAddress: rule.destinationAddress || '',
                destinationPort: rule.destinationPort || '',
                protocol: rule.protocol || 'all',
                translationAddress: rule.translationAddress || '',
                translationPort: rule.translationPort || '',
                type: rule.type
            });
        } else {
            // Generate next available rule number
            const maxNumber = existingRules.length > 0
                ? Math.max(...existingRules.map(r => parseInt(r.number)))
                : 0;
            const nextNumber = Math.ceil((maxNumber + 10) / 10) * 10; // Round to next 10

            setFormData({
                number: nextNumber.toString(),
                description: '',
                interface: '',
                sourceAddress: '',
                sourcePort: '',
                destinationAddress: '',
                destinationPort: '',
                protocol: 'all',
                translationAddress: natType === 'source' ? 'masquerade' : '',
                translationPort: '',
                type: natType
            });
        }
    }, [rule, natType, existingRules]);

    const handleSubmit = () => {
        // Validation
        if (!formData.number) {
            alert('Rule number is required');
            return;
        }

        if (!formData.interface) {
            alert(`${natType === 'source' ? 'Outbound' : 'Inbound'} interface is required`);
            return;
        }

        if (!formData.translationAddress) {
            alert('Translation address is required');
            return;
        }

        // Additional validation for DNAT
        if (natType === 'destination' && !formData.destinationPort && !formData.destinationAddress) {
            alert('For Destination NAT, specify at least a destination port or address');
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
            title={`${isEditing ? 'Edit' : 'Add'} ${natType === 'source' ? 'Source' : 'Destination'} NAT Rule`}
            size="large"
        >
            <div className="space-y-4">
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
                        <p className="text-xs text-slate-500 mt-1">
                            Lower numbers are processed first
                        </p>
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
                            placeholder="Web server port forward"
                        />
                    </div>
                </div>

                {/* Interface */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        {natType === 'source' ? 'Outbound' : 'Inbound'} Interface *
                    </label>
                    <input
                        type="text"
                        value={formData.interface}
                        onChange={(e) => updateField('interface', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="eth0"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        {natType === 'source'
                            ? 'Interface for outgoing traffic (WAN interface)'
                            : 'Interface for incoming traffic (WAN interface)'
                        }
                    </p>
                </div>

                {/* Protocol */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Protocol
                    </label>
                    <select
                        value={formData.protocol}
                        onChange={(e) => updateField('protocol', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Protocols</option>
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                        <option value="tcp_udp">TCP + UDP</option>
                        <option value="icmp">ICMP</option>
                    </select>
                </div>

                {/* Source Filters */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">Source Filters (Optional)</h3>

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
                            <p className="text-xs text-slate-500 mt-1">
                                CIDR notation or single IP
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Source Port
                            </label>
                            <input
                                type="text"
                                value={formData.sourcePort}
                                onChange={(e) => updateField('sourcePort', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1024-65535"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Port or range (e.g., 80 or 1024-65535)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Destination Filters */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">
                        Destination Filters {natType === 'destination' && '(Required for DNAT)'}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Destination Address
                            </label>
                            <input
                                type="text"
                                value={formData.destinationAddress}
                                onChange={(e) => updateField('destinationAddress', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={natType === 'destination' ? 'Your WAN IP' : '192.168.1.0/24'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Destination Port {natType === 'destination' && '*'}
                            </label>
                            <input
                                type="text"
                                value={formData.destinationPort}
                                onChange={(e) => updateField('destinationPort', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={natType === 'destination' ? '80' : '443'}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {natType === 'destination' ? 'Port to forward (e.g., 80 for HTTP)' : 'Optional port filter'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Translation */}
                <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-blue-300">
                        Translation *
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Translation Address *
                            </label>
                            <input
                                type="text"
                                value={formData.translationAddress}
                                onChange={(e) => updateField('translationAddress', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={natType === 'source' ? 'masquerade' : '192.168.1.100'}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {natType === 'source'
                                    ? 'Use "masquerade" for interface IP, or specify IP/range'
                                    : 'Internal IP to forward to'
                                }
                            </p>
                        </div>

                        {natType === 'destination' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Translation Port
                                </label>
                                <input
                                    type="text"
                                    value={formData.translationPort}
                                    onChange={(e) => updateField('translationPort', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="8080"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Optional: Forward to a different port
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Helper text */}
                    <div className="p-3 bg-slate-900/50 rounded border border-slate-700">
                        <p className="text-xs text-slate-400">
                            {natType === 'source' ? (
                                <>
                                    <strong className="text-blue-400">Source NAT (SNAT):</strong> Translates the source IP of outbound traffic.
                                    Use "masquerade" to use the outbound interface's IP address automatically.
                                </>
                            ) : (
                                <>
                                    <strong className="text-blue-400">Destination NAT (DNAT):</strong> Forwards incoming traffic to internal hosts.
                                    Commonly used for port forwarding services behind your firewall.
                                </>
                            )}
                        </p>
                    </div>
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
