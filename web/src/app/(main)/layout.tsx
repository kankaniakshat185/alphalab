import TopNav from "@/components/TopNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <TopNav />
      <main className="main-content">
        {children}
      </main>
      
      <footer className="global-footer">
        <div className="global-footer-inner">
          <span className="footer-text">
            AlphaLab — Factor Stress-Testing Platform
          </span>
          <span className="footer-text" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            Built by 
            <a href="https://github.com/kankaniakshat185" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>Akshat</a>
            <a href="https://github.com/kankaniakshat185/alphalab" target="_blank" rel="noreferrer" style={{ display: "inline-flex", color: "inherit", opacity: 0.7 }} title="Akshat's Repo">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            &amp;
            <a href="https://github.com/VaishnaviRai287" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>Vaishnavi</a>
            <a href="https://github.com/VaishnaviRai287/alphalab" target="_blank" rel="noreferrer" style={{ display: "inline-flex", color: "inherit", opacity: 0.7 }} title="Vaishnavi's Repo">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
