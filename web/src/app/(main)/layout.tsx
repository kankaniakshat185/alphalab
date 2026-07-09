import TopNav from "@/components/TopNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <TopNav />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
