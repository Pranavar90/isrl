import React, { useState, useEffect } from 'react';
import LiveStream from './components/LiveStream';
import DeepDiveView from './components/DeepDiveView';
import {
  Shield,
  Activity,
  Users,
  AlertCircle,
  LayoutDashboard,
  Database,
  Bell,
  Settings,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [stats, setStats] = useState({
    totalEvents: 1240,
    highRisk: 12,
    monitoredUsers: 450
  });

  const handleAction = async (alertId, action) => {
    try {
      await axios.post('http://localhost:8000/alerts/action', {
        alert_id: alertId,
        action: action
      });
      setNotification({ type: action, message: `System: node_${alertId} ${action === 'escalate' ? 'escalated to L2' : 'cleared from queue'}` });
      setTimeout(() => setNotification(null), 3000);
      setSelectedAlert(null);
      if (action === 'escalate') {
        setStats(prev => ({ ...prev, highRisk: Math.max(0, prev.highRisk - 1) }));
      }
    } catch (err) {
      console.error("Failed to process action", err);
      setNotification({ type: 'error', message: 'CRITICAL: Operation broadcast failure' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'nodes', icon: Database, label: 'Data Nodes' },
    { id: 'users', icon: Users, label: 'Identity Matrix' },
    { id: 'alerts', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar - Functional & Slim */}
      <aside className="w-16 border-r border-[#1f1f23] flex flex-col items-center py-6 bg-[#0c0c0e] justify-between z-20">
        <div className="flex flex-col items-center gap-10">
          <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 shadow-2xl">
            <Activity className="w-5 h-5 text-zinc-400" />
          </div>
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "p-3 rounded-xl transition-all relative group",
                  currentView === item.id
                    ? "bg-zinc-800 text-zinc-100 shadow-lg"
                    : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
                {currentView === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-zinc-400 rounded-r-full" />
                )}
                {/* Tooltip on hover */}
                <div className="absolute left-20 bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest z-50">
                  {item.label}
                </div>
              </button>
            ))}
          </nav>
        </div>

        <button className="p-3 text-zinc-600 hover:text-zinc-400 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col relative">
        {/* Top Header - Ultra Muted */}
        <header className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-8 bg-[#09090b]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 uppercase">
              Sector_04 // Neural_Link // Terminal_01
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5 font-bold text-zinc-400">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                  connectionStatus === 'connected' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse"
                )} />
                {connectionStatus.toUpperCase()}
              </span>
              <button
                onClick={() => {
                  const mock = { id: 'MOCK_' + Date.now(), timestamp: new Date().toISOString(), user: 'TST_USER', pc: 'PC-999', score: 92, summary: 'Manual diagnostic trigger initiated by administrator.' };
                  setSelectedAlert(mock);
                }}
                className="px-2 py-0.5 border border-zinc-800 rounded hover:bg-zinc-800 transition-colors text-[9px]"
              >
                SIMULATE_NODE
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center p-1">
                <div className="w-full h-full bg-zinc-800 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        {currentView === 'dashboard' ? (
          <main className="flex-1 flex overflow-hidden">
            {/* Left Feed - Data Dense */}
            <div className="w-[340px] border-r border-[#1f1f23] flex flex-col bg-[#0c0c0e]/30">
              <div className="p-4 border-b border-[#1f1f23] flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Anomaly Pipeline</h2>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <LiveStream onSelectAlert={setSelectedAlert} selectedId={selectedAlert?.id} />
              </div>
            </div>

            {/* Right Analysis - Detailed */}
            <div className="flex-1 flex flex-col bg-[#09090b]">
              {selectedAlert ? (
                <div className="flex-1 overflow-y-auto p-10 max-w-5xl mx-auto w-full">
                  <div className="flex items-center gap-2 mb-8 text-[10px] text-zinc-600 font-mono">
                    <span>SECTOR_ROOT</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>ANOMALY_LOGS</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-zinc-400">{selectedAlert.id}</span>
                  </div>
                  <DeepDiveView alert={selectedAlert} onAction={handleAction} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative">
                    <Shield className="w-24 h-24 text-zinc-900 absolute -inset-2 blur-2xl animate-pulse" />
                    <Shield className="w-24 h-24 text-zinc-900 opacity-20 relative z-10" />
                  </div>
                  <p className="mt-8 text-[10px] font-mono tracking-widest text-zinc-700 uppercase">
                    Waiting for node selection
                  </p>
                  <div className="mt-4 flex gap-2">
                    <div className="w-8 h-px bg-zinc-900" />
                    <div className="w-2 h-px bg-zinc-900" />
                    <div className="w-16 h-px bg-zinc-900" />
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-12 border border-zinc-900 rounded-2xl bg-[#0c0c0e]">
              <AlertCircle className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
              <h2 className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-widest">{currentView} Module Encrypted</h2>
              <p className="text-xs text-zinc-700 font-mono">Insufficient privileges to access high-level database metrics.</p>
            </div>
          </div>
        )}
        {/* Notification Toast */}
        {notification && (
          <div className={cn(
            "fixed bottom-8 right-8 px-6 py-3 rounded border font-mono text-[10px] z-50 animate-in slide-in-from-bottom-4 duration-300 shadow-2xl",
            notification.type === 'escalate' ? "bg-red-950/90 border-red-900 text-red-200" :
              notification.type === 'error' ? "bg-amber-950/90 border-amber-900 text-amber-200" :
                "bg-zinc-900/90 border-zinc-700 text-zinc-300"
          )}>
            {notification.message.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
