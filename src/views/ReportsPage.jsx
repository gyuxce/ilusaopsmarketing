import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Activity, 
  Filter,
  CheckSquare,
  RefreshCw,
  Printer
} from 'lucide-react';
import { activityService } from '../services/activityService';
import { performanceService } from '../services/performanceService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import { attendanceService } from '../services/attendanceService';
import { reviewService } from '../services/reviewService';
import { formatMoney, formatDate, getLocalDateString } from '../utils/formatters';

const getFirstOfMonthString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
};

const aggregateEntries = (entries) => {
  const spend = entries.reduce((sum, e) => sum + Number(e.spend || 0), 0);
  const reach = entries.reduce((sum, e) => sum + Number(e.reach || 0), 0);
  const impressions = entries.reduce((sum, e) => sum + Number(e.impressions || 0), 0);
  const clicks = entries.reduce((sum, e) => sum + Number(e.clicks || 0), 0);
  const leads = entries.reduce((sum, e) => sum + Number(e.results || 0), 0);

  return {
    spend,
    reach,
    impressions,
    clicks,
    leads,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpl: leads > 0 ? spend / leads : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: reach > 0 ? impressions / reach : 0,
  };
};

const getKpiWarnings = ({ ctr, cpc, cpl, frequency, clicks, impressions, reach }) => {
  const warnings = [];
  if (impressions > 0 && clicks > impressions) warnings.push('Klik lebih besar dari impressions. Cek ulang input clicks atau impressions.');
  if (reach > 0 && impressions > 0 && reach > impressions) warnings.push('Reach lebih besar dari impressions. Biasanya impressions minimal sama atau lebih besar dari reach.');
  if (ctr > 10) warnings.push('CTR di atas 10%. Angka ini tidak umum untuk ads, cek kembali impressions dan clicks.');
  if (frequency > 5) warnings.push('Frequency di atas 5x. Audiens mungkin mulai terlalu sering melihat iklan.');
  if (cpl > 0 && cpl < 500) warnings.push('CPL sangat rendah. Pastikan leads dan spend sudah benar.');
  if (cpc > 0 && cpc < 100) warnings.push('CPC sangat rendah. Pastikan clicks dan spend sudah benar.');
  return warnings;
};

