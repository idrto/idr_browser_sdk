export class IdrError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "IdrError";
    this.code = code;
  }
}

export function assertNever(x: never): never {
  throw new IdrError("internal", `Unexpected value: ${String(x)}`);
}
