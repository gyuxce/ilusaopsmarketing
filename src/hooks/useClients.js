import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../services/clientService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export function useClients(showSoftDeleted = false) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientService.getClients();
      
      // If we are showing soft deleted, also pull them in mock style if desired,
      // or filter based on showSoftDeleted
      if (showSoftDeleted) {
        setClients(data); 
      } else {
        setClients(data.filter(c => c.deleted_at === null));
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching clients in hooks:', err);
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [showSoftDeleted]);

  const createClient = useCallback(async (clientData) => {
    try {
      const newClient = await clientService.createClient(clientData);
      setClients(prev => {
        const exists = prev.some(c => c.id === newClient.id);
        if (exists) return prev;
        return [...prev, newClient];
      });
      return newClient;
    } catch (err) {
      setError(err.message || 'Failed to create client');
      throw err;
    }
  }, []);

  const updateClient = useCallback(async (id, updateData) => {
    try {
      const updated = await clientService.updateClient(id, updateData);
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update client');
      throw err;
    }
  }, []);

  const deleteClient = useCallback(async (id) => {
    try {
      await clientService.softDeleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete client');
      throw err;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Realtime subscription setup
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channelId = `clients-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload) => {
          console.log('Real-world clients postgres change received:', payload);
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refresh: fetchClients,
    refetch: fetchClients, // compatibility alias
    createClient,
    updateClient,
    deleteClient,
    addClient: createClient, // compatibility alias
    removeClient: deleteClient // compatibility alias
  };
}
