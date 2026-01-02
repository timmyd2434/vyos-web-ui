import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function MainLayout() {
    const { connection, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                {/* Topbar (Simple for now) */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-sm font-medium text-slate-400">Connected to</h2>
                        <p className="text-white font-mono">{connection?.url}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                    </button>
                </header>

                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
