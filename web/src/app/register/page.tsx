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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 className="page-title" style={{ fontSize: "22px", marginBottom: "20px" }}>Create an Account</h2>
        
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Full Name</label>
            <input 
              type="text" 
              name="full_name" 
              required 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--card-border)", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--card-border)", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--card-border)", outline: "none" }}
            />
          </div>
          
          {state?.error && (
            <div style={{ color: "var(--red)", fontSize: "12px", padding: "8px", background: "var(--red-soft)", borderRadius: "6px" }}>
              {state.error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={isPending} style={{ marginTop: "8px" }}>
            {isPending ? "Registering..." : "Register"}
          </button>
        </form>

        <div style={{ marginTop: "20px", fontSize: "12px", textAlign: "center", color: "var(--text-muted)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
