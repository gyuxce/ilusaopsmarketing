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

const PRESET_RESULT_TYPES = ['Leads', 'WhatsApp Chats', 'Purchases', 'Link Clicks', 'Video Views', 'App Installs'];

const sanitizeMoneyToNumber = (val) => {
  if (!val) return 0;
  let str = String(val).trim();
  // Strip non-digits except commas and dots
  str = str.replace(/[^0-9.,]/g, '');
  // If it ends with ,00 or .00, strip it
  if (str.endsWith(',00') || str.endsWith('.00')) {
    str = str.slice(0, -3);
  }
  // Remove all non-numeric characters (since we want integer values)
  const clean = str.replace(/[^0-9]/g, '');
  return Number(clean) || 0;
};

const parseIndonesianDate = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim().toLowerCase();
  
  const indonesianMonths = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agu: 7, ags: 7,
    september: 8, sep: 8,
    oktober: 9, okt: 9,
    november: 10, nov: 10,
    desember: 11, des: 11
  };
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const parts = str.split(/[\s\-/,]+/);
  if (parts.length === 3) {
    let day = NaN;
    let month = NaN;
    let year = NaN;

    if (indonesianMonths[parts[1]] !== undefined) {
      month = indonesianMonths[parts[1]];
      day = parseInt(parts[0], 10);
      year = parseInt(parts[2], 10);
    } else if (indonesianMonths[parts[0]] !== undefined) {
      month = indonesianMonths[parts[0]];
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p2 > 999) {
        day = p0;
        month = p1 - 1;
        year = p2;
      } else if (p0 > 999) {
        year = p0;
        month = p1 - 1;
        day = p2;
      }
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  return null;
};

const parseCSVText = (text) => {
  if (!text) return { headers: [], rows: [] };
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) return { headers: [], rows: [] };
  
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const parseRow = (rowText) => {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim());
    return fields.map(f => {
      if (f.startsWith('"') && f.endsWith('"')) {
        return f.slice(1, -1).trim();
      }
      return f;
    });
  };

  const headers = parseRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
};

const getCSVFieldValue = (row, possibleNames) => {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const matchedKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
    if (matchedKey !== undefined) {
      return row[matchedKey];
    }
  }
  return '';
};

