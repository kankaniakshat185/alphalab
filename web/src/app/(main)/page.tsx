import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientDashboard from "./ClientDashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getLeaderboard() {
  const token = await getAuthToken();
  if (!token) redirect("/login");

  const res = await fetch(`${API_URL}/factors/leaderboard?sort=overall_score&order=desc&page_size=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) redirect("/login");
    return { items: [] };
  }
  return res.json();
}

export default async function DashboardPage() {
  const data = await getLeaderboard();
  const factors = data.items || [];

  return (
    <>
      {/* ─── Client Interactive Dashboard Widgets ─── */}
      <ClientDashboard factors={factors} />


    </>
  );
}
