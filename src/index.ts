export { IdrClient } from "./IdrClient";
export { IdrError } from "./errors/IdrError";
export { mountAuthPanel } from "./ui/AuthPanel";
export { registerAuthPanelElement } from "./ui/IdrAuthPanelElement";
import "./ui/IdrAuthPanelElement";
export type {
  ConnectOptions,
  HostIdentityDocument,
  IdrAuthMode,
  IdrConnectionState,
  IdrFetchInit,
  ParsedTarget,
  ResolveResponse,
} from "./types";
export {
  IDR_API_BASE,
  IDR_SIGNAL_URL,
  BROWSER_SOURCE_HOST,
  ALLOWED_HOST_SUFFIXES,
} from "./constants";
export { buildIdrHostname, formatIdrtoUri } from "./addressing/parseTarget";
