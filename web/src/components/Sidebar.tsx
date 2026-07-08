"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-logo">αL</div>
        AlphaLab
      </div>

      <div className="profile-widget">
        <div className="profile-info">
          <img src="https://ui-avatars.com/api/?name=Admin&background=random" className="profile-avatar" alt="Avatar" />
          <div>
            <div className="profile-name">Quant Admin</div>
            <div className="profile-role">Admin</div>
          </div>
        </div>
        <div className="profile-alert">🔔</div>
      </div>

      <Link href="/lab" style={{ textDecoration: 'none' }}>
        <div className="nav-active" style={pathname !== "/lab" ? { background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", boxShadow: "none" } : {}}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          Research Lab
        </div>
      </Link>

      <div className="nav-grid">
        <Link href="/history" style={{ textDecoration: 'none' }}>
          <div className="nav-item">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            History
          </div>
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="nav-item">
            <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Home
          </div>
        </Link>
        <div className="nav-item">
          <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          Flow
        </div>
        <div className="nav-item">
          <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          Analytics
        </div>
      </div>

      <div className="promo-card" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Engine Status</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#334155", fontWeight: 500 }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></div>
              Universe
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>NIFTY 50</div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#334155", fontWeight: 500 }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></div>
              Data Sync
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>T-1 Close</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#334155", fontWeight: 500 }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }}></div>
              Compute
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>Parallelized</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
