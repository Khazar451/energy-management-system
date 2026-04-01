'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getDevices, addDevice, type DeviceDto } from '@/lib/api';
import { Plus, Cpu, X, CheckCircle, XCircle } from 'lucide-react';

export default function DevicesPage() {
  const router = useRouter();
  const [devices,  setDevices]  = useState<DeviceDto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState('');

  // form state
  const [form, setForm] = useState({
    branchId: '', deviceType: '', modelName: '', installDate: '', serialNumber: ''
  });

  useEffect(() => {
    if (!localStorage.getItem('ems_token')) { router.replace('/login'); return; }
    loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (err: any) {
      if (err.message?.includes('401')) router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await addDevice({
        branchId:    parseInt(form.branchId),
        deviceType:  form.deviceType,
        modelName:   form.modelName || undefined,
        installDate: form.installDate,
        serialNumber:form.serialNumber || undefined,
      });
      setModal(false);
      setForm({ branchId:'', deviceType:'', modelName:'', installDate:'', serialNumber:'' });
      await loadDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = devices.filter(d =>
    filter === '' ||
    d.deviceType.toLowerCase().includes(filter.toLowerCase()) ||
    (d.city ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (d.serialNumber ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  const activeCount   = devices.filter(d =>  d.isActive).length;
  const inactiveCount = devices.filter(d => !d.isActive).length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 className="page-title">Cihaz Envanteri</h1>
            <p className="page-subtitle">IoT cihazlarını yönetin ve yeni cihaz ekleyin</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={15} /> Cihaz Ekle
          </button>
        </div>

        {/* Summary row */}
        <div className="card-grid" style={{ marginBottom:24 }}>
          <div className="kpi-card blue">
            <div className="kpi-header">
              <div className="kpi-label">Toplam Cihaz</div>
              <div className="kpi-icon blue"><Cpu size={18} /></div>
            </div>
            <div className="kpi-value blue">{devices.length}</div>
            <div className="kpi-sub">kayıtlı cihaz</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-header">
              <div className="kpi-label">Aktif</div>
              <div className="kpi-icon green"><CheckCircle size={18} /></div>
            </div>
            <div className="kpi-value green">{activeCount}</div>
            <div className="kpi-sub">çevrimiçi cihaz</div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-header">
              <div className="kpi-label">Pasif</div>
              <div className="kpi-icon red"><XCircle size={18} /></div>
            </div>
            <div className="kpi-value red">{inactiveCount}</div>
            <div className="kpi-sub">devre dışı</div>
          </div>
        </div>

        {/* Filter */}
        <div className="card" style={{ marginBottom:20 }}>
          <input
            className="form-input"
            placeholder="Cihaz tipi, şehir veya seri numarasına göre filtrele..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ maxWidth:400 }}
          />
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
            <div className="spinner" style={{ width:36, height:36 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cihaz Tipi</th>
                  <th>Model</th>
                  <th>Şehir</th>
                  <th>Seri No</th>
                  <th>Kurulum Tarihi</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>#{d.id}</td>
                    <td style={{ fontWeight:600 }}>{d.deviceType}</td>
                    <td style={{ color:'var(--text-secondary)' }}>{d.modelName ?? '—'}</td>
                    <td>{d.city ?? '—'}</td>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{d.serialNumber ?? '—'}</td>
                    <td style={{ color:'var(--text-secondary)' }}>
                      {new Date(d.installDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      {d.isActive
                        ? <span className="badge badge-green">● Aktif</span>
                        : <span className="badge badge-red">● Pasif</span>
                      }
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>
                      Cihaz bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Device Modal */}
        {modal && (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(false)}>
            <div className="modal">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div className="modal-title">Yeni Cihaz Ekle</div>
                <button onClick={() => setModal(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              {error && <div className="login-error">{error}</div>}
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Şube ID *</label>
                  <input className="form-input" type="number" required value={form.branchId}
                    onChange={e => setForm(f => ({...f, branchId: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cihaz Tipi *</label>
                  <input className="form-input" required placeholder="Smart Meter, HVAC Sensor..." value={form.deviceType}
                    onChange={e => setForm(f => ({...f, deviceType: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="form-input" placeholder="EM-3000" value={form.modelName}
                    onChange={e => setForm(f => ({...f, modelName: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Kurulum Tarihi *</label>
                  <input className="form-input" type="date" required value={form.installDate}
                    onChange={e => setForm(f => ({...f, installDate: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Seri Numarası</label>
                  <input className="form-input" placeholder="SN-001" value={form.serialNumber}
                    onChange={e => setForm(f => ({...f, serialNumber: e.target.value}))} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner" /> : <><Plus size={14} /> Ekle</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
