import React, { useState, useEffect } from 'react';
import {
    Activity,
    ShieldAlert,
    Users,
    Zap,
    Brain
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import axios from 'axios';

const MetricCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg flex items-start justify-between group hover:border-zinc-700 transition-all">
        <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">{title}</p>
            <h3 className="text-3xl font-mono text-zinc-100 font-bold tracking-tighter">{value}</h3>
            <p className={`text-[10px] font-mono mt-2 ${color}`}>{subtext}</p>
        </div>
        <div className={`p-3 rounded-lg bg-zinc-900/50 group-hover:bg-zinc-900 border border-zinc-800 transition-colors ${color.replace('text-', 'text-opacity-80 text-')}`}>
            <Icon className="w-6 h-6" />
        </div>
    </div>
);

const LandingPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const host = window.location.hostname;
                const res = await axios.get(`http://${host}:8000/metrics/landing_stats`);
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load landing stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) return <div className="p-10 font-mono text-zinc-600 text-xs">Initializing Neural Interfaces...</div>;

    const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

    return (
        <div className="p-6 w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-2xl font-mono font-bold text-zinc-100 uppercase tracking-widest leading-none">Global Overview // Real-time Threat Telemetry</h2>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Events Analyzed"
                    value={stats.total_events.toLocaleString()}
                    subtext="+12.5% vs last hour"
                    icon={Activity}
                    color="text-emerald-500"
                />
                <MetricCard
                    title="Active Threats"
                    value={stats.active_threats}
                    subtext="Requires immediate attention"
                    icon={ShieldAlert}
                    color="text-red-500"
                />
                <MetricCard
                    title="High Risk Users"
                    value={stats.high_risk_events}
                    subtext="Behavioral deviation detected"
                    icon={Users}
                    color="text-amber-500"
                />
            </div>

            {/* Visualization Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Risk Distribution */}
                <div className="bg-black/40 border border-zinc-900 rounded-lg p-6 backdrop-blur">
                    <div className="flex items-center gap-2 mb-6 border-b border-zinc-900/50 pb-4">
                        <Brain className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Risk Profile Distribution</h3>
                    </div>
                    <div className="h-[250px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '12px', fontFamily: 'monospace', color: '#e4e4e7' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-zinc-200">{stats.high_risk_events}</span>
                                <span className="block text-[9px] text-zinc-600 uppercase tracking-widest">Anomalies</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Card (How it Works) */}
                <div className="bg-zinc-900/20 border border-zinc-800 rounded-lg p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-100">Hybrid Detection Engine</h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                            The system utilizes a multi-layered ensemble approach to calculating risk scores (0-100):
                        </p>

                        <div className="space-y-3">
                            {[
                                { label: "Behavioral Autoencoder", val: "35%", desc: "Learns user baselines" },
                                { label: "Isolation Forest", val: "15%", desc: "Detects global outliers" },
                                { label: "Context Scoring", val: "15%", desc: "Lifecycle & Dept shifts" },
                                { label: "Security Rules", val: "35%", desc: "Deterministic checks" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-pink-500' : i === 2 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                            <span className="text-[10px] font-bold text-zinc-300 uppercase">{item.label}</span>
                                        </div>
                                        <span className="text-[9px] text-zinc-600 pl-3">{item.desc}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-500">{item.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
