import { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import Modal from './Modal';
import clsx from 'clsx';

export default function QosPolicyEditor({ isOpen, onClose, policy, policyType, existingPolicies }) {
    const { addChange } = useConfig();
    const isEditing = !!policy;

    const [formData, setFormData] = useState({
        name: '',
        type: policyType,
        // Common fields
        bandwidth: '',
        // Shaper specific
        defaultBandwidth: '100%',
        defaultCeiling: '100%',
        defaultQueueType: 'fq-codel',
        // FQ-CoDel specific
        codel_quantum: '',
        codel_flows: '',
        codel_interval: '',
        codel_target: '',
        codel_limit: '',
        // Limiter specific
        limiter_defaultBandwidth: '',
        // Interface assignment
        assignToInterface: '',
        assignDirection: 'egress'
    });

    useEffect(() => {
        if (policy) {
            setFormData({
                name: policy.name,
                type: policy.type,
                bandwidth: policy.config?.bandwidth || '',
                defaultBandwidth: policy.config?.default?.bandwidth || '100%',
                defaultCeiling: policy.config?.default?.ceiling || '100%',
                defaultQueueType: policy.config?.default?.['queue-type'] || 'fq-codel',
                codel_quantum: policy.config?.codel_quantum || '',
                codel_flows: policy.config?.flows || '',
                codel_interval: policy.config?.interval || '',
                codel_target: policy.config?.target || '',
                codel_limit: policy.config?.limit || '',
                limiter_defaultBandwidth: policy.config?.default?.bandwidth || '',
                assignToInterface: '',
                assignDirection: 'egress'
            });
        } else {
            setFormData(prev => ({ ...prev, type: policyType }));
        }
    }, [policy, policyType]);

    const handleSave = () => {
        if (!formData.name) {
            alert('Policy name is required');
            return;
        }

        // Check for duplicate names
        if (!isEditing && existingPolicies.some(p => p.name === formData.name && p.type === formData.type)) {
            alert('A policy with this name already exists');
            return;
        }

        const ops = [];
        const basePath = ['qos', 'policy', formData.type, formData.name];

        // Delete old policy if name changed
        if (isEditing && policy.name !== formData.name) {
            ops.push({
                op: 'delete',
                path: ['qos', 'policy', policy.type, policy.name]
            });
        }

        // Build commands based on policy type
        if (formData.type === 'shaper') {
            // Shaper policy
            if (formData.bandwidth) {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'bandwidth', formData.bandwidth]
                });
            }

            // Default class
            if (formData.defaultBandwidth) {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'default', 'bandwidth', formData.defaultBandwidth]
                });
            }

            if (formData.defaultCeiling) {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'default', 'ceiling', formData.defaultCeiling]
                });
            }

            if (formData.defaultQueueType) {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'default', 'queue-type', formData.defaultQueueType]
                });
            }
        } else if (formData.type === 'fq-codel') {
            // FQ-CoDel policy - VyOS uses defaults, parameters not configurable via standalone policy
            // FQ-CoDel works well with its built-in defaults
            // To tune FQ-CoDel, it should be embedded in a Shaper policy's queue-type

            // Just create the policy - VyOS will use optimal defaults
            // We still need at least one command to create the policy
            ops.push({
                op: 'set',
                path: [...basePath]
            });
        } else if (formData.type === 'limiter') {
            // Limiter policy
            if (formData.limiter_defaultBandwidth) {
                ops.push({
                    op: 'set',
                    path: [...basePath, 'default', 'bandwidth', formData.limiter_defaultBandwidth]
                });
            }
        }

        // Interface assignment (if specified)
        if (formData.assignToInterface) {
            ops.push({
                op: 'set',
                path: ['qos', 'interface', formData.assignToInterface, formData.assignDirection, formData.name]
            });
        }

        const description = isEditing
            ? `Edit QoS policy ${formData.name}`
            : `Create QoS policy ${formData.name}`;

        addChange(description, ops);
        onClose();
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getPolicyTypeName = (type) => {
        const names = {
            'shaper': 'Shaper',
            'fq-codel': 'FQ-CoDel',
            'limiter': 'Limiter'
        };
        return names[type] || type;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${isEditing ? 'Edit' : 'Create'} ${getPolicyTypeName(formData.type)} Policy`}
            size="large"
        >
            <div className="p-6 space-y-6">
                {/* Policy Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Policy Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="MY-TRAFFIC-POLICY"
                        disabled={isEditing}
                    />
                    <p className="text-xs text-slate-500 mt-1">Unique identifier for this policy</p>
                </div>

                {/* Shaper-specific fields */}
                {formData.type === 'shaper' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Total Bandwidth (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.bandwidth}
                                onChange={(e) => updateField('bandwidth', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="100mbit"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Overall bandwidth limit (e.g., 100mbit, 1gbit)
                            </p>
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Default Class Settings</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Guaranteed Bandwidth
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.defaultBandwidth}
                                        onChange={(e) => updateField('defaultBandwidth', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="100%"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Maximum (Ceiling)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.defaultCeiling}
                                        onChange={(e) => updateField('defaultCeiling', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="100%"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Queue Type
                                </label>
                                <select
                                    value={formData.defaultQueueType}
                                    onChange={(e) => updateField('defaultQueueType', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="fq-codel">FQ-CoDel (Recommended)</option>
                                    <option value="fair-queue">Fair Queue</option>
                                    <option value="drop-tail">Drop Tail</option>
                                    <option value="priority">Priority</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    FQ-CoDel reduces bufferbloat and improves latency
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* FQ-CoDel-specific fields */}
                {formData.type === 'fq-codel' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                            <p className="text-sm text-slate-300 mb-3">
                                <strong className="text-blue-400">FQ-CoDel</strong> is a "set it and forget it" policy that works excellently with its built-in defaults.
                            </p>
                            <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                                <li>Automatically distributes traffic into 1024 fair queues</li>
                                <li>Reduces bufferbloat and latency without configuration</li>
                                <li>Optimized for 10Gbit speeds by default</li>
                                <li>Best used as an egress (outbound) policy</li>
                            </ul>
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">
                                <strong className="text-slate-300">Note:</strong> FQ-CoDel parameters cannot be tuned via standalone policy.
                                For advanced tuning, embed FQ-CoDel as a <code className="px-1 py-0.5 bg-slate-700 rounded text-blue-400">queue-type</code> within a Shaper policy's class configuration.
                            </p>
                        </div>
                    </div>
                )}

                {/* Limiter-specific fields */}
                {formData.type === 'limiter' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Default Bandwidth Limit
                        </label>
                        <input
                            type="text"
                            value={formData.limiter_defaultBandwidth}
                            onChange={(e) => updateField('limiter_defaultBandwidth', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100mbit"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Ingress policing limit for unmatched traffic
                        </p>
                    </div>
                )}

                {/* Interface Assignment */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300">Apply to Interface (Optional)</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Interface
                            </label>
                            <input
                                type="text"
                                value={formData.assignToInterface}
                                onChange={(e) => updateField('assignToInterface', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="eth0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Direction
                            </label>
                            <select
                                value={formData.assignDirection}
                                onChange={(e) => updateField('assignDirection', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="egress">Egress (Outbound)</option>
                                <option value="ingress">Ingress (Inbound)</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        You can assign this policy to an interface now, or do it later from the Interfaces tab
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
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                    >
                        {isEditing ? 'Save Changes' : 'Create Policy'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
