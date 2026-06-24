import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

const client = IdrClient.forService("ollama");
const authEl = document.getElementById("auth");
mountAuthPanel(authEl, { client });

document.getElementById("connect").onclick = async () => {
  const out = document.getElementById("out");
  out.textContent = "Connecting…";
  try {
    await client.ensureSession({ interactive: true, mount: authEl });
    await client.connect({ host: document.getElementById("host").value.trim() });
    const res = await client.fetch("/api/tags");
    out.textContent = JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    out.textContent = err.message ?? String(err);
  }
};
