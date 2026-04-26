# Ollama Runner — Local, Private, Zero-Egress

The Ollama runner executes Magneto reasoning tasks against a **local Ollama server**. No API key, no cloud calls, no data leaves your machine.

This is the runner of choice for:

- **Regulated industries** — healthcare, finance, defense, legal — where source code or business data cannot leave a trust boundary
- **Air-gapped environments** — offline development, classified networks
- **Solo developers** — fast iteration without paying per token
- **Cost-conscious teams** — predictable hardware cost vs unbounded API spend
- **Privacy-sensitive open source** — contributors can audit every byte that gets sent to a model

## Quick Start

### 1. Install Ollama

macOS / Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Windows: download from <https://ollama.com>.

### 2. Pull a model

```bash
ollama pull llama3.1          # 4.7 GB — solid general-purpose default
ollama pull qwen2.5-coder     # 4.4 GB — better for code tasks
ollama pull deepseek-coder    # for heavy code reasoning
ollama pull phi3:mini         # 2.3 GB — for laptops without dedicated GPU
```

### 3. Start the server (auto-starts on macOS app install)

```bash
ollama serve   # listens on http://localhost:11434
```

### 4. Run a Magneto task

```bash
magneto run task.md --runner ollama
```

That's it.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | URL of the Ollama HTTP API |
| `OLLAMA_MODEL` | `llama3.1` | Model name to use (must be pulled) |
| `MAGNETO_USE_OLLAMA` | _(unset)_ | When set to any value, makes Ollama the auto-detection fallback |

Programmatic override:

```typescript
import { OllamaRunner } from 'magneto-ai';

const runner = new OllamaRunner({
  host: 'http://gpu-box.lan:11434',
  model: 'qwen2.5-coder',
  timeoutMs: 10 * 60 * 1000, // 10 min for slow models
});
```

## How It Compares

| Capability | OpenAI | Copilot Cloud | **Ollama** |
|---|---|---|---|
| API key required | ✅ | ✅ | **❌** |
| Data leaves your machine | ✅ | ✅ | **❌** |
| Per-token cost | ✅ | ✅ | **❌** |
| Works offline | ❌ | ❌ | **✅** |
| Quality (general) | ★★★★★ | ★★★★ | ★★★ (model-dependent) |
| Quality (code) | ★★★★★ | ★★★★★ | ★★★★ with `qwen2.5-coder` / `deepseek-coder` |
| Cold start | ~1s | ~1s | 5–30s first call (model load) |
| Latency / token | ~30ms | ~50ms | 10–100ms (hardware-dependent) |

## What Gets Logged

The runner explicitly tags every result with `metadata.dataEgress = 'none'` so audit log consumers can verify:

```json
{
  "runner": "ollama",
  "metadata": {
    "model": "llama3.1",
    "host": "http://localhost:11434",
    "tokensUsed": 1247,
    "promptEvalCount": 893,
    "evalCount": 354,
    "totalDurationMs": 4321,
    "dataEgress": "none"
  }
}
```

## Resilience Built-In

- **Health check** before every execution: confirms the server is up and the requested model is pulled. Returns actionable guidance if not.
- **Generous timeout** (5 min default) — local models on CPU are slow; configurable via constructor.
- **Tolerant JSON parsing** — strips ` ```json ` fences and locates the outermost `{...}` before parsing. Local models occasionally wrap output in prose despite instructions; Magneto handles it.
- **NDJSON streaming** — token-by-token output for `--stream` mode.

## Auto-Detection

`detectAgentEnvironment()` chooses the active runner. Ollama is selected as the **final fallback** when none of these are present:

1. Cascade / Windsurf markers
2. Copilot markers
3. Antigravity
4. `GEMINI_API_KEY`
5. `OPENAI_API_KEY`

…AND **`OLLAMA_HOST` or `MAGNETO_USE_OLLAMA`** is set.

For teams that want Ollama as the default for every developer, set `MAGNETO_USE_OLLAMA=1` in your shell rc and unset cloud keys.

## Hardware Recommendations

| Workload | Minimum | Recommended |
|---|---|---|
| Quick experiments | 8 GB RAM, no GPU (`phi3:mini`) | M2 Mac / 16 GB + iGPU |
| Daily development | 16 GB RAM, M-series Mac | 24 GB unified memory |
| Heavy code reasoning | 32 GB RAM + RTX 3090/4090 | 48 GB+ unified or RTX 4090 |
| Team self-hosted | NVIDIA A10 / A100 | Multi-GPU node + Ollama in Docker |

## Self-Hosting for a Team

Run Ollama on a single GPU box on your network and point everyone's Magneto at it:

```bash
# On the GPU host
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# In every developer's shell
export OLLAMA_HOST=http://gpu-host.internal:11434
export OLLAMA_MODEL=qwen2.5-coder
```

No per-seat licensing, no API gateway, no rate limits.

## Troubleshooting

**"Cannot reach Ollama at http://localhost:11434"**
→ `ollama serve` not running. Start it.

**"Model `llama3.1` not pulled"**
→ Run `ollama pull llama3.1`. Magneto lists what *is* available in the warning.

**Slow first response (10–30s) then fast**
→ That's model load. Ollama keeps the model warm; subsequent calls are fast. To pre-warm: `ollama run <model> ""`

**Garbled JSON in findings**
→ The model is too small. Switch to `qwen2.5-coder`, `deepseek-coder`, or `llama3.1` (8B+).

**OOM on M-series Mac**
→ Reduce context: pass a smaller `num_ctx` via `OllamaRunner({ ... })` or use `phi3:mini`.

## See Also

- `docs/AUTO-DETECT.md` — runner auto-detection
- [Ollama documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama model library](https://ollama.com/library)
