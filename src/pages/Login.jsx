import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Server, ArrowRight, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

export default function Login() {
    const { login, loading, error } = useAuth();
    const navigate = useNavigate();

    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(url, key);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 mb-4 shadow-lg shadow-blue-900/20">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">VyOS Manager</h1>
                    <p className="text-slate-400 mt-2">Connect to your router to get started</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* URL Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Router IP Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Server className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all outline-none"
                                        placeholder="192.168.1.1 (https:// is added automatically)"
                                    />
                                </div>
                            </div>

                            {/* API Key Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">API Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all outline-none"
                                        placeholder="Enter your API key"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium text-white transition-all",
                                loading
                                    ? "bg-blue-600/50 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Connect Router
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-500 text-sm mt-8">
                    VyOS HTTP API must be enabled on the router.
                </p>
            </div>
        </div>
    );
}
