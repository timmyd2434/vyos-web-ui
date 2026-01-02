import { useState } from 'react';
import { useVyosOperational } from '../hooks/useVyosData';
import { Download, Upload, Server, ShieldAlert, FileJson } from 'lucide-react';
import clsx from 'clsx';

export default function System() {
    // 1. Config Backup Query
    // By passing empty path [], we request the root configuration node
    const { refetch: fetchConfig, isFetching: isBackingUp } = useVyosOperational(
        ['system', 'config', 'full'],
        [],
        'showConfig',
        { enabled: false } // Don't fetch automatically on mount
    );

    const handleDownloadBackup = async () => {
        try {
            const result = await fetchConfig();
            if (result.data) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vyos-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("Backup failed", err);
            alert("Failed to download configuration.");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">System Management</h1>
                <p className="text-slate-400">Configuration backup and system maintenance</p>
            </div>

            {/* Backup Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-medium text-white flex items-center">
                            <Download className="w-5 h-5 mr-2 text-blue-400" />
                            Configuration Backup
                        </h2>
                        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                            Generate and download a full JSON backup of the current running configuration.
                            This file includes all interfaces, firewall rules, routing protocols, and system settings.
                        </p>
                    </div>
                    <div>
                        <button
                            onClick={handleDownloadBackup}
                            disabled={isBackingUp}
                            className={clsx(
                                "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors font-medium",
                                isBackingUp ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-500"
                            )}
                        >
                            {isBackingUp ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileJson className="w-4 h-4 mr-2" />
                                    Download JSON
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Restore Section (Future) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 opacity-60">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-medium text-slate-300 flex items-center">
                            <Upload className="w-5 h-5 mr-2 text-slate-500" />
                            Restore Configuration
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm">
                            Restoring a full configuration from a JSON file is currently disabled.
                            This feature requires careful handling to avoid network disconnection during the restore process.
                        </p>
                    </div>
                    <div>
                        <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg cursor-not-allowed font-medium">
                            Coming Soon
                        </button>
                    </div>
                </div>
            </div>

            {/* System Info Placeholder */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-medium text-white flex items-center mb-4">
                    <Server className="w-5 h-5 mr-2 text-purple-400" />
                    System Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block mb-1">Hostname</span>
                        <span className="text-white font-mono">vyos</span>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block mb-1">Architecture</span>
                        <span className="text-white font-mono">x86_64</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
