# TypeScript Power Pack Rules

## Import Graph Analysis
- Trace all import/export relationships
- Detect circular dependency chains
- Identify barrel file anti-patterns (index.ts re-exports causing large bundles)
- Map module boundaries and public API surface

## Type Safety Checks
- Flag `any` type usage — suggest `unknown` with type guards instead
- Detect unsafe type assertions (`as any`, `as unknown as T`)
- Validate generic constraints are properly bounded
- Check discriminated unions for exhaustiveness
- Ensure proper error typing in catch blocks

## Code Quality
- Verify `strict` mode is enabled in tsconfig.json
- Check for proper `readonly` usage on immutable data
- Validate enum usage (prefer const enums or union types)
- Review utility type usage (Partial, Required, Pick, Omit)

## Performance
- Detect large type computations that slow the compiler
- Flag deeply nested conditional types
- Identify opportunities for type inference vs explicit annotation
