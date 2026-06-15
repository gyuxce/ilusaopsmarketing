import React, { useState, useEffect } from 'react';
import { CalendarClock, RefreshCw, Search } from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { getLocalDateString } from '../utils/formatters';

export function AttendanceLogsPage({ attendanceVersion = 0 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getLogs();
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 0);
    return () => clearTimeout(timer);
  }, [attendanceVersion]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = log.users?.name || '';
    const email = log.users?.email || '';
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-orange-600" />
            <span>Attendance Logs</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Daily attendance and clock-in history
          </p>
        </div>
        
        <button 
          onClick={fetchLogs}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#141414]/20 text-[#141414] font-mono text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* SEARCH SECTION */}
      <div className="bg-white border border-[#141414]/15 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by team member name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#141414]/20 focus:border-[#141414] focus:ring-0 bg-white rounded-none text-xs font-mono"
          />
        </div>
      </div>

      {/* DATA GRID */}
      <div className="bg-white border border-[#141414]/15 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 font-mono text-xs text-slate-405">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-600 mb-3" />
            <span>Memuat data absensi...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-mono text-xs uppercase bg-slate-50">
            Belum ada log absensi atau data tidak ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] uppercase border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100 border-b border-[#141414]/20 text-[#141414] font-extrabold tracking-wider">
                  <th className="p-3">Clock Date</th>
                  <th className="p-3">Clock In Time</th>
                  <th className="p-3">Team Member</th>
                  <th className="p-3">Role / Dept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {filteredLogs.map(log => {
                  const d = new Date(log.clock_in_time);
                  const isToday = log.clock_date === getLocalDateString();
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-1 border ${isToday ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {log.clock_date}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-700">
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div className="text-[#141414] font-sans lowercase first-letter:uppercase text-[11px]">
                          {log.users?.name || 'Unknown User'}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {log.users?.email || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                          {log.users?.role || '-'}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {log.users?.department || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
