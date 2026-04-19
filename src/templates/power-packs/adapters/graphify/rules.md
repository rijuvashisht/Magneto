# Graphify Adapter

## Overview
The Graphify adapter bridges Graphify's dependency graph output into Magneto AI's memory system. This enables Magneto AI to leverage pre-computed code relationship data for deeper reasoning.

## Memory Modes

### `internal-first` (default)
- Magneto AI uses its own analysis first
- Falls back to Graphify data when internal analysis is insufficient
- Best for projects where Magneto AI's native analysis is primary

### `external-first`
- Prioritizes Graphify's dependency graph
- Magneto AI enriches Graphify data with its own reasoning
- Best for projects already deeply integrated with Graphify

## Data Mapping
- **Nodes** → Magneto AI memory entities (files, modules, classes, functions)
- **Edges** → Magneto AI memory relationships (imports, calls, extends, implements)
- **Metadata** → Magneto AI memory context (timestamps, confidence, source info)

## Configuration
- `autoImport`: Automatically import on `magneto init` or `magneto refresh`
- `refreshOnInit`: Re-import Graphify data when running `magneto init`
- `maxNodes`: Maximum nodes to import (prevents memory overflow)
- `maxEdges`: Maximum edges to import
