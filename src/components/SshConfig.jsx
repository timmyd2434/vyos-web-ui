import { useState, useEffect } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { useConfig } from '../context/ConfigContext';
import { Save, RefreshCw, Terminal } from 'lucide-react';
import clsx from 'clsx';

export default function SshConfig() {
    const { data: config, isLoading, refetch, isRefetching } = useVyosOperational(
        ['service', 'ssh'],
        ['service', 'ssh'],
        'showConfig'
    );

    const { stageCommand } = useConfig();
    const [port, setPort] = useState('22');
    const [disablePass, setDisablePass] = useState(false);

    useEffect(() => {
        if (config) {
            setPort(config.port || '22');
            // Check if disable-password-authentication exists (it's often a valueless node or "true")
            setDisablePass(Object.prototype.hasOwnProperty.call(config, 'disable-password-authentication'));
        }
    }, [config]);

    const handleSave = () => {
        // Port
        if (port !== config?.port) {
            stageCommand({ op: 'set', path: ['service', 'ssh', 'port', port] });
        }

        // Disable Password Auth
        const hasDisable = Object.prototype.hasOwnProperty.call(config || {}, 'disable-password-authentication');
        if (disablePass && !hasDisable) {
            stageCommand({ op: 'set', path: ['service', 'ssh', 'disable-password-authentication'] });
        } else if (!disablePass && hasDisable) {
            stageCommand({ op: 'delete', path: ['service', 'ssh', 'disable-password-authentication'] });
        }
    };

    if (isLoading) return <div className="text-slate-500 py-8 text-center">Loading SSH configuration...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-white">SSH Server</h2>
                <button
                    onClick={() => refetch()}
                    className={clsx("p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white", isRefetching && "animate-spin")}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-start">
                    <div className="bg-slate-800 p-3 rounded-lg mr-4">
                        <Terminal className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">Remote Access</h3>
                        <p className="text-sm text-slate-400 mt-1">Configure Secure Shell access to the router.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Port</label>
                        <input
                            type="number"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-500">Default is 22.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Authentication</label>
                        <div className="flex items-center space-x-3 mt-2">
                            <input
                                type="checkbox"
                                id="disablePass"
                                checked={disablePass}
                                onChange={(e) => setDisablePass(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-offset-slate-900"
                            />
                            <label htmlFor="disablePass" className="text-sm text-slate-300">Disable Password Authentication</label>
                        </div>
                        <p className="text-xs text-slate-500">
                            If checked, you must log in using SSH Keys. Ensure keys are added before enabling.
                        </p>
                    </div>
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
