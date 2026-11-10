# Sleeple — Design Doc v1

**One-liner:** A daily sleep-score check-in app. Every day at your local noon,
sync last night's sleep, get a score, see how your friends did.

## Product model (locked decisions)

| Decision | Choice | Rationale |
|---|---|---|
| Platform | Expo / React Native, iOS first | One codebase → Android later; HealthKit needs native |
| Ingest | HealthKit only for v1 | Free; covers Apple Watch + every device that writes to Apple Health (Garmin, Whoop, Oura all can). Aggregators (Terra/Rook) deferred to Android phase |
| Sync trigger | Check-in prompt at local noon (BeReal model) | Local notification → open app → HealthKit sync → score posts. Noon is the ritual prompt, not the scoring boundary — a session scores whenever it completes and the user next opens the app |
| Social model | Friends (mutual), not groups | Boards are per-user views: "me + my friends." Groups deferred |
| Visibility | Score only | Members see numbers, not breakdowns |
| Scoring | Absolute targets, computed by us | Apple Health emits raw stages, NOT a score. Personalized targets = future `formula_version` upgrade |
| Freeze | Score locked at check-in | Late device revisions update raw storage, not the locked entry |
| Check-in policy | Forgiving — post anytime, marked late | Streaks deferred post-MVP |
| Backend | None — local-only for now (AsyncStorage + on-device scoring); backend deferred | Scoring happens on-device; friends data is placeholder demo. A real backend can adopt the tables sketch below later |
| Notifications | iOS local notifications | Free, no APNs needed for v1 |

## Score formula v1 (`formula_version = 1`)

All inputs derivable from `HKCategoryTypeIdentifier.sleepAnalysis` samples.

| Component | Points | Definition |
|---|---|---|
| Duration | 60 | `min(asleep_hours / 8.0, 1.0) × 60` |
| Efficiency | 25 | `asleep_time / in_bed_time`, capped at 95% → full marks |
| Continuity | 15 | `max(0, 15 − 2×(awakenings − 1))` from `awake` segments inside the sleep session; if no stage data, redistribute to duration/efficiency |

- **Sleep night = primary session only** — longest in-bed span among completed, unscored sessions. Naps excluded (Bevel does the same). Sleep is a session `(start, end)`; `wake_date` is a derived label, never a primary key input.
- **Sleep date = local wake date.** Wake up Tuesday → that's Tuesday's score. Every device agrees on this convention.
- **Confidence tier per entry** (NOOP pattern — a sparse night reads honestly): staged nights post `confidence=solid`; nights with no real stage data (`inBed`/`asleepUnspecified` only) rescale duration+efficiency to 100 and post `confidence=building`, shown as `~score`. No fabricated awakenings.
- Bands: <70 Poor, 70–85 Normal, >85 Excellent (Bevel-aligned, easy to explain).

## Architecture

```
iPhone (Expo)
  ├─ HealthKit read (react-native-healthkit)
  ├─ Local notification @ 12:00 user-local
  └─ On open: normalize sleep samples → score + persist locally
                                                              │
On-device (AsyncStorage) — backend deferred                    ▼
  ├─ Local store: sleep nights + locked score entries (self)
  ├─ Scoring: ingest → compute score → lock entry (on-device)
  └─ Board: friends scores are placeholder demo data until backend lands
```

### Tables (sketch)

- `users(id, handle, tz, created_at)`
- `friendships(requester_id, addressee_id, status)` — mutual only; `status=accepted`
- `sleep_nights(user_id, wake_date, source, raw_json, asleep_min, inbed_min, awakenings, updated_at)` — PK `(user_id, wake_date)`, upsert = latest wins (industry convention per Terra docs)
- `board_entries(user_id, wake_date, score, formula_version, posted_at, late)` — written once at check-in, immutable after

Board for user U on date D = `SELECT score FROM board_entries WHERE user_id ∈ (U ∪ accepted_friends(U)) AND wake_date = D`.

## Edge cases (designed, not discovered)

1. **Timezones** — reveal is per-user local noon; wake-date is per-user local. A Tokyo friend simply competes on *their* last night. Boards show `pending` for friends who haven't checked in.
2. **Revisions** — raw upserts always overwrite; `board_entries` never do. Locked entries can show a `revised` flag later.
3. **No watch / no data** — check-in finds no session → entry recorded as `status=missed` (score null), board shows it. No fake scores.
4. **Double-sourced data** (Garmin→Health + Watch) — overlapping samples from multiple sources describe one night; asleep/awake intervals are union-merged before summing (NOOP `SleepSessionDedup` lesson), so dual writes can't double-count. A source writing real stages marks the session `staged`; stage-less sessions take the redistributed score + `building` confidence (NOOP `SleepMerge` richness rule).
5. **Late check-in** — `late=true` marker; streaks can consume this later.
6. **DST / tz changes** — store `tz` at check-in time; never recompute historical wake_dates.
7. **Session in progress at check-in** (slept past noon, night shift) — HealthKit can't distinguish "just woke" from "still asleep" (no trailing awake sample), so a session whose last non-awake sample ended <30 min ago is refused with a "check in later" prompt. Scores exist only for completed sessions — never lock a partial night (NOOP: a score exists only when it can be computed honestly).

## Roadmap hooks (build none of this now)

- Android → aggregator (Terra/ROOK) behind the same `/sleep-night` contract
- Groups → `group_members` table; board query swaps member source
- Personalized formula → `formula_version=2` + backfill job (raw kept forever): personal need from recent average instead of fixed 8h, consistency component (bed/wake regularity), optional sleep-debt planning estimate (NOOP `SleepDebt`: 55% unmet-need carry, 10-min deadband, 14-night bound)
- Streaks, push notifications (APNs), read-only web board

## Non-goals for v1

Recovery/strain scores, nap scoring, sleep coaching, global leaderboards,
manual score entry, breakdown visibility to friends.

## Resolved design questions

- **Shift workers / sessions spanning noon**: solved by the session model —
  a session scores when it *completes*, not at a clock boundary. `wake_date`
  derives from `session.end_time` in the sleeper's local tz.
- **Mid-day friend acceptance**: boards are derived per-viewer at read time,
  not materialized per-friendship. New friends immediately see each other's
  existing entries — friendship is standing consent, no backfill needed.
