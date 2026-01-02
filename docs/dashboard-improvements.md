---
type: improvement
description: Dashboard Metrics & Charts Implementation
---

# Dashboard Improvements

We have successfully implemented real-time metrics and historical caching for the dashboard.

## Features Added

1.  **System Load Graph**:
    -   Source: `show system uptime`
    -   Metric: 1-minute load average
    -   Reasoning: VyOS 1.5 `show system cpu` output is hardware-specific, and `show monitoring cpu` requires Prometheus. Load Average is a reliable standard proxy for system busyness.

2.  **Memory Usage Graph**:
    -   Source: `show system memory`
    -   Metric: Percentage used (Used / Total).
    -   Fixes: Parsers now accurately handle `GB`, `MB`, and `KB` units.

3.  **Interface Traffic Graphs**:
    -   Source: `show interfaces counters`
    -   Metric: RX and TX data rates (Bytes per second, displayed as KB/s).
    -   Logic: A custom hook calculates the delta betwen 5-second snapshots to derive the rate.
    -   Scope: All interfaces except `lo` (Loopback).

## Technical Stability Updates

-   **Memoization**: All parsers are wrapped in `useMemo` to preventing re-calculating identity-unsafe objects on every render.
-   **Deep Equality Hooks**: The custom `useMetrics` hooks now use `JSON.stringify` dependency checking. This prevents infinite render loops (Blue Screens) caused by React detecting "new" objects every 5 seconds even if the data content hasn't changed.
-   **Safe Rendering**: Charts now display a "Waiting for data..." state instead of trying to render empty arrays, preventing Recharts errors.

## Verification
1.  **Load**: Displays numeric load average (e.g., 0.15).
2.  **Memory**: Displays graphical usage %.
3.  **Traffic**: Graphs populate as traffic flows through interfaces.
