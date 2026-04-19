# Manus AI Adapter

Integrate Magneto AI with Manus API.

## Installation

```bash
magneto adapter install manus
```

Creates:
```
.magneto/adapters/manus/
├── MANUS.md
├── config.json  # API key (gitignored)
└── adapter.json
```

## Configuration

1. Get API key from https://open.manus.im/
2. Edit `.magneto/adapters/manus/config.json`
3. Add your `MANUS_API_KEY`

## Usage

```bash
magneto adapter sync manus --push  # Sync to Manus
magneto adapter sync manus --tasks # Sync tasks
```

## Documentation

https://github.com/rijuvashisht/Magneto
