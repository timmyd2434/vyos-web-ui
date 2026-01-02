import { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import { Save, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const INTERFACE_TYPES = [
    { value: 'ethernet', label: 'Ethernet' },
    { value: 'dummy', label: 'Dummy (Loopback)' },
    { value: 'vlan', label: 'VLAN' },
    // Add wireguard, bonding, etc. later
];

export default function InterfaceForm({ initialData, onClose, onSuccess }) {
    const { addChange } = useConfig();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        type: 'ethernet',
        name: '',
        description: '',
        address: '', // comma separated or single string
        // Add specific fields like vlan-id, parent-interface later
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                type: initialData.type || 'ethernet',
                name: initialData.name || '',
                description: initialData.description || '',
                address: Array.isArray(initialData.address) ? initialData.address.join(', ') : (initialData.address || ''),
            });
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Construct 'set' commands
            // Path: ['interfaces', type, name]
            const basePath = ['interfaces', formData.type, formData.name];

            const operations = [];

            // Description
            if (formData.description) {
                operations.push({
                    op: 'set',
                    path: [...basePath, 'description', formData.description]
                });
            }

            // Address
            if (formData.address) {
                const addresses = formData.address.split(',').map(a => a.trim()).filter(Boolean);
                addresses.forEach(addr => {
                    operations.push({
                        op: 'set',
                        path: [...basePath, 'address', addr]
                    });
                });
            }

            const desc = initialData
                ? `Update interface ${formData.name}`
                : `Create interface ${formData.name}`;

            addChange(desc, operations);

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to stage configuration");
        } finally {
            setLoading(false);
        }
    };

    const isEditing = !!initialData;

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start text-red-400 text-sm">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Type Selection - Locked if editing */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Interface Type</label>
                    <select
                        className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        disabled={isEditing}
                    >
                        {INTERFACE_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Name - Locked if editing */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Interface Name</label>
                    <input
                        type="text"
                        className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        placeholder="e.g. eth1"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={isEditing}
                        required
                    />
                </div>

                {/* Description */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                    <input
                        type="text"
                        className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="WAN Uplink"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Addresses */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">IP Addresses</label>
                    <input
                        type="text"
                        className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                        placeholder="192.168.1.1/24, 2001:db8::1/64, dhcp"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-slate-500">Comma separated. Use 'dhcp' for dynamic assignment.</p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors mr-2"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all",
                        loading ? "opacity-75 cursor-wait" : "hover:bg-blue-500 active:scale-95"
                    )}
                >
                    {loading ? "Staging..." : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Stage Changes
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
