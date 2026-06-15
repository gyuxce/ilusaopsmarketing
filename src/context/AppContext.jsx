import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

const AppContext = createContext(null);

export function AppContextProvider({ children }) {
  // --- TOAST STATE ---
  const [toasts, setToasts] = useState([]);
  
  const showSuccess = useCallback((message) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type: 'success', duration: 3000 }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const showError = useCallback((message) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type: 'error', duration: 6000 }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- CONFIRM DIALOG STATE ---
  const [confirmState, setConfirmState] = useState(null); // { title, message, resolve }

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: options.title || 'Konfirmasi Aksi',
        message: options.message || 'Apakah Anda yakin ingin melanjutkan?',
        resolve
      });
    });
  }, []);

  const handleConfirmClose = (result) => {
    if (confirmState && confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(null);
  };

  return (
    <AppContext.Provider value={{ showSuccess, showError, confirm }}>
      {children}

      {/* TOASTS RENDERING (Bottom Right Corner) */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
        id="global-toast-container"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 border shadow-md font-mono text-xs animate-in slide-in-from-bottom-5 duration-150 ${
              toast.type === 'success' 
                ? 'bg-[#E4E3E0] border-[#141414] text-[#141414] outline outline-1 outline-emerald-500/20' 
                : 'bg-[#141414] border-rose-500 text-rose-100'
            }`}
            id={`toast-${toast.id}`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500" />
              )}
            </div>
            
            <div className="flex-1 space-y-1">
              <span className="font-extrabold uppercase text-[9px] tracking-wider text-slate-400 block">
                {toast.type === 'success' ? 'Success' : 'Something went wrong'}
              </span>
              <p className="font-sans text-[11px] font-semibold leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-orange-600 transition-colors mt-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* CONFIRM DIALOG OVERLAY (MODAL) */}
      {confirmState && (
        <div 
          className="fixed inset-0 z-50 bg-[#141414]/75 flex items-center justify-center p-4 backdrop-blur-xs"
          id="confirm-dialog-overlay"
        >
          <div 
            className="bg-[#E4E3E0] border-2 border-[#141414] w-full max-w-md shadow-lg overflow-hidden animate-in zoom-in-95 duration-150"
            id="confirm-dialog-box"
          >
            {/* Modal Header */}
            <div className="bg-[#141414] text-[#E4E3E0] px-5 py-4 flex items-center gap-3">
              <div className="shrink-0 bg-orange-600 p-1.5 border border-orange-500">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-mono text-xs font-black uppercase tracking-wider">
                  {confirmState.title}
                </h4>
                <p className="text-[8px] font-mono tracking-widest text-slate-400 leading-none mt-0.5 uppercase">
                  Please confirm this action
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 font-mono text-xs space-y-4">
              <p className="text-slate-700 leading-relaxed font-sans font-medium text-[12px]">
                {confirmState.message}
              </p>
              <div className="bg-amber-100/60 border-l-2 border-amber-500 p-2 text-[9px] text-amber-800 uppercase leading-relaxed font-bold">
                ⚠️ tindakan ini tidak dapat dibatalkan atau dipulihkan di kemudian hari.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => handleConfirmClose(false)}
                className="flex-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider border border-slate-305 text-[#141414] bg-white hover:border-orange-600 hover:text-orange-600 transition-all cursor-pointer"
                id="btn-confirm-cancel"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className="flex-1 py-1 px-4 font-mono text-[10px] font-extrabold uppercase tracking-widest bg-[#141414] hover:bg-[#b91c1c] text-white hover:text-white transition-all cursor-pointer border-none"
                id="btn-confirm-agree"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useToast() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useToast must be used within an AppContextProvider');
  }
  return {
    showSuccess: context.showSuccess,
    showError: context.showError
  };
}

export function useConfirm() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useConfirm must be used within an AppContextProvider');
  }
  return context.confirm;
}
