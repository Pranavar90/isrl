import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Brush, ComposedChart, Line
} from 'recharts';
import {
    ShieldAlert,
    Fingerprint,
    Search,
    CheckCircle2,
    Users,
    Activity,
    Info,
    Share2,
    X,
    MessageSquare,
    AlertTriangle,
    BarChart3,
    TrendingUp,
    Zap
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DeepDiveView = ({ alert, onAction }) => {
    const [activityData, setActivityData] = React.useState([]);
    const [deptData, setDeptData] = React.useState([]);
    const [showModal, setShowModal] = React.useState(false);
    const [comment, setComment] = React.useState('');
    const [modalAction, setModalAction] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const host = window.location.hostname;
                const [activityRes, deptRes] = await Promise.all([
                    axios.get(`http://${host}:8000/metrics/activity`),
                    axios.get(`http://${host}:8000/metrics/dept_risk`)
                ]);
                setActivityData(activityRes.data);
                setDeptData(deptRes.data);
            } catch (err) {
                console.error("Failed to fetch analytics data", err);
            }
        };
        fetchData();
        // Refresh every 10s for the "sliding window" feel
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [alert.id]);

    const handleConfirm = (type) => {
        onAction(alert.id, type, comment);
        setShowModal(false);
        setComment('');
    };

    const shapFeatures = alert.shap && alert.features ? alert.features.map((f, i) => ({
        feature: f,
        contribution: alert.shap[i],
        description: Math.abs(alert.shap[i]) > 0.1 ? `High attribution coefficient` : 'Baseline variance'
    })) : [
        { feature: 'device_trust', contribution: 0.15, description: 'Stable telemetry' },
        { feature: 'failed_attempts', contribution: 0.65, description: 'Statistically significant deviation' },
        { feature: 'location_rarity', contribution: 0.25, description: 'Geospatial outlier' },
    ];

    const peerData = [
        { name: 'Subject', value: alert.score },
        { name: 'Peer Avg', value: Math.max(12, Math.round(alert.score * 0.35)) },
        { name: 'Z-Score', value: Math.round(alert.score * 0.45) },
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Subject Profile */}
            <div className="flex justify-between items-start border-b border-zinc-800 pb-8">
                <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                        <Fingerprint className="w-8 h-8 text-zinc-500 group-hover:text-emerald-500 transition-colors z-10" />
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-mono font-bold tracking-tight text-zinc-100 uppercase">
                                NODE_ID: {alert.user}
                            </h1>
                            <span className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700 rounded-sm uppercase tracking-[0.2em] font-bold">
                                {alert.department || 'INTERNAL_DEPT'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-zinc-600" /> TRACE_REF: {alert.id}</span>
                            <span className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-red-500" /> <span className="text-red-500 font-bold">RISK_COEFFICIENT:</span> {alert.score.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setModalAction('resolve'); setShowModal(true); }}
                        className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-zinc-950 text-zinc-500 border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200 transition-all rounded"
                    >
                        Resolve Entry
                    </button>
                    <button
                        onClick={() => { setModalAction('escalate'); setShowModal(true); }}
                        className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-900/30 hover:text-red-400 transition-all rounded shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                    >
                        Escalate Trace
                    </button>
                </div>
            </div>

            {/* Top Analysis Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                {/* Factor Attribution Analysis (GRAPH) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                        <BarChart3 className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Factor Attribution coefficients</h3>
                    </div>

                    <div className="h-[250px] w-full bg-zinc-950/30 rounded border border-zinc-900/50 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={shapFeatures.map(f => ({ name: f.feature, value: f.contribution * 100 }))}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f1f23" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    fontSize={9}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontFamily: 'monospace' }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '2px' }}
                                    itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                                />
                                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={20}>
                                    {shapFeatures.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.contribution > 0.4 ? '#ef4444' : '#10b981'} fillOpacity={0.6} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Information Synthesis Panels (Dual Box) */}
                <div className="grid grid-cols-1 gap-6">
                    {/* User Profile / Normal Behavior Context */}
                    <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg relative group">
                        <div className="flex items-center gap-3 mb-4 border-b border-zinc-900 pb-3">
                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Baseline user Behavior Profile</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <span className="block text-[8px] text-zinc-600 uppercase font-mono">Temporal_Alignment</span>
                                    <span className="block text-[10px] text-zinc-300 font-mono">09:00 - 18:00 (Standard)</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[8px] text-zinc-600 uppercase font-mono">Access_Vector</span>
                                    <span className="block text-[10px] text-zinc-300 font-mono">Engineering_Subnet_A</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <span className="block text-[8px] text-zinc-600 uppercase font-mono">Device_Trust_Index</span>
                                    <span className="block text-[10px] text-emerald-500 font-mono italic">Verified_Secure (89%)</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[8px] text-zinc-600 uppercase font-mono">Role_Classification</span>
                                    <span className="block text-[10px] text-zinc-300 font-mono uppercase">System_Developer</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Intelligence Report / GenAI synthesis */}
                    <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg relative overflow-hidden h-full">
                        <div className="flex items-center gap-3 mb-4 border-b border-zinc-900 pb-3">
                            <Info className="w-3.5 h-3.5 text-zinc-500" />
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Intelligence Synthesis Report</h3>
                        </div>
                        <div className="min-h-[60px] flex items-start gap-4">
                            <div className={cn(
                                "w-1 h-12 rounded-full shrink-0 transition-all duration-1000",
                                alert.score > 70 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-emerald-500/20"
                            )} />
                            <div className="space-y-6 w-full">
                                <p className="text-[10px] text-zinc-500 font-mono leading-relaxed bg-zinc-900/20 p-4 border-l-2 border-zinc-800">
                                    <span className="text-zinc-400 block mb-1 font-bold tracking-widest uppercase italic font-sans underline decoration-zinc-800 underline-offset-4">Deterministic Synopsis Attribution:</span>
                                    {alert.summary || "Incipient observation phase. No critical deviations detected in current telemetry window."}
                                </p>

                                <div className="p-4 bg-zinc-900/30 border-l-2 border-blue-900/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                        <div className="text-[6px] font-mono uppercase tracking-[.3em] font-bold">PHI_3_ENGINE_V2</div>
                                    </div>
                                    <span className="text-blue-400/70 block mb-2 text-[9px] font-bold tracking-widest uppercase italic font-sans">Interpretive AI Narration:</span>
                                    <p className="text-[10px] text-zinc-300 font-mono leading-relaxed italic">
                                        {alert.narrative || (alert.score > 40 ? "// Awaiting neural synthesis... (Ollama:Phi3)" : "// Narrative suppressed for low-probability event.")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Insight Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 pt-10">
                {/* Dept Risk Radar */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                        <Share2 className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Departmental Risk Surface</h3>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center p-4 bg-zinc-950/20 border border-zinc-900/50 rounded">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={deptData}>
                                <PolarGrid stroke="#18181b" />
                                <PolarAngleAxis
                                    dataKey="dept"
                                    tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
                                />
                                <Radar
                                    name="Risk"
                                    dataKey="risk"
                                    stroke="#ec4899"
                                    fill="#ec4899"
                                    fillOpacity={0.2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Leaderboard */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">High-Activity Attribution ranking</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { user: 'mei_sharma', activity: 48, risk: 92 },
                            { user: 'j_doe_x', activity: 85, risk: 24 },
                            { user: 'admin_sys_04', activity: 62, risk: 45 },
                        ].map((u, i) => (
                            <div key={i} className="bg-zinc-950 border border-zinc-900 p-4 rounded group hover:border-zinc-700 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase">{u.user}</span>
                                    <span className="text-[9px] font-mono text-zinc-600 uppercase">RANK_{i + 1}</span>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                                            <span>Telemetry_Density</span>
                                            <span>{u.activity}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500/40" style={{ width: `${u.activity}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between text-[8px] font-mono text-red-500 uppercase font-bold">
                                            <span>Risk_Index</span>
                                            <span>{u.risk}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500/40" style={{ width: `${u.risk}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                {modalAction === 'escalate' ? 'Acknowledge Threat Pattern' : 'Declassify Security Event'}
                            </h2>
                            <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-zinc-600 hover:text-zinc-200" /></button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Scientific Attribution / Remarks</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.data)}
                                    className="w-full bg-black border border-zinc-900 rounded p-4 text-[11px] text-zinc-300 h-32 focus:outline-none focus:border-emerald-900/50 font-mono transition-all"
                                    placeholder="Annotate technical rationale..."
                                />
                            </div>

                            <button
                                onClick={() => handleConfirm(modalAction === 'escalate' ? 'confirm_threat' : 'resolve_true')}
                                className={cn(
                                    "w-full py-4 text-[10px] font-bold uppercase tracking-[0.3em] rounded transition-all shadow-lg",
                                    modalAction === 'escalate'
                                        ? "bg-red-600 text-white hover:bg-red-500 shadow-red-900/20"
                                        : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20"
                                )}
                            >
                                {modalAction === 'escalate' ? 'Execute Escalation' : 'Confirm Resolution'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepDiveView;
