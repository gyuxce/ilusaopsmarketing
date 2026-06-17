import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight, 
  Calendar, 
  DollarSign, 
  ChevronLeft, 
  Sparkles, 
  SlidersHorizontal,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  ListFilter,
  BarChart3,
  Flame,
  MousePointerClick,
  Activity,
  Briefcase
} from 'lucide-react';
import { activityService } from '../services/activityService';
import { performanceService } from '../services/performanceService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import { userService } from '../services/userService';
import { formatMoney, formatDate, getLocalDateString } from '../utils/formatters';
import { useToast, useConfirm } from '../context/AppContext';
import { SkeletonCard, SkeletonList } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const COLUMNS = ['Date', 'Spend', 'Reach', 'Impressions', 'Clicks', 'Results', 'CTR', 'CPR', 'Notes', 'Actions'];

const STATUS_COLORS = {
  Active: 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold',
  Paused: 'bg-amber-50 border-amber-500 text-amber-800 font-bold',
  Completed: 'bg-blue-50 border-blue-500 text-blue-800 font-bold',
  Draft: 'bg-slate-100 border-slate-300 text-slate-700',
  Scheduled: 'bg-purple-50 border-purple-300 text-purple-700'
};

export function MarketingPage({ activityType }) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  // Main Data States
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [performanceEntries, setPerformanceEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Filter States
  const [clientFilter, setClientFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal forms states
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);

  // Edit states references
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingPerfEntry, setEditingPerfEntry] = useState(null);

  // Activity Form fields
  const [fTitle, setFTitle] = useState('');
  const [fClientId, setFClientId] = useState('');
  const [fProjectId, setFProjectId] = useState('');
  const [fChannel, setFChannel] = useState('Meta Ads');
  const [fBudget, setFBudget] = useState('');
  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fStatus, setFStatus] = useState('Active');
  const [fOwnerId, setFOwnerId] = useState('');

  // Performance Entry Form fields
  const [fpDate, setFpDate] = useState(getLocalDateString);
  const [fpSpend, setFpSpend] = useState('');
  const [fpReach, setFpReach] = useState('');
  const [fpImpressions, setFpImpressions] = useState('');
  const [fpClicks, setFpClicks] = useState('');
  const [fpResults, setFpResults] = useState('');
  const [fpRevenue, setFpRevenue] = useState('');
  const [fpNotes, setFpNotes] = useState('');

  // Mapping states helper lookup tables
  const clientMap = clients.reduce((acc, c) => ({ ...acc, [c.id]: c.company_name }), {});
  const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.project_name }), {});
  const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

  // Page Labels depending on activityType
  const getPageLabels = () => {
    switch (activityType) {
      case 'campaign':
        return {
          title: 'Paid Ads campaigns',
          subtitle: 'Execute budgets & target audience sets across active channels',
          addBtn: 'Create Campaign',
          editTitle: 'Modify Campaign Activity',
          createTitle: 'Design Ads Campaign'
        };
      case 'creative_test':
        return {
          title: 'Creative Tests',
          subtitle: 'Log variant analytics, asset trials, and conversion performance',
          addBtn: 'Add Creative Activity',
          editTitle: 'Modify Creative Test Activity',
          createTitle: 'Design Creative Trial'
        };
      case 'content':
        return {
          title: 'Content & Editorial',
          subtitle: 'Track organic publishing events, impressions, and engagements',
          addBtn: 'Add Content Activity',
          editTitle: 'Modify Content Activity',
          createTitle: 'Design Content Record'
        };
      default:
        return {
          title: 'Marketing Sprints',
          subtitle: 'Active tactical sprint tracks',
          addBtn: 'Add Activity',
          editTitle: 'Edit Activity',
          createTitle: 'Create Activity'
        };
    }
  };

  const pageLabels = getPageLabels();

  // Load static workspace elements
  const loadStaticWorkspace = async () => {
    try {
      const clientsData = await clientService.getAll();
      setClients(clientsData || []);

      const projectsData = await projectService.getAll();
      setProjects(projectsData || []);

      const usersData = await userService.getAll();
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error loading metadata collections:', err);
    }
  };

  // Load activities matching current activityType
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityService.getAll(activityType);
      setActivities(data || []);
    } catch (err) {
      console.error('Failed to query marketing activities:', err);
      setError(err.message || 'Error pulling activity listings.');
    } finally {
      setLoading(false);
    }
  }, [activityType]);

  // Run initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaticWorkspace();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync when tab action shifts or mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      loadActivities();
      setSelectedActivity(null); // Reset detail selector
    }, 5);
    return () => clearTimeout(timer);
  }, [loadActivities]);

  // Load Performance entries for the selected activity
  const loadPerformanceRecords = async (activityId) => {
    setPerfLoading(true);
    try {
      const entries = await performanceService.getByActivity(activityId);
      setPerformanceEntries(entries || []);
    } catch (err) {
      console.error('Failed to load performance log entries:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  // Trigger brief floating notifications
  const triggerFeedback = (text, isError = false) => {
    if (isError) {
      showError(text);
    } else {
      showSuccess(text);
    }
  };

  const handleSelectActivity = (act) => {
    setSelectedActivity(act);
    loadPerformanceRecords(act.id);
  };

  // -------------------- ACTIVITY CRUD OPERATORS --------------------
  
  const handleOpenAddActModal = () => {
    setEditingActivity(null);
    setFTitle('');
    setFClientId(clients[0]?.id || '');
    setFProjectId(projects.filter(p => p.client_id === (clients[0]?.id || ''))[0]?.id || '');
    setFChannel(activityType === 'content' ? 'Instagram' : 'Meta Ads');
    setFBudget('');
    setFStartDate(getLocalDateString());
    // default 30 days window
    const end = new Date();
    end.setDate(end.getDate() + 30);
    setFEndDate(getLocalDateString(end));
    setFStatus('Active');
    setFOwnerId('');
    setIsActModalOpen(true);
  };

  const handleOpenEditActModal = (act, e) => {
    e.stopPropagation(); // prevent opening details frame
    setEditingActivity(act);
    setFTitle(act.title);
    setFClientId(act.client_id || '');
    setFProjectId(act.project_id || '');
    setFChannel(act.channel || 'Meta Ads');
    setFBudget(act.budget || '');
    setFStartDate(act.start_date || '');
    setFEndDate(act.end_date || '');
    setFStatus(act.status || 'Active');
    setFOwnerId(act.owner_id || '');
    setIsActModalOpen(true);
  };

  const handleClientFormChange = (cid) => {
    setFClientId(cid);
    const matched = projects.filter(p => p.client_id === cid);
    if (matched.length > 0) {
      setFProjectId(matched[0].id);
    } else {
      setFProjectId('');
    }
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!fTitle.trim() || !fClientId) {
      triggerFeedback('Please input the title and client.', true);
      return;
    }

    const payload = {
      title: fTitle,
      client_id: fClientId,
      project_id: fProjectId || null,
      activity_type: activityType,
      channel: fChannel,
      budget: Number(fBudget || 0),
      start_date: fStartDate,
      end_date: fEndDate,
      status: fStatus,
      owner_id: fOwnerId || null
    };

    try {
      if (editingActivity) {
        // UPDATE Mode
        const updated = await activityService.update(editingActivity.id, payload);
        setActivities(prev => prev.map(item => item.id === editingActivity.id ? updated : item));
        setSelectedActivity(prev => (prev && prev.id === editingActivity.id) ? { ...prev, ...updated } : prev);
        triggerFeedback('Activity successfully updated.');
      } else {
        // CREATE Mode
        const created = await activityService.create(payload);
        setActivities(prev => [created, ...prev]);
        triggerFeedback('New Operational activity deployed successfully.');
      }
      setIsActModalOpen(false);
    } catch (err) {
      triggerFeedback(`Action failed: ${err.message}`, true);
    }
  };

  const handleDeleteActivity = async (actToDelete, e) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'Hapus Aktivitas',
      message: `Yakin hapus ${actToDelete.title}? Tindakan ini tidak bisa dibatalkan.`
    });

    if (isConfirmed) {
      try {
        await activityService.softDelete(actToDelete.id);
        setActivities(prev => prev.filter(item => item.id !== actToDelete.id));
        if (selectedActivity && selectedActivity.id === actToDelete.id) {
          setSelectedActivity(null);
        }
        triggerFeedback('Activity soft-deleted.');
      } catch (err) {
        triggerFeedback(`Delete failed: ${err.message}`, true);
      }
    }
  };


  // -------------------- PERFORMANCE JOURNAL OPERATORS --------------------

  const handleOpenAddPerfModal = () => {
    setEditingPerfEntry(null);
    setFpDate(getLocalDateString());
    setFpSpend('');
    setFpReach('');
    setFpImpressions('');
    setFpClicks('');
    setFpResults('');
    setFpRevenue('');
    setFpNotes('');
    setIsPerfModalOpen(true);
  };

  const handleOpenEditPerfModal = (entry) => {
    setEditingPerfEntry(entry);
    setFpDate(entry.metric_date);
    setFpSpend(entry.spend || '');
    setFpReach(entry.reach || '');
    setFpImpressions(entry.impressions || '');
    setFpClicks(entry.clicks || '');
    setFpResults(entry.results || '');
    setFpNotes(entry.notes || '');
    setIsPerfModalOpen(true);
  };

  const handlePerfEntrySubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivity) return;

    if (!fpDate) {
      triggerFeedback('Please define the entry metric date.', true);
      return;
    }

    const payload = {
      activity_id: selectedActivity.id,
      metric_date: fpDate,
      spend: Number(fpSpend || 0),
      reach: Number(fpReach || 0),
      impressions: Number(fpImpressions || 0),
      clicks: Number(fpClicks || 0),
      results: Number(fpResults || 0),
      notes: fpNotes || 'Operational entry update.'
    };

    try {
      if (editingPerfEntry) {
        // UPDATE MODE
        const updated = await performanceService.update(editingPerfEntry.id, payload);
        setPerformanceEntries(prev => prev.map(item => item.id === editingPerfEntry.id ? updated : item));
        triggerFeedback('Performance record updated.');
      } else {
        // CREATE MODE
        const created = await performanceService.create(payload);
        setPerformanceEntries(prev => [created, ...prev]);
        triggerFeedback('New performance journal entry saved.');
      }
      setIsPerfModalOpen(false);
    } catch (err) {
      triggerFeedback(`Failed to store entry: ${err.message}`, true);
    }
  };

  const handleDeletePerformanceEntry = async (id) => {
    const isConfirmed = await confirm({
      title: 'Hapus Catatan Kinerja',
      message: `Yakin hapus catatan kinerja harian ini? Tindakan ini tidak bisa dibatalkan.`
    });

    if (isConfirmed) {
      try {
        await performanceService.remove(id);
        setPerformanceEntries(prev => prev.filter(item => item.id !== id));
        triggerFeedback('Performance data entry deleted.');
      } catch (err) {
        triggerFeedback(`Delete entry failed: ${err.message}`, true);
      }
    }
  };


  // -------------------- COMPUTATIONS AND METRIC CALCULATIONS --------------------

  // Filter activities to display in current grid
  const filteredActivities = activities.filter(act => {
    if (clientFilter !== 'All' && act.client_id !== clientFilter) return false;
    if (statusFilter !== 'All' && act.status !== statusFilter) return false;
    return true;
  });

  // Calculate high-level stats for each individual activity (used on cards)
  const getActivitySummaryStats = (activityId) => {
    if (typeof window === 'undefined') return { spend: 0, results: 0, roas: 0 };
    // Get stored performance entries
    // Since we want dynamic list on render, lookup global local database values
    const storedPerf = localStorage.getItem('ilusa_performance_entries');
    const allEntries = storedPerf ? JSON.parse(storedPerf) : [];
    const matchees = allEntries.filter(e => e.activity_id === activityId);
    
    const spend = matchees.reduce((sum, item) => sum + Number(item.spend || 0), 0);
    const results = matchees.reduce((sum, item) => sum + Number(item.results || 0), 0);
    
    return { spend, results };
  };

  // Calculate detailed aggregations for SELECTED activity
  const currentTotalSpend = performanceEntries.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
  const currentTotalResults = performanceEntries.reduce((sum, entry) => sum + Number(entry.results || 0), 0);
  const currentTotalClicks = performanceEntries.reduce((sum, entry) => sum + Number(entry.clicks || 0), 0);
  const currentTotalImpressions = performanceEntries.reduce((sum, entry) => sum + Number(entry.impressions || 0), 0);

  const currentAverageCTR = currentTotalImpressions > 0 ? (currentTotalClicks / currentTotalImpressions) * 100 : 0;
  const currentAverageCPR = currentTotalResults > 0 ? (currentTotalSpend / currentTotalResults) : 0;

  // Group performance entries into Weekly buckets as required ("Hitung dan tampilkan agregasi mingguan: total spend, total results, average ROAS.")
  const getWeeklyAggregations = () => {
    const weeklyBuckets = {};

    performanceEntries.forEach(entry => {
      const dateVal = new Date(entry.metric_date);
      if (isNaN(dateVal.getTime())) return;

      // Find Monday of the current entry's week
      const day = dateVal.getDay();
      const diff = dateVal.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      const monday = new Date(dateVal.setDate(diff));
      monday.setHours(0,0,0,0);
      const startStr = getLocalDateString(monday);

      // End Sunday boundary
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const endStr = getLocalDateString(sunday);

      const weekLabel = `WK: ${formatDate(startStr)} - ${formatDate(endStr)}`;

      if (!weeklyBuckets[weekLabel]) {
        weeklyBuckets[weekLabel] = {
          label: weekLabel,
          spend: 0,
          results: 0,
          entryCount: 0
        };
      }

      weeklyBuckets[weekLabel].spend += Number(entry.spend || 0);
      weeklyBuckets[weekLabel].results += Number(entry.results || 0);
      weeklyBuckets[weekLabel].entryCount += 1;
    });

    // Translate to calculated list
    return Object.values(weeklyBuckets).sort((a,b) => b.label.localeCompare(a.label)).map(w => {
      return {
        ...w
      };
    });
  };

  const weeklyAnalysis = getWeeklyAggregations();

  return (
    <div className="space-y-6">
      
      {/* Floating Status Notification Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 p-4 shadow-md font-mono text-xs border transition-all ${
          feedback.isError 
            ? 'bg-rose-50 border-rose-500 text-rose-800' 
            : 'bg-emerald-50 border-emerald-500 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-6 w-6 text-orange-600" />
            <span>{pageLabels.title}</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-pre-wrap">
            {pageLabels.subtitle}
          </p>
        </div>

        <button 
          onClick={handleOpenAddActModal}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-orange-600 transition-all rounded-none cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{pageLabels.addBtn}</span>
        </button>
      </div>

      {/* CRITICAL WORKSPACE FILTERS STRIP */}
      <div className="bg-white border border-[#141414]/15 p-4 md:flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase">
          <SlidersHorizontal className="h-4 w-4 text-orange-600" />
          <span>Search & Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Client select filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Company Profile:</span>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="py-1 px-2 border border-[#141414]/15 bg-slate-50 focus:border-[#141414] font-bold text-[#141414] rounded-none outline-none cursor-pointer"
            >
              <option value="All">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          {/* Status select filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Track Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 border border-[#141414]/15 bg-slate-50 focus:border-[#141414] font-bold text-[#141414] rounded-none outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVITY LIST */}
        <div className={`${selectedActivity ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-4`}>
          <div className="flex items-center justify-between bg-[#141414]/5 p-3 border border-[#141414]/15">
            <h3 className="text-xs font-bold font-mono text-[#141414] uppercase tracking-wider">
              Tactical Sprint Items ({filteredActivities.length})
            </h3>
            {selectedActivity && (
              <span className="text-[10px] text-slate-500 font-mono">Click a card to load entries detail</span>
            )}
          </div>

          {loading ? (
            <div className={`grid gap-4 ${selectedActivity ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {[1, 2, 3].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activities Tracked"
              description="No marketing operations match the chosen parameters under this channel. You can add ad campaigns, testing sprints, or content tracks."
              actionText="Add operational track"
              onAction={handleOpenAddActModal}
            />
          ) : (
            <div className={`grid gap-4 ${selectedActivity ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredActivities.map(act => {
                const isSelected = selectedActivity ? selectedActivity.id === act.id : false;
                const stats = getActivitySummaryStats(act.id);
                
                return (
                  <div
                    key={act.id}
                    onClick={() => handleSelectActivity(act)}
                    className={`bg-white border p-4 cursor-pointer relative group transition-all duration-150 ${
                      isSelected 
                        ? 'border-orange-600 shadow-xs ring-1 ring-orange-500' 
                        : 'border-[#141414]/15 hover:border-[#141414]/60'
                    }`}
                  >
                    
                    {/* Tiny Metadata Row */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[8px] font-mono font-bold text-orange-700 bg-orange-5 border border-orange-200/50 px-1.5 py-0.5 uppercase tracking-tight truncate max-w-[200px]">
                        {clientMap[act.client_id] || 'General Client'}
                      </span>
                      
                      <span className={`text-[8.5px] font-mono border px-1.5 py-0.5 rounded-none font-bold uppercase shrink-0 ${STATUS_COLORS[act.status] || 'bg-slate-100'}`}>
                        {act.status}
                      </span>
                    </div>

                    {/* Main Title Info */}
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-[#141414] uppercase leading-tight line-clamp-2">
                        {act.title}
                      </h4>
                      
                      <span className="text-[9px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 font-bold uppercase">
                        {act.channel || 'Direct'}
                      </span>
                    </div>

                    {/* Date limits */}
                    <div className="mt-3 bg-slate-50 border border-slate-100 p-2 text-slate-500 font-mono text-[9px] uppercase space-y-1">
                      <div className="flex justify-between">
                        <span>Sprint Budget</span>
                        <strong className="text-slate-800 font-bold">{formatMoney(act.budget)}</strong>
                      </div>
                      
                      <div className="flex justify-between text-slate-400">
                        <span>Duration</span>
                        <span>{formatDate(act.start_date)} - {formatDate(act.end_date)}</span>
                      </div>
                    </div>

                    {/* Quick Summarized KPIs */}
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 text-[8px] uppercase block mb-1">Total Spend</span>
                        <span className="font-extrabold text-[#141414]">{formatMoney(stats.spend)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[8px] uppercase block mb-1">Results (Leads)</span>
                        <span className="font-bold text-slate-700">{stats.results}</span>
                      </div>
                    </div>

                    {/* Edit/Delete Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                      <button
                        onClick={(e) => handleOpenEditActModal(act, e)}
                        className="p-1 text-slate-600 hover:text-orange-600 cursor-pointer"
                        title="Edit Activity Detail"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteActivity(act, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Activity Track"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAIL WORKSPACE (Only displays when an activity is chosen) */}
        {selectedActivity && (
          <div className="lg:col-span-8 bg-white border border-[#141414] p-5 space-y-6">
            
            {/* Detail Heading */}
            <div className="flex items-center justify-between border-b border-[#141414]/15 pb-4">
              <div className="space-y-1">
                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="flex items-center gap-1 text-[9.5px] font-mono text-slate-400 hover:text-[#141414] font-bold uppercase tracking-wider mb-2 bg-slate-50 border p-1 rounded-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Exit Detail View</span>
                </button>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 uppercase">
                    {clientMap[selectedActivity.client_id]}
                  </span>
                  {selectedActivity.project_id && (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 uppercase">
                      Proj: {projectMap[selectedActivity.project_id]}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-[#141414] uppercase tracking-wide">
                  {selectedActivity.title}
                </h2>
              </div>

              <div className="text-right">
                <span className={`inline-block text-[10px] font-mono border px-2 py-0.5 font-bold uppercase ${STATUS_COLORS[selectedActivity.status] || 'bg-slate-100'}`}>
                  {selectedActivity.status}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1.5 uppercase">
                  Budget limit: <b className="text-slate-800">{formatMoney(selectedActivity.budget)}</b>
                </p>
              </div>
            </div>

            {/* QUICK HEALTH METRICS PANEL (ROAS, CTR, CPR) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/60 text-xs font-mono uppercase">
              <div>
                <span className="text-slate-400 text-[9px] block">Sum Spend Tracked</span>
                <div className="text-sm font-extrabold text-[#141414] mt-1">
                  {formatMoney(currentTotalSpend)}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] block">Average CTR</span>
                <div className="text-sm font-extrabold text-blue-700 mt-1 flex items-center gap-1">
                  {currentAverageCTR.toFixed(2)}%
                  <MousePointerClick className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[9px] block">Cost Per Result (CPR)</span>
                <div className="text-sm font-extrabold text-orange-800 mt-1">
                  {formatMoney(currentAverageCPR)}
                </div>
              </div>
            </div>

            {/* PERFORMANCE JOURNAL ENTRIES LIST AND GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                  <span>Performance Logs Table</span>
                </h3>

                <button
                  onClick={handleOpenAddPerfModal}
                  className="flex items-center gap-1 bg-[#141414] text-white py-1.5 px-3 hover:bg-orange-600 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Entry</span>
                </button>
              </div>

              {perfLoading ? (
                <div className="text-center py-10 border border-dashed border-[#141414]/15 font-mono text-xs text-slate-400">
                  Loading metrics journal...
                </div>
              ) : performanceEntries.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#141414]/15 bg-slate-50 font-mono text-xs text-slate-400 uppercase">
                  No performance metrics registered for this sprint.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#141414]/15">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <thead className="bg-[#141414] text-white uppercase font-bold text-[9px]">
                      <tr>
                        {COLUMNS.map(col => (
                          <th key={col} className="p-2 border border-slate-700 text-center">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]/10 bg-white">
                      {performanceEntries.map(entry => {
                        // calculated stats on each entry row
                        const ctr = entry.impressions > 0 ? (entry.clicks / entry.impressions) * 100 : 0;
                        const cpr = entry.results > 0 ? (entry.spend / entry.results) : 0;

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 transition-colors text-center font-mono">
                            <td className="p-2 font-bold text-[#141414] whitespace-nowrap">
                              {formatDate(entry.metric_date)}
                            </td>
                            <td className="p-2 text-slate-700 font-bold">
                              {formatMoney(entry.spend)}
                            </td>
                            <td className="p-2 text-slate-500">
                              {entry.reach.toLocaleString()}
                            </td>
                            <td className="p-2 text-slate-500">
                              {entry.impressions.toLocaleString()}
                            </td>
                            <td className="p-2 text-slate-500">
                              {entry.clicks.toLocaleString()}
                            </td>
                            <td className="p-2 font-bold text-slate-800">
                              {entry.results.toLocaleString()}
                            </td>
                            <td className="p-2 text-blue-700">
                              {ctr.toFixed(2)}%
                            </td>
                            <td className="p-2 text-orange-800">
                              {formatMoney(cpr)}
                            </td>
                            <td className="p-2 max-w-[150px] truncate text-slate-400 text-[9px] text-left" title={entry.notes}>
                              {entry.notes || '-'}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditPerfModal(entry)}
                                  className="text-slate-500 hover:text-orange-600 p-0.5 cursor-pointer"
                                  title="Edit Entry"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeletePerformanceEntry(entry.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* WEEKLY ANALYSIS SECTION */}
            <div className="mt-8 border-t border-[#141414]/15 pt-6 space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-600" />
                <span>Weekly Metrics Analytics (Grouped Aggregation)</span>
              </h3>

              {weeklyAnalysis.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-mono uppercase italic">
                  Waiting for daily entry data to compute weekly aggregates...
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weeklyAnalysis.map(week => (
                    <div 
                      key={week.label}
                      className="border border-[#141414]/15 p-4 bg-slate-50 font-mono uppercase space-y-2 text-[10px]"
                    >
                      <div className="border-b border-slate-200 pb-1.5 font-bold text-slate-800">
                        {week.label}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 py-1">
                        <div>
                          <span className="text-slate-400 text-[8px] block">Sum Spend</span>
                          <strong className="text-xs text-slate-800">{formatMoney(week.spend)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[8px] block">Sum Results</span>
                          <strong className="text-xs text-slate-800">{week.results}</strong>
                        </div>
                      </div>
                      
                      <div className="text-[8px] text-slate-400 normal-case italic text-right pt-1 border-t border-dashed border-slate-200">
                        Calculated from {week.entryCount} operational logs
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* -------------------- 1. MODAL: CREATE / MODIFY ACTIVITY -------------------- */}
      {isActModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-lg shadow-lg">
            
            {/* Heading */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-orange-600" />
                <span>{editingActivity ? pageLabels.editTitle : pageLabels.createTitle}</span>
              </h3>
              <button 
                onClick={() => setIsActModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleActivitySubmit} className="p-5 space-y-4 font-mono text-[11px]">
              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Activity Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Traveloka June Paid Ad Setup"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Target Client *</label>
                  <select
                    value={fClientId}
                    onChange={(e) => handleClientFormChange(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                    required
                  >
                    <option value="" disabled>Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Sprint Project</label>
                  <select
                    value={fProjectId}
                    onChange={(e) => setFProjectId(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  >
                    <option value="">Stand-Alone Activity</option>
                    {projects.filter(p => p.client_id === fClientId).map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Active Channel</label>
                  <select
                    value={fChannel}
                    onChange={(e) => setFChannel(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  >
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Instagram">Instagram Reels</option>
                    <option value="SEO">SEO Backlinks</option>
                    <option value="Email">Email Marketing</option>
                    <option value="General">General / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Assigned Budget (IDR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45000000"
                    value={fBudget}
                    onChange={(e) => setFBudget(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={fStartDate}
                    onChange={(e) => setFStartDate(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Target End *</label>
                  <input
                    type="date"
                    value={fEndDate}
                    onChange={(e) => setFEndDate(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">PIC / Team Handler</label>
                <select
                  value={fOwnerId}
                  onChange={(e) => setFOwnerId(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                >
                  <option value="">-- Assign PIC --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsActModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase text-[#141414]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase"
                >
                  Save Activity
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* -------------------- 2. MODAL: CREATE / MODIFY PERFORMANCE ENTRY -------------------- */}
      {isPerfModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-lg shadow-lg">
            
            {/* Heading */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                <span>{editingPerfEntry ? 'Edit Performance Log' : 'Add Weekly/Daily Performance Entry'}</span>
              </h3>
              <button 
                onClick={() => setIsPerfModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePerfEntrySubmit} className="p-5 space-y-4 font-mono text-[11px]">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Metric Date *</label>
                  <input
                    type="date"
                    value={fpDate}
                    onChange={(e) => setFpDate(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Cost Spend (IDR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={fpSpend}
                    onChange={(e) => setFpSpend(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Reach</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={fpReach}
                    onChange={(e) => setFpReach(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Impressions</label>
                  <input
                    type="number"
                    placeholder="32000"
                    value={fpImpressions}
                    onChange={(e) => setFpImpressions(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Clicks</label>
                  <input
                    type="number"
                    placeholder="960"
                    value={fpClicks}
                    onChange={(e) => setFpClicks(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Results (Leads)</label>
                  <input
                    type="number"
                    placeholder="48"
                    value={fpResults}
                    onChange={(e) => setFpResults(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>
              </div>

              {/* Auto-calculated Metrics Display */}
              <div className="bg-slate-50 p-3 border border-slate-200 flex items-center justify-between font-mono text-[9px] uppercase">
                <div>
                  <span className="text-slate-400 block mb-0.5">Calc. CTR</span>
                  <strong className="text-blue-700">
                    {(Number(fpImpressions) > 0 ? (Number(fpClicks) / Number(fpImpressions)) * 100 : 0).toFixed(2)}%
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Calc. CPC</span>
                  <strong className="text-slate-800">
                    {formatMoney(Number(fpClicks) > 0 ? (Number(fpSpend) / Number(fpClicks)) : 0)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Calc. CPL/CPR</span>
                  <strong className="text-orange-800">
                    {formatMoney(Number(fpResults) > 0 ? (Number(fpSpend) / Number(fpResults)) : 0)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Log Annotation & Notes</label>
                <input
                  type="text"
                  placeholder="Insert bid strategies, holiday adjustments, or variant success notes..."
                  value={fpNotes}
                  onChange={(e) => setFpNotes(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsPerfModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase text-[#141414]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase"
                >
                  Record Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default MarketingPage;
