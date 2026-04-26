# Python Power Pack Rules

## Type Safety (PEP 484 / 526)
- Add type hints to all public function signatures and module-level constants
- Use `from __future__ import annotations` for forward references in older Python
- Prefer `Optional[T]` over `Union[T, None]`; use `|` syntax on Python 3.10+
- Run `mypy --strict` or `pyright` in CI; treat type errors as blocking
- Avoid `Any` — use `object`, `TypeVar`, or `Protocol` where flexibility is needed

## Security
- **Code injection**: never use `eval`, `exec`, or `__import__` on user input
- **SQL injection**: always parameterize — `cursor.execute("SELECT * FROM t WHERE id = %s", (id,))` never `f"WHERE id = {id}"`
- **Command injection**: `subprocess.run([...])` with `shell=False` (default); never pass user input with `shell=True`
- **Deserialization**: `pickle` and `yaml.load` (without `SafeLoader`) execute arbitrary code on untrusted data
- **Secrets**: load from environment via `os.getenv` or a secrets manager — never commit literals
- **HTTP**: `requests.get(url, timeout=10)` — without `timeout`, a hung server hangs your app

## Common Pitfalls
- **Mutable default arguments** — `def f(items=[])` shares one list across calls; use `def f(items=None): items = items or []`
- **Bare except** — `except:` catches `KeyboardInterrupt` and `SystemExit`; always specify exception types
- **`assert` for security** — stripped under `python -O`; raise explicit exceptions instead
- **DEBUG = True** in production Django/Flask leaks tracebacks and source

## Async / Concurrency
- Don't call sync I/O (`requests`, `time.sleep`, `open`) inside `async def` — blocks the event loop
- Use `asyncio.to_thread` or `aiohttp`/`httpx.AsyncClient` for async HTTP
- `asyncio.gather` for parallel awaits; understand `return_exceptions=True` semantics
- Prefer `async with`/`async for` for context-managed async resources

## Project Hygiene
- Pin direct dependencies in `requirements.txt` or `pyproject.toml` (`==` or `~=`)
- Separate `requirements-dev.txt` for tooling (pytest, mypy, ruff)
- Use a virtualenv or `poetry`/`uv` — never install into system Python
- Add `__init__.py` to package directories (or use namespace packages explicitly)
- Configure `ruff` or `flake8` + `black` for consistent formatting

## Testing
- pytest with `--cov` for coverage; aim for ≥ 80% on business logic
- Use fixtures over setUp/tearDown; `parametrize` instead of test loops
- Mock external I/O with `unittest.mock` or `pytest-mock`
- Async tests: `pytest-asyncio` with `@pytest.mark.asyncio`

## Framework-Specific Notes

### Django
- Always run migrations review before deploy: `manage.py makemigrations --check --dry-run`
- Use `select_related` / `prefetch_related` to avoid N+1 query problems
- CSRF protection is on by default — don't disable globally
- `DEBUG=False` in production; configure `ALLOWED_HOSTS`

### FastAPI
- Use Pydantic models for all request/response bodies — typed validation is free
- Dependency injection via `Depends()` for auth, DB sessions, settings
- Async endpoints only when actually doing async I/O — sync endpoints run on a threadpool

### Flask
- Use Blueprints to organize routes
- `app.config.from_object()` with environment-specific config classes
- Always wrap DB sessions in app context

## Performance
- Profile before optimizing — `cProfile`, `py-spy`, or `scalene`
- Use generators for large iterables; avoid materializing full lists
- `functools.lru_cache` for pure expensive functions
- C extensions (numpy, polars, orjson) for hot paths
