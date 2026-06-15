import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  CheckSquare, 
  FolderGit, 
  Megaphone, 
  Terminal, 
  BarChart2, 
  Settings as SettingsIcon, 
  FileText, 
  LayoutDashboard, 
  User, 
  Database,
  Lock,
  ChevronRight,
  TrendingUp,
  FlaskConical,
  PlaySquare,
  HelpCircle,
  Menu,
  X,
  Search,
  Bell,
  RefreshCw,
  CalendarClock
} from 'lucide-react';

// Import Views
import { HomePage } from './views/HomePage';
import { ClientsPage } from './views/ClientsPage';
import { TeamPage } from './views/TeamPage';
import { WorkPage } from './views/WorkPage';
import { AdsCampaigns } from './views/AdsCampaigns';
import { WeeklyReview } from './views/WeeklyReview';
import { ReportsPage } from './views/ReportsPage';
import { SettingsPage } from './views/SettingsPage';
import { AttendanceLogsPage } from './views/AttendanceLogsPage';

// Import Custom Hooks
import { useClients } from './hooks/useClients';
import { useWorkItems } from './hooks/useWorkItems';
import { isSupabaseConfigured } from './services/supabaseClient';
import { marketingService } from './services/marketingService';
import { attendanceService } from './services/attendanceService';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './views/LoginPage';
import { LogOut } from 'lucide-react';
import { formatDate, getLocalDateString } from './utils/formatters';

