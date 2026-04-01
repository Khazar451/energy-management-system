'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import { getDashboardInfo, getForecast, type BranchSummary, type ForecastPoint } from '@/lib/api';
import { Zap, Building2, Cpu, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [info,     setInfo]     = useState<{ companyName: string; branches: BranchSummary[] } | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!localStorage.getItem('ems_token')) { router.replace('/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getDashboardInfo();
      setInfo(data);
      // get forecast for first branch if available
      if (data.branches.length > 0) {
        const fc = await getForecast(data.branches[0].branchId, 7).catch(() => ({ predictions: [] }));
        setForecast(fc.predictions);
      }
    } catch (err: any) {
      if (err.message?.includes('401')) router.replace('/login');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalEnergy  = info?.branches.reduce((s, b) => s + b.totalEnergyUsage, 0) ?? 0;
  const totalDevices = info?.branches.reduce((s, b) => s + b.deviceCount, 0) ?? 0;
  const overBudget   = info?.branches.filter(b => b.totalEnergyUsage > b.budgetAlert && b.budgetAlert > 0) ?? [];

  // chart data from branches
  const branchChartData = info?.branches.map(b => ({
    name: b.city ?? `Şube ${b.branchId}`,
    enerji: b.totalEnergyUsage,
    bütçe: b.budgetAlert,
  })) ?? [];

  const forecastChartData = forecast.map(f => ({
    tarih: new Date(f.timestamp).toLocaleDateString('tr-TR', { month:'short', day:'numeric' }),
    tahmin: f.forecast_kwh,
    alt: f.lower,
    üst: f.upper,
  }));

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Genel Bakış</h1>
          <p className="page-subtitle">
            {info ? `${info.companyName} — Enerji tüketim özeti` : 'Yükleniyor...'}
          </p>
        </div>

        {overBudget.length > 0 && (
          <div className="alert-banner anomaly">
            <AlertTriangle size={18} />
            <span>
              <strong>{overBudget.length} şube</strong> bütçe uyarı eşiğini aşmıştır:&nbsp;
              {overBudget.map(b => b.city ?? `#${b.branchId}`).join(', ')}
            </span>
          </div>
        )}

        {error && <div className="alert-banner anomaly"><AlertTriangle size={18} />{error}</div>}

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
            <div className="spinner" style={{ width:36, height:36 }} />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="card-grid" style={{ marginBottom: 28 }}>
              <div className="kpi-card blue">
                <div className="kpi-header">
                  <div className="kpi-label">Toplam Tüketim</div>
                  <div className="kpi-icon blue"><Zap size={18} /></div>
                </div>
                <div className="kpi-value blue">{totalEnergy.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</div>
                <div className="kpi-sub">kWh · Son 30 gün</div>
              </div>

              <div className="kpi-card green">
                <div className="kpi-header">
                  <div className="kpi-label">Aktif Şubeler</div>
                  <div className="kpi-icon green"><Building2 size={18} /></div>
                </div>
                <div className="kpi-value green">{info?.branches.length ?? 0}</div>
                <div className="kpi-sub">şube izleniyor</div>
              </div>

              <div className="kpi-card amber">
                <div className="kpi-header">
                  <div className="kpi-label">Cihaz Sayısı</div>
                  <div className="kpi-icon amber"><Cpu size={18} /></div>
                </div>
                <div className="kpi-value amber">{totalDevices}</div>
                <div className="kpi-sub">aktif IoT cihaz</div>
              </div>

              <div className={`kpi-card ${overBudget.length > 0 ? 'red' : 'green'}`}>
                <div className="kpi-header">
                  <div className="kpi-label">Bütçe Durumu</div>
                  <div className={`kpi-icon ${overBudget.length > 0 ? 'red' : 'green'}`}>
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className={`kpi-value ${overBudget.length > 0 ? 'red' : 'green'}`}>
                  {overBudget.length > 0 ? `${overBudget.length} Uyarı` : 'Normal'}
                </div>
                <div className="kpi-sub">{overBudget.length === 0 ? 'Tüm şubeler bütçe dahilinde' : 'bütçe aşımı'}</div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Şube Tüketim Karşılaştırması</div>
                    <div className="chart-subtitle">Son 30 gün · kWh</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={branchChartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                    <Bar dataKey="enerji" fill="#3b82f6" radius={[4,4,0,0]} name="Tüketim (kWh)" />
                    <Bar dataKey="bütçe"  fill="rgba(245,158,11,0.35)" radius={[4,4,0,0]} name="Bütçe Eşiği" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <div className="chart-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <TrendingUp size={15} color="var(--green)" /> AI Tüketim Tahmini
                    </div>
                    <div className="chart-subtitle">Önümüzdeki 7 gün · ARIMA modeli</div>
                  </div>
                </div>
                {forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={forecastChartData}>
                      <defs>
                        <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="tarih" tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8 }} />
                      <Area type="monotone" dataKey="tahmin" stroke="#10b981" strokeWidth={2} fill="url(#fcGrad)" name="Tahmin (kWh)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:220, color:'var(--text-muted)', fontSize:13 }}>
                    ML servisi bağlantısı kurulamadı
                  </div>
                )}
              </div>
            </div>

            {/* Branch Table */}
            <div className="card">
              <div className="section-heading">Şube Detayları</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Şehir</th>
                      <th>Aktif Cihaz</th>
                      <th>Tüketim (kWh)</th>
                      <th>Bütçe Eşiği</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info?.branches.map(b => (
                      <tr key={b.branchId}>
                        <td style={{ fontWeight:600 }}>{b.city ?? '—'}</td>
                        <td>{b.deviceCount}</td>
                        <td>{b.totalEnergyUsage.toLocaleString('tr-TR', { maximumFractionDigits:1 })}</td>
                        <td>{b.budgetAlert > 0 ? b.budgetAlert.toLocaleString('tr-TR') : '—'}</td>
                        <td>
                          {b.budgetAlert > 0 && b.totalEnergyUsage > b.budgetAlert
                            ? <span className="badge badge-red">⚠ Aşıldı</span>
                            : <span className="badge badge-green">✓ Normal</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
