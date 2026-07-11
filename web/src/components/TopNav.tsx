"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/actions";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", label: "Home" },
    { href: "/lab", label: "Research Lab" },
    { href: "/history", label: "History" },
    { href: "/flow", label: "Flow" },
  ];

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        {/* Brand */}
        <Link href="/" className="nav-brand">
          <div className="nav-brand-mark">αL</div>
          AlphaLab
        </Link>

        {/* Center links */}
        <div className="nav-links">
          {links.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: profile */}
        <div className="nav-right">
          <span className="nav-profile-name">Quant Admin</span>
          <img
            src="https://ui-avatars.com/api/?name=Admin&background=1a1c18&color=fff&size=64"
            className="nav-avatar"
            alt="Avatar"
          />
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            style={{
              background: "none",
              border: "1px solid #ddddd9",
              fontSize: "11px",
              fontWeight: 500,
              color: "#5c6059",
              padding: "5px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
