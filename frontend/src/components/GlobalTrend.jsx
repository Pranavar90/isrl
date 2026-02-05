import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Brush, ComposedChart, Line
} from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#09090b] border border-zinc-800 p-3 shadow-2xl">
                <p className="text-zinc-500 mb-2 font-mono text-[10px]">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between gap-6 items-center">
                            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: entry.dataKey === 'risk' ? '#ef4444' : '#10b981' }}>
                                {entry.name} :
                            </span>
                            <span className="text-[10px] font-mono text-zinc-100 font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const GlobalTrend = () => {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const fetchData = React.useCallback(async () => {
        try {
            const host = window.location.hostname;
            const res = await axios.get(`http://${host}:8000/metrics/activity`);
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch global metrics", err);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="space-y-6 pt-10 border-t border-zinc-900 bg-black/20 pb-8">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 px-8">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operational Pulse Trend (Global)</h3>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Res: 1min / Window: 60min</span>
                    {loading && <RefreshCw className="w-3 h-3 text-zinc-800 animate-spin" />}
                </div>
            </div>

            <div className="h-[240px] w-full relative group">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />

                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="colorGlobalActivity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#121214" />
                        <XAxis
                            dataKey="time"
                            fontSize={9}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#3f3f46', fontFamily: 'monospace' }}
                        />
                        <YAxis
                            fontSize={9}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#3f3f46', fontFamily: 'monospace' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="activity"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorGlobalActivity)"
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="risk"
                            stroke="#ef4444"
                            strokeWidth={1}
                            dot={false}
                            strokeDasharray="4 4"
                            opacity={0.4}
                        />
                        <Brush
                            dataKey="time"
                            height={20}
                            stroke="#1f1f23"
                            fill="#09090b"
                            gap={10}
                            style={{ fontSize: '8px', fontFamily: 'monospace' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono text-zinc-800 tracking-widest uppercase pb-2 px-8">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-emerald-500" /> THROUGHPUT_VOLUME</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500/50 dashed" /> AGGREGATE_RISK_SURFACE</span>
                </div>
                <span>SYSTEM_STATUS // NOMINAL</span>
            </div>
        </div>
    );
};

export default GlobalTrend;
