import React, { useState } from 'react';
import { Plus, Play, Trash2, Edit3, X } from 'lucide-react';
import { useReviews, useCreateReview, useUpdateReview, useDeleteReview } from '../hooks/useReviews';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';
import { getLocalDateString } from '../utils/formatters';
import type { WeeklyReview as WeeklyReviewType } from '../types';

export function WeeklyReview() {
  const { session } = useAuth();

  const { data: reviews = [], isLoading } = useReviews();
  const { data: clients = [] } = useClients();

  const activeClients = clients.filter(c => c.status === 'Active');

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  // Form state
  const [clientSelected, setClientSelected] = useState('');
  const [reviewDate, setReviewDate] = useState(getLocalDateString);
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Layout UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // Active Selected Review (defaults to first review in descending order on load)
  const activeReviewId = selectedReviewId || reviews[0]?.id || null;
  const selectedReview = reviews.find(r => r.id === activeReviewId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeClient = clientSelected || activeClients[0]?.id || '';
    if (!weeklyNotes || !activeClient) return;

    const payload: Partial<WeeklyReviewType> = {
      client_id: activeClient,
      project_id: null,
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
      setWeeklyNotes(''); 
      setNextAction(''); 
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('WeeklyReview submit error:', err);
    }
  };

  const handleEdit = (rev: WeeklyReviewType) => {
    setClientSelected(rev.client_id ?? '');
    setReviewDate(rev.review_date);
    setWeeklyNotes(rev.weekly_notes ?? '');
    setNextAction(rev.next_action ?? '');
    setEditingId(rev.id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteReview.mutateAsync(deleteConfirmId);
    if (editingId === deleteConfirmId) { 
      setEditingId(null); 
      setWeeklyNotes(''); 
      setNextAction(''); 
    }
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

      {/* Add/Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#141414]/75 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-[#141414]/25 p-6 max-w-lg w-full font-mono shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#141414]/10 pb-3">
              <h4 className="font-extrabold text-[#141414] text-xs uppercase tracking-wider flex items-center gap-1.5">
                {editingId ? <Edit3 className="h-4.5 w-4.5 text-orange-600" /> : <Plus className="h-4.5 w-4.5 text-orange-600" />}
                {editingId ? 'Edit Review Record' : 'Log Weekly Meeting'}
              </h4>
              <button 
                type="button" 
                onClick={() => { setIsModalOpen(false); setEditingId(null); setWeeklyNotes(''); setNextAction(''); }}
                className="text-slate-400 hover:text-[#141414] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Client Link *</label>
                <select 
                  value={clientSelected || activeClients[0]?.id || ''} 
                  onChange={e => setClientSelected(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                >
                  {activeClients.length === 0 && <option value="">— No active clients —</option>}
                  {activeClients.map(c => <option key={c.id} value={c.id}>{c.client_code} - {c.company_name.substring(0, 32)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Tanggal Weekly</label>
                <input 
                  type="date" 
                  value={reviewDate} 
                  onChange={e => setReviewDate(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Catatan Weekly</label>
                <textarea 
                  value={weeklyNotes} 
                  onChange={e => setWeeklyNotes(e.target.value)} 
                  placeholder="Catatan hasil meeting..." 
                  rows={6} 
                  required
                  className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Next Action</label>
                <textarea 
                  value={nextAction} 
                  onChange={e => setNextAction(e.target.value)} 
                  placeholder="Tindak lanjut yang disepakati..." 
                  rows={4}
                  className="w-full p-2.5 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" 
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingId(null); setWeeklyNotes(''); setNextAction(''); }} 
                  className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase text-[#141414]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase"
                >
                  {editingId ? 'Update Record' : 'Publish Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#141414]/15 pb-4 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Weekly Operations Review</h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Weekly notes, decisions, and next actions</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setWeeklyNotes('');
            setNextAction('');
            const today = getLocalDateString();
            setReviewDate(today);
            setClientSelected(activeClients[0]?.id || '');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-[#141414] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 hover:bg-orange-600 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-orange-600" />
          <span>Log Meeting</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column - Master Catalog List (1/3 Width) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="font-extrabold text-[10px] uppercase tracking-widest font-mono text-[#141414] border-b border-[#141414]/10 pb-2">
            Catalog List ({reviews.length})
          </h3>
          {isLoading ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="font-mono text-center text-xs text-slate-400 py-6">No weekly reviews published yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {reviews.map(rev => {
                const client = clients.find(c => c.id === rev.client_id);
                const isActive = rev.id === activeReviewId;
                return (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedReviewId(rev.id)}
                    className={`w-full text-left p-3.5 border transition-all cursor-pointer font-mono flex flex-col gap-2 ${
                      isActive 
                        ? 'border-orange-600 bg-orange-50/15 shadow-none' 
                        : 'border-[#141414]/10 bg-white hover:border-[#141414]/30'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 text-[9px] uppercase">
                      <span className="font-extrabold text-[#141414] bg-slate-100 px-2 py-0.5 border border-slate-200">
                        {rev.review_date}
                      </span>
                      <span className="text-slate-400 font-bold">
                        {client ? client.client_code : 'Custom'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed normal-case">
                      {rev.weekly_notes}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column - Detail Viewer (2/3 Width) */}
        <div className="lg:col-span-8">
          <h3 className="font-extrabold text-[10px] uppercase tracking-widest font-mono text-[#141414] border-b border-[#141414]/10 pb-2 mb-3">
            Review Details
          </h3>
          {selectedReview ? (
            <div className="bg-white border border-[#141414]/15 p-6 space-y-6 shadow-none">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#141414]/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-extrabold text-[#141414] bg-orange-100 border border-orange-200/50 px-2 py-0.5 uppercase">
                      Date: {selectedReview.review_date}
                    </span>
                    <span className="text-[9px] font-mono bg-[#141414] text-white font-bold px-2 py-0.5 uppercase">
                      {selectedReview.status}
                    </span>
                  </div>
                  {(() => {
                    const client = clients.find(c => c.id === selectedReview.client_id);
                    return client ? (
                      <h2 className="text-xs font-bold text-[#141414] font-mono uppercase">
                        Client Partner: <span className="text-orange-700 font-extrabold">{client.client_code} - {client.company_name}</span>
                      </h2>
                    ) : null;
                  })()}
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => {
                      handleEdit(selectedReview);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-[#141414]/15 hover:border-[#141414] bg-slate-50 hover:bg-slate-100 font-mono text-[9px] font-bold uppercase transition-all cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3 text-orange-600" />
                    <span>Edit Record</span>
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(selectedReview.id)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 font-mono text-[9px] font-bold text-rose-600 uppercase transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-6 font-mono">
                {/* Catatan Weekly */}
                <div className="space-y-2">
                  <span className="font-extrabold text-orange-700 uppercase text-[9px] tracking-wider block bg-orange-50 border-l-2 border-orange-500 py-1 px-2.5">
                    Catatan Weekly / meeting notes:
                  </span>
                  <p className="text-[#141414] text-[11.5px] leading-relaxed whitespace-pre-wrap pl-2 font-mono">
                    {selectedReview.weekly_notes}
                  </p>
                </div>

                {/* Next Action */}
                {selectedReview.next_action && (
                  <div className="space-y-2 pt-2 border-t border-[#141414]/5">
                    <span className="font-extrabold text-slate-800 uppercase text-[9px] tracking-wider block bg-slate-50 border-l-2 border-slate-500 py-1 px-2.5">
                      Next Action Plan / tindak lanjut:
                    </span>
                    <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap pl-2 font-mono">
                      {selectedReview.next_action}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-24 border border-dashed border-[#141414]/15 bg-slate-50 text-center font-mono text-xs text-slate-400 uppercase">
              No review record selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyReview;
