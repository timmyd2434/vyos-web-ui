import { NavLink } from 'react-router-dom';
import { Home, Network, Shield, Settings, Terminal, Activity } from 'lucide-react';
import clsx from 'clsx';

const NAVIGATION = [
    { name: 'Dashboard', to: '/dashboard', icon: Home },
    { name: 'Interfaces', to: '/interfaces', icon: Network },
    { name: 'Firewall', to: '/firewall', icon: Shield },
    { name: 'Services', to: '/services', icon: Activity },
    { name: 'System', to: '/system', icon: Settings },
    { name: 'Terminal', to: '/terminal', icon: Terminal },
];

export default function Sidebar() {
    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed inset-y-0 left-0 z-50">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">VyOS Manager</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {NAVIGATION.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.to}
                        className={({ isActive }) => clsx(
                            "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            isActive
                                ? "bg-blue-600/10 text-blue-400"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        )}
                    >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            {/* Version Info */}
            <div className="p-4 border-t border-slate-800">
                <p className="text-xs text-slate-600 font-mono text-center">v1.2.0-rc11</p>
            </div>
        </aside>
    );
}
