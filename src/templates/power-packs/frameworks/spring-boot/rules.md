# Spring Boot Power Pack Rules

## Dependency Injection
- **Constructor injection only** — `@Autowired` on fields breaks immutability and testing
- Use Lombok `@RequiredArgsConstructor` (or Java records) to keep boilerplate low
- Avoid `@Component` on classes that should be `@Service`/`@Repository`/`@Controller` — semantic stereotype helps tooling
- Mark deps `final` — caught by linters if you forget

## Configuration
- Prefer **`@ConfigurationProperties`** + a record/typed class over scattering `@Value("${...}")` everywhere
- Validate config on startup with `@Validated` + Bean Validation annotations
- Profile-specific config: `application-prod.yml`, `application-dev.yml`; activate via `SPRING_PROFILES_ACTIVE`
- **Secrets**: use `${ENV_VAR}` placeholders; never commit `spring.datasource.password=hunter2`
- For Kubernetes: use `spring-cloud-kubernetes-config` or mount as env vars

## Data & JPA
- **N+1 queries** are the #1 perf killer — use:
  - `@EntityGraph(attributePaths = {"orders.items"})` on repository methods
  - Explicit fetch joins: `@Query("select u from User u join fetch u.orders where u.id = :id")`
  - Or batch fetching: `@BatchSize(size = 50)` on collections
- **Disable Open Session In View** in production: `spring.jpa.open-in-view=false` — forces explicit fetching, prevents lazy-load surprises in controllers/views
- `spring.jpa.hibernate.ddl-auto`: `validate` or `none` in prod; `update`/`create` only in dev
- Use **Flyway** or **Liquibase** for schema migrations — never rely on Hibernate DDL
- Index foreign keys and frequently-filtered columns

## Transactions
- `@Transactional` belongs on **service-layer methods**, not controllers (mixing HTTP & DB concerns)
- Default propagation `REQUIRED` is right 95% of the time
- **Self-invocation pitfall**: calling `this.foo()` where `foo` is `@Transactional` bypasses the proxy → no transaction. Inject self or split into separate beans.
- `@Transactional` on `private`/`protected` methods does nothing (proxy can't intercept)
- Mark read-only queries `@Transactional(readOnly = true)` — Hibernate skips dirty-check overhead

## Security (Spring Security 6+)
- Use `SecurityFilterChain` bean (replaces deprecated `WebSecurityConfigurerAdapter`)
- Be explicit about every endpoint:
  ```java
  http.authorizeHttpRequests(auth -> auth
      .requestMatchers("/public/**").permitAll()
      .requestMatchers("/admin/**").hasRole("ADMIN")
      .anyRequest().authenticated()
  );
  ```
- **CSRF**: keep enabled for browser sessions; disable only for stateless JWT APIs and document why
- **CORS**: configure once at SecurityFilterChain via `CorsConfigurationSource` — don't sprinkle `@CrossOrigin` on controllers
- **Password encoding**: `BCryptPasswordEncoder(12)` minimum; never plaintext or MD5/SHA1
- Always validate JWT signature, issuer, audience, expiry — use `JwtDecoder` from `oauth2-resource-server`
- Method-level security via `@PreAuthorize("hasRole('ADMIN')")` — enable with `@EnableMethodSecurity`

## Actuator Hardening
- **Never** set `management.endpoints.web.exposure.include=*` in production — leaks env vars, heap dumps, beans
- Expose only what you need: `health,info,prometheus`
- Run actuator on a separate port: `management.server.port=9090`, isolate at network level
- Sensitive endpoints (`/env`, `/configprops`, `/heapdump`) require `ROLE_ADMIN`

## Controllers & DTOs
- Return `ResponseEntity<T>` with explicit status: `ResponseEntity.created(uri).body(dto)`, `ResponseEntity.noContent().build()`
- Validate request bodies with `@Valid @RequestBody UserCreateRequest req`
- Use **records** for DTOs — immutable, concise, zero boilerplate
- Don't expose JPA entities as response bodies — separate DTO layer prevents accidental data leakage
- Document with `@Operation`, `@ApiResponse` (springdoc-openapi)

## Error Handling
- One global `@RestControllerAdvice` with `@ExceptionHandler` per logical exception
- Return RFC 7807 `ProblemDetail` (built-in since Spring 6) for consistent error shape
- Don't `catch(Exception e)` and swallow — log + rethrow, or convert to a domain exception
- Never leak stack traces to clients

## Async & Scheduling
- `@Async` requires `@EnableAsync`; specify a custom `Executor` — default is unbounded
- `@Scheduled` runs on a single-thread executor by default; configure `TaskScheduler` for parallelism
- For event-driven work prefer `ApplicationEventPublisher` with `@TransactionalEventListener(phase = AFTER_COMMIT)` to avoid firing on rollback

## Testing
- `@SpringBootTest` is heavy — prefer slice tests: `@WebMvcTest`, `@DataJpaTest`, `@JsonTest`
- Use **Testcontainers** for real Postgres/Redis/Kafka — no H2 in-memory hacks
- `@MockBean` for collaborators in slice tests; `Mockito` `@Mock` for unit tests
- Verify HTTP layer with `MockMvc` or `WebTestClient` (reactive)

## Performance
- Enable **Spring Boot 3 native image** for fast startup if appropriate (`mvn -Pnative spring-boot:build-image`)
- Use **Caffeine** caching with `@Cacheable` over `ConcurrentMapCacheManager`
- HTTP client: switch from `RestTemplate` to **`RestClient`** (Spring 6.1+) or `WebClient` for reactive
- Database connection pool: HikariCP (default) — tune `maximum-pool-size` based on DB capacity
- Always set timeouts on outbound calls (`HttpClient.connectTimeout`, `setReadTimeout`)

## Build & Deployment
- Use Maven Wrapper (`./mvnw`) or Gradle Wrapper (`./gradlew`) — pin build tool version
- Layer JARs for faster Docker rebuilds: `BP_LAYERS = true` with Cloud Native Buildpacks
- Externalize config: 12-factor app principles
- Health check endpoint: `/actuator/health` with `liveness` and `readiness` groups for k8s
