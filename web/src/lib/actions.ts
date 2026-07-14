"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function parseError(errorData: any, defaultMsg: string): string {
  if (!errorData) return defaultMsg;
  if (typeof errorData.detail === "string") return errorData.detail;
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((err: any) => {
        const field = err.loc ? err.loc[err.loc.length - 1] : "";
        return field ? `${field}: ${err.msg}` : err.msg;
      })
      .join(", ");
  }
  return defaultMsg;
}

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: email as string,
      password: password as string,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return { error: parseError(errorData, "Failed to login") };
  }

  const data = await res.json();

  // Set the HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set("access_token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600 * 24 * 7, // 1 week
  });

  redirect("/");
}

export async function register(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("full_name");

  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: fullName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return { error: parseError(errorData, "Failed to register") };
  }

  // Once registered, log them in automatically
  return login(formData);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  redirect("/login");
}

export async function getAuthToken() {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return "dummy_bypass_token";
  }
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    redirect("/login");
  }

  return res;
}

export async function getCurrentUser() {
  try {
    const res = await fetchWithAuth("/users/me");
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function submitExperiment(formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const factorName = formData.get("factor_name") as string;
  const factorFormula = formData.get("factor_formula") as string;

  const payload = {
    name,
    description,
    factors: [
      {
        name: factorName,
        formula: factorFormula
      }
    ]
  };

  const res = await fetch(`${API_URL}/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return { error: errorData?.detail || "Failed to submit experiment" };
  }

  const data = await res.json();
  redirect(`/history/${data.factors[0].id}`);
}
