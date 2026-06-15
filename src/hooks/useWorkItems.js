import { useState, useEffect, useCallback } from 'react';
import { workService } from '../services/workService';

export function useWorkItems() {
  const [projects, setProjects] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, listData] = await Promise.all([
        workService.getProjects(),
        workService.getWorkItems()
      ]);
      setProjects(projData);
      setWorkItems(listData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch work items');
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (projectData) => {
    try {
      const newProj = await workService.insertProject(projectData);
      setProjects(prev => [...prev, newProj]);
      return newProj;
    } catch (err) {
      setError(err.message || 'Failed to insert project');
      throw err;
    }
  }, []);

  const addWorkItem = useCallback(async (taskData) => {
    try {
      const newTask = await workService.insertWorkItem(taskData);
      setWorkItems(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err.message || 'Failed to insert task');
      throw err;
    }
  }, []);

  const toggleWorkItem = useCallback(async (id, currentStatus) => {
    const isCompleted = currentStatus === 'Done';
    const nextStatus = isCompleted ? 'To Do' : 'Done';
    const completedAt = isCompleted ? null : new Date().toISOString();
    
    try {
      const updated = await workService.updateWorkItemStatus(id, nextStatus, completedAt);
      setWorkItems(prev => prev.map(item => item.id === id ? { ...item, status: nextStatus, completed_at: completedAt } : item));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update work item');
      throw err;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAll]);

  return {
    projects,
    workItems,
    loading,
    error,
    refetch: fetchAll,
    addProject,
    addWorkItem,
    toggleWorkItem
  };
}
