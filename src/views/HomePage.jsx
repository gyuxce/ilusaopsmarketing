import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { clientsService } from '../services/clientsService';
import { marketingService } from '../services/marketingService';
import { workService } from '../services/workService';
import { formatDate, formatMoney, getLocalDateString, parseLocalDate } from '../utils/formatters';

export function HomePage({ onNavigate, attendanceVersion = 0 }) {
  const [clients, setClients] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [performanceEntries, setPerformanceEntries] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const today = getLocalDateString();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [clientData, workData, activityData, performanceData, attendanceData] = await Promise.all([
        clientsService.getClients(false),
        workService.getWorkItems(),
        marketingService.getActivities(),
        marketingService.getPerformanceEntries(),
        attendanceService.getLogs(today, today)
      ]);

      setClients(clientData || []);
      setWorkItems(workData || []);
      setActivities(activityData || []);
      setPerformanceEntries(performanceData || []);
      setAttendanceLogs(attendanceData || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setFeedback({ text: 'Some dashboard data could not be loaded.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadDashboard, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceVersion]);

  const showFeedback = (text, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const markDone = async (item) => {
    try {
      await workService.updateWorkItem(item.id, {
        status: 'Done',
        completed_at: new Date().toISOString()
      });
      showFeedback('Task marked as done.');
      await loadDashboard();
    } catch (error) {
      console.error('Failed to update task:', error);
      showFeedback('Task could not be updated.', true);
    }
  };

  const activeClients = clients.filter(client => client.status === 'Active' && client.deleted_at === null);
  const openWork = workItems.filter(item => item.status !== 'Done' && item.deleted_at === null);
  const todayDate = parseLocalDate(today);

  const needsAttention = openWork
    .filter(item => {
      const isHighPriority = item.priority === 'Urgent' || item.priority === 'High';
      const isOverdue = item.due_date && parseLocalDate(item.due_date) < todayDate;
      return isHighPriority || isOverdue;
    })
    .sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
      return parseLocalDate(a.due_date || '2999-12-31') - parseLocalDate(b.due_date || '2999-12-31');
    })
    .slice(0, 5);

  const latestMetricDate = performanceEntries.reduce(
    (latest, entry) => entry.metric_date > latest ? entry.metric_date : latest,
    today
  );
  const focusDate = parseLocalDate(latestMetricDate);
  const day = focusDate.getDay();
  const monday = new Date(focusDate);
  monday.setDate(focusDate.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = getLocalDateString(monday);
  const weekEnd = getLocalDateString(sunday);

  const weeklyEntries = performanceEntries.filter(
    entry => entry.metric_date >= weekStart && entry.metric_date <= weekEnd
  );

  const campaignSummary = activities
    .map(activity => {
      const entries = weeklyEntries.filter(entry => entry.activity_id === activity.id);
      const spend = entries.reduce((total, entry) => total + Number(entry.spend || 0), 0);
      const results = entries.reduce((total, entry) => total + Number(entry.results || 0), 0);
      const revenue = entries.reduce((total, entry) => total + Number(entry.revenue || 0), 0);
      return {
        activity,
        spend,
        results,
        roas: spend > 0 ? revenue / spend : 0
      };
    })
    .filter(item => item.spend > 0 || item.results > 0)
    .sort((a, b) => b.results - a.results)
    .slice(0, 4);

  const kpis = [
    {
      label: 'Active clients',
      value: activeClients.length,
      helper: 'Current accounts',
      icon: Users,
      onClick: () => onNavigate('Clients')
    },
    {
      label: 'Open work',
      value: openWork.length,
      helper: `${needsAttention.length} need attention`,
      icon: CheckSquare,
      onClick: () => onNavigate('Work')
    },
    {
      label: 'Team present',
      value: attendanceLogs.length,
      helper: 'Clocked in today',
      icon: UserCheck,
      onClick: () => onNavigate('Attendance')
    }
  ];

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 p-4 shadow-md text-sm border ${
          feedback.isError
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-1 border-b border-[#141414]/15 pb-5">
        <span className="text-sm font-medium text-orange-600">Overview</span>
        <h1 className="text-2xl font-bold text-[#141414]">Good work starts with a clear view.</h1>
        <p className="text-sm text-slate-500">
          Key activity for {formatDate(today)}. Details remain available in each workspace.
        </p>
      </header>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading dashboard...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.map(({ label, value, helper, icon: Icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="bg-white p-5 border border-[#141414]/10 text-left hover:border-orange-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-medium text-slate-600">{label}</span>
                  <Icon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-[#141414]">{value}</div>
                <div className="mt-1 text-xs text-slate-400">{helper}</div>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#141414]/10 p-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-semibold text-[#141414] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Needs attention
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Urgent, high priority, or overdue work.</p>
                </div>
                <button onClick={() => onNavigate('Work')} className="text-xs font-medium text-orange-600 cursor-pointer">
                  View work
                </button>
              </div>

              {needsAttention.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400 bg-slate-50">
                  Nothing needs immediate attention.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {needsAttention.map(item => {
                    const overdue = item.due_date && parseLocalDate(item.due_date) < todayDate;
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-[#141414] truncate">{item.title}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {item.priority}{overdue ? ' · Overdue' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => markDone(item)}
                          className="shrink-0 px-3 py-1.5 text-xs border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer"
                        >
                          Mark done
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#141414]/10 p-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-semibold text-[#141414] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    Campaign summary
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(weekStart)} - {formatDate(weekEnd)}
                  </p>
                </div>
                <button onClick={() => onNavigate('Ads Campaigns')} className="text-xs font-medium text-orange-600 cursor-pointer">
                  View marketing
                </button>
              </div>

              {campaignSummary.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400 bg-slate-50">
                  No campaign activity recorded this week.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {campaignSummary.map(({ activity, spend, results, roas }) => (
                    <div key={activity.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-sm text-[#141414] truncate">{activity.title}</div>
                        <span className="text-xs text-slate-400">{activity.channel}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                        <span className="text-slate-500">{formatMoney(spend)}</span>
                        <span className="text-center text-slate-500">{results} results</span>
                        <span className="text-right font-medium text-emerald-700">{roas.toFixed(2)}x ROAS</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default HomePage;
