import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Plus, RefreshCw, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Modal from '../components/Modal';
import InterfaceForm from '../components/InterfaceForm';

export default function Interfaces() {
    const { data, isLoading, refetch, isRefetching } = useVyosOperational(
        ['interfaces', 'list'],
        ['interfaces'],
        'showConfig'
    );
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInterface, setEditingInterface] = useState(null);

    // VyOS interface structure parsing (simplified for now)
    // Real structure is hierarchical: { ethernet: { eth0: { ... } }, loopback: { lo: { ... } } }
    const flattenInterfaces = (data) => {
        if (!data) return [];
        const flat = [];
        Object.keys(data).forEach(type => {
            Object.keys(data[type]).forEach(name => {
                flat.push({
                    type,
                    name,
                    ...data[type][name]
                });
            });
        });
        return flat;
    };

    const interfaces = flattenInterfaces(data).filter(iface =>
        iface.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingInterface(null);
        setIsModalOpen(true);
    };

    const handleEdit = (iface) => {
        setEditingInterface(iface);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        refetch(); // Refresh list after save
    };

    return (
        <div className="space-y-6">
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingInterface ? `Edit ${editingInterface.name}` : "Create Interface"}
            >
                <InterfaceForm
                    initialData={editingInterface}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            </Modal>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Interfaces</h1>
                    <p className="text-slate-400">Manage network adapters and virtual interfaces</p>
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                        onClick={() => refetch()}
                        className={clsx(
                            "p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors",
                            isRefetching && "animate-spin"
                        )}
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex-1 sm:flex-none items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium flex"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Interface</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search interfaces..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
                                <th className="px-6 py-4">Interface</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">State</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Loading interface data...
                                    </td>
                                </tr>
                            )}

                            {!isLoading && interfaces.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No interfaces found.
                                    </td>
                                </tr>
                            )}

                            {interfaces.map((iface) => (
                                <tr key={iface.name} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="mr-3 p-2 rounded bg-slate-800 text-slate-400">
                                                {/* Icon based on type */}
                                                <span className="font-mono font-bold text-xs">{iface.type.substring(0, 3).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-white">{iface.name}</span>
                                                <div className="text-xs text-slate-500">{iface.mac || "Virtual"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                                        {/* Handle address array or single string */}
                                        {Array.isArray(iface.address)
                                            ? iface.address.map(addr => <div key={addr}>{addr}</div>)
                                            : iface.address || "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Check for disabled flag in config. default is Up if not disabled. */}
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                            (!iface.disable && iface.disable !== '')
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-red-500/10 text-red-400"
                                        )}>
                                            {(!iface.disable && iface.disable !== '') ? "UP" : "DISABLED"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                        {iface.description || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(iface)}
                                                className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
