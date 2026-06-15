import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  User, 
  Mail, 
  Briefcase, 
  Shield, 
  X, 
  Edit, 
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { workService } from '../services/workService';
import { useToast, useConfirm } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { isSupabaseConfigured } from '../services/supabaseClient';

export function TeamPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  // Data States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All'); // 'All' | 'Admin' | 'Manager' | 'Staff' | 'Client'

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // user object if editing, null if creating

  // Form states
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Staff');
  const [userDepartment, setUserDepartment] = useState('Operations');
  const [userStatus, setUserStatus] = useState('Active');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workService.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
      setError(err.message || 'Failed to retrieve team member records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 0);
    return () => clearTimeout(timer);
  }, []);

  const triggerFeedback = (text, type = 'success') => {
    if (type === 'error') {
      showError(text);
    } else {
      showSuccess(text);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('Staff');
    setUserDepartment('Operations');
    setUserStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserDepartment(user.department);
    setUserStatus(user.status || 'Active');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      triggerFeedback('Please populate all required fields.', 'error');
      return;
    }

    const payload = {
      name: userName,
      email: userEmail,
      role: userRole,
      department: userDepartment,
      status: userStatus
    };

    try {
      if (editingUser) {
        await workService.updateUser(editingUser.id, payload);
        triggerFeedback('Team member profile updated successfully.');
      } else {
        await workService.insertUser(payload);
        triggerFeedback('New team member registered successfully.');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      triggerFeedback(`Action failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Remove Team Member',
      message: `Yakin menghapus anggota team "${name}"? Tindakan ini tidak bisa dibatalkan.`
    });

    if (isConfirmed) {
      try {
        await workService.deleteUser(id);
        triggerFeedback(`Anggota "${name}" telah dihapus.`);
        fetchUsers();
      } catch (err) {
        triggerFeedback(`Delete failed: ${err.message}`, 'error');
      }
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === 'All') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">
            Team
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Members, roles, and work assignments
          </p>
        </div>
        
        {isSupabaseConfigured ? (
          <p className="mt-4 md:mt-0 max-w-sm text-[9px] text-slate-500 font-mono uppercase text-right">
            New accounts must be invited through Supabase Auth. Their team profile is created automatically on first registration.
          </p>
        ) : (
          <button
            onClick={openAddModal}
            className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-orange-600 active:bg-orange-700 transition-all rounded-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* SEARCH & FILTERS SECTION */}
      <div className="bg-white border border-[#141414]/15 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#141414]/20 focus:border-[#141414] focus:ring-0 bg-white rounded-none text-xs font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-1 text-slate-500 uppercase pr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Role:</span>
          </div>

          {['All', 'Admin', 'Manager', 'Staff', 'Client'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 border font-bold uppercase tracking-wider cursor-pointer ${
                roleFilter === role 
                  ? 'bg-[#141414] text-white border-[#141414]' 
                  : 'bg-slate-50 text-[#141414] border-slate-200 hover:bg-slate-100'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

      </div>

      {/* DATA GRID DISPLAY */}
      {loading ? (
        <div className="py-12 text-center font-mono text-xs text-slate-400">
          Retrieving team members records...
        </div>
      ) : error ? (
        <div className="p-10 border border-dashed border-red-200 bg-red-50 text-center font-mono space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-xs font-bold uppercase text-red-800">{error}</p>
          <button 
            onClick={fetchUsers}
            className="px-4 py-2 border border-red-500 text-red-700 hover:bg-white text-xs font-bold"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState 
          icon={User}
          title="No Team Members Found"
          description={isSupabaseConfigured
            ? 'No team members match your criteria. Invite accounts through Supabase Auth first.'
            : 'No team members match your criteria. Create employees or freelancers to assign tasks to them.'}
          actionText={isSupabaseConfigured ? undefined : 'Add Team Member'}
          onAction={isSupabaseConfigured ? undefined : openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div 
              key={u.id} 
              className="bg-white border border-[#141414]/15 flex flex-col justify-between hover:border-[#141414] transition-all duration-200"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base tracking-tight text-[#141414] uppercase leading-tight">
                      {u.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px] uppercase">
                      <Briefcase className="h-3 w-3 text-slate-400" />
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
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate lowercase">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-orange-600 rounded-none shrink-0 inline-block"></span>
                    <span>Status: <strong className={u.status === 'Inactive' ? 'text-red-600' : 'text-emerald-600'}>{u.status || 'Active'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between gap-2 font-mono text-[9px]">
                <button 
                  onClick={() => openEditModal(u)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#141414] font-bold uppercase transition-colors cursor-pointer"
                >
                  Edit
                </button>

                <button 
                  onClick={() => handleDeleteUser(u.id, u.name)}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold uppercase transition-colors border border-rose-200 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- CREATE / EDIT MEMBER MODAL ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-lg animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between border-b border-[#141414]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest">
                {editingUser ? 'Modify Member Profile' : 'Register Team Member'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Diana Prasetya"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input 
                  type="email" 
                  placeholder="e.g. diana@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Role *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Client">Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Status *</label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Department / Specialty *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Freelance Copywriter, Design, Operations"
                  value={userDepartment}
                  onChange={(e) => setUserDepartment(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                />
                <p className="text-[8px] font-mono text-slate-400 uppercase mt-1">
                  Tip: Tulis &quot;Freelance [Keahlian]&quot; jika merupakan freelancer luar.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 text-[#141414] uppercase hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Register Member'}
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
