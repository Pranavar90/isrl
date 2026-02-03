import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Fingerprint, MapPin, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const IdentityMatrix = () => {
    const [identities, setIdentities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIdentities = async () => {
            try {
                const res = await axios.get('http://localhost:8000/metrics/identities');
                setIdentities(res.data);
            } catch (err) {
                console.error("Failed to fetch identities", err);
            } finally {
                setLoading(false);
            }
        };
        fetchIdentities();
    }, []);

    if (loading) return <div className="text-zinc-600 font-mono text-xs p-10">Syncing LDAP Matrix...</div>;

    return (
        <div className="p-10 max-w-7xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-2">Identity Matrix</h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Active Personnel Profiles // Behavioral Baselines</p>
            </div>

            <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-900 bg-zinc-950">
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">Personnel</th>
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">Department</th>
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">Classification</th>
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">Base Trust</th>
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">HQ Location</th>
                            <th className="p-4 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {identities.map((id, i) => (
                            <tr key={i} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                            <Fingerprint className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                                        </div>
                                        <span className="text-xs font-mono font-medium text-zinc-300 uppercase">{id.user}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs text-zinc-500 font-mono uppercase">{id.department}</span>
                                </td>
                                <td className="p-4">
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded border border-zinc-800 font-mono",
                                        id.type === 'Admin' ? "text-amber-500 bg-amber-500/5" :
                                            id.type === 'Privileged' ? "text-blue-400 bg-blue-400/5" : "text-zinc-600"
                                    )}>
                                        {id.type}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-zinc-700" style={{ width: `${id.trust}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-600">{id.trust}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-left">
                                    <div className="flex items-center gap-1.5 text-zinc-500">
                                        <MapPin className="w-3 h-3" />
                                        <span className="text-xs font-mono">{id.location}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[9px] uppercase tracking-widest">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        {id.status}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default IdentityMatrix;