export default function App() {
  const { session, userProfile, loading: authLoading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Home');
  const [campaigns, setCampaigns] = useState([]);

  // States for responsive display, central search, and realtime notifications
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [newUpdateAvailable, setNewUpdateAvailable] = useState(false);

  // Attendance State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [attendanceVersion, setAttendanceVersion] = useState(0);

  // Load state from hooks
  const { clients, loading: clientsLoading, addClient, removeClient } = useClients(true); // Fetch deleted clients too so toggling deleted works
  const { projects, workItems, loading: workLoading, addProject, addWorkItem, toggleWorkItem } = useWorkItems();

  useEffect(() => {
    let cancelled = false;
    marketingService.getCampaigns()
      .then(data => {
        if (!cancelled) setCampaigns(data);
      })
      .catch(err => {
        console.error('Failed to load campaigns:', err);
        if (!cancelled) setCampaigns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    // Wait until userProfile is loaded before checking attendance, to avoid race conditions with session.user.id
    if (!userProfile && session) return; 

    const uid = userProfile?.id || session?.user?.id;
    if (uid) {
      let cancelled = false;
      attendanceService.checkClockInStatus(uid)
        .then(log => {
          if (cancelled) return;
          if (log) {
            setIsClockedIn(true);
            setClockInTime(log.clock_in_time);
          } else {
            setIsClockedIn(false);
            setClockInTime(null);
          }
        })
        .catch(err => {
          console.error('Failed to check clock-in status:', err);
          if (!cancelled) {
            setIsClockedIn(false);
            setClockInTime(null);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [session, userProfile]);

  const handleClockIn = async () => {
    const uid = userProfile?.id || session?.user?.id;
    if (!uid) {
      alert("No active session found.");
      return;
    }
    
    try {
      const log = await attendanceService.clockIn(uid, {
        name: userProfile?.name || session?.user?.email?.split('@')[0],
        email: session?.user?.email,
        role: userProfile?.role,
        department: userProfile?.department
      });
      setIsClockedIn(true);
      setClockInTime(log.clock_in_time);
      setAttendanceVersion(version => version + 1);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to clock in.');
    }
  };

  // Realtime Changes Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let activeChannel = null;

    const setupChannel = async () => {
      const { supabase } = await import('./services/supabaseClient');
      if (!supabase) return;
      activeChannel = supabase
        .channel('dashboard-marketing-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'work_items' },
          () => {
            setNewUpdateAvailable(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'marketing_activities' },
          () => {
            setNewUpdateAvailable(true);
          }
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      if (activeChannel) {
        import('./services/supabaseClient').then(({ supabase }) => {
          if (supabase) supabase.removeChannel(activeChannel);
        });
      }
    };
  }, []);

  // Central Global Search across Clients, Tasks, and Marketing Activities
  const handleSearchChange = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const lowerQuery = query.toLowerCase();

    // 1. Match Clients code or company
    const matchedClients = (clients || []).filter(c => 
      c.company_name?.toLowerCase().includes(lowerQuery) ||
      c.contact_name?.toLowerCase().includes(lowerQuery)
    );

    // 2. Match Work Items (Tasks)
    const matchedWorkItems = (workItems || []).filter(w => 
      w.title?.toLowerCase().includes(lowerQuery) ||
      w.description?.toLowerCase().includes(lowerQuery)
    );

    // 3. Match Marketing Ops Activities
    let matchedActivities = [];
    try {
      const allActivities = await marketingService.getActivities();
      matchedActivities = (allActivities || []).filter(a => 
        a.title?.toLowerCase().includes(lowerQuery) ||
        a.channel?.toLowerCase().includes(lowerQuery)
      );
    } catch (err) {
      console.error('Activities load in global search empty:', err);
    }

    setSearchResults({
      clients: matchedClients,
      workItems: matchedWorkItems,
      activities: matchedActivities
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center font-sans text-[#141414]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-[#141414] text-white flex items-center justify-center border border-[#141414] animate-spin">
            <Terminal className="h-5 w-5 text-orange-600" />
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 animate-pulse">
            Loading workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  const handleAddClient = async (clientData) => {
    await addClient(clientData);
  };

  const handleDeleteClient = async (id) => {
    await removeClient(id);
  };

  const handleRestoreClient = async (id) => {
    // Rely on services directly
    const { clientsService } = await import('./services/clientsService');
    await clientsService.restoreClient(id);
    window.location.reload(); // Refresh collections
  };

  const handleAddProject = async (projData) => {
    await addProject(projData);
  };

  const handleAddWorkItem = async (taskData) => {
    await addWorkItem(taskData);
  };

  const handleToggleWorkItem = async (id, currentStatus) => {
    await toggleWorkItem(id, currentStatus);
  };

  const primaryMenuItems = [
    { name: 'Home', label: 'Overview', icon: LayoutDashboard },
    { name: 'Clients', label: 'Clients', icon: Users },
    { name: 'Work', label: 'Work', icon: FolderGit },
    { name: 'Ads Campaigns', label: 'Marketing', icon: Megaphone },
    { name: 'Reports', label: 'Reports', icon: BarChart2 },
  ];

  const secondaryMenuItems = [
    { name: 'Team', label: 'Team', icon: User },
    { name: 'Attendance', label: 'Attendance', icon: CalendarClock },
    { name: 'Weekly Review', label: 'Weekly reviews', icon: FileText },
    { name: 'Settings', label: 'Settings', icon: SettingsIcon },
  ];

  const menuItems = primaryMenuItems;

  // Render Page body
  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <HomePage onNavigate={setActiveTab} attendanceVersion={attendanceVersion} />
        );
      case 'Clients':
        return (
          <ClientsPage />
        );
      case 'Team':
        return (
          <TeamPage />
        );
      case 'Attendance':
        return (
          <AttendanceLogsPage attendanceVersion={attendanceVersion} />
        );
      case 'Work':
        return (
          <WorkPage />
        );
      case 'Ads Campaigns':
        return (
          <AdsCampaigns 
            projects={projects} 
            clients={clients} 
          />
        );
      case 'Weekly Review':
        return (
          <WeeklyReview 
            projects={projects} 
            clients={clients} 
          />
        );
      case 'Reports':
        return (
          <ReportsPage />
        );
      case 'Settings':
        return (
          <SettingsPage />
        );
      default:
        return <div className="p-6 font-mono text-xs">Page Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#E4E3E0] font-sans text-[#141414] overflow-hidden relative print:h-auto print:overflow-visible print:bg-white">
      
      {/* MOBILE HEADER/BURGER OVERLAY DRAWER */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#141414]/80 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside 
            className="w-64 bg-[#141414] text-[#E4E3E0] flex flex-col justify-between border-r border-[#141414] h-full p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-4 border-b border-[#E4E3E0]/10 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-orange-600" />
                <span className="font-bold text-[#E4E3E0] text-sm">
                  Ilusa
                </span>
              </div>

              <nav className="py-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.name);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-orange-600 text-white font-bold' 
                          : 'hover:bg-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-[#E4E3E0]/10 bg-[#0d0d0d]/80 space-y-3">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest">More</div>
              <div className="grid grid-cols-2 gap-1">
                {secondaryMenuItems.map(item => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.name);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="text-left px-2 py-2 text-[10px] text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="hidden">
                <span className="flex items-center gap-1"><Database className="h-3.5 w-3.5 text-orange-500" /> Supabase</span>
                <span className="text-emerald-500 font-bold">🟢 ONLINE</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* SIDEBAR LEFT */}
      <aside className="hidden lg:flex w-56 bg-[#141414] text-[#E4E3E0] flex flex-col justify-between border-r border-[#141414] shrink-0 h-full print:hidden">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header branding */}
          <div className="p-6 border-b border-[#E4E3E0]/10 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-orange-600" />
            <span className="font-bold text-sm">
              Ilusa
            </span>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-orange-600 text-white font-bold' 
                      : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info blocks of sidebar */}
        <div className="p-4 border-t border-[#E4E3E0]/10 bg-[#0d0d0d]/80 space-y-4">
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">More</div>
            <div className="grid grid-cols-2 gap-1">
              {secondaryMenuItems.map(item => (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`text-left px-2 py-2 text-[10px] cursor-pointer ${
                    activeTab === item.name
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Supabase connection status */}
          <div className="hidden">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-orange-600" />
              <span>Supabase</span>
            </div>
            <span className={`font-bold px-1.5 py-0.5 ${
              isSupabaseConfigured ? 'text-emerald-500' : 'text-amber-500'
            }`}>
              {isSupabaseConfigured ? '🟢 ONLINE' : '🟡 OFFLINE'}
            </span>
          </div>

          {/* Logged in User Profile banner */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#D4D3D0] rounded-none flex items-center justify-center border border-[#141414] shrink-0 text-[#141414]">
              <User className="h-4 w-4 font-bold" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-tight uppercase truncate" title={userProfile?.name || session?.user?.email?.split('@')[0] || 'User'}>
                {userProfile?.name || session?.user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none truncate">
                {userProfile?.role || 'Staff'} / {userProfile?.department || 'Ops'}
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* RIGHT CONTENT WINDOW */}
      <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible">
        
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-[#141414]/15 px-4 lg:px-8 flex items-center justify-between shrink-0 font-mono text-[10px] print:hidden">
          <div className="flex items-center gap-2">
            {/* Hamburger Button */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 text-[#141414] lg:hidden block cursor-pointer transition-colors"
              title="Open Navigation"
              id="mobile-sandwich-btn"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-slate-500 uppercase">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#141414] font-bold">{activeTab}</span>
            </div>
          </div>

          {/* GLOBAL CENTRAL SEARCH BAR */}
          <div className="relative w-40 sm:w-64 md:w-80 ml-auto mr-4 animate-in fade-in" id="central-search-bar">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="search everything..."
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-orange-600 pl-8.5 pr-8 py-1.5 font-mono text-[9px] uppercase tracking-wider text-[#141414] outline-none placeholder:text-slate-400 transition-all rounded-none"
                id="global-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-black cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* FLOATING SEARCH RESULTS GRID */}
            {searchResults && searchQuery.trim().length > 0 && (
              <div 
                className="absolute top-full right-0 w-80 mt-1 max-h-96 overflow-y-auto bg-white border border-[#141414] shadow-2xl z-50 text-[9.5px] uppercase font-mono tracking-wider divide-y divide-slate-100"
                id="search-dropdown-menu"
              >
                {/* Result Block: Clients */}
                {searchResults.clients.length > 0 && (
                  <div className="p-2">
                    <div className="text-[8px] tracking-widest text-[#141414]/50 font-black bg-slate-100 p-1.5 mb-1">CLIENT CONTRACTS</div>
                    {searchResults.clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveTab('Clients');
                          setSearchQuery('');
                          setSearchResults(null);
                        }}
                        className="w-full text-left p-2 hover:bg-orange-50 text-[#141414] flex items-center justify-between font-bold"
                      >
                        <span className="truncate">{c.company_name}</span>
                        <span className="text-[7.5px] text-slate-400 bg-slate-100 border px-1 capitalize whitespace-nowrap">{c.contact_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Result Block: Work Items */}
                {searchResults.workItems.length > 0 && (
                  <div className="p-2">
                    <div className="text-[8px] tracking-widest text-[#141414]/50 font-black bg-slate-110 bg-slate-100 p-1.5 mb-1">WORK TASKS</div>
                    {searchResults.workItems.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setActiveTab('Work');
                          setSearchQuery('');
                          setSearchResults(null);
                        }}
                        className="w-full text-left p-2 hover:bg-orange-50 text-[#141414] flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate text-[10px]">{w.title}</span>
                          <span className={`text-[7px] px-1 border uppercase ${
                            w.priority === 'High' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}>{w.priority}</span>
                        </div>
                        {w.description && <span className="text-[7.5px] text-slate-400 normal-case font-sans font-medium line-clamp-1">{w.description}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Result Block: Marketing Activities */}
                {searchResults.activities.length > 0 && (
                  <div className="p-2">
                    <div className="text-[8px] tracking-widest text-[#141414]/50 font-black bg-slate-100 p-1.5 mb-1">MARKETING OPERATIONS</div>
                    {searchResults.activities.map(a => {
                      let activeTargetTab = 'Ads Campaigns';
                      if (a.activity_type === 'creative_test') activeTargetTab = 'Creative Tests';
                      if (a.activity_type === 'content') activeTargetTab = 'Content';

                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            setActiveTab(activeTargetTab);
                            setSearchQuery('');
                            setSearchResults(null);
                          }}
                          className="w-full text-left p-2 hover:bg-orange-50 text-[#141414] flex flex-col gap-0.5 font-bold"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{a.title}</span>
                            <span className="shrink-0 text-[7px] font-bold text-orange-600 bg-orange-50 px-1 border border-orange-200">{a.channel}</span>
                          </div>
                          <span className="text-[7.5px] text-slate-400 normal-case font-sans italic">View: {activeTargetTab}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* No items matched banner */}
                {searchResults.clients.length === 0 && searchResults.workItems.length === 0 && searchResults.activities.length === 0 && (
                  <div className="p-4 text-center text-slate-400 font-mono text-[9px] uppercase">
                    Data tidak ditemukan.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {/* User & Role Display in Topbar as requested */}
            <div className="hidden md:flex items-center gap-3 border-r border-[#141414]/10 pr-6 text-slate-500 uppercase">
              <User className="h-3.5 w-3.5 text-orange-600" />
              <span>User: <strong className="text-[#141414]">{userProfile?.name || session?.user?.email?.split('@')[0] || 'Member'}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Role: <strong className="text-[#141414]">{userProfile?.role || 'Staff'}</strong></span>
            </div>

            <div className="flex items-center gap-4 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
              <span className="hidden sm:inline-block">Date: {formatDate(getLocalDateString())}</span>
              <span className="h-1.5 w-1.5 bg-orange-600 rounded-none inline-block animate-ping"></span>
              
              {isClockedIn ? (
                <span className="hidden md:inline-block text-emerald-700 bg-emerald-50 px-2.5 py-1.5 border border-emerald-200 uppercase whitespace-nowrap">
                  Clocked In: {new Date(clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              ) : (
                <button
                  onClick={handleClockIn}
                  className="hidden md:inline-block px-2.5 py-1.5 bg-orange-600 text-white hover:bg-orange-700 transition-all cursor-pointer font-bold border border-[#141414] uppercase whitespace-nowrap"
                  title="Clock In for Today"
                >
                  Clock In
                </button>
              )}
              
              <button 
                onClick={logout}
                className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-orange-600 hover:text-white transition-all rounded-none cursor-pointer border border-[#141414] uppercase text-[9px] font-bold tracking-wider"
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN DISPLAY SCENE */}
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto bg-[#E4E3E0] print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
        
      </div>

      {/* Realtime update notification */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2.5 font-mono text-[9px] print:hidden" id="realtime-updates-container">
        {/* Realtime database alert badge */}
        {newUpdateAvailable && (
          <div 
            onClick={() => window.location.reload()}
            className="bg-orange-600 text-white font-black uppercase py-3.5 px-5 border-2 border-black flex items-center gap-2.5 shadow-2xl animate-bounce cursor-pointer hover:bg-black transition-all"
            id="realtime-badge-banner"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white animate-spin" />
            <span>New update available - click to refresh</span>
          </div>
        )}

      </div>
      
    </div>
  );
}
