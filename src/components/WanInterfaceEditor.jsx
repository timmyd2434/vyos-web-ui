import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Plus, Trash2 } from 'lucide-react';

export default function WanInterfaceEditor({ isOpen, onClose, onSave, interface: iface }) {
    const isEditing = !!iface;

    const [formData, setFormData] = useState({
        name: '',
        nexthop: 'dhcp',
        nexthopCustom: '',
        failureCount: '1',
        successCount: '1',
        tests: []
    });

    useEffect(() => {
        if (iface) {
            // Parse existing interface
            const tests = [];
            if (iface.tests && typeof iface.tests === 'object') {
                Object.entries(iface.tests).forEach(([testNum, testConfig]) => {
                    tests.push({
                        number: testNum,
                        type: testConfig.type || 'ping',
                        target: testConfig.target || '8.8.8.8',
                        respTime: testConfig['resp-time'] || '5'
                    });
                });
            }

            setFormData({
                name: iface.name,
                nexthop: iface.nexthop === 'dhcp' ? 'dhcp' : 'custom',
                nexthopCustom: iface.nexthop !== 'dhcp' ? iface.nexthop : '',
                failureCount: iface.failureCount || '1',
                successCount: iface.successCount || '1',
                tests
            });
        }
    }, [iface]);

    const handleSubmit = () => {
        if (!formData.name) {
            alert('Interface name is required');
            return;
        }

        if (formData.nexthop === 'custom' && !formData.nexthopCustom) {
            alert('Custom nexthop IP address is required');
            return;
        }

        const nexthop = formData.nexthop === 'dhcp' ? 'dhcp' : formData.nexthopCustom;

        onSave({
            ...formData,
            nexthop
        });
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addTest = () => {
        const nextNum = formData.tests.length > 0
            ? (Math.max(...formData.tests.map(t => parseInt(t.number))) + 1).toString()
            : '0';

        setFormData(prev => ({
            ...prev,
            tests: [...prev.tests, {
                number: nextNum,
                type: 'ping',
                target: '8.8.8.8',
                respTime: '5'
            }]
        }));
    };

    const removeTest = (index) => {
        setFormData(prev => ({
            ...prev,
            tests: prev.tests.filter((_, idx) => idx !== index)
        }));
    };

    const updateTest = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            tests: prev.tests.map((test, idx) =>
                idx === index ? { ...test, [field]: value } : test
            )
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${isEditing ? 'Edit' : 'Add'} WAN Interface`}
            size="large"
        >
            <div className="p-6 space-y-4">
                {/* Interface Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Interface Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="eth0"
                        disabled={isEditing}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        The WAN interface to use for load balancing
                    </p>
                </div>

                {/* Nexthop Configuration */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">Gateway (Nexthop) *</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Gateway Type
                        </label>
                        <select
                            value={formData.nexthop}
                            onChange={(e) => updateField('nexthop', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="dhcp">DHCP (Automatic)</option>
                            <option value="custom">Custom IP Address</option>
                        </select>
                    </div>

                    {formData.nexthop === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Gateway IP Address *
                            </label>
                            <input
                                type="text"
                                value={formData.nexthopCustom}
                                onChange={(e) => updateField('nexthopCustom', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="192.168.1.1"
                            />
                        </div>
                    )}
                </div>

                {/* Health Check Thresholds */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Failure Count
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.failureCount}
                            onChange={(e) => updateField('failureCount', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Failures before marking interface unavailable (1-10)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Success Count
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.successCount}
                            onChange={(e) => updateField('successCount', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Successes before adding interface back (1-10)
                        </p>
                    </div>
                </div>

                {/* Health Check Tests */}
                <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-blue-300">Health Check Tests (Optional)</h3>
                        <button
                            type="button"
                            onClick={addTest}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500 transition-colors"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Test
                        </button>
                    </div>

                    {formData.tests.length === 0 ? (
                        <div className="text-center text-slate-400 py-4 text-sm">
                            No health tests configured. Add a test to monitor interface health.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.tests.map((test, index) => (
                                <div key={index} className="p-3 bg-slate-800 rounded space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-blue-400">Test #{test.number}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeTest(index)}
                                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Test Type
                                            </label>
                                            <select
                                                value={test.type}
                                                onChange={(e) => updateTest(index, 'type', e.target.value)}
                                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="ping">Ping (ICMP)</option>
                                                <option value="ttl">TTL Test</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Target IP/Host
                                            </label>
                                            <input
                                                type="text"
                                                value={test.target}
                                                onChange={(e) => updateTest(index, 'target', e.target.value)}
                                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="8.8.8.8"
                                            />
                                        </div>

                                        {test.type === 'ping' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                                    Response Time (sec)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    value={test.respTime}
                                                    onChange={(e) => updateTest(index, 'respTime', e.target.value)}
                                                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-slate-400">
                        Health tests monitor interface availability. Ping tests check connectivity, TTL tests verify routing.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                    >
                        {isEditing ? 'Save Changes' : 'Add Interface'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
