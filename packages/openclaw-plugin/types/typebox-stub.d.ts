// Minimal @sinclair/typebox stubs — the real package is provided by OpenClaw's build toolchain.
declare module '@sinclair/typebox' {
  export type TSchema = { type?: string; [key: string]: unknown };
  export const Type: {
    Object<T extends Record<string, TSchema>>(props: T, opts?: Record<string, unknown>): TSchema;
    String(opts?: Record<string, unknown>): TSchema;
    Boolean(opts?: Record<string, unknown>): TSchema;
    Number(opts?: Record<string, unknown>): TSchema;
    Optional<T extends TSchema>(schema: T): TSchema;
    Array<T extends TSchema>(schema: T, opts?: Record<string, unknown>): TSchema;
  };
}
