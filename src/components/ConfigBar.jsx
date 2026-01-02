import { useConfig } from '../context/ConfigContext';
import { Save, Trash2, Check, AlertTriangle, FileText } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import Modal from './Modal';

export default function ConfigBar() {
    const { pendingChanges, commit, discardAll, isCommitting, lastError, removeChange } = useConfig();
    const [showDiff, setShowDiff] = useState(false);

    if (pendingChanges.length === 0) return null;

    return (
        <>
            <div className="fixed bottom-6 inset-x-0 mx-auto max-w-4xl z-40 px-4">
                <div className="bg-slate-900 border border-blue-500/50 shadow-lg shadow-blue-900/20 rounded-xl p-4 flex items-center justify-between backdrop-blur-md">

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
                            <span className="font-bold">{pendingChanges.length}</span>
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Uncommitted Changes</h3>
                            <p className="text-sm text-slate-400">Review your changes before applying</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowDiff(true)}
                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Review
                        </button>

                        <div className="h-6 w-px bg-slate-700 mx-2" />

                        <button
                            onClick={discardAll}
                            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center"
                            disabled={isCommitting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Discard
                        </button>

                        <button
                            onClick={commit}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium flex items-center shadow-lg shadow-blue-500/20"
                            disabled={isCommitting}
                        >
                            {isCommitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Commit
                        </button>
                    </div>
                </div>

                {lastError && (
                    <div className="mt-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center shadow-lg animate-in slide-in-from-bottom-2">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Commit Failed: {lastError}
                    </div>
                )}
            </div>

            {/* Diff Modal */}
            <Modal isOpen={showDiff} onClose={() => setShowDiff(false)} title="Pending Changes" size="lg">
                <div className="space-y-4 p-2">
                    {pendingChanges.map((change, idx) => (
                        <div key={change.id} className="bg-slate-950 rounded-lg p-4 border border-slate-800 flex justify-between group">
                            <div className="flex-1">
                                <div className="flex items-center mb-2">
                                    <span className="text-slate-500 font-mono text-xs mr-3">#{idx + 1}</span>
                                    <h4 className="text-white font-medium">{change.description}</h4>
                                </div>
                                <div className="space-y-1">
                                    {change.ops.map((op, i) => (
                                        <div key={i} className="font-mono text-xs text-slate-400 break-all">
                                            <span className={clsx(
                                                "uppercase font-bold mr-2",
                                                op.op === 'set' ? "text-emerald-400" : "text-red-400"
                                            )}>{op.op}</span>
                                            {op.path.join(' ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => removeChange(change.id)}
                                className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {pendingChanges.length === 0 && (
                        <p className="text-slate-500 text-center py-8">No pending changes.</p>
                    )}
                </div>
            </Modal>
        </>
    );
}
