# Graph Report - noon  (2026-11-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 213 nodes · 453 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a383a207`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- index.tsx
- board.tsx
- api.ts
- expo
- dependencies
- friends.tsx
- sleep.ts
- SleepBoardWidget.tsx
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `Home()` - 19 edges
2. `Board()` - 18 edges
3. `Friends()` - 14 edges
4. `react-native` - 13 edges
5. `expo` - 12 edges
6. `PressableScale()` - 10 edges
7. `checkIn()` - 10 edges
8. `react` - 10 edges
9. `colors` - 10 edges
10. `useFlashStatus()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Board()` --calls--> `EmptyState()`  [EXTRACTED]
  mobile/src/app/(app)/board.tsx → mobile/src/components/EmptyState.tsx
- `Board()` --calls--> `NightFooter()`  [EXTRACTED]
  mobile/src/app/(app)/board.tsx → mobile/src/components/NightFooter.tsx
- `Board()` --calls--> `SkeletonRows()`  [EXTRACTED]
  mobile/src/app/(app)/board.tsx → mobile/src/components/SkeletonRows.tsx
- `Board()` --calls--> `SleepCat()`  [EXTRACTED]
  mobile/src/app/(app)/board.tsx → mobile/src/components/SleepCat.tsx
- `Board()` --calls--> `checkIn()`  [EXTRACTED]
  mobile/src/app/(app)/board.tsx → mobile/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (38): { defineConfig }, expoConfig, devDependencies, babel-preset-expo, eslint, eslint-config-expo, expo-build-properties, @types/react (+30 more)

### Community 1 - "index.tsx"
Cohesion: 0.14
Nodes (26): Board(), Band, bandColor, bandFor(), dateLabel(), dayName(), fmtHours(), fmtTime() (+18 more)

### Community 2 - "board.tsx"
Cohesion: 0.20
Nodes (20): BoardRowItem(), styles, Badge(), styles, EmptyState(), styles, styles, styles (+12 more)

### Community 3 - "api.ts"
Cohesion: 0.12
Nodes (24): ApiError, checkIn(), DEMO_BOARD, DEMO_BOARD_LONG, fetchBoard(), fetchEntry(), fetchPrevScored(), localHour() (+16 more)

### Community 4 - "expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, expo (+16 more)

### Community 5 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, expo, expo-constants, expo-dev-client, expo-font, expo-haptics, expo-linear-gradient, expo-linking (+12 more)

### Community 6 - "friends.tsx"
Cohesion: 0.26
Nodes (13): FriendRow, FriendRowItem(), Friends(), acceptRequest(), onAdd(), styles, NightFooter(), SkeletonRows() (+5 more)

### Community 7 - "sleep.ts"
Cohesion: 0.24
Nodes (10): onCheckIn(), postCheckIn(), ASLEEP_VALUES, ensureSleepPermission(), getSleepState(), mergedCount(), mergedMinutes(), SLEEP_TYPE (+2 more)

### Community 8 - "SleepBoardWidget.tsx"
Cohesion: 0.33
Nodes (3): BoardWidgetRow, SleepBoardProps, expo-widgets

### Community 9 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, extends, expo/tsconfig.base

## Knowledge Gaps
- **13 isolated node(s):** `babel-preset-expo`, `expo`, `expo-build-properties`, `expo-constants`, `expo-dev-client` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **What connects `babel-preset-expo`, `expo`, `expo-build-properties` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04756871035940803 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `board.tsx` to `package.json`, `index.tsx`, `friends.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Why does `react` connect `index.tsx` to `package.json`, `board.tsx`, `friends.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._