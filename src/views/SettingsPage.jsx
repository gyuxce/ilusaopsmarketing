import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  User, 
  Lock, 
  ShieldAlert, 
  Plus, 
  X, 
  LogOut, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  SlidersHorizontal, 
  Eye, 
  UserPlus, 
  Building2, 
  Mail, 
  KeyRound, 
  CheckCircle2,
  Trash2,
  LockKeyhole,
  Database,
  Copy
} from 'lucide-react';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';

// DDL schemas removed

export function SettingsPage() {
  const { session, userProfile, logout } = useAuth();

  // Profile Settings State
  const [profileName, setProfileName] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');

  // Automatically pre-fill the form once the profile is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userProfile) {
        setProfileName(userProfile.name || '');
        setProfileDepartment(userProfile.department || '');
      } else if (session?.user?.email) {
        setProfileName(session.user.email.split('@')[0]);
        setProfileDepartment('Operations');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [userProfile, session]);

  // Password Settings State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notifications State
  const [toast, setToast] = useState(null);

  // Trigger Toast Alert
  const showToast = (message, isError = false) => {
    setToast({ text: message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // 3. EDIT LOGGED-IN PROFILE (NAME & DEPARTMENT)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !profileDepartment.trim()) {
      showToast('Nama dan Departemen wajib diisi.', true);
      return;
    }

    try {
      const userId = session?.user?.id;
      if (userId) {
        await userService.update(userId, {
          name: profileName,
          department: profileDepartment
        });
      }
      showToast('Profil berhasil diperbarui!');
      
      // Trigger quick refresh of sidebar layout values
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Profile update failed:', err);
      showToast('Gagal memperbarui data profil.', true);
    }
  };

  // 4. UPDATE USER PASSWORD WITH SUPABASE AUTH API
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('Sandi baru harus berisi minimal 6 karakter.', true);
      return;
    }
    if (password !== confirmPassword) {
      showToast('Konfirmasi kata sandi tidak cocok.', true);
      return;
    }

    setUpdatingPassword(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      showToast('Sandi akun berhasil diatur ulang.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      showToast(err.message || 'Gagal mengubah kata sandi.', true);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8" id="settings-scene-container">
      {/* Toast Alert Banner */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 border shadow-sm font-mono text-xs transition-transform ${
            toast.isError 
              ? 'bg-rose-50 border-rose-500 text-rose-800' 
              : 'bg-emerald-50 border-emerald-500 text-emerald-800'
          }`}
          id="settings-notification-toast"
        >
          <div className="flex items-center gap-2">
            {toast.isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header Summary */}
      <div className="border-b border-[#141414]/15 pb-4">
        <h1 className="text-2xl font-black text-[#141414] uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-orange-600" />
          <span>Settings</span>
        </h1>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          Profile, password, and account preferences.
        </p>
      </div>

      {/* Grid Layout: 2 Columns on Desktop */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: PROFILE & PASSWORD */}
        <div className="space-y-6">
          
          {/* PROFILE SETTINGS FORM */}
          <div className="bg-white p-6 border border-[#141414]/15 space-y-4" id="profile-settings-card">
            <div>
              <h3 className="text-xs font-black font-mono text-[#141414] uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-orange-600" />
                <span>Profile Settings</span>
              </h3>
              <p className="text-[9.5px] text-slate-450 font-mono text-slate-400 mt-1 uppercase">
                Update credentials name and workspace assignment
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 font-mono text-[10.5px]">
              {/* Account Email (Disabled, view-only) */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-slate-400">Account Email</label>
                <div className="w-full p-2.5 bg-slate-50 text-slate-400 border border-slate-200 select-all font-bold lowercase">
                  {session?.user?.email || 'mock.user@ilusa.co'}
                </div>
              </div>

              {/* Edit Name */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-slate-400">Profile Name</label>
                <input 
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white font-bold text-[#141414] focus:border-[#141414] outline-none rounded-none"
                  placeholder="Insert Display Name"
                  required
                />
              </div>

              {/* Edit Department */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-slate-400">Office Department</label>
                <input 
                  type="text"
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white font-bold text-[#141414] focus:border-[#141414] outline-none rounded-none"
                  placeholder="Insert Office Department"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-[#141414] text-[#E4E3E0] hover:bg-orange-600 hover:text-white transition-colors uppercase font-bold text-[10px] cursor-pointer"
                id="btn-update-profile"
              >
                Save Profile parameters
              </button>
            </form>
          </div>

          {/* CHANGE SECURE PASSWORD CARD */}
          <div className="bg-white p-6 border border-[#141414]/15 space-y-4" id="security-password-card">
            <div>
              <h3 className="text-xs font-black font-mono text-[#141414] uppercase tracking-wider flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-orange-600" />
                <span>Set Account Password</span>
              </h3>
              <p className="text-[9.5px] text-slate-450 font-mono text-slate-400 mt-1 uppercase">
                Authorize new security key signatures using supabase.auth
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 font-mono text-[10.5px]">
              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-slate-400">New Account Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white font-bold text-[#141414] focus:border-[#141414] outline-none rounded-none"
                  placeholder="Min 6 Characters"
                  required
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-slate-400">Confirm Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white font-bold text-[#141414] focus:border-[#141414] outline-none rounded-none"
                  placeholder="Repeat Password"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={updatingPassword}
                className="w-full py-2.5 bg-slate-800 text-white hover:bg-orange-600 transition-colors uppercase font-bold text-[10px] cursor-pointer disabled:opacity-50"
                id="btn-change-password"
              >
                {updatingPassword ? 'Authorizing Password...' : 'Update Password Signature'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: DANGER ZONE */}
        <div className="space-y-6">
          {/* DANGER ZONE */}
          <div className="bg-[#141414] text-[#E4E3E0] p-6 border border-rose-500/40 space-y-4" id="danger-zone-card">
            <div className="flex items-center gap-2 border-b border-rose-500/20 pb-2">
              <ShieldAlert className="h-5 w-5 text-rose-500 animate-pulse" />
              <h3 className="text-xs font-black font-mono uppercase tracking-wider text-rose-500">
                Workspace Danger Zone
              </h3>
            </div>
            
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed uppercase">
              Ensure all pending sprint logs and client budgets are synced before terminating your active session credentials.
            </p>

            <button 
              onClick={logout}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer border-none"
              id="btn-settings-signout"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out of Workspace</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SettingsPage;
