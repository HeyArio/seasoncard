"use client";

import { useState } from "react";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string } | { kind: "done"; mode: string };

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 48,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #E3D8CA",
  background: "#FFFDF9",
  font: "inherit",
  fontSize: 15,
};
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 };

export default function SetupForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(f.get("code") ?? ""),
          clientId: String(f.get("clientId") ?? ""),
          secret: String(f.get("secret") ?? ""),
          mode: String(f.get("mode") ?? "live"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: data.message || data.issue || data.error || `Failed (${res.status})` });
        return;
      }
      setState({ kind: "done", mode: data.mode });
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="card-flat" style={{ padding: 16, borderRadius: 16, background: "#E4E7DA", color: "#2F3822" }}>
        <strong>Connected.</strong> PayPal ({state.mode}) is live and the payment webhook is registered. Season Card can take payments now.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={label}>
        Setup code (from the server console)
        <input name="code" required autoComplete="off" style={field} placeholder="XXXX-XXXX" />
      </label>
      <label style={label}>
        PayPal mode
        <select name="mode" defaultValue="live" style={field}>
          <option value="live">Live (real payments)</option>
          <option value="sandbox">Sandbox (test)</option>
        </select>
      </label>
      <label style={label}>
        PayPal Client ID
        <input name="clientId" required autoComplete="off" spellCheck={false} style={field} />
      </label>
      <label style={label}>
        PayPal Secret
        <input name="secret" type="password" required autoComplete="off" spellCheck={false} style={field} />
      </label>
      {state.kind === "error" && (
        <div role="alert" style={{ color: "#8A2E14", fontSize: 14 }}>
          {state.message}
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={state.kind === "busy"}>
        {state.kind === "busy" ? "Checking with PayPal…" : "Connect PayPal"}
      </button>
    </form>
  );
}
