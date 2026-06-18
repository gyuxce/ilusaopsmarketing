import React, { useState } from 'react';
import {
  Plus, Trash2, User, Mail, Briefcase, X, Edit, SlidersHorizontal
} from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useToast, useConfirm } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import type { User as UserType } from '../types';

const ROLES = ['All', 'Admin', 'Manager', 'Staff', 'Client'] as const;

export function TeamPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserType['role']>('Staff');
  const [userDepartment, setUserDepartment] = useState('Operations');
  const [userStatus, setUserStatus] = useState<UserType['status']>('Active');

  // TanStack Query — fetch & mutate
  const { data: users = [], isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q);
    return matchSearch && (roleFilter === 'All' || u.role === roleFilter);
  });

  const openAddModal = () => {
    setEditingUser(null);
    setUserName(''); setUserEmail(''); setUserRole('Staff');
    setUserDepartment('Operations'); setUserStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserType) => {
    setEditingUser(u);
    setUserName(u.name); setUserEmail(u.email); setUserRole(u.role);
    setUserDepartment(u.department); setUserStatus(u.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) { showError('Nama dan email wajib diisi.'); return; }
    const payload = { name: userName, email: userEmail, role: userRole, department: userDepartment, status: userStatus };
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, payload });
        showSuccess('Profil anggota diperbarui.');
      } else {
        await createUser.mutateAsync(payload);
        showSuccess('Anggota baru berhasil didaftarkan.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (u: UserType) => {
    const ok = await confirm({ title: 'Hapus Anggota', message: `Yakin hapus "${u.name}"?` });
    if (!ok) return;
    try {
      await deleteUser.mutateAsync(u.id);
      showSuccess(`"${u.name}" dihapus.`);
    } catch (err: any) {
      showError(err.message || 'Delete gagal.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Team</h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Members, roles, and work assignments</p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <p className="max-w-xs text-[9px] text-slate-500 font-mono uppercase md:text-right leading-relaxed">
            Akun baru diundang via Supabase Auth. Profil tim dibuat otomatis saat pertama login.
          </p>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 border border-orange-600 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-orange-700 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="bg-white border border-[#141414]/15 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <div className="flex items-center gap-1 text-slate-500 uppercase">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Role:</span>
          </div>
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 border font-bold uppercase cursor-pointer ${roleFilter === role ? 'bg-[#141414] text-white border-[#141414]' : 'bg-slate-50 text-[#141414] border-slate-200 hover:bg-slate-100'}`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-slate-400">Loading team members...</div>
      ) : error ? (
        <div className="p-8 border border-dashed border-red-200 bg-red-50 text-center font-mono text-xs text-red-800">
          {(error as any).message}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={User} title="No Team Members Found" description="No members match your search criteria." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-white border border-[#141414]/15 flex flex-col justify-between hover:border-[#141414] transition-all">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base tracking-tight text-[#141414] uppercase leading-tight">{u.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px] uppercase">
                      <Briefcase className="h-3 w-3" />
                      <span>{u.department || 'Ops'}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 border font-bold uppercase ${
                    u.role === 'Admin' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                    u.role === 'Manager' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                    u.role === 'Client' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    'bg-slate-50 text-slate-800 border-slate-300'
                  }`}>
                    {u.role}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#141414]/5 space-y-1.5 font-mono text-[9.5px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate lowercase">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-orange-600 inline-block shrink-0" />
                    <span>Status: <strong className={u.status === 'Inactive' ? 'text-red-600' : 'text-emerald-600'}>{u.status}</strong></span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between gap-2 font-mono text-[9px]">
                <button onClick={() => openEditModal(u)} className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 font-bold uppercase cursor-pointer flex items-center gap-1">
                  <Edit className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => handleDelete(u)} className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold uppercase border border-rose-200 cursor-pointer flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-lg">
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest">
                {editingUser ? 'Modify Member Profile' : 'Register Team Member'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input type="text" placeholder="e.g. Diana Prasetya" value={userName} onChange={e => setUserName(e.target.value)} required
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Email *</label>
                <input type="email" placeholder="e.g. diana@example.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} required
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Role *</label>
                  <select value={userRole} onChange={e => setUserRole(e.target.value as UserType['role'])}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono">
                    <option>Staff</option><option>Manager</option><option>Admin</option><option>Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Status *</label>
                  <select value={userStatus} onChange={e => setUserStatus(e.target.value as UserType['status'])}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono">
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Department *</label>
                <input type="text" placeholder="e.g. Design, Copywriting, Operations" value={userDepartment} onChange={e => setUserDepartment(e.target.value)} required
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px] font-mono">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase cursor-pointer">
                  {editingUser ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamPage;
