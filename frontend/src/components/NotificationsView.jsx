import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const NotificationsView = ({ alerts, onNavigateToAlert }) => {
    const [loading, setLoading] = useState(false);

    const handleAlertClick = (alert) => {
        if (onNavigateToAlert) {
            onNavigateToAlert(alert);
        }
    };

    if (loading) return <div className="text-zinc-600 font-mono text-xs p-10">Fetching Alert History...</div>;

    return (
        <div className="p-10 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-2">Notification Center</h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Historical Anomalies // Operational Queue</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Low Risk Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                        <h2 className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-[0.2em]">Nominal / Elevated // Risk &lt; 50%</h2>
                        <span className="text-[10px] text-zinc-700 font-mono">{alerts.filter(a => a.score < 50).length} ENTRIES</span>
                    </div>
                    {alerts.filter(a => a.score < 50).map((alert) => (
                        <div
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className="p-4 rounded-lg bg-[#0c0c0e]/50 border border-zinc-900 flex justify-between items-center group hover:bg-zinc-900/20 hover:border-zinc-800 transition-all cursor-pointer"
                        >
                            <div className="flex gap-4 items-center">
                                <div className="p-2 rounded-md border bg-emerald-500/5 border-emerald-900/50 text-emerald-500/50 group-hover:text-emerald-500 transition-colors">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xs font-mono font-bold text-zinc-400">ALERT::{alert.id.slice(0, 8)}</h3>
                                        <span className="text-[9px] text-zinc-700 font-mono">{alert.user}</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 font-mono line-clamp-1">{alert.summary}</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-mono text-red-600 group-hover:text-red-500 font-bold">{alert.score.toFixed(1)}%</span>
                        </div>
                    ))}
                    {alerts.filter(a => a.score < 50).length === 0 && (
                        <div className="text-center py-10 border border-dashed border-zinc-900 rounded-xl">
                            <p className="text-[8px] font-mono text-zinc-800 uppercase tracking-widest">Awaiting low-risk telemetry...</p>
                        </div>
                    )}
                </div>

                {/* High Risk Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                        <h2 className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-[0.2em]">Critical / Anomalous // Risk &gt;= 50%</h2>
                        <span className="text-[10px] text-zinc-700 font-mono">{alerts.filter(a => a.score >= 50).length} ENTRIES</span>
                    </div>
                    {alerts.filter(a => a.score >= 50).map((alert) => (
                        <div
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className="p-5 rounded-lg bg-[#0c0c0e] border border-red-900/20 flex justify-between items-center group hover:bg-red-900/10 hover:border-red-500/30 transition-all cursor-pointer shadow-lg shadow-red-950/5"
                        >
                            <div className="flex gap-4 items-center">
                                <div className={cn(
                                    "p-3 rounded-md border",
                                    alert.score > 80 ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-amber-500/5 border-amber-900/50 text-amber-500"
                                )}>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-sm font-mono font-bold text-zinc-200">ALERT::{alert.id.slice(0, 8)}</h3>
                                        <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(alert.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-mono max-w-sm line-clamp-1">{alert.summary}</p>
                                    <div className="mt-2 flex items-center gap-4">
                                        <span className="text-[9px] uppercase font-bold text-zinc-500">Node: {alert.user}</span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[10px] font-mono text-red-700 font-bold">CRITICAL_INDEX: {alert.score.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 text-zinc-700 group-hover:text-red-500 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                    {alerts.filter(a => a.score >= 50).length === 0 && (
                        <div className="text-center py-10 border border-dashed border-red-900/10 rounded-xl bg-red-500/2">
                            <p className="text-[8px] font-mono text-zinc-800 uppercase tracking-widest">No critical anomalies registered in current window</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsView;
