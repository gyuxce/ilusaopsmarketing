import React, { useState } from 'react';
import {
  Trash2, User, AlertTriangle, FolderOpen,
  Calendar, ChevronRight, ChevronLeft, SlidersHorizontal
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useActivities } from '../hooks/useActivities';
import { useClients } from '../hooks/useClients';
import { useUsers } from '../hooks/useUsers';
import { useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useUpdateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useToast, useConfirm } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;
type KanbanStatus = typeof COLUMNS[number];

export function WorkPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [clientFilter, setClientFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  // Data via TanStack Query — cached, tidak re-fetch setiap pindah tab
  const { data: rawProjects = [], isLoading: projLoading } = useProjects();
  const { data: rawActivities = [], isLoading: actLoading } = useActivities();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const loading = projLoading || actLoading;

  // Unifikasi projects + activities ke 1 array Kanban
  const allItems = [
    ...rawProjects.map(p => ({ ...p, _itemType: 'Project' as const, _title: p.project_name })),
    ...rawActivities.map(a => ({
      ...a,
      _itemType: 'Marketing' as const,
      _title: a.title,
      assignee_id: a.owner_id,
    })),
  ];

  // Filter
  const filtered = allItems.filter(item => {
    const matchClient = clientFilter === 'All' || item.client_id === clientFilter;
    const matchAssignee = assigneeFilter === 'All' ||
      item.assignee_id === assigneeFilter ||
      item.owner_id === assigneeFilter;
    return matchClient && matchAssignee;
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  const handleMoveStatus = async (id: string, type: 'Project' | 'Marketing', newStatus: string) => {
    try {
      if (type === 'Marketing') {
        await updateActivity.mutateAsync({ id, payload: { status: newStatus as any } });
      } else {
        await updateProject.mutateAsync({ id, payload: { status: newStatus as any } });
      }
      showSuccess(`Moved to "${newStatus}"`);
    } catch (err: any) {
      showError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, type: 'Project' | 'Marketing', title: string) => {
    const ok = await confirm({ title: 'Hapus Item', message: `Yakin hapus "${title}"?` });
    if (!ok) return;
    try {
      if (type === 'Marketing') {
        await deleteActivity.mutateAsync(id);
      } else {
        await deleteProject.mutateAsync(id);
      }
      showSuccess('Item dihapus.');
    } catch (err: any) {
      showError(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Kanban Sprints & Workspace</h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">Projects and tasks across the current workflow</p>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-[#141414]/15 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase">
          <SlidersHorizontal className="h-4 w-4 text-orange-600" />
          <span>Filters</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Client:</span>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="py-1 px-2 border border-[#141414]/15 bg-slate-50 rounded-none outline-none text-[10px]"
            >
              <option value="All">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="py-1 px-2 border border-[#141414]/15 bg-slate-50 rounded-none outline-none text-[10px]"
            >
              <option value="All">All</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KANBAN */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <div key={col} className="bg-[#D4D3D0]/10 border border-[#141414]/10 p-3 min-h-[300px]">
              <div className="h-6 bg-slate-200/80 animate-pulse mb-3 rounded" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white border border-[#141414]/10 animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No Projects Found" description="No projects match the current filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colItems = filtered.filter(item => {
              if (item.status === col) return true;
              if (col === 'To Do' && !COLUMNS.includes(item.status as KanbanStatus)) return true;
              return false;
            });
            const colIndex = COLUMNS.indexOf(col);

            return (
              <div key={col} className="bg-[#D4D3D0]/20 border border-[#141414]/10 p-3 min-h-[500px] flex flex-col">
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[#141414]/15 pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-orange-600 shrink-0" />
                    <h3 className="text-xs font-extrabold uppercase font-mono tracking-tight text-[#141414]">{col}</h3>
                  </div>
                  <span className="bg-[#141414] text-white px-1.5 py-0.5 text-[9px] font-mono font-bold">{colItems.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1">
                  {colItems.length === 0 ? (
                    <div className="py-8 bg-white/40 border border-dashed border-[#141414]/10 text-center font-mono text-[9px] text-slate-400 uppercase">Empty</div>
                  ) : (
                    colItems.map(item => {
                      const itemAny = item as any;
                      return (
                        <div key={item.id} className="bg-white border border-[#141414]/15 p-2.5 space-y-2 hover:border-[#141414]/50 transition-all">
                          {/* Card meta */}
                          <div className="space-y-1">
                            {item.client_id && (
                              <span className="text-[8px] font-mono text-orange-700 bg-orange-50 border border-orange-200/50 px-1.5 py-0.5 font-bold uppercase block truncate">
                                {clientMap[item.client_id] ?? 'Unknown Client'}
                              </span>
                            )}
                            <h4 className="font-extrabold text-xs text-[#141414] leading-snug tracking-tight uppercase line-clamp-2">
                              {item._itemType === 'Marketing' && (
                                <span className="bg-blue-100 text-blue-800 border border-blue-200 px-1 py-0.5 mr-1.5 text-[8px] font-black inline-block align-middle">AD</span>
                              )}
                              {item._title}
                            </h4>
                          </div>

                          {/* Metadata */}
                          <div className="bg-slate-50 p-1.5 border border-slate-100 space-y-1 font-mono text-[9px] uppercase">
                            {(itemAny.start_date || itemAny.due_date || itemAny.end_date) && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">
                                  {itemAny.start_date && (itemAny.due_date || itemAny.end_date) && itemAny.start_date !== (itemAny.due_date || itemAny.end_date) ? (
                                    <><b>{itemAny.start_date}</b> <span className="text-slate-300">→</span> <b>{itemAny.due_date || itemAny.end_date}</b></>
                                  ) : (
                                    <b>{itemAny.due_date || itemAny.end_date || itemAny.start_date}</b>
                                  )}
                                </span>
                              </div>
                            )}
                            {(userMap[itemAny.owner_id ?? ''] || (itemAny._itemType === 'Project' && userMap[itemAny.assignee_id ?? ''])) && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <User className="h-3 w-3 text-orange-600 shrink-0" />
                                <span className="truncate">
                                  {userMap[itemAny.owner_id ?? ''] && (
                                    <>PIC: <strong>{userMap[itemAny.owner_id ?? '']}</strong></>
                                  )}
                                  {itemAny._itemType === 'Project' && itemAny.assignee_id && itemAny.assignee_id !== itemAny.owner_id && userMap[itemAny.assignee_id] && (
                                    <>
                                      <span className="text-slate-300 mx-1">|</span>
                                      ASG: <strong>{userMap[itemAny.assignee_id]}</strong>
                                    </>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Description / Notes */}
                          {(() => {
                            const notes = itemAny.description || itemAny.objective || itemAny.targeting || '';
                            if (!notes) return null;
                            return (
                              <div 
                                className="text-[9px] text-slate-500 font-mono normal-case border-t border-dashed border-slate-200 pt-1.5 cursor-help flex items-start gap-1"
                                title={notes}
                              >
                                <span className="font-bold uppercase text-[8px] text-slate-400 shrink-0">Note:</span>
                                <p className="line-clamp-1 truncate flex-1">{notes}</p>
                              </div>
                            );
                          })()}

                          {/* Move + Delete */}
                          <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-2">
                            <div className="flex gap-1">
                              {colIndex > 0 && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, item._itemType, COLUMNS[colIndex - 1])}
                                  className="p-1 border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                  title={`Back to ${COLUMNS[colIndex - 1]}`}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                              )}
                              {colIndex < COLUMNS.length - 1 && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, item._itemType, COLUMNS[colIndex + 1])}
                                  className="p-1.5 border border-[#141414]/20 bg-white hover:border-[#141414] hover:bg-orange-50 font-bold text-orange-700 cursor-pointer text-[9px] font-mono flex items-center gap-0.5"
                                >
                                  <span>Move</span>
                                  <ChevronRight className="h-3 w-3 text-[#141414]" />
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => handleDelete(item.id, item._itemType, item._title)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer ml-auto"
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
