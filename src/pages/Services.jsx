import { useState } from 'react';
import { Server, Globe, Terminal } from 'lucide-react';
import clsx from 'clsx';
import DhcpConfig from '../components/DhcpConfig';
import DnsConfig from '../components/DnsConfig';
import SshConfig from '../components/SshConfig';

export default function Services() {
    const [activeTab, setActiveTab] = useState('dhcp');

    const TABS = [
        { id: 'dhcp', name: 'DHCP Server', icon: Server },
        { id: 'dns', name: 'DNS Forwarding', icon: Globe },
        { id: 'ssh', name: 'SSH', icon: Terminal },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Services</h1>
                <p className="text-slate-400">Manage network services and daemons</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[400px]">
                {activeTab === 'dhcp' && <DhcpConfig />}
                {activeTab === 'dns' && <DnsConfig />}
                {activeTab === 'ssh' && <SshConfig />}
            </div>
        </div>
    );
}
