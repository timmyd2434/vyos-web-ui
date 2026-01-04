import { useState, useEffect } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

// Move Section component outside to prevent re-creation on every render
const Section = ({ title, list, newItem, setNewItem, onAdd, onRemove, placeholder }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400">{title}</label>
        <div className="flex gap-2 mb-2">
            <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
            <button
                onClick={onAdd}
                className="p-2 bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
        <div className="space-y-1">
            {list.map(item => (
                <div key={item} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded border border-slate-800 group">
                    <span className="text-sm text-slate-300 font-mono">{item}</span>
                    <button
                        onClick={() => onRemove(item)}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            {list.length === 0 && <div className="text-xs text-slate-600 italic">No entries configured</div>}
        </div>
    </div>
);

export default function DnsConfig() {
    const { data: config, isLoading, refetch, isRefetching } = useVyosOperational(
        ['service', 'dns', 'forwarding'],
        ['service', 'dns', 'forwarding'],
        'showConfig',
        { refetchInterval: false }
    );

    const { stageCommand, isStaged } = useConfig();
    const [cacheSize, setCacheSize] = useState('0');
    const [listenAddresses, setListenAddresses] = useState([]);
    const [allowFrom, setAllowFrom] = useState([]);
    const [nameServers, setNameServers] = useState([]);
    const [newAddress, setNewAddress] = useState('');
    const [newAllow, setNewAllow] = useState('');
    const [newNs, setNewNs] = useState('');

    // Load initial data
    useEffect(() => {
        if (config) {
            setCacheSize(config['cache-size'] || '0');
            // VyOS returns single string for one item, or object/array for multiple.
            // Our flattener usually helps, but here we deal with raw config object structure 
            // from useVyosOperational (which is just the JSON response).

            const toArray = (val) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (typeof val === 'object') return Object.keys(val); // Sometimes keys are values in VyOS config output
                return [val];
            };

            setListenAddresses(toArray(config['listen-address']));
            setAllowFrom(toArray(config['allow-from']));
            setNameServers(toArray(config['name-server']));
        }
    }, [config]);

    const handleAddItem = (setter, list, item, setInput) => {
        if (item && !list.includes(item)) {
            setter([...list, item]);
            setInput('');
        }
    };

    const handleRemoveItem = (setter, list, item) => {
        setter(list.filter(i => i !== item));
    };

    const handleSave = () => {
        // VyOS requires 'allow-from' for DNS forwarding to be valid
        // We must set required fields BEFORE optional ones
        // Also, don't delete lists if we're just going to re-add them (wasteful and can cause errors)

        const commands = [];

        // CRITICAL: Set allow-from FIRST if we have any entries (it's required by VyOS)
        if (allowFrom.length > 0) {
            // Only delete if we're replacing with different values
            if (config?.['allow-from']) {
                commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'allow-from'] });
            }
            allowFrom.forEach(net => {
                commands.push({ op: 'set', path: ['service', 'dns', 'forwarding', 'allow-from', net] });
            });
        } else if (config?.['allow-from']) {
            // User removed all allow-from entries - delete it
            commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'allow-from'] });
        }

        // Listen Address
        if (listenAddresses.length > 0) {
            if (config?.['listen-address']) {
                commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'listen-address'] });
            }
            listenAddresses.forEach(addr => {
                commands.push({ op: 'set', path: ['service', 'dns', 'forwarding', 'listen-address', addr] });
            });
        } else if (config?.['listen-address']) {
            commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'listen-address'] });
        }

        // Name Servers
        if (nameServers.length > 0) {
            if (config?.['name-server']) {
                commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'name-server'] });
            }
            nameServers.forEach(ns => {
                commands.push({ op: 'set', path: ['service', 'dns', 'forwarding', 'name-server', ns] });
            });
        } else if (config?.['name-server']) {
            commands.push({ op: 'delete', path: ['service', 'dns', 'forwarding', 'name-server'] });
        }

        // Cache Size (set AFTER required fields)
        if (cacheSize !== config?.['cache-size']) {
            commands.push({ op: 'set', path: ['service', 'dns', 'forwarding', 'cache-size', cacheSize] });
        }

        commands.forEach(cmd => stageCommand(cmd));
    };

    if (isLoading) return <div className="text-slate-500 py-8 text-center">Loading DNS configuration...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-white">DNS Forwarding</h2>
                <button
                    onClick={() => refetch()}
                    className={clsx("p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white", isRefetching && "animate-spin")}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">

                {/* Cache Size */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Cache Size</label>
                    <input
                        type="number"
                        value={cacheSize}
                        onChange={(e) => setCacheSize(e.target.value)}
                        className="w-full md:w-1/3 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500">Number of records to cache (0 = unlimited or default)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Section
                        title="Listen Addresses"
                        list={listenAddresses}
                        newItem={newAddress}
                        setNewItem={setNewAddress}
                        onAdd={() => handleAddItem(setListenAddresses, listenAddresses, newAddress, setNewAddress)}
                        onRemove={(item) => handleRemoveItem(setListenAddresses, listenAddresses, item)}
                        placeholder="e.g. 192.168.1.1"
                    />

                    <Section
                        title="Allow From (Networks)"
                        list={allowFrom}
                        newItem={newAllow}
                        setNewItem={setNewAllow}
                        onAdd={() => handleAddItem(setAllowFrom, allowFrom, newAllow, setNewAllow)}
                        onRemove={(item) => handleRemoveItem(setAllowFrom, allowFrom, item)}
                        placeholder="e.g. 192.168.1.0/24"
                    />

                    <Section
                        title="System Name Servers"
                        list={nameServers}
                        newItem={newNs}
                        setNewItem={setNewNs}
                        onAdd={() => handleAddItem(setNameServers, nameServers, newNs, setNewNs)}
                        onRemove={(item) => handleRemoveItem(setNameServers, nameServers, item)}
                        placeholder="e.g. 8.8.8.8"
                    />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                    >
                        <Save className="w-4 h-4" />
                        <span>Stage Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
