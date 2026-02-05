import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const NotificationsView = ({ onNavigateToAlert }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await axios.get('http://localhost:8000/alerts/history');
                setAlerts(res.data);
            } catch (err) {
                console.error("Failed to fetch alerts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

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

            <div className="space-y-4">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className="p-6 rounded-lg bg-[#0c0c0e] border border-zinc-900 flex justify-between items-center group hover:bg-zinc-900/20 hover:border-zinc-800 transition-all cursor-pointer"
                    >
                        <div className="flex gap-4 items-center">
                            <div className={cn(
                                "p-3 rounded-md border",
                                alert.score > 80 ? "bg-red-500/5 border-red-900/50 text-red-500" : "bg-amber-500/5 border-amber-900/50 text-amber-500"
                            )}>
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-sm font-mono font-bold text-zinc-200">ALERT::{alert.id}</h3>
                                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 font-mono max-w-xl line-clamp-1">{alert.summary}</p>
                                <div className="mt-2 flex items-center gap-4">
                                    <span className="text-[10px] uppercase font-bold text-zinc-400">Node: {alert.user}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono",
                                        alert.score > 80 ? "text-red-700" : "text-amber-700"
                                    )}>RISK_SCORE: {alert.score}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-2 text-zinc-700 group-hover:text-zinc-400 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    </div>
                ))}

                {alerts.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-zinc-900 rounded-xl">
                        <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">No unresolved critical notifications in current sector</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;
