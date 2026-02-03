import React, { useState, useEffect } from 'react';
import { Terminal, Clock, User, HardDrive } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const LiveStream = ({ onSelectAlert, selectedId }) => {
    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState('connecting');

    useEffect(() => {
        console.log("Initializing WebSocket connection...");
        const ws = new WebSocket('ws://localhost:8000/ws/stream');

        ws.onopen = () => {
            console.log("WebSocket connected.");
            setStatus('connected');
        };

        ws.onmessage = (e) => {
            try {
                const newEvent = JSON.parse(e.data);
                setEvents(prev => [newEvent, ...prev].slice(0, 50));
            } catch (err) {
                console.error("Failed to parse event data", err);
            }
        };

        ws.onerror = (e) => {
            console.error("WebSocket error:", e);
            setStatus('error');
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected.");
            setStatus('disconnected');
        };

        return () => ws.close();
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-zinc-950/50">
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {events.length === 0 && (
                    <div className="p-4 text-center text-zinc-700 text-xs italic mt-10">
                        Awaiting telemetry data...
                    </div>
                )}
                {events.map((evt) => (
                    <div
                        key={evt.id}
                        onClick={() => onSelectAlert(evt)}
                        className={cn(
                            "p-3 mb-1.5 rounded border border-transparent cursor-pointer transition-all",
                            selectedId === evt.id
                                ? "bg-zinc-800/80 border-zinc-700"
                                : "hover:bg-zinc-900/50 hover:border-zinc-800"
                        )}
                    >
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })}
                            </span>
                            <div className={cn(
                                "w-1 h-3 rounded-full shadow-sm",
                                evt.score > 75 ? "bg-red-500 shadow-red-500/50" :
                                    evt.score > 40 ? "bg-amber-500 shadow-amber-500/50" : "bg-zinc-800"
                            )} />
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-medium text-zinc-300">{evt.user}</span>
                            <span className="text-[10px] text-zinc-600 font-mono">@{evt.pc}</span>
                        </div>

                        <p className="text-[11px] text-zinc-500 leading-tight line-clamp-1">
                            {evt.summary}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-700 uppercase tracking-tighter">Priority Trace</span>
                            <span className={cn(
                                "text-[10px] font-mono font-bold",
                                evt.score > 75 ? "text-red-500" :
                                    evt.score > 40 ? "text-amber-500" : "text-zinc-600"
                            )}>
                                {evt.score}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveStream;
