import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg text-xs">
                <p className="text-slate-300 font-mono mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {Number(entry.value).toFixed(2)} {unit}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const MetricAreaChart = ({ data, color = "#3b82f6", unit = "%", title }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col h-64">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip unit={unit} />} />
                    <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#color-${color})`} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export const InterfaceLineChart = ({ data, title }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col h-64">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title} Traffic</h3>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => (val / 1024).toFixed(0)}
                        unit=" KB/s"
                    />
                    <Tooltip content={<CustomTooltip unit="KB/s" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="rxBps" name="RX" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="txBps" name="TX" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);
