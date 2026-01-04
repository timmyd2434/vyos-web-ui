import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Route, Plus, Trash2, Edit, Network, ArrowRight, Settings } from 'lucide-react';
import Modal from '../components/Modal';
import clsx from 'clsx';

export default function Routes() {
    const { data: configData, isLoading, error, refetch } = useVyosOperational(
        ['protocols', 'static', 'route'],
        ['protocols', 'static', 'route'],
        'showConfig'
    );

    const { addChange } = useConfig();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editingRoute, setEditingRoute] = useState(null);
    const [formData, setFormData] = useState({
        destination: '',
        nextHopType: 'ip', // 'ip' | 'interface'
        nextHop: '',
        interface: '',
        distance: '1',
        description: ''
    });

    // Parse routes from VyOS config data
    const parseRoutes = (data) => {
        if (!data || typeof data !== 'object') return [];

        const routes = [];
        Object.entries(data).forEach(([destination, routeConfig]) => {
            if (routeConfig && typeof routeConfig === 'object') {
                // Check for next-hop IP addresses
                if (routeConfig['next-hop']) {
                    Object.entries(routeConfig['next-hop']).forEach(([nextHop, hopConfig]) => {
                        routes.push({
                            destination,
                            nextHopType: 'ip',
                            nextHop,
                            distance: hopConfig?.distance || '1',
                            disabled: hopConfig?.disable === '' || hopConfig?.disable === true
                        });
                    });
                }

                // Check for interface-based routes
                if (routeConfig['interface']) {
                    Object.entries(routeConfig['interface']).forEach(([iface, ifaceConfig]) => {
                        routes.push({
                            destination,
                            nextHopType: 'interface',
                            interface: iface,
                            distance: ifaceConfig?.distance || '1',
                            disabled: ifaceConfig?.disable === '' || ifaceConfig?.disable === true
                        });
                    });
                }

                // Check for blackhole routes
                if (routeConfig['blackhole']) {
                    routes.push({
                        destination,
                        nextHopType: 'blackhole',
                        distance: routeConfig.blackhole?.distance || '1'
                    });
                }
            }
        });

        return routes;
    };

    const routes = parseRoutes(configData);

    // Modal handlers
    const openCreateModal = () => {
        setModalMode('create');
        setEditingRoute(null);
        setFormData({
            destination: '',
            nextHopType: 'ip',
            nextHop: '',
            interface: '',
            distance: '1',
            description: ''
        });
        setModalOpen(true);
    };

    const openEditModal = (route) => {
        setModalMode('edit');
        setEditingRoute(route);
        setFormData({
            destination: route.destination,
            nextHopType: route.nextHopType,
            nextHop: route.nextHop || '',
            interface: route.interface || '',
            distance: route.distance,
            description: ''
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingRoute(null);
    };

    const handleDelete = (route) => {
        if (!confirm(`Delete route ${route.destination}?`)) return;

        const ops = [];

        if (route.nextHopType === 'ip') {
            ops.push({
                op: 'delete',
                path: ['protocols', 'static', 'route', route.destination, 'next-hop', route.nextHop]
            });
        } else if (route.nextHopType === 'interface') {
            ops.push({
                op: 'delete',
                path: ['protocols', 'static', 'route', route.destination, 'interface', route.interface]
            });
        } else if (route.nextHopType === 'blackhole') {
            ops.push({
                op: 'delete',
                path: ['protocols', 'static', 'route', route.destination, 'blackhole']
            });
        }

        // If this was the only next-hop for this destination, delete the route entirely
        const routesWithSameDest = routes.filter(r => r.destination === route.destination);
        if (routesWithSameDest.length === 1) {
            ops.push({
                op: 'delete',
                path: ['protocols', 'static', 'route', route.destination]
            });
        }

        addChange(`Delete route ${route.destination}`, ops);
    };

    const handleSave = () => {
        const { destination, nextHopType, nextHop, interface: iface, distance } = formData;

        if (!destination) {
            alert('Destination network is required');
            return;
        }

        // Validate CIDR format
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrRegex.test(destination)) {
            alert('Destination must be in CIDR format (e.g., 192.168.1.0/24)');
            return;
        }

        if (nextHopType === 'ip' && !nextHop) {
            alert('Next-hop IP address is required');
            return;
        }

        if (nextHopType === 'interface' && !iface) {
            alert('Interface is required');
            return;
        }

        const ops = [];

        // If editing, delete the old route first
        if (modalMode === 'edit' && editingRoute) {
            if (editingRoute.nextHopType === 'ip') {
                ops.push({
                    op: 'delete',
                    path: ['protocols', 'static', 'route', editingRoute.destination, 'next-hop', editingRoute.nextHop]
                });
            } else if (editingRoute.nextHopType === 'interface') {
                ops.push({
                    op: 'delete',
                    path: ['protocols', 'static', 'route', editingRoute.destination, 'interface', editingRoute.interface]
                });
            }
        }

        // Add the new/updated route
        if (nextHopType === 'ip') {
            ops.push({
                op: 'set',
                path: ['protocols', 'static', 'route', destination, 'next-hop', nextHop]
            });

            if (distance && distance !== '1') {
                ops.push({
                    op: 'set',
                    path: ['protocols', 'static', 'route', destination, 'next-hop', nextHop, 'distance', distance]
                });
            }
        } else if (nextHopType === 'interface') {
            ops.push({
                op: 'set',
                path: ['protocols', 'static', 'route', destination, 'interface', iface]
            });

            if (distance && distance !== '1') {
                ops.push({
                    op: 'set',
                    path: ['protocols', 'static', 'route', destination, 'interface', iface, 'distance', distance]
                });
            }
        } else if (nextHopType === 'blackhole') {
            ops.push({
                op: 'set',
                path: ['protocols', 'static', 'route', destination, 'blackhole']
            });

            if (distance && distance !== '1') {
                ops.push({
                    op: 'set',
                    path: ['protocols', 'static', 'route', destination, 'blackhole', 'distance', distance]
                });
            }
        }

        const description = modalMode === 'create'
            ? `Add static route ${destination}`
            : `Edit static route ${destination}`;

        addChange(description, ops);
        closeModal();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Static Routes</h1>
                    <p className="text-slate-400">Manage IPv4 static routing table</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Route
                </button>
            </div>

            {/* Routes List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        Loading routes...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400">
                        Error loading routes: {error.message}
                    </div>
                ) : routes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No static routes configured</p>
                        <p className="text-sm mt-2">Click "Add Route" to create your first static route</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {routes.map((route, idx) => (
                            <div
                                key={`${route.destination}-${route.nextHop || route.interface}-${idx}`}
                                className={clsx(
                                    "p-4 hover:bg-slate-800/50 transition-colors",
                                    route.disabled && "opacity-50"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Network className="w-5 h-5 text-blue-400" />

                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-white font-medium">
                                                {route.destination}
                                            </span>

                                            <ArrowRight className="w-4 h-4 text-slate-600" />

                                            {route.nextHopType === 'ip' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 uppercase">via</span>
                                                    <span className="font-mono text-slate-300">
                                                        {route.nextHop}
                                                    </span>
                                                </div>
                                            )}

                                            {route.nextHopType === 'interface' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 uppercase">dev</span>
                                                    <span className="font-mono text-cyan-400">
                                                        {route.interface}
                                                    </span>
                                                </div>
                                            )}

                                            {route.nextHopType === 'blackhole' && (
                                                <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs font-medium">
                                                    BLACKHOLE
                                                </span>
                                            )}
                                        </div>

                                        {route.distance !== '1' && (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Settings className="w-3 h-3" />
                                                <span>metric {route.distance}</span>
                                            </div>
                                        )}

                                        {route.disabled && (
                                            <span className="px-2 py-1 bg-orange-900/30 text-orange-400 rounded text-xs font-medium">
                                                DISABLED
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(route)}
                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                            title="Edit route"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(route)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                            title="Delete route"
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

            {/* Route Editor Modal */}
            {modalOpen && (
                <Modal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    title={modalMode === 'create' ? 'Add Static Route' : 'Edit Static Route'}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Destination Network *
                            </label>
                            <input
                                type="text"
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                placeholder="192.168.1.0/24"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={modalMode === 'edit'}
                            />
                            <p className="text-xs text-slate-500 mt-1">Network in CIDR notation</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Route Type *
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, nextHopType: 'ip' })}
                                    className={clsx(
                                        "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                                        formData.nextHopType === 'ip'
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    Next-hop IP
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, nextHopType: 'interface' })}
                                    className={clsx(
                                        "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                                        formData.nextHopType === 'interface'
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    Interface
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, nextHopType: 'blackhole' })}
                                    className={clsx(
                                        "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                                        formData.nextHopType === 'blackhole'
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    Blackhole
                                </button>
                            </div>
                        </div>

                        {formData.nextHopType === 'ip' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Next-hop IP Address *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nextHop}
                                    onChange={(e) => setFormData({ ...formData, nextHop: e.target.value })}
                                    placeholder="192.168.1.1"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {formData.nextHopType === 'interface' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Interface *
                                </label>
                                <input
                                    type="text"
                                    value={formData.interface}
                                    onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
                                    placeholder="eth0"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Administrative Distance
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="255"
                                value={formData.distance}
                                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Lower values are preferred (1-255, default: 1)
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                            >
                                {modalMode === 'create' ? 'Add Route' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
