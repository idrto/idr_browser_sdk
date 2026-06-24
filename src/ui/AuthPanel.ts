import type { IdrClient } from "../IdrClient";

export type AuthPanelOptions = {
  client: IdrClient;
};

export async function mountAuthPanel(container: HTMLElement, opts: AuthPanelOptions): Promise<void> {
  container.replaceChildren();
  const root = document.createElement("div");
  root.className = "idr-auth-panel";
  root.innerHTML = `
    <style>
      .idr-auth-panel { font-family: system-ui, sans-serif; max-width: 360px; }
      .idr-auth-panel h3 { margin: 0 0 12px; font-size: 1rem; }
      .idr-auth-panel label { display: block; font-size: 0.85rem; margin: 8px 0 4px; }
      .idr-auth-panel input { width: 100%; box-sizing: border-box; padding: 8px; }
      .idr-auth-panel button { margin-top: 12px; padding: 8px 12px; cursor: pointer; }
      .idr-auth-panel .tabs { display: flex; gap: 8px; margin-bottom: 12px; }
      .idr-auth-panel .tab { flex: 1; padding: 6px; border: 1px solid #ccc; background: #f8f8f8; cursor: pointer; }
      .idr-auth-panel .tab.active { background: #fff; border-bottom-color: #fff; font-weight: 600; }
      .idr-auth-panel .panel { display: none; border: 1px solid #ccc; padding: 12px; margin-top: -1px; }
      .idr-auth-panel .panel.active { display: block; }
      .idr-auth-panel .error { color: #b00020; font-size: 0.85rem; margin-top: 8px; }
      .idr-auth-panel .remember { margin-top: 8px; font-size: 0.85rem; }
    </style>
    <h3>Connect to idr.to</h3>
    <div class="tabs">
      <button type="button" class="tab active" data-tab="account">Sign in</button>
      <button type="button" class="tab" data-tab="key">Access key</button>
    </div>
    <div class="panel active" data-panel="account">
      <label>Entity ID</label>
      <input type="email" name="entity" autocomplete="username" />
      <label>Password</label>
      <input type="password" name="password" autocomplete="current-password" />
      <label class="remember"><input type="checkbox" name="persist-account" /> Remember in this browser</label>
      <button type="button" data-action="login-account">Sign in</button>
    </div>
    <div class="panel" data-panel="key">
      <label>Access key</label>
      <input type="password" name="access-key" autocomplete="off" spellcheck="false" />
      <label class="remember"><input type="checkbox" name="persist-key" /> Remember in this browser</label>
      <button type="button" data-action="login-key">Use access key</button>
    </div>
    <div class="error" hidden></div>
  `;
  container.appendChild(root);

  const errorEl = root.querySelector<HTMLElement>(".error")!;
  const showError = (msg: string) => {
    errorEl.hidden = !msg;
    errorEl.textContent = msg;
  };

  root.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      root.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      root.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      root.querySelector(`.panel[data-panel="${tab.dataset.tab}"]`)?.classList.add("active");
      showError("");
    });
  });

  root.querySelector<HTMLButtonElement>('[data-action="login-account"]')!.addEventListener("click", async () => {
    showError("");
    const entity = root.querySelector<HTMLInputElement>('input[name="entity"]')!.value;
    const password = root.querySelector<HTMLInputElement>('input[name="password"]')!.value;
    const persist = root.querySelector<HTMLInputElement>('input[name="persist-account"]')!.checked;
    try {
      await opts.client.loginAccount({ entityId: entity, password, persist });
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  });

  root.querySelector<HTMLButtonElement>('[data-action="login-key"]')!.addEventListener("click", async () => {
    showError("");
    const accessKey = root.querySelector<HTMLInputElement>('input[name="access-key"]')!.value;
    const persist = root.querySelector<HTMLInputElement>('input[name="persist-key"]')!.checked;
    try {
      await opts.client.loginAccessKey({ accessKey, persist });
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  });
}
