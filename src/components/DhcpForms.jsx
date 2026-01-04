import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';

export function SharedNetworkForm({ initialData, onClose, onSave }) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, description });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Network Name</label>
                <input
                    type="text"
                    required
                    readOnly={!!initialData} // Name is key, cannot edit
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 read-only:opacity-50"
                    placeholder="e.g. LAN-NETWORK"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Optional description"
                />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                    Save
                </button>
            </div>
        </form>
    );
}

export function SubnetForm({ sharedNetworkName, initialData, onClose, onSave }) {
    const [cidr, setCidr] = useState(initialData?.cidr || '');
    // Extract from option object if present
    const [gateway, setGateway] = useState(initialData?.option?.['default-router'] || '');
    const [dns, setDns] = useState(() => {
        const ns = initialData?.option?.['name-server'];
        if (!ns) return '';
        return Array.isArray(ns) ? ns.join(', ') : ns;
    });
    // Flatten range for editing. We'll simplify to one range for this UI version.
    const [rangeStart, setRangeStart] = useState('');
    const [rangeStop, setRangeStop] = useState('');

    useEffect(() => {
        if (initialData?.range) {
            // Take first range found
            const rangeKey = Object.keys(initialData.range)[0];
            if (rangeKey) {
                setRangeStart(initialData.range[rangeKey].start || '');
                setRangeStop(initialData.range[rangeKey].stop || '');
            }
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            cidr,
            defaultRouter: gateway,
            nameServer: dns.split(',').map(s => s.trim()).filter(Boolean),
            rangeStart,
            rangeStop
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-500/10 p-3 rounded text-blue-400 text-sm mb-4">
                Adding subnet to <strong>{sharedNetworkName}</strong>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Subnet CIDR</label>
                    <input
                        type="text"
                        required
                        readOnly={!!initialData}
                        value={cidr}
                        onChange={(e) => setCidr(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 read-only:opacity-50"
                        placeholder="e.g. 192.168.1.0/24"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Default Gateway</label>
                    <input
                        type="text"
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 192.168.1.1"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">DNS Server</label>
                    <input
                        type="text"
                        value={dns}
                        onChange={(e) => setDns(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 8.8.8.8"
                    />
                </div>

                <div className="col-span-2 border-t border-slate-800 pt-2 mt-2">
                    <label className="block text-sm font-medium text-slate-400 mb-2">DHCP Lease Range</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500">Start Address</label>
                            <input
                                type="text"
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. 192.168.1.100"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Stop Address</label>
                            <input
                                type="text"
                                value={rangeStop}
                                onChange={(e) => setRangeStop(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. 192.168.1.200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                    Save
                </button>
            </div>
        </form>
    );
}
