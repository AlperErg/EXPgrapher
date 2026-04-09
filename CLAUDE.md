# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EXPgrapher is a vanilla JavaScript SPA for creating scientific experiment graphs with uncertainty error bars. It has no build step — it deploys directly as static files to GitHub Pages on push to `master`.

Live site: https://graph.ergune.dev

## Commands

```bash
# No build step — open index.html directly in a browser or use a local server
npx serve .        # or: python3 -m http.server

# Linting (config referenced in package.json but .eslintrc.js doesn't currently exist)
npm run lint

# No tests are configured
```

## Architecture

The app is composed of five JS files loaded sequentially in `index.html`. There is no module bundler — all globals are shared across files.

### JS Modules (load order matters)

| File | Responsibility |
|------|---------------|
| [table.js](table.js) | SlickGrid data table, undo/redo command buffer, number parsing (`toNumber()`), URL state hydration |
| [graph.js](graph.js) | Chart.js graph rendering (`drawGraph()`/`makeGraph()`), trendline math, drag-to-edit trendlines, graph settings modal |
| [feedback.js](feedback.js) | Real-time validation engine (`evaluate()`), scientific notation checks, trendline compliance, feedback display |
| [windowFunctions.js](windowFunctions.js) | PNG download (`saveGraph()`), URL sharing (`copyDoc()`), clipboard, snackbar notifications |
| [webshare.js](webshare.js) | Native Web Share API with clipboard fallback |
| [modal.js](modal.js) | Generic modal open/close behavior |

### Data Flow

```
User edits table cell
  → SlickGrid event → undoRedoBuffer.queueAndExecuteCommand()
  → scheduleGraphAndFeedbackUpdate() (requestAnimationFrame throttled)
  → drawGraph()   — builds Chart.js datasets from table data, renders canvas
  → evaluate()    — validates data, checks trendline compliance, shows feedback
```

### Key Data Structures

- **`dataset[]`** — validated rows: `{x, dx, y, dy, litx, litdx, lity, litdy, dataRow}`
- **`trendlineData[]`** — 3 trendlines (best fit, max slope, min slope), each an array of `{x, y}` points editable by dragging
- **`scaleData{}`** — computed axis ranges and step sizes
- **`allData[]`** — final Chart.js datasets array (scatter points + trendlines + error bar annotations)

### Number Parsing (`toNumber` in table.js)

Accepts scientific notation in multiple formats: `1.5e-3`, `2x10^4`, percentages. Returns `{validNumber, operand, base, power, failMsg}`. This is central to data entry — all cell validation goes through it.

### URL State / Sharing

`copyDoc()` in [windowFunctions.js](windowFunctions.js) serializes the entire app state (table data + graph settings) into URL query parameters. The reverse (hydration) happens in [table.js](table.js) on load. Parameters: `dataLength`, `x#`/`dx#`/`y#`/`dy#` per row, `graphTitle`, `graphXAxis`, `graphXAxisUnits`, `graphYAxis`, `graphYAxisUnits`, `graphXSymbol`, `graphYSymbol`, `line#data#x`/`line#data#y` for trendlines.

### Performance

Frame rendering is guarded by `graphDrawFramePending` and `graphAndFeedbackFramePending` boolean flags to prevent duplicate `requestAnimationFrame` calls. Both `drawGraph()` and `evaluate()` run on the same animation frame after table changes.

## Dependencies

- **chart.js v2.9.4** — graph rendering (note: v2, not v3/v4 — the API differs significantly)
- **slickgrid v2.4.45** — interactive data table

Loaded from `node_modules/` (no CDN). Run `npm install` if they're missing.
