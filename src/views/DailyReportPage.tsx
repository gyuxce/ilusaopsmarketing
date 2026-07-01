import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Edit3,
  FileDown,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useClients } from '../hooks/useClients';
import { useUsers } from '../hooks/useUsers';
import {
  useCreateDailyReport,
  useDailyReports,
  useDeleteDailyReport,
  useUpdateDailyReport,
} from '../hooks/useDailyReports';
import { useConfirm, useToast } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { formatDate, getLocalDateString } from '../utils/formatters';
import type { DailyReport } from '../types';

const DIVISIONS = ['Operasional', 'Admin Operasional', 'Customer Relation-Sales', 'Marketing-Design'];

const escapeHtml = (value?: string | null) =>
  String(value || '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');

const compactText = (value?: string | null) => String(value || '').trim();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'daily-report';

const buildReportHtml = ({
  report,
  clientName,
  userName,
}: {
  report: DailyReport;
  clientName: string;
  userName: string;
}) => {
  const hasSupport = compactText(report.need_support).length > 0;
  const sections = [
    ['01', 'Highlight', report.highlight, '#fff7ed'],
    ['02', 'Challenge / Rejection', report.challenge, '#f8fafc'],
    ['03', 'Next Plan / Positive Progress', report.next_plan, '#ecfdf5'],
    ['04', 'Need Support / Escalation', report.need_support, hasSupport ? '#fffbeb' : '#f8fafc'],
  ];

  return `
    <div style="width: 794px; min-height: 1123px; box-sizing: border-box; padding: 44px; background: #ffffff; color: #141414; font-family: Arial, Helvetica, sans-serif; font-stretch: normal; letter-spacing: 0;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; border-bottom: 5px solid #141414; padding-bottom: 24px;">
        <div>
          <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #f15a24; font-weight: 700; margin-bottom: 12px;">ILUSA DAILY REPORT</div>
          <h1 style="font-size: 34px; line-height: 1.08; margin: 0 0 10px; font-weight: 800; letter-spacing: 0;">Daily Report</h1>
          <div style="font-size: 18px; font-weight: 700; color: #334155;">${escapeHtml(clientName)}</div>
        </div>
        <div style="background: #141414; color: white; padding: 16px 18px; min-width: 170px;">
          <div style="font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #cbd5e1; margin-bottom: 8px; font-weight: 700;">Report Date</div>
          <div style="font-size: 18px; font-weight: 800; letter-spacing: 0;">${escapeHtml(formatDate(report.report_date))}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 26px 0;">
        <div style="border: 1px solid #d8dee8; padding: 14px; background: #f8fafc;">
          <div style="font-size: 9px; letter-spacing: .8px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px;">Client</div>
          <div style="font-size: 14px; line-height: 1.35; font-weight: 800;">${escapeHtml(clientName)}</div>
        </div>
        <div style="border: 1px solid #d8dee8; padding: 14px; background: #f8fafc;">
          <div style="font-size: 9px; letter-spacing: .8px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px;">Reported By</div>
          <div style="font-size: 14px; line-height: 1.35; font-weight: 800;">${escapeHtml(userName)}</div>
        </div>
        <div style="border: 1px solid #d8dee8; padding: 14px; background: #f8fafc;">
          <div style="font-size: 9px; letter-spacing: .8px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px;">Division</div>
          <div style="font-size: 14px; line-height: 1.35; font-weight: 800;">${escapeHtml(report.division)}</div>
        </div>
      </div>

      <div style="border: 1px solid ${hasSupport ? '#f59e0b' : '#d8dee8'}; background: ${hasSupport ? '#fffbeb' : '#f8fafc'}; padding: 16px 18px; margin-bottom: 22px;">
        <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 800; color: ${hasSupport ? '#b45309' : '#64748b'}; margin-bottom: 8px;">Executive Attention</div>
        <div style="font-size: 14px; line-height: 1.55; color: #141414;">
          ${hasSupport ? escapeHtml(report.need_support) : 'Tidak ada support atau escalation khusus yang dicatat untuk report ini.'}
        </div>
      </div>

      ${sections.map(([number, label, value, bg]) => `
        <section style="display: grid; grid-template-columns: 62px 1fr; border: 1px solid #d8dee8; margin-bottom: 14px; min-height: 116px;">
          <div style="background: #141414; color: white; display: flex; align-items: flex-start; justify-content: center; padding-top: 16px; font-size: 18px; font-weight: 800;">${number}</div>
          <div style="background: ${bg};">
            <div style="border-bottom: 1px solid #d8dee8; padding: 12px 16px; font-size: 11px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: #334155;">${escapeHtml(label)}</div>
            <div style="padding: 16px; font-size: 14px; line-height: 1.65; color: #1f2937;">${escapeHtml(value)}</div>
          </div>
        </section>
      `).join('')}

      <div style="margin-top: 26px;">
        <div style="border-top: 2px solid #141414; padding-top: 12px;">
          <div style="font-size: 9px; letter-spacing: .8px; text-transform: uppercase; color: #64748b; font-weight: 700;">Prepared By</div>
          <div style="font-size: 14px; font-weight: 800; margin-top: 6px;">${escapeHtml(userName)}</div>
        </div>
      </div>
    </div>
  `;
};

