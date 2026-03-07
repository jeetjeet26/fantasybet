# FantasyLines vs. Major Platforms — Gap Analysis & Plan

## How Other Platforms Work (Summary)

### Fantasy sports (Yahoo, ESPN, Sleeper, DraftKings, FanDuel)

| Area | What they do |
|------|----------------|
| **League setup** | Commissioner creates league, sets name/logo/URL, max teams, scoring format (head-to-head, points-only, guillotine), roster positions, draft type & time. |
| **Roles** | Commissioner (full control), optional co-commissioner, members. Commissioner can boot users, lock teams, edit rosters (post-week), manage waivers and dues. |
| **Invites** | Unique invite link and/or invite code. Sleeper: "commish-only invites" to hide link; "override invite capacity" to keep link visible when full. Invite by email, in-app, or share link (social, text). |
| **League settings** | Editable: name, logo, scoring rules, draft time, playoff format, divisions, public vs private, auto-renew. |
| **Admin** | Commissioner tab/section: send/cancel invites, lock or remove teams, edit rosters/waivers, manage league dues, reset/delete league. |

### Predictive markets (Polymarket, Kalshi)

| Area | What they do |
|------|----------------|
| **Resolution** | Markets settle from designated sources; disputes via bond + oracle (Polymarket) or "Request to Settle" (Kalshi). |
| **Admin** | Central "Markets Team" or oracle for resolution; no per-league commissioner in the same sense. |

### Social / group betting (WagerLab, Parlaymint, FanDuel Pass The Leg)

| Area | What they do |
|------|----------------|
| **Group play** | Shared parlays, pools, "only losers pay," peer-to-peer. |
| **Invites** | Compete with friends/family; track results; settle among themselves or in-app. |

### Cross-cutting

- **Notifications**: Deadline reminders (lineup/slate lock), push and email, often with calendar sync.
- **Discovery**: Public leagues, matchmaking, browse open leagues (Sleeper).

---

## Diff: What We Have vs. What We're Missing

### Leagues

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Create league | Yes (name, auto invite_code, created_by) | No logo, no custom URL slug, no "league type" or scoring format. |
| League identity | Name + invite_code | No logo/avatar, no description, no public/private flag. |
| Max members | No limit | Platforms often cap (e.g. 12) and hide invite when full. |
| Edit league | No | Can't change name or settings after creation. |

### Roles and permissions

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Creator | Stored as `created_by` | Not used as "commissioner"; no special UI or permissions. |
| Commissioner | Implicit (creator) | No commissioner tab, no "commissioner-only" actions. |
| Co-commissioner | No | Can't assign. |
| Member | Any league_member | Can't be removed or locked by commissioner. |
| Invite permission | Any member can invite | No "commish-only invites" or "only commissioner can invite". |

### Invites

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Invite code | Yes, shareable | No shareable **link** (e.g. `/join/ABC123`). |
| Email invite | Yes (store email, status) | No outbound email; invite is record only. |
| Invite visibility | Code always visible to members | No "hide invite when full" or "commish-only" mode. |
| Join by link | Yes via `/leagues/join/[code]` | Same as code; no distinct "invite link" UX. |
| Pending invites list | No | Can't see or cancel pending email invites. |

### League admin (commissioner)

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| League settings page | No | No place to edit name, description, max members, invite rules. |
| Member list | Yes (view only) | Can't remove/kick member, can't lock user. |
| Invite management | Create only | No list of pending invites, no "cancel invite". |
| Slate control | Edge Function only | No commissioner "pick today's games" or "lock slate" from UI. |
| Delete / reset league | No | No "delete league" or "reset season". |

### Betting and slates

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Daily slate | Yes, 5 games per league from API | No commissioner override (e.g. pick 5 from a list). |
| Lock time | Inferred from game start | No configurable "slate lock at X o'clock" per league. |
| Scoring | Placement points (1st=10, …) | No configurable scoring (e.g. points per win, bonus for perfect day). |

### Notifications and engagement

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Reminders | None | No "slate closing in 1 hour" or "new slate available". |
| In-app alerts | None | No toast/banner for new invites or results. |
| Email | Auth only | No transactional email for invites or results. |
| Calendar | No | No "add slate deadline to calendar". |

### Discovery and join

| Feature | FantasyLines now | Gap |
|--------|-------------------|-----|
| Join by code | Yes | Good. |
| Public leagues | No | Can't list or browse open leagues. |

---

## Plan to Emulate Those Platforms (Phased)

### Phase 1: Commissioner identity and invite UX

- **1.1** Add `league_members.role`: `commissioner` \| `member` (creator = commissioner; existing rows backfill from `leagues.created_by`).
- **1.2** UI: show "Commissioner" badge next to creator in Members list; add "Commissioner" section or tab visible only to commissioner.
- **1.3** Invite link: add `leagues.invite_slug` (optional, unique) and route `/join/[slug]` that resolves to league and pre-fills code or auto-joins. Keep existing code-based join.
- **1.4** Invite section: list pending `league_invites` (email, invited_by, created_at) with "Cancel" for commissioner (and optionally for inviter). Only commissioners can invite if we add "invite_permission" in Phase 2.

### Phase 2: League settings and permissions

- **2.1** League settings: `max_members` (nullable = unlimited), `invite_mode` (`any_member` \| `commissioner_only`), `description` (text), `logo_url` (optional). Migration + RLS.
- **2.2** League settings page (commissioner only): edit name, description, max_members, invite_mode, logo. Enforce max_members on join and (optional) hide invite when at capacity.
- **2.3** RLS and actions: only commissioner (or co-commissioner) can update league settings, cancel invites, remove members. "Remove member" = delete from `league_members` (and optionally soft-block rejoin).

### Phase 3: Commissioner admin actions

- **3.1** Members table: "Remove" button for commissioner (with confirm). Optionally "Lock" (e.g. `league_members.can_bet` = false) so they stay in league but can't place new bets.
- **3.2** Pending invites: list + cancel; optional "Resend" (e.g. trigger email in Phase 4).
- **3.3** Slate control (optional): commissioner can "Request slate" (call snapshot for this league) or "Lock slate" (set slate status to locked) from UI; keep Edge Function as default source of games.
- **3.4** Danger zone: "Delete league" (commissioner only, confirm). Soft-delete or hard-delete with cascade per product choice.

### Phase 4: Notifications and polish

- **4.1** In-app: "New slate available", "Slate locks in 1 hour" (if we have lock time), "You were invited to [League]". Use Supabase Realtime or polling on dashboard/league page.
- **4.2** Email (optional): transactional emails for invite (with join link), slate reminder, weekly summary. Use Resend/SendGrid + Supabase Edge Function or queue.
- **4.3** League discovery (optional): public leagues list, join by browse; or keep invite-only and skip.

### Phase 5: Scoring and contest flexibility (stretch)

- **5.1** League-level scoring config: e.g. placement points override (custom points for 1st–Nth), or "points per win" modifier. Store in league settings, use in settlement Edge Function.
- **5.2** Slate lock time: per-league "lock at X minutes before first game" or "lock at 10:00 ET" for consistency with fantasy "deadline" UX.

---

## Implementation order (recommended)

1. **Phase 1** — Commissioner role and invite link/list so league "feels" like Yahoo/Sleeper.
2. **Phase 2** — League settings and invite_mode so commissioner has control.
3. **Phase 3** — Remove member, cancel invite, delete league so admin is complete for a friends league.
4. **Phase 4** — Notifications and email for engagement.
5. **Phase 5** — Optional scoring and lock-time tuning.

All schema changes can be delivered as migration files; no Supabase MCP or live DB writes required until you run them.