export function MarketingPage({ activityType }) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  // Main Data States
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [performanceEntries, setPerformanceEntries] = useState([]);
  const [allPerformanceEntries, setAllPerformanceEntries] = useState([]);
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
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);

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
  const [fAdsName, setFAdsName] = useState('');
  const [fTargeting, setFTargeting] = useState('');
  const [fResultType, setFResultType] = useState('Leads');

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
      const [data, perfData] = await Promise.all([
        activityService.getAll(activityType),
        performanceService.getAll()
      ]);
      setActivities(data || []);
      setAllPerformanceEntries(perfData || []);
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
    setFAdsName('');
    setFTargeting('');
    setFResultType('Leads');
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
    setFAdsName(act.ads_name || '');
    setFTargeting(act.targeting || '');
    setFResultType(act.result_type || 'Leads');
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
      budget: sanitizeMoneyToNumber(fBudget),
      ads_name: fAdsName || null,
      targeting: fTargeting || null,
      result_type: fResultType || 'Leads',
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
      spend: sanitizeMoneyToNumber(fpSpend),
      reach: sanitizeMoneyToNumber(fpReach),
      impressions: sanitizeMoneyToNumber(fpImpressions),
      clicks: sanitizeMoneyToNumber(fpClicks),
      results: sanitizeMoneyToNumber(fpResults),
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
      const perfData = await performanceService.getAll();
      setAllPerformanceEntries(perfData || []);
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
        const perfData = await performanceService.getAll();
        setAllPerformanceEntries(perfData || []);
        triggerFeedback('Performance data entry deleted.');
      } catch (err) {
        triggerFeedback(`Delete entry failed: ${err.message}`, true);
      }
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile || !selectedActivity) {
      setCsvError("No file or campaign selected.");
      return;
    }

    setCsvImporting(true);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const { rows } = parseCSVText(text);

        if (rows.length === 0) {
          throw new Error("CSV file is empty or invalid.");
        }

        const defaultClientId = selectedActivity.client_id;
        const defaultProjectId = selectedActivity.project_id;
        const defaultChannel = selectedActivity.channel || "Meta Ads";
        const defaultOwnerId = selectedActivity.owner_id;

        const allActs = await activityService.getAll(activityType);

        const campaignsMap = {};
        rows.forEach(row => {
          const rawCampName = getCSVFieldValue(row, ['Campaign name', 'Campaign', 'Nama Kampanye', 'Nama Campaign']);
          const campaignName = rawCampName ? rawCampName.trim() : '';
          if (!campaignName) return;

          if (!campaignsMap[campaignName]) {
            campaignsMap[campaignName] = [];
          }
          campaignsMap[campaignName].push(row);
        });

        const campaignNames = Object.keys(campaignsMap);
        if (campaignNames.length === 0) {
          throw new Error("No valid campaign names found in CSV. Please verify column headers.");
        }

        const activityIdMap = {};

        for (const name of campaignNames) {
          const matchedAct = allActs.find(act => act.title.trim().toLowerCase() === name.toLowerCase());
          
          if (matchedAct) {
            activityIdMap[name] = matchedAct.id;
          } else {
            const rowsForCamp = campaignsMap[name];
            const firstRow = rowsForCamp[0];
            const adsName = getCSVFieldValue(firstRow, ['Ads', 'Ads name', 'Ad name', 'Varian Iklan', 'Varian', 'Nama Iklan']) || null;
            const targeting = getCSVFieldValue(firstRow, ['Targeting', 'Targeting details', 'Target']) || null;
            const resultType = getCSVFieldValue(firstRow, ['Result type', 'Result name', 'Tipe Hasil']) || 'Leads';

            let minDateStr = null;
            let maxDateStr = null;
            rowsForCamp.forEach(r => {
              const dStr = getCSVFieldValue(r, ['Start running', 'Start date', 'Tanggal Mulai', 'Mulai', 'Date', 'Metric Date', 'Tanggal']);
              const parsedDate = parseIndonesianDate(dStr);
              if (parsedDate) {
                if (!minDateStr || parsedDate < minDateStr) minDateStr = parsedDate;
                if (!maxDateStr || parsedDate > maxDateStr) maxDateStr = parsedDate;
              }
            });

            const startDate = minDateStr || getLocalDateString();
            const endDate = maxDateStr || getLocalDateString();

            const totalSpend = rowsForCamp.reduce((sum, r) => {
              const spVal = getCSVFieldValue(r, ['Amount spent (IDR)', 'Amount spent', 'Spend', 'Biaya', 'Pengeluaran', 'Budget Spent', 'Spent']);
              return sum + sanitizeMoneyToNumber(spVal);
            }, 0);

            const newActPayload = {
              title: name,
              client_id: defaultClientId,
              project_id: defaultProjectId,
              activity_type: activityType,
              channel: defaultChannel,
              budget: totalSpend || 1000000,
              ads_name: adsName,
              targeting: targeting,
              result_type: resultType,
              start_date: startDate,
              end_date: endDate,
              status: 'Active',
              owner_id: defaultOwnerId
            };

            const created = await activityService.create(newActPayload);
            activityIdMap[name] = created.id;
          }
        }

        const perfEntriesToUpsert = [];
        campaignNames.forEach(name => {
          const actId = activityIdMap[name];
          const rowsForCamp = campaignsMap[name];

          rowsForCamp.forEach(row => {
            const rawDate = getCSVFieldValue(row, ['Start running', 'Start date', 'Tanggal Mulai', 'Mulai', 'Date', 'Metric Date', 'Tanggal']);
            const parsedDate = parseIndonesianDate(rawDate);
            if (!parsedDate) return;

            const spend = sanitizeMoneyToNumber(getCSVFieldValue(row, ['Amount spent (IDR)', 'Amount spent', 'Spend', 'Biaya', 'Pengeluaran', 'Budget Spent', 'Spent']));
            const reach = sanitizeMoneyToNumber(getCSVFieldValue(row, ['Reach', 'Jangkauan']));
            const impressions = sanitizeMoneyToNumber(getCSVFieldValue(row, ['Impressions', 'Impresi']));
            const clicks = sanitizeMoneyToNumber(getCSVFieldValue(row, ['Clicks', 'Klik']));
            const results = sanitizeMoneyToNumber(getCSVFieldValue(row, ['Results', 'Hasil', 'Leads', 'Conversions']));
            const notes = getCSVFieldValue(row, ['Notes', 'Keterangan', 'Annotation']) || 'Imported via CSV.';

            perfEntriesToUpsert.push({
              activity_id: actId,
              metric_date: parsedDate,
              spend,
              reach,
              impressions,
              clicks,
              results,
              revenue: 0,
              notes
            });
          });
        });

        if (perfEntriesToUpsert.length === 0) {
          throw new Error("No performance records found with valid dates.");
        }

        await performanceService.upsertMany(perfEntriesToUpsert);

        await loadActivities();
        if (selectedActivity) {
          await loadPerformanceRecords(selectedActivity.id);
        }

        triggerFeedback(`Successfully imported ${campaignNames.length} campaigns and ${perfEntriesToUpsert.length} logs.`);
        setIsCsvModalOpen(false);
        setCsvFile(null);
      } catch (err) {
        console.error("CSV Import Error: ", err);
        setCsvError(err.message || "An unexpected error occurred during CSV import.");
      } finally {
        setCsvImporting(false);
      }
    };

    reader.onerror = () => {
      setCsvError("Error reading the file.");
      setCsvImporting(false);
    };

    reader.readAsText(csvFile);
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
    const matchees = allPerformanceEntries.filter(e => e.activity_id === activityId);
    
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
                        <span className="text-slate-400 text-[8px] uppercase block mb-1 truncate" title={`Results (${act.result_type || 'Leads'})`}>
                          Results ({act.result_type || 'Leads'})
                        </span>
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
                {selectedActivity.ads_name && (
                  <p className="text-[10px] text-slate-600 font-mono">
                    <b>Ads Variant:</b> {selectedActivity.ads_name}
                  </p>
                )}
                {selectedActivity.targeting && (
                  <p className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap mt-0.5 leading-tight">
                    <b>Targeting:</b> {selectedActivity.targeting}
                  </p>
                )}
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

            {/* SVG TRENDS CHART */}
            {performanceEntries.length > 1 && (
              <div className="bg-slate-50 border border-[#141414]/15 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span>Performance Trend Chart</span>
                  </h3>
                  <div className="flex items-center gap-4 text-[9px] font-mono uppercase text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-0.5 bg-orange-600"></span>
                      <span>Spend (IDR)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-0.5 bg-blue-600"></span>
                      <span>Results ({selectedActivity.result_type || 'Leads'})</span>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  {(() => {
                    const sortedEntries = [...performanceEntries].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
                    const width = 600;
                    const height = 180;
                    const paddingLeft = 50;
                    const paddingRight = 40;
                    const paddingTop = 20;
                    const paddingBottom = 30;

                    const graphWidth = width - paddingLeft - paddingRight;
                    const graphHeight = height - paddingTop - paddingBottom;

                    const maxSpend = Math.max(...sortedEntries.map(e => Number(e.spend || 0)), 1);
                    const maxResults = Math.max(...sortedEntries.map(e => Number(e.results || 0)), 1);

                    const points = sortedEntries.map((e, idx) => {
                      const x = paddingLeft + (idx / (sortedEntries.length - 1)) * graphWidth;
                      const ySpend = height - paddingBottom - (Number(e.spend || 0) / maxSpend) * graphHeight;
                      const yResults = height - paddingBottom - (Number(e.results || 0) / maxResults) * graphHeight;
                      return { x, ySpend, yResults, date: e.metric_date, spend: e.spend, results: e.results };
                    });

                    const spendPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.ySpend}`).join(' ');
                    const resultsPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yResults}`).join(' ');

                    const spendAreaPath = points.length > 0 
                      ? `${spendPath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
                      : '';

                    const gridCount = 4;
                    const horizontalGrid = Array.from({ length: gridCount }).map((_, idx) => {
                      const y = paddingTop + (idx / (gridCount - 1)) * graphHeight;
                      const spendVal = maxSpend - (idx / (gridCount - 1)) * maxSpend;
                      const resultsVal = maxResults - (idx / (gridCount - 1)) * maxResults;
                      return { y, spendVal, resultsVal };
                    });

                    return (
                      <div className="relative">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                          <defs>
                            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {horizontalGrid.map((g, idx) => (
                            <g key={idx}>
                              <line 
                                x1={paddingLeft} 
                                y1={g.y} 
                                x2={width - paddingRight} 
                                y2={g.y} 
                                stroke="#141414" 
                                strokeOpacity="0.08" 
                                strokeDasharray="3,3" 
                              />
                              <text 
                                x={paddingLeft - 8} 
                                y={g.y + 3} 
                                textAnchor="end" 
                                fill="#64748b" 
                                className="font-mono text-[8px]"
                              >
                                {g.spendVal >= 1000000 
                                  ? `Rp ${(g.spendVal / 1000000).toFixed(1)}Jt` 
                                  : `Rp ${(g.spendVal / 1000).toFixed(0)}rb`
                                }
                              </text>
                              <text 
                                x={width - paddingRight + 8} 
                                y={g.y + 3} 
                                textAnchor="start" 
                                fill="#3b82f6" 
                                className="font-mono text-[8px]"
                              >
                                {g.resultsVal.toFixed(0)}
                              </text>
                            </g>
                          ))}

                          {points.length > 0 && (
                            <>
                              <text 
                                x={points[0].x} 
                                y={height - paddingBottom + 16} 
                                textAnchor="middle" 
                                fill="#64748b" 
                                className="font-mono text-[8px]"
                              >
                                {formatDate(points[0].date)}
                              </text>
                              
                              {points.length > 2 && (
                                <text 
                                  x={points[Math.floor(points.length / 2)].x} 
                                  y={height - paddingBottom + 16} 
                                  textAnchor="middle" 
                                  fill="#64748b" 
                                  className="font-mono text-[8px]"
                                >
                                  {formatDate(points[Math.floor(points.length / 2)].date)}
                                </text>
                              )}

                              <text 
                                x={points[points.length - 1].x} 
                                y={height - paddingBottom + 16} 
                                textAnchor="middle" 
                                fill="#64748b" 
                                className="font-mono text-[8px]"
                              >
                                {formatDate(points[points.length - 1].date)}
                              </text>
                            </>
                          )}

                          {spendAreaPath && (
                            <path d={spendAreaPath} fill="url(#spendGrad)" />
                          )}

                          <path 
                            d={spendPath} 
                            fill="none" 
                            stroke="#ea580c" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                          <path 
                            d={resultsPath} 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />

                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle 
                                cx={p.x} 
                                cy={p.ySpend} 
                                r="2.5" 
                                fill="#ffffff" 
                                stroke="#ea580c" 
                                strokeWidth="1.5" 
                              />
                              <circle 
                                cx={p.x} 
                                cy={p.yResults} 
                                r="2.5" 
                                fill="#ffffff" 
                                stroke="#3b82f6" 
                                strokeWidth="1.5" 
                              />
                            </g>
                          ))}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* PERFORMANCE JOURNAL ENTRIES LIST AND GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                  <span>Performance Logs Table</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCsvModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#141414] text-[#141414] font-mono text-[10px] font-bold uppercase transition-all hover:bg-slate-50 cursor-pointer"
                  >
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={handleOpenAddPerfModal}
                    className="flex items-center gap-1 bg-[#141414] text-white py-1.5 px-3 hover:bg-orange-600 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Log Entry</span>
                  </button>
                </div>
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
                            {col === 'Results' && selectedActivity?.result_type
                              ? `Results (${selectedActivity.result_type})`
                              : col}
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
                          <span className="text-slate-400 text-[8px] block truncate" title={`Sum Results (${selectedActivity.result_type || 'Leads'})`}>
                            Sum Results ({selectedActivity.result_type || 'Leads'})
                          </span>
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
                    type="text"
                    placeholder="e.g. 45.000.000"
                    value={fBudget}
                    onChange={(e) => setFBudget(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Ads Variant / Ads Name</label>
                  <input
                    type="text"
                    placeholder="e.g. May-InvitationInterview-HNZ-WA-Interaksi"
                    value={fAdsName}
                    onChange={(e) => setFAdsName(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none placeholder:text-slate-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Result Type</label>
                  <div className="space-y-1.5">
                    <select
                      value={PRESET_RESULT_TYPES.includes(fResultType) ? fResultType : 'Custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Custom') {
                          setFResultType('');
                        } else {
                          setFResultType(val);
                        }
                      }}
                      className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                    >
                      {PRESET_RESULT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      <option value="Custom">Custom / Input Manual</option>
                    </select>
                    
                    {(!PRESET_RESULT_TYPES.includes(fResultType) || fResultType === '') && (
                      <input
                        type="text"
                        placeholder="e.g. Messaging conversations started"
                        value={fResultType}
                        onChange={(e) => setFResultType(e.target.value)}
                        className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none placeholder:text-slate-400 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Targeting Details</label>
                <textarea
                  placeholder="e.g. Lokasi: Bandung, Gender: Pria/Wanita, Umur: 22-35, Interest: Broad"
                  value={fTargeting}
                  onChange={(e) => setFTargeting(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none placeholder:text-slate-400 font-mono text-[10px]"
                />
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
                    type="text"
                    placeholder="e.g. 1.500.000"
                    value={fpSpend}
                    onChange={(e) => setFpSpend(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Reach</label>
                  <input
                    type="text"
                    placeholder="25.000"
                    value={fpReach}
                    onChange={(e) => setFpReach(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Impressions</label>
                  <input
                    type="text"
                    placeholder="32.000"
                    value={fpImpressions}
                    onChange={(e) => setFpImpressions(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Clicks</label>
                  <input
                    type="text"
                    placeholder="960"
                    value={fpClicks}
                    onChange={(e) => setFpClicks(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Results ({selectedActivity?.result_type || 'Leads'})</label>
                  <input
                    type="text"
                    placeholder="48"
                    value={fpResults}
                    onChange={(e) => setFpResults(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs"
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

      {/* -------------------- 3. MODAL: CSV IMPORT UPLOADER -------------------- */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-lg">
            
            {/* Heading */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-orange-600" />
                <span>Bulk Import via CSV</span>
              </h3>
              <button 
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvFile(null);
                  setCsvError(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCsvImport} className="p-5 space-y-4 font-mono text-[11px]">
              
              <div className="bg-slate-50 border border-slate-200 p-3 text-slate-600 text-[10px] space-y-1.5 leading-relaxed">
                <p className="font-bold text-[#141414] uppercase">Expected CSV Columns:</p>
                <p className="text-slate-500">
                  `Campaign name`, `Ads`, `Start running`, `Targeting`, `Amount spent (IDR)`, `Reach`, `Impressions`, `Result type`, `Results`
                </p>
                <p className="text-[9px] text-orange-600 font-bold">
                  * Delimiter (comma/semicolon) is auto-detected. Indonesian dates (e.g. 11 Mei 2026) are supported!
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1.5">Select CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      setCsvError(null);
                    }
                  }}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-slate-50 font-mono text-[10px]"
                  required
                />
              </div>

              {csvError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="whitespace-pre-wrap">{csvError}</div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvError(null);
                  }}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase text-[#141414]"
                  disabled={csvImporting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141414] hover:bg-orange-600 text-white font-bold uppercase disabled:opacity-50"
                  disabled={csvImporting || !csvFile}
                >
                  {csvImporting ? 'Processing...' : 'Execute Import'}
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
