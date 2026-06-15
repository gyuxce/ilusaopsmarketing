import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  User, 
  AlertTriangle, 
  FolderOpen, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  SlidersHorizontal,
  Briefcase
} from 'lucide-react';
import { workService } from '../services/workService';
import { clientsService } from '../services/clientsService';
import { clientService } from '../services/clientService';
import { marketingService } from '../services/marketingService';
import { useToast, useConfirm } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Blocked', 'Done'];

export function WorkPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  // Main Data States
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Status Control States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters State
  const [clientFilter, setClientFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  // Loading Initial Data
  const loadWorkspaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Clients
      const clientsData = await clientsService.getClients(false);
      setClients(clientsData || []);

      // 2. Fetch Users
      const usersData = await workService.getUsers();
      setUsers(usersData || []);

      // 3. Fetch Projects and Ads
      const projectsData = await workService.getProjects(false);
      const adsData = await marketingService.getActivities();

      const unifiedProjects = (projectsData || []).map(p => ({
        ...p,
        _itemType: 'Project',
      }));

      const unifiedAds = (adsData || []).map(m => ({
        ...m,
        _itemType: 'Marketing',
        project_name: m.title,
        description: m.channel,
        assignee_id: m.owner_id
      }));

      setProjects([...unifiedProjects, ...unifiedAds]);

    } catch (err) {
      console.error('Error loading work items:', err);
      setError(err.message || 'Failed to initialize Kanban workspace board.');
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkspaceData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const triggerFeedback = (text, isError = false) => {
    if (isError) {
      showError(text);
    } else {
      showSuccess(text);
    }
  };

  // Move Status Action
  const handleMoveStatus = async (id, nextStatus) => {
    try {
      const item = projects.find(i => i.id === id);
      if (item._itemType === 'Marketing') {
        await marketingService.updateActivity(id, { status: nextStatus });
      } else {
        await clientService.updateClientProject(id, { status: nextStatus });
      }
      
      setProjects(prev => prev.map(item => item.id === id ? { 
        ...item, 
        status: nextStatus 
      } : item));
      
      triggerFeedback(`Moved project to "${nextStatus}" status.`);
    } catch (err) {
      triggerFeedback(`Failed to update status: ${err.message}`, true);
    }
  };

  // Soft Delete Action
  const handleDeleteTask = async (id, title) => {
    const isConfirmed = await confirm({
      title: 'Hapus Item',
      message: `Yakin hapus ${title}? Tindakan ini tidak bisa dibatalkan.`
    });

    if (isConfirmed) {
      try {
        const item = projects.find(i => i.id === id);
        if (item._itemType === 'Marketing') {
          await marketingService.softDeleteActivity(id);
        } else {
          await clientService.softDeleteProject(id);
        }
        setProjects(prev => prev.filter(item => item.id !== id));
        triggerFeedback('Item soft-deleted.');
      } catch (err) {
        triggerFeedback(`Delete failed: ${err.message}`, true);
      }
    }
  };

  // Helper Maps
  const clientMap = clients.reduce((acc, c) => ({ ...acc, [c.id]: c.company_name }), {});
  const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

  // Filter Projects for Kanban
  const filteredProjects = projects.filter(p => {
    let matchClient = true;
    let matchAssignee = true;
    
    if (clientFilter !== 'All') {
      matchClient = p.client_id === clientFilter;
    }
    if (assigneeFilter !== 'All') {
      matchAssignee = p.assignee_id === assigneeFilter || p.owner_id === assigneeFilter;
    }
    
    return matchClient && matchAssignee;
  });

  return (
    <div className="space-y-6">
      
      {/* feedback message popup */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 p-4 shadow-md font-mono text-xs border transition-all ${
          feedback.isError 
            ? 'bg-red-50 border-red-500 text-red-800' 
            : 'bg-emerald-50 border-emerald-500 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">
            Kanban Sprints & Workspace
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Projects and tasks across the current workflow
          </p>
        </div>
      </div>

      {/* FILTERS & TOOLS STRIP */}
      <div className="bg-white border border-[#141414]/15 p-4 md:flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase">
          <SlidersHorizontal className="h-4 w-4 text-orange-600" />
          <span>Quick Workspace Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Client Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Client:</span>
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

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Assignee / PIC:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="py-1 px-2 border border-[#141414]/15 bg-slate-50 focus:border-[#141414] font-bold text-[#141414] rounded-none outline-none cursor-pointer"
            >
              <option value="All">All Assignees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE LOADING STATE */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {COLUMNS.map(col => (
            <div key={col} className="bg-[#D4D3D0]/10 border border-[#141414]/10 p-3 min-h-[300px] flex flex-col justify-start">
              <div className="h-6 bg-slate-200/80 animate-pulse border-b border-[#141414]/10 pb-2.5 mb-3" />
              <div className="space-y-3">
                <div className="h-16 bg-white border border-[#141414]/10 animate-pulse" />
                <div className="h-24 bg-white border border-[#141414]/10 animate-pulse" />
                <div className="h-16 bg-white border border-[#141414]/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-10 border border-dashed border-red-200 bg-red-50 text-center font-mono space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-xs font-bold uppercase text-red-800">{error}</p>
          <button 
            onClick={loadWorkspaceData}
            className="px-4 py-2 border border-red-500 text-red-700 hover:bg-white text-xs font-bold"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState 
          icon={FolderOpen}
          title="No Projects Found"
          description="There are currently no projects listed. Deploy a new project from the Clients menu to see it here."
        />
      ) : (
        /* KANBAN BOARD SYSTEM */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          
          {COLUMNS.map(col => {
            const colItems = filteredProjects.filter(item => {
              if (item.status === col) return true;
              if (col === 'Backlog' && !COLUMNS.includes(item.status)) return true; // Map unmapped statuses to Backlog
              return false;
            });
            return (
              <div 
                key={col} 
                className="bg-[#D4D3D0]/20 border border-[#141414]/10 p-3 min-h-[500px] flex flex-col justify-start"
              >
                
                {/* Column Head */}
                <div className="flex items-center justify-between border-b border-[#141414]/15 pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-600 shrink-0"></span>
                    <h3 className="text-xs font-extrabold uppercase font-mono tracking-tight text-[#141414] truncate">
                      {col}
                    </h3>
                  </div>
                  <span className="bg-[#141414] text-white px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none">
                    {colItems.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px]">
                  {colItems.length === 0 ? (
                    <div className="py-8 bg-white/40 border border-dashed border-[#141414]/10 text-center font-mono text-[9px] text-slate-400 uppercase">
                      Empty Segment
                    </div>
                  ) : (
                    colItems.map(item => {
                      const clientName = clientMap[item.client_id] || 'Non-Specified Client';
                      const ownerName = userMap[item.owner_id];
                      const assigneeName = userMap[item.assignee_id];
                      const colIndex = COLUMNS.indexOf(col);
                      
                      return (
                        <div 
                          key={item.id}
                          className="bg-white border border-[#141414]/15 p-3.5 space-y-3.5 shadow-none hover:border-[#141414]/50 hover:shadow-xs transition-all duration-150"
                        >
                          
                          {/* Card Header Info */}
                          <div className="space-y-1">
                            {item.client_id && (
                              <span className="text-[8px] font-mono text-orange-700 bg-orange-50 border border-orange-200/50 px-1.5 py-0.5 font-bold uppercase truncate max-w-full block">
                                {clientName}
                              </span>
                            )}
                            <h4 className="font-extrabold text-xs text-[#141414] leading-snug tracking-tight uppercase line-clamp-2">
                              {item._itemType === 'Marketing' && (
                                <span className="bg-blue-100 text-blue-800 border border-blue-200 px-1 py-0.5 mr-1.5 text-[8px] font-black tracking-widest inline-block align-middle">AD</span>
                              )}
                              {item.project_name}
                            </h4>
                          </div>

                          {/* Work detail & description */}
                          {item.description && (
                            <p className="text-[10px] text-slate-500 font-sans leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* Date and Assignee Metadata */}
                          <div className="bg-slate-50 p-2 border border-slate-100 space-y-1.5 font-mono text-[9px] uppercase">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>Start: <b className="text-slate-700">{item.start_date}</b></span>
                            </div>
                            
                            {(ownerName || assigneeName) && (
                              <div className="flex items-start gap-1.5 text-slate-500">
                                <User className="h-3 w-3 text-orange-600 shrink-0 mt-0.5" />
                                <div className="leading-tight">
                                  {ownerName && <div className="truncate">PIC: <strong className="text-slate-800">{ownerName}</strong></div>}
                                  {assigneeName && <div className="truncate">Assigned to: <strong className="text-slate-800">{assigneeName}</strong></div>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* MOVE BUTTONS/SELECTOR CONTAINER */}
                          <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-2">
                            {/* Simple Step Navigation */}
                            <div className="flex items-center gap-1">
                              {colIndex > 0 && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, COLUMNS[colIndex - 1])}
                                  className="p-1 border border-slate-200 bg-slate-50 text-slate-600 hover:text-[#141414] hover:bg-slate-100 cursor-pointer"
                                  title={`Move to ${COLUMNS[colIndex - 1]}`}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                              )}
                              
                              {colIndex < COLUMNS.length - 1 && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, COLUMNS[colIndex + 1])}
                                  className="p-1.5 border border-[#141414]/20 bg-white hover:border-[#141414] hover:bg-orange-50 font-bold text-orange-700 cursor-pointer text-[9px] font-mono flex items-center gap-0.5 leading-none"
                                >
                                  <span>Move</span>
                                  <ChevronRight className="h-3 w-3 text-[#141414]" />
                                </button>
                              )}
                            </div>

                            {/* Soft Delete */}
                            <button
                              onClick={() => handleDeleteTask(item.id, item.project_name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer ml-auto"
                              title="Delete Project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

export default WorkPage;
