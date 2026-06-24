<script lang="ts">
  import { onMount } from "svelte";
  import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

  const client = IdrClient.forService("ollama");
  let authMount: HTMLDivElement | undefined;
  let host = $state("");
  let out = $state("(not connected)");

  onMount(() => {
    if (authMount) mountAuthPanel(authMount, { client });
  });

  async function connect() {
    out = "Connecting…";
    try {
      await client.ensureSession({ interactive: true, mount: authMount! });
      await client.connect({ host: host.trim() });
      const res = await client.fetch("/api/tags");
      out = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      out = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<main style="font-family: system-ui; max-width: 520px; margin: 2rem auto">
  <h1>Edge Ollama (Svelte ISV demo)</h1>
  <p>Service <code>ollama</code> is hardcoded. Enter target host only.</p>
  <label>
    Target host
    <input bind:value={host} placeholder="edge-gpu-1.your-entity.idr" style="display:block;width:100%;margin-top:4px;padding:8px" />
  </label>
  <div bind:this={authMount} style="margin-top:16px"></div>
  <button type="button" style="margin-top:16px;padding:8px 16px" onclick={connect}>
    Connect &amp; list models
  </button>
  <pre style="background:#f4f4f4;padding:12px;margin-top:16px">{out}</pre>
</main>
