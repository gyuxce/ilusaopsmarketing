import React from 'react';
import { TrendingUp, Users, CheckSquare, UserCheck } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useWorkItems } from '../hooks/useWorkItems';
import { useActivities } from '../hooks/useActivities';
import { attendanceService } from '../services/attendanceService';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatMoney, getLocalDateString } from '../utils/formatters';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  attendanceVersion?: number;
}

export function HomePage({ onNavigate, attendanceVersion = 0 }: HomePageProps) {
  const today = getLocalDateString();

  const { data: clients = [] } = useClients();
  const { data: workItems = [] } = useWorkItems();
  const { data: activities = [] } = useActivities();

  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ['attendance', 'today', today, attendanceVersion],
    queryFn: () => attendanceService.getLogs(today, today),
  });

  // Derived stats
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const doneTasks = workItems.filter(w => w.status === 'Done').length;
  const activeCampaigns = activities.filter(a => a.status === 'Active').length;
  const totalSpend = activities.reduce((sum, a) => sum + (a.budget || 0), 0);
  const clockedInToday = attendanceLogs.length;

  const stats = [
    { label: 'Active Clients', value: activeClients, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', tab: 'Clients' },
    { label: 'Tasks Done', value: doneTasks, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'Work' },
    { label: 'Active Campaigns', value: activeCampaigns, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'Ads Campaigns' },
    { label: 'Clocked In Today', value: clockedInToday, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'Attendance' },
  ];

  // Recent tasks (not done, ordered by created_at)
  const recentTasks = workItems
    .filter(w => w.status !== 'Done')
    .slice(0, 6);

  // Recent campaigns
  const recentCampaigns = activities.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Overview</h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          {formatDate(today)} · Marketing Ops Workspace
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => onNavigate(stat.tab)}
              className="bg-white border border-[#141414]/15 p-5 text-left hover:border-[#141414] hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-[8px] font-mono text-slate-400 uppercase group-hover:text-orange-600 transition-colors">View →</span>
              </div>
              <div className="text-3xl font-black text-[#141414] tabular-nums">{stat.value}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
            </button>
          );
        })}
      </div>

      {/* BOTTOM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Open Tasks */}
        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4 flex items-center justify-between">
            <span>Open Tasks</span>
            <button onClick={() => onNavigate('Work')} className="text-orange-600 hover:underline cursor-pointer text-[9px]">View All →</button>
          </h2>
          {recentTasks.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-400 text-center py-6">Semua task sudah selesai 🎉</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                  <span className="text-[#141414] font-bold truncate flex-1">{task.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-bold uppercase border shrink-0 ${
                    task.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-300' :
                    task.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>{task.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Summary */}
        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4 flex items-center justify-between">
            <span>Campaigns</span>
            <button onClick={() => onNavigate('Ads Campaigns')} className="text-orange-600 hover:underline cursor-pointer text-[9px]">View All →</button>
          </h2>
          <div className="mb-3 p-3 bg-[#141414] text-white font-mono text-[10px] flex items-center justify-between">
            <span className="uppercase tracking-wider">Total Budget</span>
            <span className="font-black text-sm">{formatMoney(totalSpend)}</span>
          </div>
          {recentCampaigns.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-400 text-center py-4">Belum ada campaign.</p>
          ) : (
            <div className="space-y-2">
              {recentCampaigns.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                  <span className="text-[#141414] font-bold truncate flex-1">{a.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-bold uppercase border shrink-0 ${
                    a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                    a.status === 'Paused' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clocked In Today */}
      {attendanceLogs.length > 0 && (
        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4">
            Tim yang Hadir Hari Ini ({attendanceLogs.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {attendanceLogs.map(log => (
              <span key={log.id} className="text-[9px] font-mono px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase">
                {(log.users as any)?.name ?? log.user_id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
