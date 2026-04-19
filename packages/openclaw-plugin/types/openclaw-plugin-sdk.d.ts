// Type stubs for openclaw/plugin-sdk/* — resolved at runtime by the OpenClaw gateway.
// These types are not shipped; they exist only for local TypeScript checking.

declare module 'openclaw/plugin-sdk/plugin-entry' {
  import type { TSchema } from '@sinclair/typebox';

  export interface ToolContent {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }

  export interface ToolResult {
    content: ToolContent[];
    isError?: boolean;
  }

  export interface ToolDef<P extends TSchema = TSchema> {
    name: string;
    description: string;
    parameters: P;
    execute(id: string, params: Record<string, unknown>): Promise<ToolResult>;
  }

  export interface ToolOptions {
    optional?: boolean;
  }

  export type HookDecision =
    | { block: true; reason?: string }
    | { requireApproval: true; reason?: string }
    | { block: false }
    | undefined
    | void;

  export interface BeforeToolCallContext {
    tool: {
      name: string;
      params: Record<string, unknown>;
    };
    session: {
      id: string;
      channel: string;
    };
  }

  export interface SkillDef {
    name: string;
    content: string;
  }

  export interface PluginApi {
    registerTool<P extends TSchema>(tool: ToolDef<P>, options?: ToolOptions): void;
    registerHook(event: 'before_tool_call', handler: (ctx: BeforeToolCallContext) => Promise<HookDecision>): void;
    registerHook(event: 'message_sending', handler: (ctx: Record<string, unknown>) => Promise<HookDecision>): void;
    registerSkill(skill: SkillDef): void;
  }

  export interface PluginEntry {
    id: string;
    name: string;
    description: string;
    register(api: PluginApi): void;
  }

  export function definePluginEntry(entry: PluginEntry): PluginEntry;
}
