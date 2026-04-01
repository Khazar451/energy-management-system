'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import { getDashboardInfo, getBranchDetail, analyzeAnomalies, type BranchSummary, type AnomalyPoint } from '@/lib/api';
import { Activity, AlertTriangle, RefreshCw, TrendingDown } from 'lucide-react';

export default function TelemetryPage() {
  const router = useRouter();
  const [branches,      setBranches]      = useState<BranchSummary[]>([]);
  const [selectedBranch,setSelectedBranch]= useState<number | null>(null);
  const [days,          setDays]          = useState(7);
  const [chartData,     setChartData]     = useState<any[]>([]);
  const [anomalies,     setAnomalies]     = useState<AnomalyPoint[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [analysing,     setAnalysing]     = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ems_token')) { router.replace('/login'); return; }
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch !== null) loadTelemetry();
  }, [selectedBranch, days]);

  async function loadBranches() {
    setLoading(true);
    try {
      const info = await getDashboardInfo();
      setBranches(info.branches);
      if (info.branches.length > 0) {
        setSelectedBranch(info.branches[0].branchId);
      }
    } catch (err: any) {
      if (err.message?.includes('401')) router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  async function loadTelemetry() {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const detail = await getBranchDetail(selectedBranch, days);
      const mapped = detail.data.map(pt => ({
        time:  new Date(pt.time).toLocaleDateString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
        kWh:   pt.energyKwh,
      }));
      setChartData(mapped);
    } catch {
      // Backend may have no InfluxDB data in dev – show empty state
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    if (!selectedBranch) return;
    setAnalysing(true);
    setAnomalies([]);
    try {
      const result = await analyzeAnomalies(selectedBranch, days);
      setAnomalies(result.anomalies);
    } catch {
      // ML service not running — ignore
    } finally {
      setAnalysing(false);
    }
  }

  const selectedBranchObj = branches.find(b => b.branchId === selectedBranch);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 className="page-title">Telemetri Verileri</h1>
            <p className="page-subtitle">Gerçek zamanlı enerji tüketim grafiği ve anomali analizi</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" onClick={loadTelemetry} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Yenile
            </button>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={analysing || !selectedBranch}>
              {analysing
                ? <span className="spinner" />
                : <><TrendingDown size={15} /> Anomali Tara</>
              }
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="card" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label className="form-label">Şube</label>
            <select
              className="form-input"
              style={{ width:200 }}
              value={selectedBranch ?? ''}
              onChange={e => setSelectedBranch(parseInt(e.target.value))}
            >
              {branches.map(b => (
                <option key={b.branchId} value={b.branchId}>
                  {b.city ?? `Şube #${b.branchId}`}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label className="form-label">Dönem</label>
            <select
              className="form-input"
              style={{ width:160 }}
              value={days}
              onChange={e => setDays(parseInt(e.target.value))}
            >
              <option value={7}>Son 7 Gün</option>
              <option value={14}>Son 14 Gün</option>
              <option value={30}>Son 30 Gün</option>
            </select>
          </div>
        </div>

        {/* Anomaly Alerts */}
        {anomalies.length > 0 && (
          <div className="alert-banner anomaly" style={{ marginBottom:20 }}>
            <AlertTriangle size={18} />
            <span>
              <strong>{anomalies.length} anomali</strong> tespit edildi.&nbsp;
              En yüksek değer: {Math.max(...anomalies.map(a => a.value)).toFixed(2)} kWh
            </span>
          </div>
        )}

        {/* Main Chart */}
        <div className="chart-container" style={{ marginBottom:20 }}>
          <div className="chart-header">
            <div>
              <div className="chart-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={16} color="var(--accent)" />
                {selectedBranchObj?.city ?? 'Şube'} — Enerji Tüketimi
              </div>
              <div className="chart-subtitle">Son {days} gün · kWh</div>
            </div>
          </div>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
              <div className="spinner" style={{ width:36, height:36 }} />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize:12, color:'var(--text-secondary)' }} />
                <Line
                  type="monotone" dataKey="kWh" stroke="var(--accent)"
                  strokeWidth={2} dot={{ r:3, fill:'var(--accent)' }}
                  activeDot={{ r:6, stroke:'var(--bg-primary)', strokeWidth:2 }}
                  name="Tüketim (kWh)"
                />
                {/* Anomaly reference lines */}
                {anomalies.map((a, i) => (
                  <ReferenceLine
                    key={i}
                    x={new Date(a.timestamp).toLocaleDateString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    stroke="var(--red)"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              height:280, color:'var(--text-muted)', gap:12
            }}>
              <Activity size={40} opacity={0.3} />
              <p style={{ fontSize:13 }}>InfluxDB&apos;den veri alınamadı. Cihazların veri gönderdiğinden emin olun.</p>
            </div>
          )}
        </div>

        {/* Anomaly Table */}
        {anomalies.length > 0 && (
          <div className="card">
            <div className="section-heading">Tespit Edilen Anomaliler</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Zaman</th>
                    <th>Değer (kWh)</th>
                    <th>Anomali Skoru</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>
                        {new Date(a.timestamp).toLocaleString('tr-TR')}
                      </td>
                      <td style={{ fontWeight:600, color:'var(--red)' }}>{a.value.toFixed(2)}</td>
                      <td style={{ color:'var(--text-secondary)', fontSize:12 }}>{a.score.toFixed(4)}</td>
                      <td><span className="badge badge-red">⚠ Anomali</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
