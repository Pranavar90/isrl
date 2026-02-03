import React from 'react';
import {
    BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    ShieldAlert,
    Fingerprint,
    Search,
    CheckCircle2,
    Users,
    Activity,
    Info
} from 'lucide-react';

const DeepDiveView = ({ alert, onAction }) => {
    // Use real SHAP features if available, else mock
    const shapFeatures = alert.shap && alert.features ? alert.features.map((f, i) => ({
        feature: f,
        contribution: alert.shap[i],
        description: Math.abs(alert.shap[i]) > 0.1 ? `Primary deviation factor` : 'Minor variance'
    })) : [
        { feature: 'logon_count', contribution: 0.15, description: 'Slightly above mean' },
        { feature: 'file_count', contribution: 0.65, description: 'Significant outlier activity' },
        { feature: 'pc_rarity', contribution: 0.25, description: 'Atypical resource interaction' },
    ];

    const peerData = [
        { name: 'Subject', value: alert.score },
        { name: 'Peer Avg', value: Math.max(12, Math.round(alert.score * 0.35)) },
        { name: 'Z-Score', value: Math.round(alert.score * 0.45) },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Subject Profile */}
            <div className="flex justify-between items-start">
                <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Fingerprint className="w-8 h-8 text-zinc-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-mono font-semibold tracking-tight text-zinc-100 uppercase">
                                Node: {alert.user}
                            </h1>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-sm uppercase tracking-widest">
                                Engineering
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Event_ID: {alert.id}</span>
                            <span className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> Risk: {alert.score}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onAction(alert.id, 'dismiss')}
                        className="h-9 px-4 text-xs font-semibold bg-zinc-900 text-zinc-400 border border-border hover:bg-zinc-800 hover:text-zinc-200 transition-all rounded transition-colors"
                    >
                        Resolve Event
                    </button>
                    <button
                        onClick={() => onAction(alert.id, 'escalate')}
                        className="h-9 px-4 text-xs font-semibold bg-red-950 text-red-200 border border-red-900 hover:bg-red-900 transition-all rounded transition-colors"
                    >
                        Escalate Node
                    </button>
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Behavioral Variance (SHAP) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Behavioral Variance Explainer</h3>
                    </div>

                    <div className="space-y-5">
                        {shapFeatures.map((f, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase">{f.feature}</span>
                                    <span className="text-[11px] font-bold text-zinc-400">+{Math.round(f.contribution * 100)}%</span>
                                </div>
                                <div className="w-full h-1 bg-zinc-900 rounded-full">
                                    <div
                                        className="h-full bg-zinc-600 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, f.contribution * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2 font-mono italic">
                                  // {f.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-5 bg-zinc-900/30 border border-zinc-800 rounded">
                        <div className="flex gap-3 items-start">
                            <Info className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                                <span className="text-zinc-300 block mb-2">INTELLIGENCE_REPORT:</span>
                                {alert.summary}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Statistical Benchmarking */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Statistical Benchmarking</h3>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#1f1f23" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#52525b', fontFamily: 'monospace' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                                />
                                <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={32}>
                                    {peerData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index === 0 ? '#52525b' : '#27272a'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-700 tracking-tighter uppercase px-2">
                        <span>Ref_Standard: 4.2r_LSCERT</span>
                        <span>Dev_Threshold: 1.84 sigma</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeepDiveView;
