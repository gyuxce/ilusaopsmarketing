import { supabase, isSupabaseConfigured, sanitizeUuid } from './supabaseClient';
import { getLocalDateString } from '../utils/formatters';

// Storage Key for LocalStorage fallback
const STORAGE_KEY = 'ilusa_clients';
const STORAGE_PROJECTS_KEY = 'ilusa_projects';

// Default mock values if offline
const DEFAULT_CLIENTS = [];

const DEFAULT_PROJECTS = [];

export const clientService = {
  /**
   * Fetch all active clients (deleted_at IS NULL) combined with owner (users) information
   */
  async getClients() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*, users!clients_owner_id_fkey(name)')
          .is('deleted_at', null)
          .order('company_name', { ascending: true });

        if (error) throw error;
        
        // Map the loaded relationship representation so it's clean (e.g. users name becomes ownerName)
        return data.map(item => ({
          ...item,
          ownerName: item.users?.name || 'Unassigned'
        }));
      } catch (err) {
        console.error('Supabase query error in clientService.getClients:', err);
        throw err;
      }
    }

    // LocalStorage Fallback code path
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : DEFAULT_CLIENTS;
      const activeList = list.filter(item => item.deleted_at === null);
      return activeList.map(item => ({
        ...item,
        ownerName: item.users?.name || 'Pratama Yudha'
      }));
    }
    return DEFAULT_CLIENTS.filter(item => item.deleted_at === null);
  },

  /**
   * Create a new client record
   */
  async createClient(clientData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedOwnerId = await sanitizeUuid(clientData.owner_id, true);
        const { data, error } = await supabase
          .from('clients')
          .insert([{
            ...clientData,
            owner_id: sanitizedOwnerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('*, users!clients_owner_id_fkey(name)');

        if (error) throw error;
        const inserted = data[0];
        return {
          ...inserted,
          ownerName: inserted.users?.name || 'Unassigned'
        };
      } catch (err) {
        console.error('Supabase create client failed:', err);
        throw err;
      }
    }

    // Fallback mode logic
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      const newClient = {
        id: `cli-${Math.floor(1000 + Math.random() * 9000)}`,
        company_name: clientData.company_name,
        client_code: clientData.client_code.toUpperCase(),
        contact_name: clientData.contact_name,
        contact_email: clientData.contact_email,
        contact_phone: clientData.contact_phone || '+62-000-000',
        owner_id: clientData.owner_id || null,
        status: clientData.status || 'Active',
        notes: clientData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        users: { name: 'Pratama Yudha' }
      };
      list.push(newClient);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return {
        ...newClient,
        ownerName: 'Pratama Yudha'
      };
    }

    return clientData;
  },

  /**
   * Update client fields
   */
  async updateClient(clientId, updateData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = { ...updateData };
        if (payload.owner_id !== undefined) {
          payload.owner_id = await sanitizeUuid(payload.owner_id);
        }
        const { data, error } = await supabase
          .from('clients')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)
          .select('*, users!clients_owner_id_fkey(name)');

        if (error) throw error;
        const updated = data[0];
        return {
          ...updated,
          ownerName: updated.users?.name || 'Unassigned'
        };
      } catch (err) {
        console.error('Supabase update client error:', err);
        throw err;
      }
    }

    // Fallback updates
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      let targetClient = null;
      list = list.map(item => {
        if (item.id === clientId) {
          targetClient = {
            ...item,
            ...updateData,
            updated_at: new Date().toISOString()
          };
          return targetClient;
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return {
        ...targetClient,
        ownerName: targetClient?.users?.name || 'Pratama Yudha'
      };
    }

    return { id: clientId, ...updateData };
  },

  /**
   * Soft delete a client
   */
  async softDeleteClient(clientId) {
    const deletedTime = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .update({ deleted_at: deletedTime })
          .eq('id', clientId)
          .select();

        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase soft delete error:', err);
        throw err;
      }
    }

    // Fallback delete
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      list = list.map(item => {
        if (item.id === clientId) {
          return { ...item, deleted_at: deletedTime };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return { id: clientId, deleted_at: deletedTime };
  },

  /**
   * Load projects associated with the client
   */
  async getClientProjects(clientId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, owner:users!projects_owner_id_fkey(name), assignee:users!projects_assignee_id_fkey(name)')
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getClientProjects query failed:', err);
        throw err;
      }
    }

    // Fallback mode
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : DEFAULT_PROJECTS;
      return list.filter(item => item.client_id === clientId && item.deleted_at === null);
    }
    return DEFAULT_PROJECTS.filter(item => item.client_id === clientId && item.deleted_at === null);
  },

  /**
   * Inserts a new project for a particular client directly
   */
  async createClientProject(projectData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedOwnerId = await sanitizeUuid(projectData.owner_id, true);
        const sanitizedAssigneeId = await sanitizeUuid(projectData.assignee_id);
        const { data, error } = await supabase
          .from('projects')
          .insert([{
            ...projectData,
            owner_id: sanitizedOwnerId,
            assignee_id: sanitizedAssigneeId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();

        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase client project creation failed:', err);
        throw err;
      }
    }

    // Fallback project creation
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      const newProj = {
        id: `prj-${Math.floor(1000 + Math.random() * 9000)}`,
        client_id: projectData.client_id,
        project_code: projectData.project_code || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        project_name: projectData.project_name,
        project_type: projectData.project_type || 'Campaign',
        owner_id: projectData.owner_id || null,
        start_date: projectData.start_date || getLocalDateString(),
        due_date: projectData.due_date || getLocalDateString(),
        status: projectData.status || 'Briefing',
        objective: projectData.objective || '',
        description: projectData.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };
      list.push(newProj);
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(list));
      return newProj;
    }

    return projectData;
  },

  /**
   * Update an existing project
   */
  async updateClientProject(projectId, updateData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = { ...updateData };
        if (payload.owner_id !== undefined) {
          payload.owner_id = await sanitizeUuid(payload.owner_id, true);
        }
        if (payload.assignee_id !== undefined) {
          payload.assignee_id = await sanitizeUuid(payload.assignee_id);
        }
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .select();

        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase update project failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      let updatedProject = null;
      const updatedList = list.map(project => {
        if (project.id !== projectId) return project;
        updatedProject = {
          ...project,
          ...updateData,
          updated_at: new Date().toISOString()
        };
        return updatedProject;
      });
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updatedList));
      return updatedProject;
    }
    return null;
  },

  /**
   * Soft delete a project
   */
  async softDeleteProject(projectId) {
    const deletedTime = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({ deleted_at: deletedTime })
          .eq('id', projectId)
          .select();

        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase soft delete project error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      let deletedProject = null;
      const updatedList = list.map(project => {
        if (project.id !== projectId) return project;
        deletedProject = { ...project, deleted_at: deletedTime };
        return deletedProject;
      });
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updatedList));
      return deletedProject;
    }
    return null;
  }
};
