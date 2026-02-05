import React, { useState } from 'react';
import {
    FlaskConical,
    Settings2,
    ShieldAlert,
    CheckCircle2,
    AlertTriangle,
    Play,
    RotateCcw
} from 'lucide-react';
import axios from 'axios';

const ScenarioSimulator = () => {
    const [params, setParams] = useState({
        failed_attempts: 0,
        hour_deviation: 0,
        is_impossible_travel: false,
        is_malicious_ip: false,
        is_new_device: false,
        is_resigned: false,
        is_notice_period: false,
        recent_dept_change: false,
        user_role: "Standard"
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const scores = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const host = window.location.hostname;
            const res = await axios.post(`http://${host}:8000/simulate/score`, params);
            setResult(res.data);
        } catch (err) {
            console.error("Simulation failed", err);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setParams({
            failed_attempts: 0,
            hour_deviation: 0,
            is_impossible_travel: false,
            is_malicious_ip: false,
            is_new_device: false,
            is_resigned: false,
            is_notice_period: false,
            recent_dept_change: false,
            user_role: "Standard"
        });
        setResult(null);
    };

    const Toggle = ({ label, checked, onChange }) => (
        <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-wider">{label}</span>
            <div className="relative">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
        </label>
    );

    return (
        <div className="p-10 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                <div className="p-3 bg-zinc-900 rounded-lg">
                    <FlaskConical className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-mono font-bold tracking-tighter text-zinc-100 uppercase mb-1">Risk Scenario Simulator</h1>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Predictive Modeling // Hypothetical Access Request</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controls Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings2 className="w-4 h-4 text-zinc-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">Parameters</h3>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase">
                                    <span>Failed Attempts (15min)</span>
                                    <span className="text-emerald-500">{params.failed_attempts}</span>
                                </div>
                                <input
                                    type="range" min="0" max="20"
                                    value={params.failed_attempts}
                                    onChange={(e) => setParams({ ...params, failed_attempts: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase">
                                    <span>Time Deviation (Hours)</span>
                                    <span className="text-emerald-500">{params.hour_deviation}h</span>
                                </div>
                                <input
                                    type="range" min="0" max="12"
                                    value={params.hour_deviation}
                                    onChange={(e) => setParams({ ...params, hour_deviation: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Dropdowns */}
                        <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">User Role</label>
                                <select
                                    value={params.user_role}
                                    onChange={(e) => setParams({ ...params, user_role: e.target.value })}
                                    className="w-full bg-black border border-zinc-800 text-zinc-300 text-[11px] p-2 rounded focus:border-emerald-500 outline-none uppercase font-mono"
                                >
                                    <option value="Standard">Standard User</option>
                                    <option value="Privileged">Privileged User</option>
                                    <option value="Admin">Administrator</option>
                                </select>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                            <Toggle label="Impossible Travel" checked={params.is_impossible_travel} onChange={(v) => setParams({ ...params, is_impossible_travel: v })} />
                            <Toggle label="Malicious IP Reputation" checked={params.is_malicious_ip} onChange={(v) => setParams({ ...params, is_malicious_ip: v })} />
                            <Toggle label="Unregistered Device" checked={params.is_new_device} onChange={(v) => setParams({ ...params, is_new_device: v })} />
                        </div>

                        {/* Context Toggles */}
                        <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                            <h4 className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-2">Contextual Signals (Vinfi)</h4>
                            <Toggle label="Resigned State" checked={params.is_resigned} onChange={(v) => setParams({ ...params, is_resigned: v })} />
                            <Toggle label="Notice Period" checked={params.is_notice_period} onChange={(v) => setParams({ ...params, is_notice_period: v })} />
                            <Toggle label="Recent Dept Change" checked={params.recent_dept_change} onChange={(v) => setParams({ ...params, recent_dept_change: v })} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSimulate}
                                disabled={loading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? <span className="animate-spin">⟳</span> : <Play className="w-4 h-4" />}
                                Analyze
                            </button>
                            <button
                                onClick={reset}
                                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Gauge Area */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-12 flex flex-col items-center justify-center relative min-h-[400px]">
                        {!result ? (
                            <div className="text-center space-y-4 opacity-50">
                                <FlaskConical className="w-16 h-16 text-zinc-700 mx-auto" />
                                <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Awaiting Input Parameters...</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500">
                                <div className="flex justify-between items-center mb-12">
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Total Risk Score</p>
                                        <div className={`text-6xl font-mono font-bold tracking-tighter ${result.score > 75 ? 'text-red-500' : result.score > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {result.score.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded border border-current font-mono text-xs uppercase font-bold tracking-widest ${result.score > 75 ? 'text-red-500 bg-red-500/10' : result.score > 40 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                                        {result.score > 85 ? 'Critical' : result.score > 65 ? 'High' : result.score > 45 ? 'Medium' : 'Low'}
                                    </div>
                                </div>

                                {/* Component Scores */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800">
                                        <span className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">Context Score</span>
                                        <span className="text-xl font-mono text-purple-400 font-bold">{result.context_score.toFixed(0)}</span>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800">
                                        <span className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">ML Score</span>
                                        <span className="text-xl font-mono text-blue-400 font-bold">{result.ml_score.toFixed(0)}</span>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800">
                                        <span className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">Rule Score</span>
                                        <span className="text-xl font-mono text-amber-400 font-bold">{result.rule_score.toFixed(0)}</span>
                                    </div>
                                </div>

                                {/* Explanation */}
                                {result.explanation && (
                                    <div className="p-6 bg-zinc-900/30 border-l-2 border-zinc-700">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Automated Risk Analysis</h4>
                                        <p className="text-xs font-mono text-zinc-300 leading-relaxed italic">
                                            "{result.explanation.summary}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScenarioSimulator;
