# Java Power Pack Rules

## Modern Java (17+)
- **Records** for immutable data carriers — replaces hand-written POJOs, getters, `equals`, `hashCode`, `toString`
- **Sealed interfaces/classes** for closed hierarchies — compiler enforces exhaustive switch
- **Pattern matching** in `switch` expressions and `instanceof`:
  ```java
  return switch (shape) {
      case Circle c -> Math.PI * c.radius() * c.radius();
      case Square s -> s.side() * s.side();
  };
  ```
- **`var`** for local variables where RHS type is obvious; never in public APIs
- **Text blocks** (`"""..."""`) for multi-line strings — no more concat forests
- **`Stream.toList()`** (JDK 16+) over `collect(Collectors.toList())`

## Null Handling
- `Optional<T>` for **return values** that legitimately may be absent — never for fields, params, or collections
- Prefer `Objects.requireNonNull(x, "x must not be null")` at method entry for params that must be non-null
- `Objects.equals(a, b)` avoids NPE in equality checks
- Don't use `Optional.get()` without `isPresent()` or default — use `orElse`/`orElseThrow`/`map`/`ifPresent`
- Collections: return empty collections (`List.of()`, `Collections.emptyMap()`) not `null`

## Generics
- Always parameterize — raw `List` or `Map` defeats type safety
- Use bounded wildcards correctly: **PECS** — *Producer Extends, Consumer Super*
  - `List<? extends Animal>` when reading
  - `List<? super Dog>` when writing
- Type parameters in method signatures: `<T extends Comparable<? super T>>`
- Avoid `Class<?>` where `Class<T>` works

## Exceptions
- **Never** catch `Throwable` or `Error` — those are JVM-fatal (`OutOfMemoryError`, `StackOverflowError`)
- Catch the **narrowest** exception type; use multi-catch: `catch (IOException | SQLException e)`
- **`InterruptedException`** must be rethrown OR `Thread.currentThread().interrupt()` — swallowing it breaks cancellation
- Prefer unchecked exceptions for unrecoverable errors (invalid input, illegal state)
- Custom exceptions should extend `RuntimeException` unless the caller has a reasonable recovery path
- Use `try-with-resources` for **every** `AutoCloseable`:
  ```java
  try (var reader = Files.newBufferedReader(path)) { ... }
  ```
- Never `e.printStackTrace()` in production code — use SLF4J logger

## Concurrency
- Prefer **`ExecutorService`** over `new Thread()` — managed lifecycle, queue, backpressure
- Virtual threads (JDK 21+): `Executors.newVirtualThreadPerTaskExecutor()` for I/O-bound work
- **Immutable objects** are thread-safe by default — prefer records over mutable classes
- `ConcurrentHashMap` over `Collections.synchronizedMap` — finer-grained locking, no global lock
- `AtomicInteger`/`AtomicReference` for single-variable contention; `LongAdder` for high-contention counters
- `CompletableFuture` for async composition — don't mix with `Future.get()` blocking calls
- Never `Thread.sleep` in production logic — use `ScheduledExecutorService` or reactive schedulers
- `volatile` only for flags / publication; use locks or atomics for compound updates

## Security
- **SQL injection**: `PreparedStatement` with `?` placeholders — never string concat
- **Command injection**: `ProcessBuilder` with argv list, never `Runtime.exec(String)` (shell-parsed)
- **Deserialization**: `ObjectInputStream.readObject` on untrusted data enables RCE — use JSON (Jackson) instead; if you must, use `ObjectInputFilter` (JDK 9+)
- **Path traversal**: `Path.of(...).normalize()` + check `startsWith(baseDir)` before file access
- **Random**: `SecureRandom` for tokens/keys, not `Math.random()` or `new Random()`
- **TLS**: default to TLS 1.2+; never disable hostname verification
- **Secrets**: env vars via `System.getenv` or JDK 21 `SystemProperties`; never hardcode
- **XML**: disable external entity resolution (XXE): `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`

## Collections & Streams
- **Immutable collections** by default: `List.of(...)`, `Map.of(...)`, `Set.of(...)` (JDK 9+)
- Streams for pipelines of ≥ 3 ops; plain for-loops for 1–2 ops (clearer + faster)
- `stream().parallel()` only for CPU-bound, stateless, large (> 10k elements) ops
- Don't mutate external state inside stream operations — breaks parallelism & reasoning
- `Collectors.toUnmodifiableList()` for safe return values

## Performance
- **JIT warm-up** matters — benchmark with **JMH**, not `System.nanoTime` around loops
- String concat in loops → `StringBuilder` (explicit sizing helps)
- `ArrayList` default capacity is 10 — `new ArrayList<>(expectedSize)` if known
- Prefer primitive arrays (`int[]`) over `List<Integer>` for hot paths — avoid boxing
- Use `record` + `MethodHandle` or Lombok's `@Value` to keep hashCode stable & fast
- Profile with `async-profiler` (flamegraphs), not just sampling CPU

## Build & Dependencies
- Pin JDK version: `<maven.compiler.release>21</maven.compiler.release>`
- Use `BOM` imports (Spring, Jackson) to keep transitive versions coherent
- `mvn dependency:analyze` / `gradle dependencies --warning-mode=all` in CI
- Enable Maven Enforcer / Gradle dependency locking
- `mvn versions:display-dependency-updates` or Renovate/Dependabot

## Testing
- **JUnit 5** (Jupiter) — `@Test`, `@ParameterizedTest`, `@Nested`
- **AssertJ** for fluent assertions: `assertThat(list).containsExactly(...)` — better messages than Hamcrest
- **Mockito** with `@Mock` + `@InjectMocks`; use `BDDMockito` for `given/when/then`
- **Testcontainers** for integration tests with real DB/queue — not H2
- Snapshot tests: use `JsonAssert` or `approvaltests-java`
- Aim for **high coverage of logic**, not code — 100% doesn't mean bug-free
