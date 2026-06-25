import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  DollarSign,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useActivities } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import { attendanceService } from '../services/attendanceService';
import { performanceService } from '../services/performanceService';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatMoney, getLocalDateString } from '../utils/formatters';

const WORK_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;
type WorkBoardStatus = typeof WORK_COLUMNS[number];

const normalizeWorkStatus = (status?: string): WorkBoardStatus => {
  if (WORK_COLUMNS.includes(status as WorkBoardStatus)) return status as WorkBoardStatus;
  if (status === 'Completed') return 'Done';
  return 'To Do';
};

interface HomePageProps {
  onNavigate: (tab: string) => void;
  attendanceVersion?: number;
}

export function HomePage({ onNavigate, attendanceVersion = 0 }: HomePageProps) {
  const today = getLocalDateString();

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: activities = [] } = useActivities();

  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ['attendance', 'today', today, attendanceVersion],
    queryFn: () => attendanceService.getLogs(today, today),
  });

  const { data: performanceEntries = [] } = useQuery({
    queryKey: ['performanceEntries', 'dashboard'],
    queryFn: () => performanceService.getAll(),
  });

  const workBoardItems = [
    ...projects.map(project => ({
      id: project.id,
      title: project.project_name,
      status: normalizeWorkStatus(project.status),
      type: 'Project' as const,
      client_id: project.client_id,
      start_date: project.start_date,
      due_date: project.due_date,
    })),
    ...activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      status: normalizeWorkStatus(activity.status),
      type: 'Ads' as const,
      client_id: activity.client_id,
      start_date: activity.start_date,
      due_date: activity.end_date,
    })),
  ];

  const workStatusCounts: Record<WorkBoardStatus, number> = {
    'To Do': 0,
    'In Progress': 0,
    Review: 0,
    Done: 0,
  };
  workBoardItems.forEach(item => {
    workStatusCounts[item.status] += 1;
  });

  const activeClients = clients.filter(client => client.status === 'Active').length;
  const openWorkItems = workBoardItems.filter(item => item.status !== 'Done').length;
  const activeCampaigns = activities.filter(activity => activity.status === 'Active').length;
  const totalBudget = activities.reduce((sum, activity) => sum + Number(activity.budget || 0), 0);
  const totalSpend = performanceEntries.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
  const totalLeads = performanceEntries.reduce((sum, entry) => sum + Number(entry.results || 0), 0);
  const totalClicks = performanceEntries.reduce((sum, entry) => sum + Number(entry.clicks || 0), 0);
  const totalImpressions = performanceEntries.reduce((sum, entry) => sum + Number(entry.impressions || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalWebinar = activities.reduce((sum, activity) => sum + Number(activity.participants_webinar || 0), 0);
  const totalMapping = activities.reduce((sum, activity) => sum + Number(activity.participants_mapping || 0), 0);
  const totalInterview = activities.reduce((sum, activity) => sum + Number(activity.participants_interview || 0), 0);
  const clockedInToday = attendanceLogs.length;

  const stats = [
    { label: 'Active Clients', value: activeClients, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', tab: 'Clients' },
    { label: 'Open Work', value: openWorkItems, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'Work' },
    { label: 'Active Campaigns', value: activeCampaigns, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'Ads Campaigns' },
    { label: 'Clocked In Today', value: clockedInToday, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'Attendance' },
  ];

  const workItemsNeedingAttention = [...workBoardItems]
    .filter(item => item.status !== 'Done')
    .sort((a, b) => {
      const rank: Record<WorkBoardStatus, number> = { Review: 0, 'In Progress': 1, 'To Do': 2, Done: 3 };
      return rank[a.status] - rank[b.status];
    })
    .slice(0, 6);

  const campaignSummaries = activities.map(activity => {
    const entries = performanceEntries.filter(entry => entry.activity_id === activity.id);
    const spend = entries.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
    const leads = entries.reduce((sum, entry) => sum + Number(entry.results || 0), 0);
    const clicks = entries.reduce((sum, entry) => sum + Number(entry.clicks || 0), 0);
    const impressions = entries.reduce((sum, entry) => sum + Number(entry.impressions || 0), 0);
    const cpl = leads > 0 ? spend / leads : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return { activity, spend, leads, cpl, ctr };
  });

  const topCampaigns = [...campaignSummaries]
    .filter(item => item.leads > 0)
    .sort((a, b) => a.cpl - b.cpl)
    .slice(0, 4);

  const attentionCampaigns = [...campaignSummaries]
    .filter(item => item.leads === 0 || item.cpl > Number(item.activity.benchmark_cpl || 1500) || item.ctr > 10)
    .slice(0, 4);

  const adsInsightCards = [
    { label: 'Actual Spend', value: formatMoney(totalSpend), sub: `Budget: ${formatMoney(totalBudget)}`, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Leads', value: totalLeads.toLocaleString('id-ID'), sub: `CPL: ${formatMoney(avgCpl)}`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Average CTR', value: `${avgCtr.toFixed(2)}%`, sub: `${totalClicks.toLocaleString('id-ID')} clicks`, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Interview Funnel', value: totalInterview.toLocaleString('id-ID'), sub: `${totalWebinar} webinar / ${totalMapping} pemetaan`, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Overview</h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          {formatDate(today)} - Marketing Ops Workspace
        </p>
      </div>

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
                <span className="text-[8px] font-mono text-slate-400 uppercase group-hover:text-orange-600 transition-colors">View -&gt;</span>
              </div>
              <div className="text-3xl font-black text-[#141414] tabular-nums">{stat.value}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adsInsightCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate('Ads Campaigns')}
              className="bg-white border border-[#141414]/15 p-4 text-left hover:border-orange-600 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-mono uppercase text-slate-400">{card.label}</div>
                  <div className="text-lg font-black text-[#141414] truncate">{card.value}</div>
                  <div className="text-[9px] font-mono uppercase text-slate-500 truncate">{card.sub}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4 flex items-center justify-between">
            <span>Work yang Perlu Diperhatikan</span>
            <button onClick={() => onNavigate('Work')} className="text-orange-600 hover:underline cursor-pointer text-[9px]">View All -&gt;</button>
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {WORK_COLUMNS.map(column => (
              <button
                key={column}
                onClick={() => onNavigate('Work')}
                className="border border-slate-200 bg-slate-50 p-2 text-left hover:border-[#141414] transition-colors"
              >
                <span className="block text-[8px] font-mono uppercase text-slate-500 truncate">{column}</span>
                <strong className="block text-lg font-black text-[#141414] tabular-nums">{workStatusCounts[column]}</strong>
              </button>
            ))}
          </div>
          {workItemsNeedingAttention.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-400 text-center py-6">Semua work item sudah selesai.</p>
          ) : (
            <div className="space-y-2">
              {workItemsNeedingAttention.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                  <div className="min-w-0 flex-1">
                    <span className="text-[#141414] font-bold truncate block">{task.title}</span>
                    <span className="text-[8px] text-slate-400 uppercase">
                      {task.type}
                      {task.due_date ? ` - due ${task.due_date}` : ''}
                    </span>
                  </div>
                  <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-bold uppercase border shrink-0 ${
                    task.status === 'Review' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>{task.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4 flex items-center justify-between">
            <span>Campaign Paling Efisien</span>
            <button onClick={() => onNavigate('Ads Campaigns')} className="text-orange-600 hover:underline cursor-pointer text-[9px]">View All -&gt;</button>
          </h2>
          <div className="mb-3 p-3 bg-[#141414] text-white font-mono text-[10px] flex items-center justify-between">
            <span className="uppercase tracking-wider">Total Actual Spend</span>
            <span className="font-black text-sm">{formatMoney(totalSpend)}</span>
          </div>
          {topCampaigns.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-400 text-center py-4">Belum ada campaign dengan leads.</p>
          ) : (
            <div className="space-y-2">
              {topCampaigns.map(item => (
                <div key={item.activity.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                  <span className="text-[#141414] font-bold truncate">{item.activity.title}</span>
                  <span className="text-slate-500">{item.leads} leads</span>
                  <span className="font-bold text-orange-700">{formatMoney(item.cpl)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span>Campaign yang Perlu Dicek</span>
          </h2>
          {attentionCampaigns.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-400 text-center py-4">Tidak ada alert campaign saat ini.</p>
          ) : (
            <div className="space-y-2">
              {attentionCampaigns.map(item => {
                const benchmark = Number(item.activity.benchmark_cpl || 1500);
                const reason = item.leads === 0
                  ? 'Belum ada leads'
                  : item.ctr > 10
                    ? 'CTR perlu dicek'
                    : `CPL di atas benchmark ${formatMoney(benchmark)}`;
                return (
                  <div key={item.activity.id} className="p-2.5 bg-amber-50 border border-amber-200 font-mono text-[10px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-[#141414] truncate">{item.activity.title}</span>
                      <span className="text-amber-800 font-bold uppercase shrink-0">{reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#141414]/15 p-5">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4">
            Funnel Harunokaze
          </h2>
          <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
            <div className="bg-orange-50 border border-orange-200 p-3">
              <span className="block text-orange-700 uppercase text-[8px]">Webinar</span>
              <strong className="text-lg text-[#141414]">{totalWebinar.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3">
              <span className="block text-slate-500 uppercase text-[8px]">Pemetaan</span>
              <strong className="text-lg text-[#141414]">{totalMapping.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3">
              <span className="block text-slate-500 uppercase text-[8px]">Interview</span>
              <strong className="text-lg text-[#141414]">{totalInterview.toLocaleString('id-ID')}</strong>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-mono text-slate-500">
            Interview rate dari total leads: {totalLeads > 0 ? ((totalInterview / totalLeads) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

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
