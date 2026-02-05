import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Activity, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DataNodes = () => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const host = window.location.hostname;
                const res = await axios.get(`http://${host}:8000/metrics/nodes`);
                setNodes(res.data);
            } catch (err) {
                console.error("Failed to fetch node metrics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNodes();
        const interval = setInterval(fetchNodes, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-zinc-600 font-mono text-xs p-10">Initializing Node Probe...</div>;

    return (
        <div className="p-10 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-2">Network Data Nodes</h1>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Global infrastructure risk assessment // Real-time telemetry</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-zinc-600 font-mono block">Active_Nodes</span>
                    <span className="text-xl font-mono text-emerald-500">{nodes.length} / 12</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodes.map((node) => (
                    <div key={node.id} className="p-6 rounded-xl bg-[#0c0c0e] border border-zinc-900 group hover:border-zinc-800 transition-all shadow-lg hover:shadow-zinc-900/20">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                <Database className={cn("w-5 h-5", node.risk > 70 ? "text-amber-500" : "text-zinc-500")} />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest",
                                    node.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                    {node.status}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono mt-1 uppercase">{node.events} pps</span>
                            </div>
                        </div>

                        <h3 className="text-sm font-mono font-bold text-zinc-300 mb-4">{node.id}</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Aggregated Risk</span>
                                <span className={cn("text-xs font-mono font-bold", node.risk > 70 ? "text-amber-500" : "text-zinc-400")}>{node.risk}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-1000", node.risk > 70 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-zinc-700")}
                                    style={{ width: `${node.risk}%` }}
                                />
                            </div>
                        </div>

                        {node.risk > 70 && (
                            <div className="mt-4 flex items-center gap-2 text-amber-500/70 text-[10px] font-mono italic animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                <span>High volatility detected in node traffic</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataNodes;
