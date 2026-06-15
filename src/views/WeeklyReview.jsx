import React, { useState, useEffect } from 'react';
import { Plus, Play, FileText, Trash2, Edit3, X } from 'lucide-react';
import { reviewsService } from '../services/reviewsService';
import { useAuth } from '../hooks/useAuth';
import { getLocalDateString } from '../utils/formatters';

export function WeeklyReview({ projects = [], clients = [] }) {
  const { session } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [projectSelected, setProjectSelected] = useState('');
  const [reviewDate, setReviewDate] = useState(getLocalDateString);
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  async function fetchReviews() {
    setLoading(true);
    const data = await reviewsService.getWeeklyReviews();
    setReviews(data);
    setLoading(false);
  }

  useEffect(() => {
    setTimeout(() => {
      fetchReviews();
    }, 0);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeProject = projectSelected || (projects[0]?.id || '');
    if (!weeklyNotes || !activeProject) return;

    const matchedProject = projects.find(p => p.id === activeProject);
    const clientId = matchedProject ? matchedProject.client_id : '';

    const payload = {
      project_id: activeProject,
      client_id: clientId,
      review_date: reviewDate,
      weekly_notes: weeklyNotes,
      next_action: nextAction,
      status: 'Published'
    };

    if (editingId) {
      const updated = await reviewsService.updateWeeklyReview(editingId, payload);
      if (updated) {
        setReviews(prev => prev.map(r => r.id === editingId ? updated : r));
      }
    } else {
      payload.facilitator_id = session?.user?.id;
      const inserted = await reviewsService.insertWeeklyReview(payload);
      setReviews(prev => [inserted, ...prev]);
    }

    setWeeklyNotes('');
    setNextAction('');
    setEditingId(null);
  };

  const handleEdit = (rev) => {
    setProjectSelected(rev.project_id);
    setReviewDate(rev.review_date);
    setWeeklyNotes(rev.weekly_notes);
    setNextAction(rev.next_action || '');
    setEditingId(rev.id);
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const success = await reviewsService.deleteWeeklyReview(deleteConfirmId);
    if (success) {
      setReviews(prev => prev.filter(r => r.id !== deleteConfirmId));
      if (editingId === deleteConfirmId) cancelEdit();
    }
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setWeeklyNotes('');
    setNextAction('');
  };

  return (
    <div className="space-y-8 relative">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#141414] p-6 max-w-sm w-full font-mono shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Review
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete this weekly review record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-[#141414] text-[#141414] font-bold text-xs uppercase hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs uppercase hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">
          Weekly Operations Review
        </h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          Weekly notes, decisions, and next actions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Form Panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-[#D4D3D0]/20 p-6 border border-[#141414] rounded-none h-fit space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-[#141414] text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
              {editingId ? <Edit3 className="h-4 w-4 text-orange-500" /> : <Plus className="h-4 w-4 text-orange-500" />}
              {editingId ? "EDIT REVIEW RECORD" : "LOG WEEKLY MEETING DECISION"}
            </h4>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-[9px] font-bold text-slate-500 hover:text-rose-600 font-mono uppercase cursor-pointer flex items-center gap-1">
                <X className="h-3 w-3" /> Cancel
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">
              Sprint Project Link
            </label>
            <select 
              value={projectSelected || (projects[0]?.id || '')}
              onChange={(e) => setProjectSelected(e.target.value)}
              className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_code} - {p.project_name.substring(0, 20)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">Tanggal Weekly</label>
            <input 
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono mb-4"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">
              Catatan Weekly
            </label>
            <textarea
              value={weeklyNotes}
              onChange={(e) => setWeeklyNotes(e.target.value)}
              placeholder="Catatan hasil meeting mingguan tim..."
              rows={3}
              className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase font-mono mb-1.5 tracking-wider">
              Next Action
            </label>
            <textarea
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Apa saja tindak lanjut yang disepakati..."
              rows={2}
              className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            className={`w-full text-[#E4E3E0] font-bold py-2.5 rounded-none text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-2 cursor-pointer ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#141414] hover:bg-[#141414]/90'}`}
          >
            <Play className="h-3.5 w-3.5 fill-[#E4E3E0] stroke-none" />
            {editingId ? "UPDATE REVIEW RECORD" : "PUBLISH REVIEW RECORD"}
          </button>
        </form>

        {/* Show Published Reviews List */}
        <div className="lg:col-span-7 space-y-4 max-h-[500px] overflow-y-auto pr-2">
          <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-[#141414]">Published Catalog</h3>
          
          {loading ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">Recalling public.weekly_reviews table...</p>
          ) : reviews.length === 0 ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">No weekly reviews published yet.</p>
          ) : (
            reviews.map(rev => {
              const proj = projects.find(p => p.id === rev.project_id);
              return (
                <div key={rev.id} className="p-5 border border-[#141414]/15 rounded-none bg-[#D4D3D0]/10 font-mono">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 text-[10px]">
                    <span className="font-bold text-[#141414] bg-[#D4D3D0] px-2.5 py-1 rounded-none uppercase tracking-wider">
                      Tanggal: {rev.review_date}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-[#141414] text-[#E4E3E0] font-bold px-2 py-0.5 uppercase">
                        {rev.status || 'Published'}
                      </span>
                      <span className="text-slate-500">Project: {proj ? proj.project_code : 'Custom'}</span>
                      <div className="flex items-center gap-1 border-l border-[#141414]/20 pl-2 ml-1">
                        <button type="button" onClick={() => handleEdit(rev)} className="text-slate-500 hover:text-orange-600 p-1 cursor-pointer" title="Edit">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => confirmDelete(rev.id)} className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-orange-600 uppercase text-[9px] tracking-wider">Catatan Weekly:</span>
                      <p className="text-[#141414] leading-relaxed whitespace-pre-wrap">{rev.weekly_notes}</p>
                    </div>
                    {rev.next_action && (
                      <div className="flex flex-col gap-1 pt-2 border-t border-[#141414]/10">
                        <span className="font-bold text-[#141414] uppercase text-[9px] tracking-wider">Next Action:</span>
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
