<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

const client = IdrClient.forService("ollama");
const authMount = ref<HTMLElement | null>(null);
const host = ref("");
const out = ref("(not connected)");

onMounted(() => {
  if (authMount.value) mountAuthPanel(authMount.value, { client });
});

async function connect() {
  out.value = "Connecting…";
  try {
    await client.ensureSession({ interactive: true, mount: authMount.value! });
    await client.connect({ host: host.value.trim() });
    const res = await client.fetch("/api/tags");
    out.value = JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    out.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <main style="font-family: system-ui; max-width: 520px; margin: 2rem auto">
    <h1>Edge Ollama (Vue ISV demo)</h1>
    <p>Service <code>ollama</code> is hardcoded. Enter target host only.</p>
    <label>
      Target host
      <input
        v-model="host"
        placeholder="edge-gpu-1.your-entity.idr"
        style="display: block; width: 100%; margin-top: 4px; padding: 8px"
      />
    </label>
    <div ref="authMount" style="margin-top: 16px" />
    <button type="button" style="margin-top: 16px; padding: 8px 16px" @click="connect">
      Connect &amp; list models
    </button>
    <pre style="background: #f4f4f4; padding: 12px; margin-top: 16px">{{ out }}</pre>
  </main>
</template>
