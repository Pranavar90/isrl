import React, { useState, useEffect } from 'react';
import {
    Building2,
    TrendingUp,
    AlertTriangle,
    Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const DeptAnalysis = () => {
    const [selectedDept, setSelectedDept] = useState('Engineering');
    const [history, setHistory] = useState([]);

    const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'IT', 'Sales', 'Security'];

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const host = window.location.hostname;
                const res = await axios.get(`http://${host}:8000/metrics/dept_history/${selectedDept}`);
                setHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch dept history", err);
            }
        };
        fetchHistory();
    }, [selectedDept]);

    return (
        <div className="p-10 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Controls */}
            <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-2">Department Intelligence</h1>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Organizational Risk Breakdown</p>
                </div>

                <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-zinc-600" />
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono p-2 rounded w-48 focus:outline-none focus:border-zinc-600 uppercase"
                    >
                        {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Risk Trend */}
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">14-Day Risk Trend: {selectedDept}</h3>
                        </div>
                        <div className="flex gap-4 text-[9px] font-mono text-zinc-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                                Average Risk Score
                            </span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={10}
                                    fontFamily="monospace"
                                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    fontFamily="monospace"
                                />
                                <Tooltip
                                    contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#10b981' }}
                                    labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avg_risk"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#09090b', stroke: '#10b981', r: 3 }}
                                    activeDot={{ r: 6, fill: '#10b981' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vertical Anomaly Counter */}
                <div className="bg-zinc-900/10 border border-zinc-800 rounded-lg p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Recent Anomalies</h3>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {history.slice(0).reverse().map((day, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-900 rounded group hover:border-zinc-800 transition-colors">
                                <span className="text-[10px] font-mono text-zinc-500">{day.date}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold font-mono ${day.anomalies > 5 ? 'text-red-500' : 'text-zinc-300'}`}>
                                        {day.anomalies}
                                    </span>
                                    <span className="text-[9px] uppercase text-zinc-600">Events</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Context Notice */}
            <div className="p-4 bg-blue-950/10 border border-blue-900/20 rounded flex items-center gap-4 text-blue-400/80">
                <Users className="w-4 h-4" />
                <p className="text-[11px] font-mono">
                    <span className="font-bold">Insight:</span> {selectedDept} has shown a {history.length > 0 && history[0].avg_risk > history[history.length - 1].avg_risk ? 'decreasing' : 'stable'} risk trajectory over the last 14 days.
                    Shift analysis monitoring is active.
                </p>
            </div>
        </div>
    );
};

export default DeptAnalysis;
