import React, { useState } from 'react';
import { Plus, Play, Trash2, Edit3, X } from 'lucide-react';
import { useReviews, useCreateReview, useUpdateReview, useDeleteReview } from '../hooks/useReviews';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { getLocalDateString } from '../utils/formatters';
import type { WeeklyReview as WeeklyReviewType } from '../types';

export function WeeklyReview() {
  const { session } = useAuth();

  const { data: reviews = [], isLoading } = useReviews();
  const { data: projects = [] } = useProjects();

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  // Form state
  const [projectSelected, setProjectSelected] = useState('');
  const [reviewDate, setReviewDate] = useState(getLocalDateString);
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeProject = projectSelected || projects[0]?.id || '';
    if (!weeklyNotes || !activeProject) return;

    const matched = projects.find(p => p.id === activeProject);
    const payload: Partial<WeeklyReviewType> = {
      project_id: activeProject,
      client_id: matched?.client_id,
      review_date: reviewDate,
      weekly_notes: weeklyNotes,
      next_action: nextAction,
      status: 'Published',
    };

    try {
      if (editingId) {
        await updateReview.mutateAsync({ id: editingId, payload });
      } else {
        payload.facilitator_id = session?.user?.id;
        await createReview.mutateAsync(payload);
      }
      setWeeklyNotes(''); setNextAction(''); setEditingId(null);
    } catch (err: any) {
      console.error('WeeklyReview submit error:', err);
    }
  };

  const handleEdit = (rev: WeeklyReviewType) => {
    setProjectSelected(rev.project_id ?? '');
    setReviewDate(rev.review_date);
    setWeeklyNotes(rev.weekly_notes ?? '');
    setNextAction(rev.next_action ?? '');
    setEditingId(rev.id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteReview.mutateAsync(deleteConfirmId);
    if (editingId === deleteConfirmId) { setEditingId(null); setWeeklyNotes(''); setNextAction(''); }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-8 relative">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#141414] p-6 max-w-sm w-full font-mono shadow-2xl">
            <h3 className="text-lg font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Review
            </h3>
            <p className="text-xs text-slate-600 mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-[#141414] font-bold text-xs uppercase hover:bg-slate-100 cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-rose-600 text-white font-bold text-xs uppercase hover:bg-rose-700 cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Weekly Operations Review</h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">Weekly notes, decisions, and next actions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-[#D4D3D0]/20 p-6 border border-[#141414] h-fit space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-[#141414] text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
              {editingId ? <Edit3 className="h-4 w-4 text-orange-500" /> : <Plus className="h-4 w-4 text-orange-500" />}
              {editingId ? 'Edit Review Record' : 'Log Weekly Meeting'}
            </h4>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setWeeklyNotes(''); setNextAction(''); }}
                className="text-[9px] font-bold text-slate-500 hover:text-rose-600 font-mono uppercase cursor-pointer flex items-center gap-1">
                <X className="h-3 w-3" /> Cancel
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">Sprint Project Link</label>
            <select value={projectSelected || projects[0]?.id || ''} onChange={e => setProjectSelected(e.target.value)}
              className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono">
              {projects.length === 0 && <option value="">— No projects —</option>}
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.project_name.substring(0, 24)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">Tanggal Weekly</label>
            <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
              className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">Catatan Weekly</label>
            <textarea value={weeklyNotes} onChange={e => setWeeklyNotes(e.target.value)} placeholder="Catatan hasil meeting..." rows={3} required
              className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">Next Action</label>
            <textarea value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Tindak lanjut yang disepakati..." rows={2}
              className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
          </div>

          <button type="submit"
            className={`w-full text-white font-bold py-2.5 text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-2 cursor-pointer ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#141414] hover:bg-[#141414]/90'}`}>
            <Play className="h-3.5 w-3.5 fill-white stroke-none" />
            {editingId ? 'Update Review Record' : 'Publish Review Record'}
          </button>
        </form>

        {/* Reviews List */}
        <div className="lg:col-span-7 space-y-4 max-h-[500px] overflow-y-auto pr-2">
          <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-[#141414]">Published Catalog</h3>
          {isLoading ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">No weekly reviews published yet.</p>
          ) : (
            reviews.map(rev => {
              const proj = projects.find(p => p.id === rev.project_id);
              return (
                <div key={rev.id} className="p-5 border border-[#141414]/15 bg-[#D4D3D0]/10 font-mono">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 text-[10px]">
                    <span className="font-bold text-[#141414] bg-[#D4D3D0] px-2.5 py-1 uppercase tracking-wider">
                      Tanggal: {rev.review_date}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-[#141414] text-white font-bold px-2 py-0.5 uppercase">{rev.status}</span>
                      <span className="text-slate-500">Project: {proj ? proj.project_code : 'Custom'}</span>
                      <div className="flex items-center gap-1 border-l border-[#141414]/20 pl-2 ml-1">
                        <button onClick={() => handleEdit(rev)} className="text-slate-500 hover:text-orange-600 p-1 cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteConfirmId(rev.id)} className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4 text-[11px]">
                    <div>
                      <span className="font-bold text-orange-600 uppercase text-[9px] tracking-wider block mb-1">Catatan Weekly:</span>
                      <p className="text-[#141414] leading-relaxed whitespace-pre-wrap">{rev.weekly_notes}</p>
                    </div>
                    {rev.next_action && (
                      <div className="pt-2 border-t border-[#141414]/10">
                        <span className="font-bold text-[#141414] uppercase text-[9px] tracking-wider block mb-1">Next Action:</span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{rev.next_action}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyReview;
