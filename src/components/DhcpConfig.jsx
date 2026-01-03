import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Network, Plus, Trash2, Edit, ChevronDown, ChevronRight, Server } from 'lucide-react';
import { SharedNetworkForm, SubnetForm } from './DhcpForms';
import Modal from './Modal';
import clsx from 'clsx';

export default function DhcpConfig() {
    const { data, isLoading } = useVyosOperational(
        ['service', 'dhcp-server', 'shared-network-name'],
        ['service', 'dhcp-server'],
        'showConfig',
        { refetchInterval: false }
    );
    const { stageCommand } = useConfig();

    // State for expanded networks
    const [expanded, setExpanded] = useState({});

    // State for pending networks (created in UI but not yet committed to VyOS)
    const [pendingNetworks, setPendingNetworks] = useState([]);

    // Modal State
    const [modal, setModal] = useState({ type: null, isOpen: false, data: null, parent: null });

    const toggleExpand = (name) => {
        setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Transform VyOS data to array
    const vyosNetworks = data ? Object.entries(data).map(([name, config]) => ({
        name,
        description: config.description || '',
        subnets: config.subnet ? Object.entries(config.subnet).map(([cidr, subConfig]) => ({
            cidr,
            ...subConfig
        })) : [],
        isPending: false
    })) : [];

    // Merge VyOS networks with pending UI-only networks
    // Remove pending networks that now exist in VyOS
    const activePending = pendingNetworks.filter(p => !vyosNetworks.some(v => v.name === p.name));
    const networks = [...vyosNetworks, ...activePending];

    const openCreateNetwork = () => setModal({ type: 'network', isOpen: true, data: null });
    const openEditNetwork = (net) => setModal({ type: 'network', isOpen: true, data: net });

    const openCreateSubnet = (netName) => setModal({ type: 'subnet', isOpen: true, data: null, parent: netName });
    const openEditSubnet = (netName, subnet) => setModal({ type: 'subnet', isOpen: true, data: subnet, parent: netName });

    const closeModal = () => setModal({ type: null, isOpen: false, data: null, parent: null });

    // Action Handlers
    const handleSaveNetwork = (formData) => {
        const { name, description } = formData;

        // VyOS DHCP networks must have at least one subnet to be valid
        // We can't create an empty shared-network-name, even with a description
        // Strategy:
        // - New network: Add to pending list (UI only) until first subnet
        // - Editing existing network: Allow setting/updating description

        if (modal.data) {
            // Editing existing network
            if (modal.data.isPending) {
                // Update pending network
                setPendingNetworks(prev => prev.map(net =>
                    net.name === name ? { ...net, description } : net
                ));
            } else {
                // Update VyOS network description
                if (description && description.trim()) {
                    stageCommand({ op: 'set', path: ['service', 'dhcp-server', 'shared-network-name', name, 'description', description] });
                } else if (modal.data.description) {
                    stageCommand({ op: 'delete', path: ['service', 'dhcp-server', 'shared-network-name', name, 'description'] });
                }
            }
        } else {
            // New network - add to pending list
            setPendingNetworks(prev => [...prev, {
                name,
                description: description || '',
                subnets: [],
                isPending: true
            }]);
        }

        closeModal();
    };

    const handleDeleteNetwork = (net) => {
        if (confirm(`Delete shared network ${net.name} and all its subnets?`)) {
            if (net.isPending) {
                // Remove from pending list
                setPendingNetworks(prev => prev.filter(n => n.name !== net.name));
            } else {
                // Delete from VyOS
                stageCommand({ op: 'delete', path: ['service', 'dhcp-server', 'shared-network-name', net.name] });
            }
        }
    };

    const handleSaveSubnet = (formData) => {
        console.log('[DHCP] handleSaveSubnet called with formData:', JSON.stringify(formData, null, 2));

        const { cidr, defaultRouter, nameServer, rangeStart, rangeStop } = formData;
        console.log('[DHCP] Extracted values:', { cidr, defaultRouter, nameServer, rangeStart, rangeStop });

        const netName = modal.parent;
        const basePath = ['service', 'dhcp-server', 'shared-network-name', netName, 'subnet', cidr];

        // Check if parent network is pending (UI-only)
        const parentNetwork = networks.find(n => n.name === netName);
        const isPendingParent = parentNetwork?.isPending;

        // VyOS requires at least one property on a subnet to create the node
        // Setting any property will automatically create parent network + subnet nodes

        // IMPORTANT: Stage subnet commands FIRST, then network description at the end
        // VyOS processes commands sequentially - network needs subnet to exist first

        // CRITICAL: VyOS requires a unique subnet-id for DHCP subnets
        // Generate a simple numeric ID from the CIDR
        // For 192.168.1.0/24, extract the third octet (1) or create a simple ID
        const cidrParts = cidr.split('/')[0].split('.');
        const subnetId = parseInt(cidrParts[2]) * 256 + parseInt(cidrParts[3]);

        stageCommand({ op: 'set', path: [...basePath, 'subnet-id', subnetId.toString()] });

        // Range (set after subnet-id is established)
        if (rangeStart && rangeStop) {
            stageCommand({ op: 'set', path: [...basePath, 'range', '0', 'start', rangeStart] });
            stageCommand({ op: 'set', path: [...basePath, 'range', '0', 'stop', rangeStop] });
        } else if (modal.data?.range) {
            // Editing: user removed range
            stageCommand({ op: 'delete', path: [...basePath, 'range', '0'] });
        }

        // Default Router (under 'option' in VyOS structure)
        if (defaultRouter && defaultRouter.trim()) {
            stageCommand({ op: 'set', path: [...basePath, 'option', 'default-router', defaultRouter] });
        } else if (modal.data?.option?.['default-router']) {
            stageCommand({ op: 'delete', path: [...basePath, 'option', 'default-router'] });
        }

        // Name Servers (under 'option' in VyOS structure)
        const nsArray = Array.isArray(nameServer) ? nameServer.filter(Boolean) : (nameServer ? [nameServer] : []);
        if (nsArray.length > 0) {
            if (modal.data?.option?.['name-server']) {
                stageCommand({ op: 'delete', path: [...basePath, 'option', 'name-server'] });
            }
            nsArray.forEach(ns => {
                if (ns.trim()) {
                    stageCommand({ op: 'set', path: [...basePath, 'option', 'name-server', ns.trim()] });
                }
            });
        } else if (modal.data?.option?.['name-server']) {
            stageCommand({ op: 'delete', path: [...basePath, 'option', 'name-server'] });
        }

        // Ensure new subnets have at least one property
        const hasAnyProperty = (rangeStart && rangeStop) || (defaultRouter && defaultRouter.trim()) || nsArray.length > 0;
        if (!modal.data && !hasAnyProperty) {
            // New subnet with no other properties - set a default description
            stageCommand({ op: 'set', path: [...basePath, 'description', 'Created via Web UI'] });
        }

        // FINALLY: Set network description AFTER subnet is fully configured
        // This ensures VyOS has a valid network+subnet before adding metadata
        if (isPendingParent && parentNetwork.description) {
            stageCommand({ op: 'set', path: ['service', 'dhcp-server', 'shared-network-name', netName, 'description', parentNetwork.description] });
        }

        closeModal();
    };

    const handleDeleteSubnet = (netName, cidr) => {
        if (confirm(`Delete subnet ${cidr}?`)) {
            stageCommand({ op: 'delete', path: ['service', 'dhcp-server', 'shared-network-name', netName, 'subnet', cidr] });
        }
    };


    if (isLoading) {
        return <div className="text-slate-500 py-8 text-center">Loading DHCP configuration...</div>;
    }

    return (
        <div className="space-y-6">
            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.type === 'network' ? (modal.data ? 'Edit Network' : 'Create Network') : (modal.data ? 'Edit Subnet' : 'Create Subnet')}
            >
                {modal.type === 'network' && (
                    <SharedNetworkForm
                        initialData={modal.data}
                        onClose={closeModal}
                        onSave={handleSaveNetwork}
                    />
                )}
                {modal.type === 'subnet' && (
                    <SubnetForm
                        sharedNetworkName={modal.parent}
                        initialData={modal.data}
                        onClose={closeModal}
                        onSave={handleSaveSubnet}
                    />
                )}
            </Modal>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white">Shared Networks</h2>
                <button
                    onClick={openCreateNetwork}
                    className="px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-sm font-medium flex items-center"
                >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Network
                </button>
            </div>

            {networks.length === 0 && (
                <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                    <Server className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No DHCP Networks</h3>
                    <p className="text-slate-500 mt-2">Configure a shared network to begin.</p>
                </div>
            )}

            <div className="space-y-4">
                {networks.map((net) => (
                    <div key={net.name} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                        {/* Network Header */}
                        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between group">
                            <div
                                className="flex items-center cursor-pointer flex-1"
                                onClick={() => toggleExpand(net.name)}
                            >
                                {expanded[net.name] ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />}
                                <Network className="w-5 h-5 text-blue-400 mr-3" />
                                <div>
                                    <h3 className="font-medium text-white">{net.name}</h3>
                                    {net.description && <p className="text-xs text-slate-400">{net.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => openEditNetwork(net)}
                                    className="p-1.5 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Edit Network"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteNetwork(net)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Network"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Subnets List */}
                        {expanded[net.name] && (
                            <div className="p-4 space-y-3 bg-slate-900/30 border-t border-slate-800">
                                {net.subnets.length === 0 && (
                                    <div className="text-sm text-slate-500 italic px-2">No subnets defined.</div>
                                )}
                                {net.subnets.map(subnet => (
                                    <div key={subnet.cidr} className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center group hover:border-slate-600 transition-colors">
                                        <div className="flex items-center">
                                            <div className="mr-3 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-mono">
                                                {subnet.cidr}
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">
                                                    Range: {subnet.range ? Object.values(subnet.range).map(r => `${r.start}-${r.stop}`).join(', ') : 'None'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    GW: {subnet['default-router'] || '-'} | DNS: {subnet['name-server'] ? (Array.isArray(subnet['name-server']) ? subnet['name-server'].join(', ') : subnet['name-server']) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditSubnet(net.name, subnet)}
                                                className="p-1.5 text-slate-400 hover:text-blue-400"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSubnet(net.name, subnet.cidr)}
                                                className="p-1.5 text-slate-400 hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => openCreateSubnet(net.name)}
                                    className="w-full py-2 border border-dashed border-slate-700 rounded text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 text-sm transition-all flex items-center justify-center"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Subnet to {net.name}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
