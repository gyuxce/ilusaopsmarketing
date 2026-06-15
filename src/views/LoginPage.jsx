import React, { useState } from 'react';
import { Terminal, Lock, Mail, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Harap masukkan email dan password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const { error } = await onLogin(email, password);
      if (error) {
        setErrorMsg(error.message || 'Gagal masuk. Silakan periksa kembali email dan sandi Anda.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan yang tidak terduga pada sistem.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans text-[#141414]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Branding header */}
        <div className="flex flex-col items-center select-none">
          <div className="h-12 w-12 bg-[#141414] text-white flex items-center justify-center border border-[#141414] shadow-sm mb-4">
            <Terminal className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="text-center text-xs tracking-[0.25em] font-extrabold text-[#141414] uppercase font-mono">
            ILUSA OPERATIONS
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 font-mono">
            MANUFACTURING MARKETING EFFICIENCY
          </p>
        </div>

        {/* Supabase status badge */}
        <div className="mt-6 flex justify-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-mono tracking-wider border rounded-none ${
            isSupabaseConfigured 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300/55' 
              : 'bg-amber-50 text-amber-700 border-amber-300/55'
          }`}>
            {isSupabaseConfigured ? (
              <>
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>Supabase Live Auth</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" />
                <span>Offline / Sandbox Mode</span>
              </>
            )}
          </span>
        </div>

      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-[#141414]/15 shadow-sm sm:px-10">
          
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider border-b border-[#141414]/10 pb-3 mb-6">
            Sign in
          </h3>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-700 uppercase font-mono tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ilusa.co"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#141414]/20 focus:outline-none focus:ring-1 focus:ring-orange-600 focus:border-orange-600 bg-white text-xs font-mono rounded-none placeholder:text-slate-400 transition-all text-[#141414]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-700 uppercase font-mono tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#141414]/20 focus:outline-none focus:ring-1 focus:ring-orange-600 focus:border-orange-600 bg-white text-xs font-mono rounded-none placeholder:text-slate-400 transition-all text-[#141414]"
                />
              </div>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="bg-red-50 border-l-2 border-red-500 p-3 flex gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-[11px] font-mono text-red-800 leading-tight">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-orange-600 active:bg-orange-700 transition-all rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>AUTHORIZING...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Sandbox Info */}
          {!isSupabaseConfigured && (
            <div className="mt-6 pt-5 border-t border-[#141414]/5 bg-slate-50/50 p-3 border border-dashed border-[#141414]/10 text-center select-none">
              <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold mb-1">
                Demo Credentials Info
              </span>
              <span className="text-[9px] font-mono text-slate-400 block leading-tight">
                Gunakan email & kata sandi bebas untuk masuk (Sandbox).
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default LoginPage;
