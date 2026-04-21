# Magneto AI - VS Code Extension

VS Code extension for Magneto AI - Agent control plane and reasoning framework.

## Features

- **Agent Panel** - View and manage AI agents directly in VS Code
- **Task Planning** - Plan tasks with automatic classification and role assignment
- **Security Check** - Evaluate security risks before executing tasks
- **Project Analysis** - Analyze codebase and build knowledge graphs
- **Context Refresh** - Update project context and power packs
- **Performance Tracking** - Track task completion time, context compression, and improvement trend without API keys
- **Performance Visualization** - Real-time graphs showing duration, compression ratio, and improvement over time

## Requirements

- VS Code 1.74.0 or higher
- Magneto AI CLI installed (`npm install -g magneto-ai`)
- Initialized Magneto project (`magneto init`)

## Installation

### From VSIX (Local)

1. Build the extension: `npm run compile`
2. Package: `npx vsce package`
3. Install in VS Code: Extensions view → ... → Install from VSIX

### From Marketplace (Future)

Search "Magneto AI" in the VS Code Extensions marketplace.

## Usage

### Open Agent Panel

- **Command Palette**: `Magneto: Open Agent Panel`
- **Keyboard Shortcut**: `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)
- **Activity Bar**: Click the Magneto icon

### Plan a Task

1. Select text in editor or open Agent Panel
2. Click "Plan Task" or use command palette
3. Enter task description
4. View the generated plan with classification and roles

### Security Check

1. Select code or task in editor
2. Run "Magneto: Security Check"
3. View risk assessment and approval requirements

### Analyze Project

1. Click "Analyze Project" in Agent Panel
2. Wait for analysis to complete
3. View results in `.magneto/memory/`

### Performance Tracking

1. Run tasks normally (no API key required):
   ```bash
   magneto run task.md
   ```
2. The extension will automatically track and display:
   - Task completion duration over time
   - Context compression ratio (files loaded vs total files)
   - Improvement trend (how much faster tasks get over time)
3. Click "Refresh" in the Performance Metrics section to update the graphs
4. Metrics are saved to `.magneto/performance-metrics.json` for historical analysis

**Key Metrics:**
- **Avg Duration**: Average time to complete tasks
- **Compression**: Percentage of files NOT loaded (context compression)
- **Improvement**: Percentage improvement in task completion time over time

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `magneto.enabled` | `true` | Enable/disable extension |
| `magneto.mcpServerUrl` | `http://localhost:3001` | MCP server endpoint |
| `magneto.autoAnalyzeOnOpen` | `false` | Auto-analyze on project open |
| `magneto.telepathyLevel` | `1` | Default autonomy level (0-3) |

## Commands

| Command | Title | Keybinding |
|---------|-------|------------|
| `magneto.openAgentPanel` | Open Agent Panel | `Ctrl+Shift+M` |
| `magneto.planTask` | Plan Task | `Ctrl+Shift+P` |
| `magneto.runTask` | Run Task | - |
| `magneto.securityCheck` | Security Check | - |
| `magneto.analyzeProject` | Analyze Project | - |
| `magneto.refreshContext` | Refresh Context | - |

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package for distribution
npx vsce package
```

## Release Notes

### 0.1.0

- Initial release
- Agent panel with task planning
- Security check integration
- Project analysis support
- Context refresh functionality

## License

MIT - see [LICENSE](https://github.com/rijuvashisht/Magneto/blob/main/LICENSE)
