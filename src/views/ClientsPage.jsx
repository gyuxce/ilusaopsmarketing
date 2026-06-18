import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  ChevronRight, 
  ArrowLeft, 
  Edit, 
  X, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  Info, 
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  SlidersHorizontal,
  ChevronDown,
  Building,
  Target,
  Clock,
  List,
  Grid
} from 'lucide-react';
import { clientService } from '../services/clientService';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../hooks/useClients';
import { formatDate, getLocalDateString } from '../utils/formatters';
import { useToast, useConfirm } from '../context/AppContext';
import { SkeletonCard, SkeletonList } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export function ClientsPage() {
  const { data: clients = [], isLoading: loading, error, refetch: refresh } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();

  const createClient = async (payload) => createClientMutation.mutateAsync(payload);
  const updateClient = async (id, payload) => updateClientMutation.mutateAsync({ id, payload });
  const deleteClient = async (id) => deleteClientMutation.mutateAsync(id);
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientProjects, setClientProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Lead' | 'Paused' | 'Churned'

  // Modal controls
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null); // client object if editing, null if creating
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // project object if editing

  // Client form states
  const [companyName, setCompanyName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [clientStatus, setClientStatus] = useState('Active');
  const [clientNotes, setClientNotes] = useState('');

  // Project form states
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectType, setProjectType] = useState('Campaign');
  const [projectStatus, setProjectStatus] = useState('Briefing');
  const [startDate, setStartDate] = useState(getLocalDateString);
  const [dueDate, setDueDate] = useState(getLocalDateString);
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [projectOwnerId, setProjectOwnerId] = useState('');
  const [projectAssigneeId, setProjectAssigneeId] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await userService.getAll();
        setTeamMembers(users || []);
      } catch (err) {
        console.error('Failed to load team members:', err);
      }
    };
    fetchUsers();
  }, []);

  // Notifications state
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchProjects = async (clientId) => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getByClient(clientId);
      setClientProjects(data || []);
    } catch (err) {
      console.error('Failed to load client projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Load projects if client is selected
  useEffect(() => {
    if (selectedClient) {
      const timer = setTimeout(() => {
        fetchProjects(selectedClient.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedClient, clients]); // Refetch if selected client or client list changes

  const triggerFeedback = (text, type = 'success') => {
    if (type === 'error') {
      showError(text);
    } else {
      showSuccess(text);
    }
  };

  // ---------------- CLIENT ACTIONS ----------------
  const openAddClientModal = () => {
    setEditingClient(null);
    setCompanyName('');
    setClientCode('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setClientStatus('Active');
    setClientNotes('');
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (client) => {
    setEditingClient(client);
    setCompanyName(client.company_name);
    setClientCode(client.client_code);
    setContactName(client.contact_name);
    setContactEmail(client.contact_email);
    setContactPhone(client.contact_phone || '');
    setClientStatus(client.status);
    setClientNotes(client.notes || '');
    setIsClientModalOpen(true);
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !clientCode || !contactName) {
      triggerFeedback('Please populate all required fields.', 'error');
      return;
    }

    const payload = {
      company_name: companyName,
      client_code: clientCode.toUpperCase().trim(),
      contact_name: contactName,
      contact_email: contactEmail || 'contact@example.com',
      contact_phone: contactPhone || '+62-000-000',
      status: clientStatus,
      notes: clientNotes,
      owner_id: null
    };

    try {
      if (editingClient) {
        const updated = await updateClient(editingClient.id, payload);
        if (selectedClient && selectedClient.id === editingClient.id) {
          setSelectedClient({ ...selectedClient, ...updated });
        }
        triggerFeedback('Client record updated successfully.');
      } else {
        await createClient(payload);
        triggerFeedback('Client record created successfully.');
      }
      setIsClientModalOpen(false);
    } catch (err) {
      triggerFeedback(`Action failed: ${err.message}`, 'error');
    }
  };

  const handleSoftDeleteClient = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Archive Client Record',
      message: `Yakin hapus client: ${name}? Tindakan ini tidak bisa dibatalkan.`
    });

    if (isConfirmed) {
      try {
        await deleteClient(id);
        triggerFeedback(`Client "${name}" has been soft-deleted.`);
        if (selectedClient && selectedClient.id === id) {
          setSelectedClient(null);
        }
      } catch (err) {
        triggerFeedback(`Delete failed: ${err.message}`, 'error');
      }
    }
  };

  // ---------------- PROJECT ACTIONS ----------------
  const openAddProjectModal = () => {
    if (!selectedClient) return;
    setEditingProject(null);
    setProjectName('');
    const suffix = Math.floor(10 + Math.random() * 90);
    setProjectCode(`PRJ-${selectedClient.client_code}-${suffix}`);
    const today = getLocalDateString();
    setStartDate(today);
    setDueDate(today);
    setProjectType('Campaign');
    setObjective('');
    setDescription('');
    setProjectOwnerId('');
    setProjectAssigneeId('');
    setProjectStatus('To Do');
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj) => {
    setEditingProject(proj);
    setProjectName(proj.project_name);
    setProjectCode(proj.project_code);
    setProjectType(proj.project_type || 'Campaign');
    setStartDate(proj.start_date);
    setDueDate(proj.due_date || proj.start_date);
    setObjective(proj.objective || '');
    setDescription(proj.description || '');
    setProjectOwnerId(proj.owner_id || '');
    setProjectAssigneeId(proj.assignee_id || '');
    setProjectStatus(proj.status || 'To Do');
    setIsProjectModalOpen(true);
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!projectName || !projectCode) {
      triggerFeedback('Please populate all required project fields.', 'error');
      return;
    }

    const payload = {
      client_id: selectedClient.id,
      project_code: projectCode.toUpperCase().trim(),
      project_name: projectName,
      project_type: projectType,
      status: projectStatus,
      start_date: startDate,
      due_date: dueDate,
      objective,
      description: description,
      owner_id: projectOwnerId || null,
      assignee_id: projectAssigneeId || null
    };

    try {
      if (editingProject) {
        await projectService.update(editingProject.id, payload);
        triggerFeedback('Project updated successfully.');
      } else {
        await projectService.create(payload);
        triggerFeedback('New project created successfully.');
      }
      fetchProjects(selectedClient.id);
      setIsProjectModalOpen(false);
    } catch (err) {
      triggerFeedback(`Project save failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteProject = async (projId) => {
    const isConfirmed = window.confirm('Are you sure you want to delete this project?');
    if (isConfirmed) {
      try {
        await projectService.softDelete(projId);
        triggerFeedback('Project deleted successfully.');
        fetchProjects(selectedClient.id);
      } catch (err) {
        triggerFeedback(`Delete project failed: ${err.message}`, 'error');
      }
    }
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.client_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.contact_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Active') return matchesSearch && c.status === 'Active';
    if (statusFilter === 'Lead') return matchesSearch && c.status === 'Lead';
    if (statusFilter === 'Inactive') return matchesSearch && (c.status === 'Churned' || c.status === 'Paused');
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 shadow-md font-mono text-xs border transition-all ${
          feedbackMsg.type === 'error' 
            ? 'bg-red-50 border-red-500 text-red-800' 
            : 'bg-emerald-50 border-emerald-500 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* DETAILED DRILLDOWN SCREEN */}
      {selectedClient ? (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#141414]/10 pb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedClient(null)} 
                className="p-2 border border-[#141414]/20 hover:border-[#141414] bg-white transition-all text-[#141414] hover:bg-orange-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest bg-orange-600 text-white px-2 py-0.5 uppercase">
                  {selectedClient.client_code}
                </span>
                <h1 className="text-xl font-bold font-sans text-[#141414] mt-1 uppercase tracking-tight">
                  {selectedClient.company_name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px]">
              <button 
                onClick={() => openEditClientModal(selectedClient)}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#141414]/20 bg-white hover:border-[#141414] font-bold text-[#141414] uppercase cursor-pointer"
              >
                <Edit className="h-3 w-3 text-orange-600" />
                <span>Modify Profile</span>
              </button>

              <button 
                onClick={() => handleSoftDeleteClient(selectedClient.id, selectedClient.company_name)}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white font-bold uppercase hover:bg-orange-700 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Archive</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT PROFILE CARD */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* PRIMARY INFOMATION */}
              <div className="bg-white border border-[#141414]/15 p-6 space-y-5">
                <div className="border-b border-[#141414]/5 pb-3">
                  <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                    Core Partnership Meta
                  </h3>
                </div>

                <div className="space-y-4 font-mono text-[11px]">
                  
                  {/* Status */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 uppercase">STATUS CODE</span>
                    <span className={`px-2 py-0.5 font-bold uppercase rounded-none border text-[9px] ${
                      selectedClient.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                      selectedClient.status === 'Lead' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                      'bg-slate-50 text-slate-800 border-slate-300'
                    }`}>
                      {selectedClient.status}
                    </span>
                  </div>

                  {/* Representative contact_name */}
                  <div className="flex items-start gap-3 py-1">
                    <User className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[9px] leading-none uppercase">Primary PIC</span>
                      <strong className="text-[#141414] font-bold text-[12px] block mt-1">{selectedClient.contact_name}</strong>
                    </div>
                  </div>

                  {/* Representative contact_email */}
                  <div className="flex items-start gap-3 py-1">
                    <Mail className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-400 block text-[9px] leading-none uppercase">Email Communication</span>
                      <a 
                        href={`mailto:${selectedClient.contact_email}`} 
                        className="text-[#141414] hover:text-orange-600 underline font-bold mt-1 block truncate"
                      >
                        {selectedClient.contact_email}
                      </a>
                    </div>
                  </div>

                  {/* Representative contact_phone */}
                  <div className="flex items-start gap-3 py-1">
                    <Phone className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[9px] leading-none uppercase">Phone Contact</span>
                      <strong className="text-[#141414] block mt-1">{selectedClient.contact_phone || '+62-000-000'}</strong>
                    </div>
                  </div>

                  {/* Assignee / Owner */}
                  <div className="flex items-start gap-3 py-1">
                    <Building className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[9px] leading-none uppercase">Account Director</span>
                      <strong className="text-[#141414] block mt-1">{selectedClient.ownerName || 'Pratama Yudha'}</strong>
                    </div>
                  </div>

                  {/* Date Created */}
                  <div className="flex justify-between items-center py-1 border-t border-[#141414]/5 pt-3 mt-2 text-[10px] text-slate-400">
                    <span>ONBOARDED AT</span>
                    <span>{formatDate(selectedClient.created_at)}</span>
                  </div>

                </div>
              </div>

              {/* CLIENT INTERNAL NOTES */}
              <div className="bg-slate-50 border border-[#141414]/15 p-6">
                <div className="flex items-center gap-1.5 border-b border-[#141414]/10 pb-3 mb-3">
                  <Info className="h-4 w-4 text-orange-600" />
                  <h3 className="text-xs font-bold font-mono text-[#141414] uppercase tracking-wide">
                    Internal Briefing Notes
                  </h3>
                </div>
                <p className="text-slate-700 text-xs font-mono leading-relaxed bg-white p-3 border border-[#141414]/10 whitespace-pre-wrap">
                  {selectedClient.notes || 'No notes available for this client. Click "Modify Profile" to add details such as advertising guidelines, special retainers, and branding instructions.'}
                </p>
              </div>

            </div>

            {/* RIGHT PROJECTS SUB-MODULE */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Header section */}
              <div className="bg-white border border-[#141414]/15 p-6">
                <div className="flex items-center justify-between border-b border-[#141414]/5 pb-4 mb-4">
                  <div>
                    <h2 className="text-sm font-extrabold uppercase font-mono tracking-wider flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-orange-600" />
                      Active Client Projects ({clientProjects.length})
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Tabel: public.projects // Active sprints tied to this client node
                    </p>
                  </div>
                  <button 
                    onClick={openAddProjectModal}
                    className="flex items-center gap-1.5 bg-[#141414] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2 hover:bg-orange-600 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Deploy Project</span>
                  </button>
                </div>

                {/* Sub projects list table */}
                {projectsLoading ? (
                  <div className="py-12 text-center font-mono text-xs text-slate-400">
                    Retrieving project rows mapping client reference...
                  </div>
                ) : clientProjects.length === 0 ? (
                  <div className="py-12 border border-dashed border-[#141414]/10 bg-slate-50 p-6 text-center text-slate-500 font-mono space-y-2">
                    <p className="text-xs font-bold text-[#141414] uppercase">No active projects loaded</p>
                    <p className="text-[10px] leading-relaxed">
                      Deploying a campaign or localized retainer will enable tracking marketing tasks and ad-sets.
                    </p>
                    <button 
                      onClick={openAddProjectModal}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#141414] text-white text-[9px] uppercase font-bold"
                    >
                      Deploy project now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientProjects.map((p) => (
                      <div 
                        key={p.id} 
                        className="p-4 border border-[#141414]/15 hover:border-[#141414] bg-white transition-all space-y-3 shadow-none"
                      >
                        <div className="md:flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono bg-slate-100 text-[#141414] px-1.5 py-0.5 border border-slate-200">
                                {p.project_code}
                              </span>
                              <span className="text-[9px] font-mono bg-orange-50 text-orange-700 border border-orange-200/50 px-1.5 py-0.5">
                                {p.project_type}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-[#141414] uppercase tracking-tight">
                              {p.project_name}
                            </h4>
                          </div>

                          <div className="mt-2 md:mt-0">
                            <span className={`text-[9px] font-mono px-2 py-0.5 border uppercase block text-center font-bold ${
                              p.status === 'Done' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              p.status === 'In Progress' ? 'bg-orange-50 text-orange-800 border-orange-300' :
                              'bg-slate-50 text-slate-800 border-slate-300'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>

                        {p.objective && (
                          <div className="text-xs text-slate-600 font-mono flex items-start gap-1 pb-1.5 border-b border-dashed border-[#141414]/5">
                            <Target className="h-3 w-3 mt-0.5 text-orange-600 shrink-0" />
                            <span>Objective: <b>{p.objective}</b></span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono text-slate-400 uppercase">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>Start: {p.start_date}</span>
                          </div>
                          {(p.owner?.name || p.assignee?.name) && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-slate-400" />
                              <span>
                                {p.owner?.name ? `PIC: ${p.owner.name}` : ''}
                                {p.owner?.name && p.assignee?.name ? ' → ' : ''}
                                {p.assignee?.name ? `Assignee: ${p.assignee.name}` : ''}
                              </span>
                            </div>
                          )}
                          {p.description && (
                            <div className="flex items-center gap-1.5 line-clamp-1 flex-1">
                              <Info className="h-3 w-3 text-slate-400" />
                              <span className="normal-case text-[#141414] font-sans">{p.description}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-[#141414]/10 flex gap-2">
                          <button 
                            onClick={() => openEditProjectModal(p)}
                            className="text-[9px] font-mono uppercase bg-slate-100 hover:bg-slate-200 text-[#141414] px-3 py-1 cursor-pointer font-bold transition-all border border-slate-300"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-[9px] font-mono uppercase bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 cursor-pointer font-bold transition-all border border-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>
      ) : (
        /* MASTER DIRECTORY VIEW SCREEN */
        <div className="space-y-6">
          
          {/* Header Action Row */}
          <div className="border-b border-[#141414]/15 pb-4 md:flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">
                Client Directory
              </h1>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Client profiles, contacts, and active projects
              </p>
            </div>
            
            <button 
              onClick={openAddClientModal}
              className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-orange-600 active:bg-orange-700 transition-all rounded-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Client Record</span>
            </button>
          </div>

          {/* SEARCH, STATUS FILTER, VIEW SWITCHER RIAL */}
          <div className="bg-white border border-[#141414]/15 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by company name, client code, or pic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#141414]/20 focus:border-[#141414] focus:ring-0 bg-white rounded-none text-xs font-mono"
              />
            </div>

            {/* Filter & Views */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
              
              {/* Sliders icon label */}
              <div className="flex items-center gap-1 text-slate-500 uppercase pr-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Status:</span>
              </div>

              {/* Status Filters */}
              {['All', 'Active', 'Lead', 'Inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 border font-bold uppercase tracking-wider cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-[#141414] text-white border-[#141414]' 
                      : 'bg-slate-50 text-[#141414] border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'Lead' ? 'Prospect / Lead' : status === 'Inactive' ? 'Inactive / Churned' : status}
                </button>
              ))}

              <span className="text-slate-300 mx-1">|</span>

              {/* Grid / Table View Toggles */}
              <div className="flex border border-slate-200">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 cursor-pointer ${viewMode === 'grid' ? 'bg-slate-200' : 'bg-white hover:bg-slate-50'}`}
                  title="Card View"
                >
                  <Grid className="h-4 w-4 text-[#141414]" />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 border-l border-slate-200 cursor-pointer ${viewMode === 'table' ? 'bg-slate-200' : 'bg-white hover:bg-slate-50'}`}
                  title="Table View"
                >
                  <List className="h-4 w-4 text-[#141414]" />
                </button>
              </div>

            </div>

          </div>

          {/* LOADING STATE */}
          {loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <SkeletonList />
            )
          ) : filteredClients.length === 0 ? (
            /* EMPTY STATE */
            <EmptyState 
              icon={Building}
              title="No Client Profiles Found"
              description="No records match your search criteria. Try modifying your filter state or add a new client record."
              actionText="Add your first client"
              onAction={openAddClientModal}
            />
          ) : viewMode === 'table' ? (
            /* TABLE ROW DIRECTORY REPRESENTATION */
            <div className="bg-white border border-[#141414]/15 overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[10px] uppercase">
                <thead>
                  <tr className="bg-[#141414]/5 border-b border-[#141414]/15 text-slate-500 font-bold">
                    <th className="p-4 w-20">Code</th>
                    <th className="p-4 text-xs font-sans font-bold text-[#141414]">Company / Name</th>
                    <th className="p-4">PIC Name</th>
                    <th className="p-4">PIC Email</th>
                    <th className="p-4">Account Lead</th>
                    <th className="p-4 w-32 text-center">Status</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedClient(c)}
                      className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-bold text-orange-700">{c.client_code}</td>
                      <td className="p-4 font-sans font-bold text-xs text-[#141414]">{c.company_name}</td>
                      <td className="p-4 font-bold">{c.contact_name}</td>
                      <td className="p-4 text-slate-500 select-all font-light lowercase">{c.contact_email}</td>
                      <td className="p-4 font-bold text-slate-500">{c.ownerName || 'Pratama Yudha'}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 font-bold uppercase rounded-none border text-[8px] ${
                          c.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          c.status === 'Lead' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-slate-50 text-slate-800 border-slate-300'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSoftDeleteClient(c.id, c.company_name); }}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* GRID COMPACT DATA CARDS ARCHITECTURE */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-white border border-[#141414]/15 flex flex-col justify-between hover:border-[#141414] transition-all duration-200"
                >
                  {/* Top segment */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 font-bold">
                          {c.client_code}
                        </span>
                        <h3 
                          onClick={() => setSelectedClient(c)}
                          className="font-extrabold text-base tracking-tight text-[#141414] hover:text-orange-600 transition-colors cursor-pointer uppercase leading-tight"
                        >
                          {c.company_name}
                        </h3>
                      </div>
                      
                      <span className={`text-[9px] font-mono px-2 py-0.5 border font-bold uppercase ${
                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        c.status === 'Lead' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        'bg-slate-50 text-slate-800 border-slate-300'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-sans line-clamp-2">
                      {c.notes || 'No specific notes recorded on integration retainers.'}
                    </p>

                    {/* PIC meta row */}
                    <div className="pt-3 border-t border-[#141414]/5 space-y-1.5 font-mono text-[9px] text-slate-500 uppercase">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>PIC: <strong className="text-[#141414]">{c.contact_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate lowercase">{c.contact_email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Director: <strong className="text-[#141414]">{c.ownerName || 'Pratama Yudha'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions segment wrapper */}
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between gap-2 font-mono text-[9px]">
                    <button 
                      onClick={() => openEditClientModal(c)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#141414] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Edit
                    </button>

                    <button 
                      onClick={() => handleSoftDeleteClient(c.id, c.company_name)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold uppercase transition-colors cursor-pointer"
                    >
                      Delete
                    </button>

                    <button 
                      onClick={() => setSelectedClient(c)}
                      className="px-3 py-1.5 bg-[#141414] text-white hover:bg-orange-600 font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                    >
                      <span>Drilldown Detail</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ---------------- CREATE / EDIT CLIENT MODAL ---------------- */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-lg animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between border-b border-[#141414]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest">
                {editingClient ? 'Modify Client Record' : 'Create Client Record'}
              </h3>
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleClientSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Company Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Traveloka Indonesia"
                  value={companyName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCompanyName(name);
                    if (!editingClient) {
                      const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
                      const words = clean.split(/\s+/);
                      let code = '';
                      if (words.length >= 2) {
                        const w1 = words[0].replace(/[AEIOU]/g, '') || words[0];
                        const w2 = words[1].replace(/[AEIOU]/g, '') || words[1];
                        code = (w1.slice(0, 3) + w2.slice(0, 3)).slice(0, 5);
                      } else if (words[0]) {
                        const consonants = words[0].replace(/[AEIOU]/g, '');
                        code = consonants.length >= 3 ? consonants.slice(0, 5) : words[0].slice(0, 5);
                      }
                      if (!code) code = 'CLI';
                      setClientCode(`ILUS-${code}`);
                    }
                  }}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Unique Client Code *</label>
                <input 
                  type="text" 
                  placeholder="e.g. ILUS-TRVL"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  disabled={editingClient !== null}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono uppercase disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">PIC Contact Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Budi Santoso"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">PIC Email Address</label>
                  <input 
                    type="email" 
                    placeholder="budi@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">PIC Phone Contact</label>
                  <input 
                    type="text" 
                    placeholder="+62-..."
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Market Status *</label>
                  <select 
                    value={clientStatus}
                    onChange={(e) => setClientStatus(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="Lead">Lead</option>
                    <option value="Paused">Paused</option>
                    <option value="Churned">Churned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Retainer / Branding Notes</label>
                <textarea 
                  placeholder="Insert retainer details, pricing schedules, or meta setups..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 font-mono text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 text-[#141414] uppercase hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase cursor-pointer"
                >
                  {editingClient ? 'Apply Changes' : 'Insert Row'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ---------------- CREATE PROJECT FOR CLIENT MODAL ---------------- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-lg animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between border-b border-[#141414]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest">
                Deploy Client Project
              </h3>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleProjectSubmit} className="p-5 space-y-4">
              
              <div className="bg-slate-50 p-2.5 border border-dashed border-[#141414]/10 text-[10px] font-mono text-slate-500 uppercase">
                Tied Client: <strong className="text-[#141414]">{selectedClient?.company_name}</strong>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Project Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Q3 Meta Retargeting Loop"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Project Code *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PRJ-TRVL-10"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Kanban Status</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Tanggal Mulai *</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (dueDate < newStart) {
                        setDueDate(newStart);
                      }
                    }}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Tanggal Selesai *</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    min={startDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">PIC (Dari Siapa)</label>
                  <select
                    value={projectOwnerId}
                    onChange={(e) => setProjectOwnerId(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="">-- Pilih PIC --</option>
                    {teamMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Assignee (Ke Siapa)</label>
                  <select
                    value={projectAssigneeId}
                    onChange={(e) => setProjectAssigneeId(e.target.value)}
                    className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                  >
                    <option value="">-- Pilih Assignee --</option>
                    {teamMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-700 uppercase mb-1">Notes / Description</label>
                <textarea 
                  placeholder="Insert notes or description here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-[#141414]/20 focus:border-[#141414] bg-white rounded-none text-xs font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 font-mono text-[10px]">
                <button 
                  type="button" 
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#141414] uppercase cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#141414] hover:bg-orange-600 text-white font-bold uppercase cursor-pointer transition-colors"
                >
                  {editingProject ? 'Apply Changes' : 'Deploy Project'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default ClientsPage;
