import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Edit3,
  ExternalLink,
  FileImage,
  Link as LinkIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useActivities } from '../hooks/useActivities';
import {
  useCreateCreativeOutput,
  useCreativeOutputs,
  useDeleteCreativeOutput,
  useUpdateCreativeOutput,
} from '../hooks/useCreativeOutputs';
import { useConfirm, useToast } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { formatDate, getLocalDateString } from '../utils/formatters';
import type { CreativeOutput } from '../types';

const OUTPUT_TYPES = ['Single', 'Carousel', 'Story', 'Banner', 'Reels Cover', 'Landing Page Asset', 'Other'];
const STATUS_OPTIONS = ['Done', 'Revision', 'Draft'] as const;

const getMonthValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const toNumber = (value: string) => {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return Number(cleaned) || 0;
};

export function CreativePage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [monthFilter, setMonthFilter] = useState(getMonthValue());
  const [designerFilter, setDesignerFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [editingOutput, setEditingOutput] = useState<CreativeOutput | null>(null);

  const [outputDate, setOutputDate] = useState(getLocalDateString());
  const [designerId, setDesignerId] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [outputType, setOutputType] = useState('Single');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState('Done');
  const [assetUrl, setAssetUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { data: outputs = [], isLoading, error } = useCreativeOutputs();
  const { data: users = [] } = useUsers();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: activities = [] } = useActivities();

  const createOutput = useCreateCreativeOutput();
  const updateOutput = useUpdateCreativeOutput();
  const deleteOutput = useDeleteCreativeOutput();

  const designerOptions = users.filter(user => user.department === 'Design' || user.role !== 'Client');
  const clientProjects = projects.filter(project => !clientId || project.client_id === clientId);
  const clientActivities = activities.filter(activity => !clientId || activity.client_id === clientId);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(client => [client.id, client.company_name])), [clients]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map(project => [project.id, project.project_name])), [projects]);
  const userMap = useMemo(() => Object.fromEntries(users.map(user => [user.id, user.name])), [users]);
  const activityMap = useMemo(() => Object.fromEntries(activities.map(activity => [activity.id, activity.title])), [activities]);

  const filteredOutputs = outputs.filter(output => {
    const matchMonth = !monthFilter || output.output_date?.startsWith(monthFilter);
    const matchDesigner = designerFilter === 'All' || output.designer_id === designerFilter;
    const matchClient = clientFilter === 'All' || output.client_id === clientFilter;
    return matchMonth && matchDesigner && matchClient;
  });

  const totalQuantity = filteredOutputs.reduce((sum, output) => sum + Number(output.quantity || 0), 0);
  const doneQuantity = filteredOutputs
    .filter(output => output.status === 'Done')
    .reduce((sum, output) => sum + Number(output.quantity || 0), 0);
  const revisionQuantity = filteredOutputs
    .filter(output => output.status === 'Revision')
    .reduce((sum, output) => sum + Number(output.quantity || 0), 0);

  const byType = OUTPUT_TYPES.map(type => ({
    type,
    qty: filteredOutputs
      .filter(output => output.output_type === type)
      .reduce((sum, output) => sum + Number(output.quantity || 0), 0),
  })).filter(item => item.qty > 0);

  const byDesigner = designerOptions.map(designer => ({
    designer,
    total: filteredOutputs
      .filter(output => output.designer_id === designer.id)
      .reduce((sum, output) => sum + Number(output.quantity || 0), 0),
  })).filter(item => item.total > 0);

  const resetForm = () => {
    setEditingOutput(null);
    setOutputDate(getLocalDateString());
    setDesignerId('');
    setClientId('');
    setProjectId('');
    setActivityId('');
    setOutputType('Single');
    setQuantity('1');
    setStatus('Done');
    setAssetUrl('');
    setNotes('');
  };

  const handleEdit = (output: CreativeOutput) => {
    setEditingOutput(output);
    setOutputDate(output.output_date || getLocalDateString());
    setDesignerId(output.designer_id || '');
    setClientId(output.client_id || '');
    setProjectId(output.project_id || '');
    setActivityId(output.activity_id || '');
    setOutputType(output.output_type || 'Single');
    setQuantity(String(output.quantity || 1));
    setStatus(output.status || 'Done');
    setAssetUrl(output.asset_url || '');
    setNotes(output.notes || '');
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    setProjectId('');
    setActivityId('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!outputDate || !outputType || toNumber(quantity) <= 0) {
      showError('Isi tanggal, jenis output, dan jumlah minimal 1.');
      return;
    }

    const payload = {
      output_date: outputDate,
      designer_id: designerId || null,
      client_id: clientId || null,
      project_id: projectId || null,
      activity_id: activityId || null,
      output_type: outputType,
      quantity: toNumber(quantity),
      status: status as CreativeOutput['status'],
      asset_url: assetUrl || null,
      notes: notes || null,
    };

    try {
      if (editingOutput) {
        await updateOutput.mutateAsync({ id: editingOutput.id, payload });
        showSuccess('Creative output berhasil diupdate.');
      } else {
        await createOutput.mutateAsync(payload);
        showSuccess('Creative output berhasil ditambahkan.');
      }
      resetForm();
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan creative output.');
    }
  };

  const handleDelete = async (output: CreativeOutput) => {
    const ok = await confirm({
      title: 'Hapus Creative Output',
      message: `Hapus ${output.output_type} tanggal ${formatDate(output.output_date)}?`,
    });
    if (!ok) return;

    try {
      await deleteOutput.mutateAsync(output.id);
      showSuccess('Creative output dihapus.');
    } catch (err: any) {
      showError(err.message || 'Gagal menghapus creative output.');
    }
  };

  const missingTable = (error as any)?.message?.includes('creative_outputs');

  return (
    <div className="space-y-6">
      <div className="border-b border-[#141414]/15 pb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] uppercase tracking-wider">Creative Output</h1>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Rekap jumlah output desain untuk owner, tanpa nominal payroll.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[10px]">
          <input
            type="month"
            value={monthFilter}
            onChange={event => setMonthFilter(event.target.value)}
            className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none"
          />
          <select
            value={designerFilter}
            onChange={event => setDesignerFilter(event.target.value)}
            className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none"
          >
            <option value="All">All Designers</option>
            {designerOptions.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select
            value={clientFilter}
            onChange={event => setClientFilter(event.target.value)}
            className="border border-[#141414]/20 bg-white px-3 py-2 rounded-none"
          >
            <option value="All">All Clients</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
          </select>
        </div>
      </div>

      {missingTable && (
        <div className="border border-amber-300 bg-amber-50 p-4 font-mono text-[11px] text-amber-900">
          Tabel creative_outputs belum ada di Supabase. Run file SQL
          <strong> supabase_creative_outputs_migration.sql </strong>
          dulu, lalu refresh halaman ini.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Output', value: totalQuantity },
          { label: 'Done', value: doneQuantity },
          { label: 'Revision', value: revisionQuantity },
          { label: 'Record', value: filteredOutputs.length },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#141414]/15 p-5">
            <div className="h-9 w-9 bg-orange-50 flex items-center justify-center mb-3">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-black text-[#141414] tabular-nums">{card.value}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        <form onSubmit={handleSubmit} className="bg-white border border-[#141414]/15 p-5 space-y-4 self-start">
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] flex items-center gap-2">
            <Plus className="h-4 w-4 text-orange-600" />
            {editingOutput ? 'Edit Output' : 'Tambah Output'}
          </h2>

          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Tanggal</label>
              <input type="date" value={outputDate} onChange={event => setOutputDate(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none" required />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Jumlah</label>
              <input type="text" value={quantity} onChange={event => setQuantity(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none" required />
            </div>
          </div>

          <div className="font-mono text-[11px]">
            <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Designer</label>
            <select value={designerId} onChange={event => setDesignerId(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
              <option value="">Unassigned</option>
              {designerOptions.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Jenis Output</label>
              <select value={outputType} onChange={event => setOutputType(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                {OUTPUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Status</label>
              <select value={status} onChange={event => setStatus(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                {STATUS_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="font-mono text-[11px]">
            <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Client</label>
            <select value={clientId} onChange={event => handleClientChange(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
              <option value="">No Client</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Project</label>
              <select value={projectId} onChange={event => setProjectId(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                <option value="">No Project</option>
                {clientProjects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Campaign</label>
              <select value={activityId} onChange={event => setActivityId(event.target.value)} className="w-full p-2 border border-[#141414]/20 bg-white rounded-none">
                <option value="">No Campaign</option>
                {clientActivities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
              </select>
            </div>
          </div>

          <div className="font-mono text-[11px]">
            <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Link Hasil</label>
            <input type="url" value={assetUrl} onChange={event => setAssetUrl(event.target.value)} placeholder="Drive / Canva / Instagram / folder final" className="w-full p-2 border border-[#141414]/20 bg-white rounded-none placeholder:text-slate-400" />
          </div>

          <div className="font-mono text-[11px]">
            <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">Catatan</label>
            <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Opsional: revisi, batch desain, atau detail output." className="w-full p-2 border border-[#141414]/20 bg-white rounded-none resize-y placeholder:text-slate-400" />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 font-mono text-[10px]">
            {editingOutput && (
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-200 bg-slate-50 uppercase">
                Cancel
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase">
              {editingOutput ? 'Update Output' : 'Save Output'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#141414]/15 p-5">
              <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4">Rekap per Jenis</h2>
              {byType.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-400">Belum ada output di filter ini.</p>
              ) : (
                <div className="space-y-2">
                  {byType.map(item => (
                    <div key={item.type} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                      <span className="font-bold text-[#141414]">{item.type}</span>
                      <strong className="text-orange-700 text-sm tabular-nums">{item.qty}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#141414]/15 p-5">
              <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414] mb-4">Rekap per Designer</h2>
              {byDesigner.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-400">Belum ada output per designer.</p>
              ) : (
                <div className="space-y-2">
                  {byDesigner.map(item => (
                    <div key={item.designer.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 font-mono text-[10px]">
                      <span className="font-bold text-[#141414]">{item.designer.name}</span>
                      <strong className="text-orange-700 text-sm tabular-nums">{item.total}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#141414]/15">
            <div className="p-5 border-b border-[#141414]/10 flex items-center justify-between gap-3">
              <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414]">Detail Output</h2>
              <span className="font-mono text-[10px] text-slate-400">{filteredOutputs.length} records</span>
            </div>

            {isLoading ? (
              <div className="p-6 font-mono text-[11px] text-slate-500">Loading creative outputs...</div>
            ) : filteredOutputs.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={FileImage} title="Belum Ada Output" description="Tambahkan output desain selesai supaya rekap bulanan mulai terisi." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead className="bg-[#141414] text-white uppercase">
                    <tr>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Designer</th>
                      <th className="p-3">Client / Project</th>
                      <th className="p-3">Jenis</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Link</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutputs.map(output => (
                      <tr key={output.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 whitespace-nowrap">{formatDate(output.output_date)}</td>
                        <td className="p-3 font-bold text-[#141414] whitespace-nowrap">{output.designer_id ? userMap[output.designer_id] || 'Unknown' : '-'}</td>
                        <td className="p-3 min-w-[220px]">
                          <div className="font-bold text-[#141414] truncate">{output.client_id ? clientMap[output.client_id] || '-' : '-'}</div>
                          <div className="text-[9px] text-slate-400 truncate">
                            {output.project_id ? projectMap[output.project_id] : output.activity_id ? activityMap[output.activity_id] : output.notes || '-'}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">{output.output_type}</td>
                        <td className="p-3 text-right font-black text-orange-700 tabular-nums">{output.quantity}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 border text-[8px] font-bold uppercase ${
                            output.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            output.status === 'Revision' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {output.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {output.asset_url ? (
                            <a href={output.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              <LinkIcon className="h-3 w-3" />
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleEdit(output)} className="p-1.5 text-slate-500 hover:text-[#141414]" title="Edit">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(output)} className="p-1.5 text-slate-400 hover:text-rose-600" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreativePage;
