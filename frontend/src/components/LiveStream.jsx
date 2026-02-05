import React, { useState, useEffect } from 'react';
import { Terminal, Clock, User, HardDrive } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const LiveStream = ({ events, onSelectAlert, selectedId }) => {
    const [status, setStatus] = useState('connected');

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#0c0c0e]">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-3">
                {events.length === 0 && (
                    <div className="p-4 text-center text-zinc-700 text-[10px] font-mono uppercase tracking-[0.2em] mt-10">
                        // Awaiting Telemetry...
                    </div>
                )}
                {events.map((evt) => (
                    <div
                        key={evt.id}
                        onClick={() => onSelectAlert(evt)}
                        className={cn(
                            "p-3 rounded border transition-all duration-300 group",
                            selectedId === evt.id
                                ? "bg-zinc-900 border-zinc-700 shadow-lg"
                                : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/40"
                        )}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-mono text-zinc-500 tracking-wider">
                                UTC_{new Date(evt.timestamp).toISOString().split('T')[1].slice(0, 8)}
                            </span>
                            <div className={cn(
                                "w-1 h-3 rounded-full opacity-50 group-hover:opacity-100 transition-opacity",
                                evt.score > 75 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                    evt.score > 40 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500/30"
                            )} />
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono font-bold text-zinc-300 tracking-tight uppercase">{evt.user}</span>
                            <HardDrive className="w-2.5 h-2.5 text-zinc-600" />
                            <span className="text-[9px] text-zinc-600 font-mono tracking-tighter">{evt.pc}</span>
                        </div>

                        <p className="text-[10px] text-zinc-500 font-mono leading-tight line-clamp-2 border-l border-zinc-800 pl-2 mt-2">
                            {evt.summary}
                        </p>

                        <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                            <span className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest">Signal_Strength</span>
                            <span className={cn(
                                "text-[10px] font-mono font-bold",
                                evt.score > 75 ? "text-red-400" :
                                    evt.score > 40 ? "text-amber-400" : "text-emerald-400/60"
                            )}>
                                {evt.score.toFixed(1)}σ
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveStream;