export function ReportsPage() {
  const [reportType, setReportType] = useState('attendance');
  const [startDate, setStartDate] = useState(getFirstOfMonthString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);

  // Data States
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Ads Data States
  const [clients, setClients] = useState([]);
  const [activities, setActivities] = useState([]);
  const [performanceEntries, setPerformanceEntries] = useState([]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'attendance') {
        const logs = await attendanceService.getLogs(startDate, endDate);
        setAttendanceLogs(logs || []);
      } 
      else if (reportType === 'weekly') {
        const [reviews, projs] = await Promise.all([
          reviewService.getAll(),
          projectService.getAll()
        ]);
        
        // Filter reviews by date range
        const filteredReviews = (reviews || []).filter(rev => {
          return rev.review_date >= startDate && rev.review_date <= endDate;
        });
        
        setWeeklyReviews(filteredReviews);
        setProjects(projs || []);
      }
      else if (reportType === 'ads') {
        const [clientsData, activitiesData, entriesData, projectsData] = await Promise.all([
          clientService.getAll(),
          activityService.getAll(),
          performanceService.getAll(),
          projectService.getAll()
        ]);
        
        setClients(clientsData || []);
        setActivities(activitiesData || []);
        setProjects(projectsData || []);
        
        // Filter entries
        const filteredEntries = (entriesData || []).filter(entry => {
          return entry.metric_date >= startDate && entry.metric_date <= endDate;
        });
        setPerformanceEntries(filteredEntries);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleGenerateReport, 0);
    return () => clearTimeout(timer);
    // This effect intentionally generates the initial default report once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // --- Renderers for each report type --- //

  const renderAttendanceReport = () => {
    if (attendanceLogs.length === 0) {
      return <div className="p-8 text-center text-slate-400 font-mono text-xs">No attendance records found for this period.</div>;
    }
    
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-[#141414] pb-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#141414]">Team Attendance Report</h2>
          <p className="text-xs font-mono text-slate-500 mt-1">Period: {startDate} to {endDate}</p>
        </div>
        
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-[#141414] text-white uppercase">
              <th className="p-3 border border-[#141414]">Date</th>
              <th className="p-3 border border-[#141414]">Team Member</th>
              <th className="p-3 border border-[#141414]">Department</th>
              <th className="p-3 border border-[#141414]">Clock In Time</th>
              <th className="p-3 border border-[#141414]">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceLogs.map(log => (
              <tr key={log.id} className="border-b border-slate-200">
                <td className="p-3 border-x border-slate-200">{log.clock_date}</td>
                <td className="p-3 border-x border-slate-200 font-bold">{log.users?.name || 'Unknown'}</td>
                <td className="p-3 border-x border-slate-200">{log.users?.department || '-'}</td>
                <td className="p-3 border-x border-slate-200">{new Date(log.clock_in_time).toLocaleTimeString('id-ID')}</td>
                <td className="p-3 border-x border-slate-200 text-emerald-600 font-bold uppercase">{log.status || 'PRESENT'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeeklyReport = () => {
    if (weeklyReviews.length === 0) {
      return <div className="p-8 text-center text-slate-400 font-mono text-xs">No weekly reviews found for this period.</div>;
    }

    return (
      <div className="space-y-6">
        <div className="border-b-2 border-[#141414] pb-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#141414]">Weekly Operations Report</h2>
          <p className="text-xs font-mono text-slate-500 mt-1">Period: {startDate} to {endDate}</p>
        </div>
        
        <div className="space-y-6">
          {weeklyReviews.map(rev => {
            const proj = projects.find(p => p.id === rev.project_id);
            return (
              <div key={rev.id} className="border border-[#141414] p-5">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                  <div className="font-bold font-mono text-sm uppercase text-[#141414]">
                    Tanggal: {rev.review_date}
                  </div>
                  <div className="text-xs font-mono bg-[#141414] text-white px-2 py-1 uppercase">
                    Project: {proj ? proj.project_code : 'General'}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-orange-600 uppercase mb-1 font-mono">Catatan Weekly:</span>
                    <p className="text-xs text-[#141414] whitespace-pre-wrap">{rev.weekly_notes || '-'}</p>
                  </div>
                  {rev.next_action && (
                    <div>
                      <span className="block text-[10px] font-bold text-[#141414] uppercase mb-1 font-mono">Next Action:</span>
                      <p className="text-xs text-[#141414] whitespace-pre-wrap font-bold bg-slate-50 p-2 border border-slate-200">{rev.next_action}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAdsReport = () => {
    const totals = aggregateEntries(performanceEntries);
    const clientMap = clients.reduce((acc, client) => ({ ...acc, [client.id]: client.company_name }), {});
    const projectMap = projects.reduce((acc, project) => ({ ...acc, [project.id]: project.project_name }), {});
    const activityMap = activities.reduce((acc, activity) => ({ ...acc, [activity.id]: activity }), {});
    const activeActivityIds = new Set(performanceEntries.map(entry => entry.activity_id));
    const visibleActivities = activities.filter(activity => activeActivityIds.has(activity.id));
    const funnel = visibleActivities.reduce((acc, activity) => ({
      webinar: acc.webinar + Number(activity.participants_webinar || 0),
      mapping: acc.mapping + Number(activity.participants_mapping || 0),
      interview: acc.interview + Number(activity.participants_interview || 0),
    }), { webinar: 0, mapping: 0, interview: 0 });
    const benchmark = visibleActivities.find(activity => Number(activity.benchmark_cpl || 0) > 0)?.benchmark_cpl || 1500;
    const benchmarkDelta = Number(benchmark) > 0 && totals.cpl > 0
      ? ((Number(benchmark) - totals.cpl) / Number(benchmark)) * 100
      : 0;
    const warnings = getKpiWarnings(totals);
    const bestCampaign = visibleActivities
      .map(activity => ({ activity, totals: aggregateEntries(performanceEntries.filter(entry => entry.activity_id === activity.id)) }))
      .filter(item => item.totals.leads > 0)
      .sort((a, b) => a.totals.cpl - b.totals.cpl)[0];

    return (
      <div className="space-y-6">
        <div className="border-b-2 border-[#141414] pb-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#141414]">Laporan Performa Iklan</h2>
          <p className="text-xs font-mono text-slate-500 mt-1">Periode: {formatDate(startDate)} sampai {formatDate(endDate)}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-[#141414] p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Total Biaya</span>
            <span className="block text-lg font-black text-[#141414]">{formatMoney(totals.spend)}</span>
          </div>
          <div className="border border-[#141414] p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Total Leads</span>
            <span className="block text-lg font-black text-[#141414]">{totals.leads.toLocaleString('id-ID')}</span>
          </div>
          <div className="border border-[#141414] p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Biaya per Lead</span>
            <span className="block text-lg font-black text-orange-600">{formatMoney(totals.cpl)}</span>
          </div>
          <div className="border border-[#141414] p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">CTR / CPC</span>
            <span className="block text-lg font-black text-blue-700">{totals.ctr.toFixed(2)}% / {formatMoney(totals.cpc)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="border border-slate-300 p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Reach</span>
            <span className="block text-base font-black text-[#141414]">{totals.reach.toLocaleString('id-ID')}</span>
          </div>
          <div className="border border-slate-300 p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Impressions</span>
            <span className="block text-base font-black text-[#141414]">{totals.impressions.toLocaleString('id-ID')}</span>
          </div>
          <div className="border border-slate-300 p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">CPM</span>
            <span className="block text-base font-black text-[#141414]">{formatMoney(totals.cpm)}</span>
          </div>
          <div className="border border-slate-300 p-4 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono mb-2">Frequency</span>
            <span className="block text-base font-black text-[#141414]">{totals.frequency.toFixed(2)}x</span>
          </div>
        </div>

        <div className="border border-[#141414] p-4">
          <h3 className="text-sm font-black uppercase text-[#141414] mb-3">Ringkasan untuk Client</h3>
          <p className="text-xs leading-relaxed text-slate-700">
            Selama periode ini iklan menghasilkan <b>{totals.leads.toLocaleString('id-ID')} leads</b> dengan total biaya <b>{formatMoney(totals.spend)}</b>.
            Rata-rata biaya per lead adalah <b>{formatMoney(totals.cpl)}</b>.
            {totals.cpl > 0 && (
              <span> Dibanding benchmark {formatMoney(benchmark)}, performa biaya lead saat ini <b>{Math.abs(benchmarkDelta).toFixed(0)}% {benchmarkDelta >= 0 ? 'lebih hemat' : 'lebih tinggi'}</b>.</span>
            )}
            {bestCampaign && (
              <span> Campaign paling efisien berdasarkan CPL adalah <b>{bestCampaign.activity.title}</b> dengan CPL <b>{formatMoney(bestCampaign.totals.cpl)}</b>.</span>
            )}
          </p>
        </div>

        {(funnel.webinar > 0 || funnel.mapping > 0 || funnel.interview > 0) && (
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-orange-300 bg-orange-50 p-4 text-center">
              <span className="block text-[9px] uppercase font-bold text-orange-700 font-mono mb-2">Leads ke Webinar</span>
              <span className="block text-base font-black text-orange-900">{totals.leads > 0 ? ((funnel.webinar / totals.leads) * 100).toFixed(1) : '0.0'}%</span>
              <span className="block text-[10px] text-orange-800 mt-1">{funnel.webinar.toLocaleString('id-ID')} peserta</span>
            </div>
            <div className="border border-orange-300 bg-orange-50 p-4 text-center">
              <span className="block text-[9px] uppercase font-bold text-orange-700 font-mono mb-2">Webinar ke Pemetaan</span>
              <span className="block text-base font-black text-orange-900">{funnel.webinar > 0 ? ((funnel.mapping / funnel.webinar) * 100).toFixed(1) : '0.0'}%</span>
              <span className="block text-[10px] text-orange-800 mt-1">{funnel.mapping.toLocaleString('id-ID')} peserta</span>
            </div>
            <div className="border border-orange-300 bg-orange-50 p-4 text-center">
              <span className="block text-[9px] uppercase font-bold text-orange-700 font-mono mb-2">Pemetaan ke Interview</span>
              <span className="block text-base font-black text-orange-900">{funnel.mapping > 0 ? ((funnel.interview / funnel.mapping) * 100).toFixed(1) : '0.0'}%</span>
              <span className="block text-[10px] text-orange-800 mt-1">{funnel.interview.toLocaleString('id-ID')} peserta</span>
            </div>
            <div className="border border-orange-300 bg-orange-50 p-4 text-center">
              <span className="block text-[9px] uppercase font-bold text-orange-700 font-mono mb-2">Leads ke Interview</span>
              <span className="block text-base font-black text-orange-900">{totals.leads > 0 ? ((funnel.interview / totals.leads) * 100).toFixed(1) : '0.0'}%</span>
              <span className="block text-[10px] text-orange-800 mt-1">{funnel.interview.toLocaleString('id-ID')} peserta</span>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
            <h3 className="text-sm font-black uppercase mb-2">Catatan Validasi Data</h3>
            {warnings.map((warning, idx) => (
              <p key={idx}>- {warning}</p>
            ))}
          </div>
        )}
        
        {performanceEntries.length === 0 ? (
          <p className="text-center text-xs font-mono text-slate-400">Belum ada data performa pada periode ini.</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414] mb-3">Breakdown per Campaign</h3>
              <table className="w-full text-left border-collapse text-[9px] font-mono">
                <thead>
                  <tr className="bg-[#141414] text-white uppercase">
                    <th className="p-2 border border-[#141414]">Campaign</th>
                    <th className="p-2 border border-[#141414]">Client / Project</th>
                    <th className="p-2 border border-[#141414]">Segment</th>
                    <th className="p-2 border border-[#141414] text-right">Biaya</th>
                    <th className="p-2 border border-[#141414] text-right">Leads</th>
                    <th className="p-2 border border-[#141414] text-right">CPL</th>
                    <th className="p-2 border border-[#141414] text-right">CTR</th>
                    <th className="p-2 border border-[#141414] text-right">CPC</th>
                    <th className="p-2 border border-[#141414] text-right">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleActivities.map(activity => {
                    const activityTotals = aggregateEntries(performanceEntries.filter(entry => entry.activity_id === activity.id));
                    return (
                      <tr key={activity.id} className="border-b border-slate-200">
                        <td className="p-2 border-x border-slate-200 font-bold">{activity.title}</td>
                        <td className="p-2 border-x border-slate-200">{clientMap[activity.client_id] || '-'} / {projectMap[activity.project_id] || 'Tanpa project'}</td>
                        <td className="p-2 border-x border-slate-200">{activity.interest_segment || activity.ad_format || '-'}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{formatMoney(activityTotals.spend)}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{activityTotals.leads.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-x border-slate-200 text-right font-bold text-orange-700">{formatMoney(activityTotals.cpl)}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{activityTotals.ctr.toFixed(2)}%</td>
                        <td className="p-2 border-x border-slate-200 text-right">{formatMoney(activityTotals.cpc)}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{activityTotals.frequency.toFixed(2)}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase text-[#141414] mb-3">Data Performa Harian</h3>
              <table className="w-full text-left border-collapse text-[9px] font-mono">
                <thead>
                  <tr className="bg-[#141414] text-white uppercase">
                    <th className="p-2 border border-[#141414]">Tanggal</th>
                    <th className="p-2 border border-[#141414]">Campaign</th>
                    <th className="p-2 border border-[#141414] text-right">Biaya</th>
                    <th className="p-2 border border-[#141414] text-right">Reach</th>
                    <th className="p-2 border border-[#141414] text-right">Impr.</th>
                    <th className="p-2 border border-[#141414] text-right">Clicks</th>
                    <th className="p-2 border border-[#141414] text-right">CTR</th>
                    <th className="p-2 border border-[#141414] text-right">Leads</th>
                    <th className="p-2 border border-[#141414] text-right">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceEntries.map((entry, idx) => {
                    const activity = activityMap[entry.activity_id];
                    const entryTotals = aggregateEntries([entry]);
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2 border-x border-slate-200">{formatDate(entry.metric_date)}</td>
                        <td className="p-2 border-x border-slate-200">{activity?.title || '-'}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{formatMoney(entryTotals.spend)}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{entryTotals.reach.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{entryTotals.impressions.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{entryTotals.clicks.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-x border-slate-200 text-right">{entryTotals.ctr.toFixed(2)}%</td>
                        <td className="p-2 border-x border-slate-200 text-right">{entryTotals.leads.toLocaleString('id-ID')}</td>
                        <td className="p-2 border-x border-slate-200 text-right font-bold text-orange-700">{formatMoney(entryTotals.cpl)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER & EXPORT ACTIONS (Hidden during print) */}
      <div id="report-controls-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141414]/15 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-[#141414] uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-600" />
            <span>Pusat Laporan</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-1 uppercase">
            Buat laporan yang siap dibaca tim dan client.
          </p>
        </div>
        <button
          id="btn-export-pdf"
          onClick={handlePrint}
          className="bg-[#141414] hover:bg-orange-600 text-[#E4E3E0] hover:text-white px-5 py-2.5 flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-widest transition-colors cursor-pointer border-none"
        >
          <Printer className="h-4 w-4" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* FILTER CONTROLS (Hidden during print) */}
      <div id="report-controls" className="bg-white p-5 border border-[#141414]/15 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <div>
          <label className="block text-[9.5px] uppercase font-bold font-mono text-slate-500 mb-1.5">Report Type</label>
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full p-2.5 border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:border-[#141414] outline-none"
          >
            <option value="attendance">Team Attendance Report</option>
            <option value="weekly">Weekly Operations & Tasks</option>
            <option value="ads">Laporan Performa Iklan</option>
          </select>
        </div>
        <div>
          <label className="block text-[9.5px] uppercase font-bold font-mono text-slate-500 mb-1.5">Start Date</label>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2.5 border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:border-[#141414] outline-none"
          />
        </div>
        <div>
          <label className="block text-[9.5px] uppercase font-bold font-mono text-slate-500 mb-1.5">End Date</label>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2.5 border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:border-[#141414] outline-none"
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full py-2.5 border border-[#141414] bg-white text-[#141414] hover:bg-[#141414] hover:text-white transition-colors flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase cursor-pointer"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            <span>Tampilkan Data</span>
          </button>
        </div>
      </div>

      {/* REPORT PREVIEW A4 CONTAINER */}
      <div 
        id="report-preview-container" 
        className="bg-white border border-[#141414]/20 p-10 min-h-[800px] shadow-sm max-w-[1000px] mx-auto print:max-w-none print:w-full print:border-none print:shadow-none print:p-0"
      >
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-4 border-[#141414] pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#141414] tracking-tighter uppercase leading-none">ILUSA</h1>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] block mt-1">Marketing Ops Workspace</span>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-500">
            <div className="font-bold text-[#141414]">GENERATED ON</div>
            <div>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mb-4 text-orange-500" />
            <span className="text-xs font-mono uppercase tracking-widest">Compiling Report Data...</span>
          </div>
        ) : (
          <div>
            {reportType === 'attendance' && renderAttendanceReport()}
            {reportType === 'weekly' && renderWeeklyReport()}
            {reportType === 'ads' && renderAdsReport()}
          </div>
        )}
      </div>

    </div>
  );
}

export default ReportsPage;
