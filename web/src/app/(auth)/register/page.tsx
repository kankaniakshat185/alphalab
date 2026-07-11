"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/lib/actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await register(formData);
    },
    null
  );

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">αL</div>
          AlphaLab
        </div>

        <div className="auth-title">Create an account</div>
        <p className="auth-subtitle">Join the quantitative factor research platform.</p>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="al-field">
            <label className="al-label">Full Name</label>
            <input type="text" name="full_name" required className="al-input" placeholder="Jane Smith" />
          </div>

          <div className="al-field">
            <label className="al-label">Email address</label>
            <input type="email" name="email" required className="al-input" placeholder="you@firm.com" />
          </div>

          <div className="al-field">
            <label className="al-label">Password</label>
            <input type="password" name="password" required className="al-input" placeholder="••••••••" />
          </div>

          {state?.error && (
            <div className="al-error">{state.error}</div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isPending}
            style={{ width: "100%", padding: "13px", marginTop: "4px", letterSpacing: "0.5px" }}
          >
            {isPending ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #ddddd9", fontSize: "12px", textAlign: "center", color: "#8a9085" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#1a1c18", fontWeight: 600, textDecoration: "underline" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
