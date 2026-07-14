"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser } from "@/lib/actions";
import { useEffect, useState } from "react";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Quant Admin");
  const [userInitials, setUserInitials] = useState("AD");

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user && user.name) {
        setUserName(user.name);
        // Get first letter of first and last name if available, else first two letters
        const parts = user.name.trim().split(" ");
        let initials = parts[0][0];
        if (parts.length > 1) {
          initials += parts[parts.length - 1][0];
        } else if (user.name.length > 1) {
          initials += user.name[1];
        }
        setUserInitials(initials.toUpperCase());
      }
    });
  }, []);

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
          <span className="nav-profile-name">{userName}</span>
          <img
            src={`https://ui-avatars.com/api/?name=${userInitials}&background=1a1c18&color=fff&size=64`}
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
