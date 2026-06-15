import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';

export function EmptyState({ 
  icon: Icon = HelpCircle, 
  title, 
  description, 
  actionText, 
  onAction,
  id = "empty-state-container"
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#141414]/15 bg-white text-center font-mono"
      id={id}
    >
      <div className="h-14 w-14 bg-slate-100 text-slate-400 flex items-center justify-center border border-[#141414]/10 mb-4 animate-bounce duration-1000">
        <Icon className="h-6 w-6 text-orange-600" />
      </div>

      <h3 className="text-sm font-black text-[#141414] uppercase tracking-wider mb-1">
        {title}
      </h3>
      
      <p className="text-[11px] text-slate-500 normal-case font-medium max-w-sm leading-normal mb-6">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#141414] text-[#E4E3E0] hover:bg-orange-600 hover:text-white transition-all font-mono text-[10px] uppercase font-bold cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}

export default EmptyState;
