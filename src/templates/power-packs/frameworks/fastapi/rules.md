# FastAPI Power Pack Rules

## Type Safety & Validation
- Define every request body, response body, and query schema as a **Pydantic model** — no raw `dict` or `Any`
- Use `Field(..., min_length=1, max_length=255, regex=r"...")` for runtime validation
- Add `response_model=` to every route — gives accurate OpenAPI and strips internal fields
- Use `Annotated[T, Path(...) | Query(...) | Header(...)]` (FastAPI ≥ 0.95) for clear param semantics
- Discriminated unions: `Union[CatModel, DogModel] = Field(discriminator="kind")`

## Dependency Injection
- Auth, DB sessions, settings, and external clients should always come through `Depends()`
- Cache expensive deps with `@lru_cache` on the factory; FastAPI will reuse per-request when used as a dep
- Sub-dependencies are first-class — compose them rather than building monoliths
- Use `Depends()` with `yield` for resources that need cleanup (DB sessions, file handles)

## Async Correctness
- `async def` endpoint **only when** you await something async — otherwise use plain `def` (FastAPI runs sync routes on a threadpool)
- **Never** call sync I/O (`requests`, `time.sleep`, `open()`, blocking ORM calls) inside `async def` — it blocks the event loop and tanks throughput
- Use `httpx.AsyncClient`, `aiofiles`, async ORMs (SQLAlchemy 2.0 async, Tortoise, Beanie)
- Wrap unavoidable blocking calls in `await asyncio.to_thread(fn, ...)` or `await run_in_threadpool(fn, ...)`

## Routing & Organization
- Group routes by domain in `APIRouter` modules — `app.include_router(users_router, prefix="/users", tags=["users"])`
- Specific paths before catch-alls: `/users/me` before `/users/{user_id}`
- Use `tags=["..."]` on routers — drives OpenAPI grouping
- Set `status_code=201` on POST that creates resources, `204` for DELETE

## Security
- **CORS**: never combine `allow_origins=["*"]` with `allow_credentials=True` — browsers reject it and it's a security smell. List explicit origins.
- **Auth**: prefer OAuth2/JWT via `OAuth2PasswordBearer` + a `Depends(get_current_user)`; mutating routes (POST/PUT/DELETE) without an auth dep are suspicious
- **Secrets**: `SECRET_KEY`, JWT signing keys, DB passwords come from env via `pydantic-settings`/`BaseSettings` — never hardcoded
- **Rate limiting**: use `slowapi` or a reverse-proxy limiter — FastAPI doesn't ship one
- **TrustedHostMiddleware**: configure exact `allowed_hosts` list; don't use `["*"]` in production
- **HTTPS**: terminate at reverse proxy (nginx/Traefik); force `HTTPSRedirectMiddleware` if app sees plain HTTP
- **Headers**: add `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, etc. (use `secure-headers` middleware)

## Background Work
- `BackgroundTasks` for tiny post-response work that must run on the same process
- For anything user-visible or retry-needing: real queue — **Celery**, **RQ**, **arq**, **Dramatiq**, or **Temporal**
- Don't `asyncio.create_task` for long work without a supervisor — orphaned tasks die silently

## Lifecycle
- Use **lifespan context manager** (FastAPI ≥ 0.93), not `@app.on_event("startup"/"shutdown")` — `on_event` is deprecated
  ```python
  @asynccontextmanager
  async def lifespan(app: FastAPI):
      app.state.db = await create_pool()
      yield
      await app.state.db.close()
  ```

## Testing
- Use `TestClient` (sync) or `httpx.AsyncClient(app=app, base_url="http://test")` for async tests
- Override deps via `app.dependency_overrides[get_db] = override_get_db` — never patch globals
- `pytest-asyncio` with `@pytest.mark.asyncio` for async test functions
- Use `pytest` fixtures with `scope="function"` for DB rollback per test

## Performance
- Enable `gzip` middleware for responses ≥ 1KB
- Set `workers=2*cpu+1` (Uvicorn) or use Gunicorn + Uvicorn workers in prod
- `orjson` or `msgspec` ResponseClass for hot paths — much faster than stdlib json
- Profile with `py-spy` against running uvicorn process

## Common Pitfalls
- Returning Pydantic model with `response_model_exclude_unset=True` to skip unset fields in PATCH
- `Form(...)` + `File(...)` cannot coexist with JSON body — pick one
- `@app.middleware("http")` runs in reverse declaration order on response — counterintuitive
- Pydantic v1 vs v2 differences: `.dict()` → `.model_dump()`, `parse_obj` → `model_validate`, validators changed
