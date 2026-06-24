import { useEffect, useRef, useState } from "react";
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

const client = IdrClient.forService("ollama");

export function App() {
  const authRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState("");
  const [out, setOut] = useState("(not connected)");

  useEffect(() => {
    if (authRef.current) mountAuthPanel(authRef.current, { client });
  }, []);

  async function connect() {
    setOut("Connecting…");
    try {
      await client.ensureSession({ interactive: true, mount: authRef.current! });
      await client.connect({ host: host.trim() });
      const res = await client.fetch("/api/tags");
      setOut(JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      setOut(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 520, margin: "2rem auto" }}>
      <h1>Edge Ollama (React ISV demo)</h1>
      <p>
        Service <code>ollama</code> is hardcoded. Enter target host only.
      </p>
      <label>
        Target host
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="edge-gpu-1.your-entity.idr"
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
        />
      </label>
      <div ref={authRef} style={{ marginTop: 16 }} />
      <button type="button" onClick={connect} style={{ marginTop: 16, padding: "8px 16px" }}>
        Connect &amp; list models
      </button>
      <pre style={{ background: "#f4f4f4", padding: 12, marginTop: 16 }}>{out}</pre>
    </main>
  );
}
