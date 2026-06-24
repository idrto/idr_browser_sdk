# Framework integration

Same rules in every framework:

- **ISV owns:** host input, connect button, workload UI
- **SDK owns:** `mountAuthPanel()` or `<idr-auth-panel>` (access keys never in ISV state)

Runnable demos: [examples/README.md](../examples/README.md)

## Vanilla (Vite)

```js
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

const client = IdrClient.forService("ollama");
mountAuthPanel(document.getElementById("auth"), { client });
```

See [examples/vanilla-vite](../examples/vanilla-vite/).

## React

```tsx
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";
import { useEffect, useRef } from "react";

const client = IdrClient.forService("ollama");

function Auth() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) mountAuthPanel(ref.current, { client });
  }, []);
  return <div ref={ref} />;
}
```

See [examples/react-vite](../examples/react-vite/).

## Vue 3

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

const client = IdrClient.forService("ollama");
const authMount = ref<HTMLElement | null>(null);

onMounted(() => {
  if (authMount.value) mountAuthPanel(authMount.value, { client });
});
</script>
<template><div ref="authMount" /></template>
```

See [examples/vue-vite](../examples/vue-vite/).

## Svelte 5

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

  const client = IdrClient.forService("ollama");
  let authMount: HTMLDivElement | undefined;

  onMount(() => {
    if (authMount) mountAuthPanel(authMount, { client });
  });
</script>
<div bind:this={authMount}></div>
```

See [examples/svelte-vite](../examples/svelte-vite/).

## Angular (standalone)

```typescript
import { AfterViewInit, Component, ElementRef, ViewChild } from "@angular/core";
import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

@Component({
  selector: "app-root",
  standalone: true,
  template: `<div #authMount></div>`,
})
export class AppComponent implements AfterViewInit {
  @ViewChild("authMount") authMount!: ElementRef<HTMLElement>;
  client = IdrClient.forService("ollama");

  ngAfterViewInit() {
    mountAuthPanel(this.authMount.nativeElement, { client: this.client });
  }
}
```

See [examples/angular-vite](../examples/angular-vite/).

## Web component

```html
<idr-auth-panel id="auth"></idr-auth-panel>
<script type="module">
  import { IdrClient } from "@idrto/idr_browser_sdk";
  const client = IdrClient.forService("ollama");
  document.getElementById("auth").clientInstance = client;
</script>
```

## Never do this

- `useState` / `v-model` / `[(ngModel)]` for access keys
- POST keys or idr.to tokens to your backend
- Pass `accessKey` to `connect()`
