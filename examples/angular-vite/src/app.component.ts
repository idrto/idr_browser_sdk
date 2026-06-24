import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FormsModule],
  template: `
    <main style="font-family: system-ui; max-width: 520px; margin: 2rem auto">
      <h1>Edge Ollama (Angular ISV demo)</h1>
      <p>Service <code>ollama</code> is hardcoded. Enter target host only.</p>
      <label>
        Target host
        <input
          [(ngModel)]="host"
          placeholder="edge-gpu-1.your-entity.idr"
          style="display: block; width: 100%; margin-top: 4px; padding: 8px"
        />
      </label>
      <div #authMount style="margin-top: 16px"></div>
      <button type="button" style="margin-top: 16px; padding: 8px 16px" (click)="connect()">
        Connect &amp; list models
      </button>
      <pre style="background: #f4f4f4; padding: 12px; margin-top: 16px">{{ out() }}</pre>
    </main>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild("authMount") authMount!: ElementRef<HTMLElement>;

  readonly client = IdrClient.forService("ollama");
  host = "";
  readonly out = signal("(not connected)");

  ngAfterViewInit(): void {
    mountAuthPanel(this.authMount.nativeElement, { client: this.client });
  }

  async connect(): Promise<void> {
    this.out.set("Connecting…");
    try {
      await this.client.ensureSession({
        interactive: true,
        mount: this.authMount.nativeElement,
      });
      await this.client.connect({ host: this.host.trim() });
      const res = await this.client.fetch("/api/tags");
      this.out.set(JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      this.out.set(err instanceof Error ? err.message : String(err));
    }
  }
}
