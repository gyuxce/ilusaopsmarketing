import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#141414]/15 p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-200 w-24"></div>
        <div className="h-3.5 bg-slate-200 rounded-none w-12"></div>
      </div>
      <div className="h-6 bg-slate-200 w-3/4 mt-2"></div>
      <div className="space-y-2 pt-2">
        <div className="h-2 bg-slate-200 w-full"></div>
        <div className="h-2 bg-slate-205 w-4/5"></div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <div className="h-5 bg-slate-200 w-16"></div>
        <div className="h-5 bg-slate-200 w-16"></div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="bg-white border border-[#141414]/15 p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="h-4 bg-slate-200 w-1/4"></div>
        <div className="h-4 bg-slate-200 w-16"></div>
      </div>
      <div className="space-y-3.5">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-b-0">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-205 w-1/3"></div>
              <div className="h-2 bg-slate-200 w-1/2"></div>
            </div>
            <div className="h-5 bg-slate-200 w-14"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGeneric({ className = "h-32" }) {
  return (
    <div className={`bg-white border border-[#141414]/15 p-6 animate-pulse flex flex-col justify-between ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 w-1/3"></div>
        <div className="h-2 bg-slate-200 w-3/4"></div>
        <div className="h-2 bg-slate-200 w-2/3"></div>
      </div>
      <div className="h-4 bg-slate-200 w-1/4 self-end"></div>
    </div>
  );
}
