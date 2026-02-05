import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Fingerprint, MapPin, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const IdentityMatrix = () => {
    const [data, setData] = useState({ departments: [] });
    const [loading, setLoading] = useState(true);
    const [expandedDepts, setExpandedDepts] = useState({});
    const [expandedLocs, setExpandedLocs] = useState({});

    useEffect(() => {
        const fetchIdentities = async () => {
            try {
                const host = window.location.hostname;
                const res = await axios.get(`http://${host}:8000/metrics/identities`);
                setData(res.data);

                // Auto-expand first department and location
                if (res.data.departments.length > 0) {
                    const firstDept = res.data.departments[0].name;
                    setExpandedDepts({ [firstDept]: true });
                    if (res.data.departments[0].locations.length > 0) {
                        setExpandedLocs({ [`${firstDept}-${res.data.departments[0].locations[0].name}`]: true });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch identities", err);
            } finally {
                setLoading(false);
            }
        };
        fetchIdentities();
    }, []);

    const toggleDept = (deptName) => {
        setExpandedDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
    };

    const toggleLoc = (deptName, locName) => {
        const key = `${deptName}-${locName}`;
        setExpandedLocs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div className="text-zinc-600 font-mono text-xs p-10">Syncing LDAP Matrix...</div>;

    return (
        <div className="p-10 max-w-7xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-2">Identity Matrix</h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Active Personnel Profiles // Hierarchical Structure</p>
            </div>

            <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
                {data.departments.map((dept, deptIdx) => (
                    <div key={deptIdx} className="border-b border-zinc-900 last:border-0">
                        {/* Department Header */}
                        <div
                            onClick={() => toggleDept(dept.name)}
                            className="p-4 bg-zinc-950 hover:bg-zinc-900/50 cursor-pointer transition-colors flex items-center gap-3"
                        >
                            {expandedDepts[dept.name] ?
                                <ChevronDown className="w-4 h-4 text-zinc-600" /> :
                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                            }
                            <Users className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm font-mono font-bold text-zinc-300 uppercase tracking-wider">{dept.name}</span>
                            <span className="text-[10px] text-zinc-700 font-mono ml-auto">
                                {dept.locations.reduce((sum, loc) => sum + loc.users.length, 0)} personnel
                            </span>
                        </div>

                        {/* Locations */}
                        {expandedDepts[dept.name] && dept.locations.map((loc, locIdx) => (
                            <div key={locIdx} className="border-t border-zinc-900/50">
                                {/* Location Header */}
                                <div
                                    onClick={() => toggleLoc(dept.name, loc.name)}
                                    className="p-4 pl-12 bg-zinc-950/50 hover:bg-zinc-900/30 cursor-pointer transition-colors flex items-center gap-3"
                                >
                                    {expandedLocs[`${dept.name}-${loc.name}`] ?
                                        <ChevronDown className="w-3 h-3 text-zinc-700" /> :
                                        <ChevronRight className="w-3 h-3 text-zinc-700" />
                                    }
                                    <MapPin className="w-3 h-3 text-zinc-700" />
                                    <span className="text-xs font-mono text-zinc-500 uppercase">{loc.name}</span>
                                    <span className="text-[9px] text-zinc-800 font-mono ml-auto">{loc.users.length} users</span>
                                </div>

                                {/* Users */}
                                {expandedLocs[`${dept.name}-${loc.name}`] && (
                                    <div className="bg-zinc-950/30">
                                        {loc.users.map((user, userIdx) => (
                                            <div key={userIdx} className="p-4 pl-20 border-t border-zinc-900/30 hover:bg-zinc-900/20 transition-colors group flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                                        <Fingerprint className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                                                    </div>
                                                    <span className="text-xs font-mono font-medium text-zinc-400 uppercase">{user.user}</span>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className={cn(
                                                        "text-[9px] px-2 py-0.5 rounded border border-zinc-800 font-mono",
                                                        user.type === 'Admin' ? "text-amber-500 bg-amber-500/5" :
                                                            user.type === 'Privileged' ? "text-blue-400 bg-blue-400/5" : "text-zinc-600"
                                                    )}>
                                                        {user.type}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                                            <div className="h-full bg-zinc-700" style={{ width: `${user.trust}%` }} />
                                                        </div>
                                                        <span className="text-[9px] font-mono text-zinc-700">{user.trust}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[8px] uppercase tracking-widest">
                                                        <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                                        {user.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IdentityMatrix;
