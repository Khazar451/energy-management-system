'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Zap, Cpu, Settings, LogOut, Activity } from 'lucide-react';

const NAV = [
  { href: '/dashboard',           label: 'Genel Bakış',  icon: LayoutDashboard },
  { href: '/dashboard/telemetry', label: 'Telemetri',    icon: Activity },
  { href: '/dashboard/devices',   label: 'Cihazlar',     icon: Cpu },
];

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();

  const companyName = typeof window !== 'undefined'
    ? localStorage.getItem('ems_company') ?? 'Kullanıcı'
    : 'Kullanıcı';

  const initial = companyName.charAt(0).toUpperCase();

  function handleLogout() {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_company');
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div>
          <div className="sidebar-logo-text">EMS</div>
          <div className="sidebar-logo-sub">Enerji Yönetimi</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${path === href ? 'active' : ''}`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {companyName.length > 18 ? companyName.slice(0, 18) + '…' : companyName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Yönetici</div>
          </div>
        </div>
        <button
          className="nav-item btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', marginTop: 4 }}
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
