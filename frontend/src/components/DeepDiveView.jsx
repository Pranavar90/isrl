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
    Info,
    Share2,
    X,
    MessageSquare,
    AlertTriangle
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';

const DeepDiveView = ({ alert, onAction }) => {
    const [graphData, setGraphData] = React.useState({ nodes: [], links: [] });
    const [showModal, setShowModal] = React.useState(false);
    const [comment, setComment] = React.useState('');
    const [modalAction, setModalAction] = React.useState(null);

    React.useEffect(() => {
        const fetchGraph = async () => {
            try {
                const res = await axios.get('http://localhost:8000/metrics/graph');
                setGraphData(res.data);
            } catch (err) {
                console.error("Failed to fetch graph", err);
            }
        };
        fetchGraph();
    }, [alert.id]);

    const handleConfirm = (type) => {
        onAction(alert.id, type, comment);
        setShowModal(false);
        setComment('');
    };

    // Use real SHAP features if available, else mock
    const shapFeatures = alert.shap && alert.features ? alert.features.map((f, i) => ({
        feature: f,
        contribution: alert.shap[i],
        description: Math.abs(alert.shap[i]) > 0.1 ? `Primary deviation factor` : 'Minor variance'
    })) : [
        { feature: 'device_trust', contribution: 0.15, description: 'Slightly above mean' },
        { feature: 'failed_attempts', contribution: 0.65, description: 'Significant outlier activity' },
        { feature: 'location_rarity', contribution: 0.25, description: 'Atypical resource interaction' },
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
                        onClick={() => { setModalAction('resolve'); setShowModal(true); }}
                        className="h-9 px-4 text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-all rounded"
                    >
                        Resolve Event
                    </button>
                    <button
                        onClick={() => { setModalAction('escalate'); setShowModal(true); }}
                        className="h-9 px-4 text-xs font-semibold bg-red-950 text-red-200 border border-red-900 hover:bg-red-900 transition-all rounded text-red-50"
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

                    {/* Relational Knowledge Graph */}
                    <div className="mt-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                            <Share2 className="w-4 h-4 text-zinc-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Relational Knowledge Graph</h3>
                        </div>
                        <div className="h-[300px] w-full bg-zinc-950/50 border border-zinc-900 rounded-lg overflow-hidden relative">
                            <ForceGraph2D
                                graphData={graphData}
                                nodeLabel="id"
                                nodeAutoColorBy="type"
                                nodeRelSize={6}
                                linkDirectionalParticles={1}
                                linkDirectionalParticleSpeed={0.01}
                                backgroundColor="#09090b"
                                height={300}
                                width={500}
                            />
                            <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-700 bg-zinc-950 px-2 py-0.5 border border-zinc-900 uppercase">
                                Subgraph_Mode: Active_Proximity
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Modal for Escalation/Resolution */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <div className="flex items-center gap-2">
                                {modalAction === 'escalate' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-200">
                                    {modalAction === 'escalate' ? 'Escalation Protocol' : 'Resolution Protocol'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-zinc-600 hover:text-zinc-400" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-zinc-500 uppercase">Analyst Briefing / Comment</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-300 h-24 focus:outline-none focus:border-zinc-700 font-mono"
                                    placeholder="Provide context for this decision..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {modalAction === 'escalate' ? (
                                    <>
                                        <button
                                            onClick={() => handleConfirm('confirm_threat')}
                                            className="bg-red-600 text-white text-[10px] font-bold py-3 uppercase tracking-widest rounded hover:bg-red-500 transition-colors"
                                        >
                                            Confirm Threat
                                        </button>
                                        <button
                                            onClick={() => handleConfirm('false_positive')}
                                            className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-3 uppercase tracking-widest rounded hover:bg-zinc-700 transition-colors"
                                        >
                                            False Positive
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleConfirm('resolve_true')}
                                            className="bg-emerald-600 text-white text-[10px] font-bold py-3 uppercase tracking-widest rounded hover:bg-emerald-500 transition-colors"
                                        >
                                            Close: Remediated
                                        </button>
                                        <button
                                            onClick={() => handleConfirm('resolve_fp')}
                                            className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-3 uppercase tracking-widest rounded hover:bg-zinc-700 transition-colors"
                                        >
                                            Close: Benign
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepDiveView;
