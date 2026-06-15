import { supabase, isSupabaseConfigured, sanitizeUuid } from './supabaseClient';

const STORAGE_PROJECTS_KEY = 'ilusa_projects';
const STORAGE_TASKS_KEY = 'ilusa_work_items';
const STORAGE_USERS_KEY = 'ilusa_users_mock';

export const MOCK_USERS = [];

const DEFAULT_PROJECTS = [];

const DEFAULT_WORK_ITEMS = [];

export const workService = {
  // --------- USERS ---------
  async getUsers() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) return data;
      } catch (err) {
        console.error('Supabase query users error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(MOCK_USERS));
    }
    return MOCK_USERS;
  },

  async insertUser(user) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').insert([user]).select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase user insert failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      const list = stored ? JSON.parse(stored) : [...MOCK_USERS];
      const newUser = {
        ...user,
        id: user.id || `usr-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newUser);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
      return newUser;
    }
    return user;
  },

  async updateUser(id, userChanges) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update(userChanges)
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase user update failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      let list = stored ? JSON.parse(stored) : [...MOCK_USERS];
      let updatedUser = null;
      list = list.map(u => {
        if (u.id === id) {
          updatedUser = { ...u, ...userChanges, updated_at: new Date().toISOString() };
          return updatedUser;
        }
        return u;
      });
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
      return updatedUser;
    }
    return { id, ...userChanges };
  },

  async deleteUser(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase user delete failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      const list = stored ? JSON.parse(stored) : [...MOCK_USERS];
      const filtered = list.filter(u => u.id !== id);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(filtered));
      return true;
    }
    return true;
  },

  // --------- PROJECTS ---------
  async getProjects(showSoftDeleted = false) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('projects').select('*');
        if (!showSoftDeleted) {
          query = query.is('deleted_at', null);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase projects query failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : DEFAULT_PROJECTS;
      if (!showSoftDeleted) {
        return list.filter(item => item.deleted_at === null);
      }
      return list;
    }
    return DEFAULT_PROJECTS;
  },

  async insertProject(project) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedOwnerId = await sanitizeUuid(project.owner_id);
        const { data, error } = await supabase.from('projects').insert([{
          ...project,
          owner_id: sanitizedOwnerId
        }]).select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase project insert failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      const newProj = {
        ...project,
        id: project.id || `prj-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        deleted_at: null
      };
      list.push(newProj);
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(list));
      return newProj;
    }
    return project;
  },

  async softDeleteProject(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase project soft delete failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, deleted_at: new Date().toISOString() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updated));
      return updated.find(item => item.id === id);
    }
    return null;
  },

  async restoreProject(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({ deleted_at: null })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase project restore failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_PROJECTS];
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, deleted_at: null };
        }
        return item;
      });
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updated));
      return updated.find(item => item.id === id);
    }
    return null;
  },

  // --------- TASKS / WORK ITEMS ---------
  /**
   * Fetches work items with optional criteria filters
   */
  async getWorkItems(filters = {}) {
    const f = filters || {};
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('work_items')
          .select('*')
          .is('deleted_at', null);

        if (f.status && f.status !== 'All') {
          query = query.eq('status', f.status);
        }
        if (f.priority && f.priority !== 'All') {
          query = query.eq('priority', f.priority);
        }
        if (f.assignee_id && f.assignee_id !== 'All') {
          query = query.eq('assignee_id', f.assignee_id);
        }
        if (f.client_id && f.client_id !== 'All') {
          query = query.eq('client_id', f.client_id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase work_items filtered query failed:', err);
        throw err;
      }
    }

    // Local Storage Sandboxed/Offline engine
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      let list = stored ? JSON.parse(stored) : DEFAULT_WORK_ITEMS;
      
      // Filter out soft deleted
      list = list.filter(item => item.deleted_at === null);

      if (f.status && f.status !== 'All') {
        list = list.filter(item => item.status === f.status);
      }
      if (f.priority && f.priority !== 'All') {
        list = list.filter(item => item.priority === f.priority);
      }
      if (f.assignee_id && f.assignee_id !== 'All') {
        list = list.filter(item => item.assignee_id === f.assignee_id);
      }
      if (f.client_id && f.client_id !== 'All') {
        list = list.filter(item => item.client_id === f.client_id);
      }

      return list;
    }
    return DEFAULT_WORK_ITEMS.filter(item => item.deleted_at === null);
  },

  /**
   * Inserts a new work item inside database
   */
  async createWorkItem(task) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedAssigneeId = await sanitizeUuid(task.assignee_id);
        const { data, error } = await supabase.from('work_items').insert([{
          ...task,
          assignee_id: sanitizedAssigneeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        }]).select();
        
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase createWorkItem failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_WORK_ITEMS];
      const newTask = {
        ...task,
        id: `wi-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };
      list.push(newTask);
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(list));
      return newTask;
    }
    return task;
  },

  // Alias helper to prevent breaking old references
  async insertWorkItem(task) {
    return this.createWorkItem(task);
  },

  /**
   * Updates an existing work item row
   */
  async updateWorkItem(id, updateData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = { ...updateData };
        if (payload.assignee_id !== undefined) {
          payload.assignee_id = await sanitizeUuid(payload.assignee_id);
        }
        const { data, error } = await supabase
          .from('work_items')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase updateWorkItem failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_WORK_ITEMS];
      let updatedTask = null;
      const updatedList = list.map(item => {
        if (item.id === id) {
          updatedTask = {
            ...item,
            ...updateData,
            updated_at: new Date().toISOString()
          };
          return updatedTask;
        }
        return item;
      });
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(updatedList));
      return updatedTask;
    }
    return { id, ...updateData };
  },

  /**
   * Soft deletes an existing work item row
   */
  async softDeleteWorkItem(id) {
    const deletedTime = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('work_items')
          .update({ deleted_at: deletedTime })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase softDeleteWorkItem failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_WORK_ITEMS];
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, deleted_at: deletedTime };
        }
        return item;
      });
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(updated));
      return { id, deleted_at: deletedTime };
    }
    return { id, deleted_at: deletedTime };
  },

  async updateWorkItemStatus(id, status, completedAt = null) {
    return this.updateWorkItem(id, { 
      status, 
      completed_at: completedAt 
    });
  }
};