export function DailyReportPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const reportExportRef = useRef<HTMLDivElement | null>(null);

  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [clientFilter, setClientFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [clientId, setClientId] = useState('');
  const [reportDate, setReportDate] = useState(getLocalDateString());
  const [userId, setUserId] = useState('');
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [highlight, setHighlight] = useState('');
  const [challenge, setChallenge] = useState('');
  const [nextPlan, setNextPlan] = useState('');
  const [needSupport, setNeedSupport] = useState('');

  const { data: reports = [], isLoading, error } = useDailyReports();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const createReport = useCreateDailyReport();
  const updateReport = useUpdateDailyReport();
  const deleteReport = useDeleteDailyReport();

  const clientMap = useMemo(() => Object.fromEntries(clients.map(client => [client.id, client.company_name])), [clients]);
  const userMap = useMemo(() => Object.fromEntries(users.map(user => [user.id, user.name])), [users]);

  const filteredReports = reports.filter(report => {
    const matchDate = !dateFilter || report.report_date === dateFilter;
    const matchClient = clientFilter === 'All' || report.client_id === clientFilter;
    const matchDivision = divisionFilter === 'All' || report.division === divisionFilter;
    const matchUser = userFilter === 'All' || report.user_id === userFilter;
    return matchDate && matchClient && matchDivision && matchUser;
  });

  const selectedReport = reports.find(report => report.id === selectedReportId) || filteredReports[0] || null;
  const selectedClientName = selectedReport ? clientMap[selectedReport.client_id] || 'Unknown Client' : '-';
  const selectedUserName = selectedReport?.user_id ? userMap[selectedReport.user_id] || 'Unknown User' : '-';
  const reportHtml = selectedReport ? buildReportHtml({ report: selectedReport, clientName: selectedClientName, userName: selectedUserName }) : '';

  const duplicateReport = reports.find(report =>
    report.id !== editingReport?.id &&
    report.client_id === clientId &&
    report.user_id === userId &&
    report.report_date === reportDate
  );

  const missingTable = (error as any)?.message?.includes('daily_reports');

  const resetForm = () => {
    setEditingReport(null);
    setClientId('');
    setReportDate(getLocalDateString());
    setUserId('');
    setDivision(DIVISIONS[0]);
    setHighlight('');
    setChallenge('');
    setNextPlan('');
    setNeedSupport('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsReportModalOpen(true);
  };

  const closeModal = () => {
    setIsReportModalOpen(false);
    resetForm();
  };

  const handleEdit = (report: DailyReport) => {
    setEditingReport(report);
    setSelectedReportId(report.id);
    setClientId(report.client_id);
    setReportDate(report.report_date);
    setUserId(report.user_id || '');
    setDivision(report.division || DIVISIONS[0]);
    setHighlight(report.highlight || '');
    setChallenge(report.challenge || '');
    setNextPlan(report.next_plan || '');
    setNeedSupport(report.need_support || '');
    setIsReportModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId || !reportDate || !division) {
      showError('Client, tanggal, dan division wajib diisi.');
      return;
    }

    const payload = {
      client_id: clientId,
      report_date: reportDate,
      user_id: userId || null,
      division,
      highlight: highlight || null,
      challenge: challenge || null,
      next_plan: nextPlan || null,
      need_support: needSupport || null,
    };

    try {
      if (editingReport) {
        const updated = await updateReport.mutateAsync({ id: editingReport.id, payload });
        setSelectedReportId(updated.id);
        showSuccess('Daily report berhasil diupdate.');
      } else {
        const created = await createReport.mutateAsync(payload);
        setSelectedReportId(created.id);
        showSuccess('Daily report berhasil dibuat.');
      }
      closeModal();
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan daily report.');
    }
  };

  const handleDelete = async (report: DailyReport) => {
    const ok = await confirm({
      title: 'Hapus Daily Report',
      message: `Hapus daily report ${clientMap[report.client_id] || 'client'} tanggal ${formatDate(report.report_date)}?`,
    });
    if (!ok) return;

    try {
      await deleteReport.mutateAsync(report.id);
      if (selectedReportId === report.id) setSelectedReportId(null);
      showSuccess('Daily report dihapus.');
    } catch (err: any) {
      showError(err.message || 'Gagal menghapus daily report.');
    }
  };

  const exportPdf = () => {
    if (!selectedReport) return;
    const popup = window.open('', '_blank', 'width=900,height=1100');
    if (!popup) {
      showError('Popup diblokir browser. Izinkan popup untuk export PDF.');
      return;
    }
    popup.document.write(`
      <html>
        <head>
          <title>Daily Report - ${selectedClientName}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; background: #e5e7eb; }
            @media print { body { background: #fff; } }
          </style>
        </head>
        <body>${reportHtml}<script>window.onload = function(){ window.print(); };</script></body>
      </html>
    `);
    popup.document.close();
  };

  const exportPng = async () => {
    if (!selectedReport || !reportExportRef.current) return;
    try {
      const dataUrl = await toPng(reportExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });
      const link = document.createElement('a');
      link.download = `${slugify(`daily-report-${selectedClientName}-${selectedReport.report_date}`)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      showError(err.message || 'Export PNG gagal. Coba refresh halaman lalu export ulang.');
    }
  };

  const supportCount = filteredReports.filter(report => report.need_support?.trim()).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#141414]/15 pb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Daily Report</h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Laporan harian tim per client dengan format siap export.</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2.5 bg-[#141414] hover:bg-orange-600 text-white font-mono text-[10px] font-bold uppercase flex items-center gap-2 self-start lg:self-auto">
          <Plus className="h-4 w-4" />
          Create Daily Report
        </button>
      </div>

      <div className="bg-white border border-[#141414]/15 p-4 flex flex-wrap items-center gap-3 font-mono text-[10px]">
        <span className="text-slate-500 uppercase font-bold">Filters</span>
        <input type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)} className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none" />
        <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none">
          <option value="All">All Clients</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
        </select>
        <select value={divisionFilter} onChange={event => setDivisionFilter(event.target.value)} className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none">
          <option value="All">All Divisions</option>
          {DIVISIONS.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={userFilter} onChange={event => setUserFilter(event.target.value)} className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none">
          <option value="All">All Team</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </div>

      {missingTable && (
        <div className="border border-amber-300 bg-amber-50 p-4 font-mono text-[11px] text-amber-900">
          Tabel daily_reports belum ada di Supabase. Run file SQL
          <strong> supabase_daily_reports_migration.sql </strong>
          dulu, lalu refresh halaman ini.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Report Filter Ini', value: filteredReports.length },
          { label: 'Need Support', value: supportCount },
          { label: 'Client Terlapor', value: new Set(filteredReports.map(report => report.client_id)).size },
          { label: 'Divisi Aktif', value: new Set(filteredReports.map(report => report.division)).size },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#141414]/15 p-5">
            <div className="h-9 w-9 bg-orange-50 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-black text-[#141414] tabular-nums">{card.value}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="bg-white border border-[#141414]/15">
          <div className="p-4 border-b border-[#141414]/10 flex items-center justify-between">
            <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414]">Report List</h2>
            <span className="font-mono text-[10px] text-slate-400">{filteredReports.length} records</span>
          </div>
          {isLoading ? (
            <div className="p-5 font-mono text-[11px] text-slate-500">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={FileText} title="Belum Ada Daily Report" description="Klik Create Daily Report untuk membuat report pertama pada filter ini." />
            </div>
          ) : (
            <div className="max-h-[760px] overflow-y-auto divide-y divide-slate-100">
              {filteredReports.map(report => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full p-3 text-left hover:bg-slate-50 font-mono text-[10px] ${selectedReport?.id === report.id ? 'bg-orange-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-[#141414] truncate">{clientMap[report.client_id] || 'Unknown Client'}</div>
                      <div className="text-slate-500 truncate">{formatDate(report.report_date)} - {report.user_id ? userMap[report.user_id] : '-'}</div>
                      <div className="text-[8px] uppercase text-orange-700 font-bold mt-1">{report.division}</div>
                      <p className="text-[9px] text-slate-500 normal-case mt-2 line-clamp-2">{report.highlight || 'Belum ada highlight.'}</p>
                    </div>
                    {report.need_support?.trim() && (
                      <span className="shrink-0 bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 text-[8px] font-bold uppercase">Support</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#141414]/15 min-h-[720px]">
          <div className="p-4 border-b border-[#141414]/10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414]">Preview Export</h2>
            {selectedReport && (
              <div className="flex gap-2 font-mono text-[10px]">
                <button onClick={() => handleEdit(selectedReport)} className="px-3 py-2 border border-slate-200 bg-slate-50 hover:border-[#141414] uppercase flex items-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button onClick={() => handleDelete(selectedReport)} className="px-3 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-500 uppercase flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button onClick={exportPng} className="px-3 py-2 border border-slate-200 bg-white hover:border-orange-600 uppercase flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  PNG
                </button>
                <button onClick={exportPdf} className="px-3 py-2 bg-[#141414] text-white hover:bg-orange-600 uppercase flex items-center gap-1">
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {!selectedReport ? (
            <div className="p-5">
              <EmptyState icon={FileText} title="Pilih Daily Report" description="Pilih report di list untuk melihat preview export." />
            </div>
          ) : (
            <div className="p-5 overflow-auto bg-slate-100">
              <div className="origin-top-left scale-[0.72] md:scale-[0.82] xl:scale-[0.86]" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          )}
        </div>
      </div>

      {selectedReport && (
        <div className="fixed left-[-10000px] top-0 pointer-events-none" aria-hidden="true">
          <div ref={reportExportRef} dangerouslySetInnerHTML={{ __html: reportHtml }} />
        </div>
      )}

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/65 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-lg">
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                {editingReport ? 'Edit Daily Report' : 'Create Daily Report'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Date *</label>
                  <input type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Division *</label>
                  <select value={division} onChange={event => setDivision(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                    {DIVISIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Client *</label>
                  <select value={clientId} onChange={event => setClientId(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none" required>
                    <option value="">Select Client</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">By</label>
                  <select value={userId} onChange={event => setUserId(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                    <option value="">Unassigned</option>
                    {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  {duplicateReport && (
                    <p className="mt-1 text-[9px] text-amber-700 font-bold uppercase">
                      Report untuk client, tanggal, dan nama ini sudah pernah dibuat.
                    </p>
                  )}
                </div>
              </div>

              {[
                ['Highlight', highlight, setHighlight],
                ['Challenge / Rejection', challenge, setChallenge],
                ['Next Plan / Positive Progress', nextPlan, setNextPlan],
                ['Need Support / Escalation', needSupport, setNeedSupport],
              ].map(([label, value, setter]) => (
                <div key={label as string} className="font-mono text-[11px]">
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">{label as string}</label>
                  <textarea
                    value={value as string}
                    onChange={event => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                    rows={4}
                    className="w-full p-2 border border-[#141414]/20 bg-white rounded-none resize-y leading-relaxed"
                  />
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 font-mono text-[10px]">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase">
                  {editingReport ? 'Update Report' : 'Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyReportPage;
