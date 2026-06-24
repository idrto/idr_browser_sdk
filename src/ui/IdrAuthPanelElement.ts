import { mountAuthPanel } from "./AuthPanel";
import type { IdrClient } from "../IdrClient";

export class IdrAuthPanelElement extends HTMLElement {
  private client: IdrClient | null = null;

  static get observedAttributes(): string[] {
    return [];
  }

  set clientInstance(value: IdrClient) {
    this.client = value;
    void this.render();
  }

  connectedCallback(): void {
    void this.render();
  }

  private async render(): Promise<void> {
    if (!this.client) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "closed" });
    const mount = document.createElement("div");
    this.shadowRoot!.replaceChildren(mount);
    await mountAuthPanel(mount, { client: this.client });
  }
}

export function registerAuthPanelElement(): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get("idr-auth-panel")) {
    customElements.define("idr-auth-panel", IdrAuthPanelElement);
  }
}

registerAuthPanelElement();
