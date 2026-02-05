import React, { useState, useEffect } from 'react';
import LiveStream from './components/LiveStream';
import DeepDiveView from './components/DeepDiveView';
import DataNodes from './components/DataNodes';
import IdentityMatrix from './components/IdentityMatrix';
import NotificationsView from './components/NotificationsView';
import GlobalTrend from './components/GlobalTrend';
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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [liveEvents, setLiveEvents] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 500000,
    highRisk: 1420,
    monitoredUsers: 5000
  });

  useEffect(() => {
    const host = window.location.hostname;
    const ws = new WebSocket(`ws://${host}:8000/ws/stream`);

    const fetchInitialData = async () => {
      try {
        const res = await axios.get(`http://${host}:8000/alerts/history`);
        setAlertHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch initial history", err);
      }
    };

    ws.onopen = () => {
      setConnectionStatus('connected');
      fetchInitialData();
    };

    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setLiveEvents(prev => [evt, ...prev].slice(0, 50));
        setAlertHistory(prev => [evt, ...prev].slice(0, 100));

        // Dynamic notification for high risk if not in notifications view
        if (evt.score > 80) {
          setNotification({
            type: 'escalate',
            message: `CRITICAL: High risk detected for ${evt.user} (${evt.score.toFixed(1)}%)`
          });
          setTimeout(() => setNotification(null), 5000);
        }
      } catch (err) {
        console.error("Failed to parse ws message", err);
      }
    };

    ws.onerror = () => setConnectionStatus('error');
    ws.onclose = () => setConnectionStatus('disconnected');

    return () => ws.close();
  }, []);

  const handleAction = async (alertId, action, comment = '') => {
    try {
      const host = window.location.hostname;
      await axios.post(`http://${host}:8000/alerts/action`, {
        alert_id: alertId,
        action: action,
        comment: comment
      });

      const displayAction = action.replace('_', ' ').toUpperCase();
      setNotification({
        type: action.includes('confirm') ? 'escalate' : 'success',
        message: `System: Action [${displayAction}] recorded for alert_${alertId.slice(-6)}`
      });

      setTimeout(() => setNotification(null), 3000);
      setSelectedAlert(null);

      if (action.includes('confirm') || action === 'escalate') {
        setStats(prev => ({ ...prev, highRisk: Math.max(0, prev.highRisk - 1) }));
      }
    } catch (err) {
      console.error("Failed to process action", err);
      setNotification({ type: 'error', message: 'CRITICAL: Operation broadcast failure' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleNotificationClick = (alert) => {
    setSelectedAlert(alert);
    setCurrentView('dashboard');
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'nodes', icon: Database, label: 'Data Nodes' },
    { id: 'users', icon: Users, label: 'Identity Matrix' },
    { id: 'alerts', icon: Bell, label: 'Notifications' },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <main className="flex-1 flex overflow-hidden">
            {/* Left Feed - Data Dense */}
            <div className="w-[340px] border-r border-[#1f1f23] flex flex-col bg-[#0c0c0e]/30">
              <div className="p-4 border-b border-[#1f1f23] flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Operational Activity Feed</h2>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                  <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <LiveStream
                  events={liveEvents}
                  onSelectAlert={setSelectedAlert}
                  selectedId={selectedAlert?.id}
                />
              </div>
            </div>

            {/* Right Analysis - Detailed */}
            <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pt-8 pb-12 w-full">
                {selectedAlert ? (
                  <>
                    <div className="flex items-center gap-2 mb-8 text-[10px] text-zinc-600 font-mono">
                      <span>SECTOR_ROOT</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>DATA_STREAMS</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-zinc-400">{selectedAlert.user}</span>
                    </div>
                    <DeepDiveView alert={selectedAlert} onAction={handleAction} />
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <Shield className="w-24 h-24 text-zinc-900 absolute -inset-2 blur-2xl animate-pulse" />
                      <Shield className="w-24 h-24 text-zinc-900 opacity-20 relative z-10" />
                    </div>
                    <p className="mt-8 text-[10px] font-mono tracking-widest text-zinc-700 uppercase">
                      Operational Overwatch: Nominal
                    </p>
                    <div className="mt-4 flex gap-2">
                      <div className="w-8 h-px bg-zinc-900" />
                      <div className="w-2 h-px bg-zinc-900" />
                      <div className="w-16 h-px bg-zinc-900" />
                    </div>
                  </div>
                )}

                {/* Global Analytics - Constant pulse across all views */}
                <div className="mt-12 -mx-8">
                  <GlobalTrend />
                </div>
              </div>
            </div>
          </main>
        );
      case 'nodes':
        return <div className="flex-1 overflow-y-auto"><DataNodes /></div>;
      case 'users':
        return <div className="flex-1 overflow-y-auto"><IdentityMatrix /></div>;
      case 'alerts':
        return <div className="flex-1 overflow-y-auto"><NotificationsView alerts={alertHistory} onNavigateToAlert={handleNotificationClick} /></div>;
      default:
        return null;
    }
  };

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
            </div>
          </div>
        </header>

        {renderContent()}

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
