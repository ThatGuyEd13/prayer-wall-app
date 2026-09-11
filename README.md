# Handoff: Prayer Wall — The Bridge at Calvary

## Overview
A mobile prayer-request app for The Bridge at Calvary Church of the Nazarene (Crosby, TX). Members post prayer requests (church-wide or pastors-only), pastoral staff pray through them and the person is notified, and there's a role-gated admin layer for the lead pastor and the owner (Edward).

## About the design files
The `.dc.html` files in this bundle are **design references built in HTML** — they show exact layout, copy, colors, interaction flow, and state transitions. They are a **front-end-only prototype**: all data lives in in-memory JavaScript state and resets on page reload. There is no real database, no real SMS, no real password storage, and no real authentication. **Do not ship this HTML as the production app.** Recreate the design and behavior it demonstrates in a real stack — recommended: React Native or Flutter for the client, a managed backend (Supabase/Firebase or a small Node/Postgres service) for data and auth, and Twilio (or similar) for SMS.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and every interaction are final — implement pixel-for-pixel from the HTML, don't restyle.

## Rollout scope (real accounts, phase 1)
Only two real accounts should exist at launch:
- **Edward — Owner.** Full admin: role management, church-wide notices, prayer-log export, transfer ownership, billing, delete account.
- **Rachel — Lead pastor.** Everything an admin needs except the owner-only actions (transfer ownership, billing, delete account, promoting someone else to lead pastor).

Pastors (Emily, Heather, Carlos) and the agricultural minister (Daniel) get accounts in a later phase — the role model already supports a `pastor` and `agricultural_minister` role, so adding them later is a data change, not a rebuild. **Members self-register** — anyone can sign up with name + phone + password (or phone + SMS code) and lands as a Member with no admin action required.

## Roles & permissions
Five roles, most to least access: `owner` > `lead_pastor` > `pastor` / `agricultural_minister` (equal permissions) > `member`.

| Capability | Member | Pastor / Ag minister | Lead pastor | Owner |
|---|---|---|---|---|
| Post a request (church-wide or pastors-only) | ✓ | ✓ | ✓ | ✓ |
| See own requests only | ✓ | – | – | – |
| See every request (incl. pastors-only) | – | ✓ | ✓ | ✓ |
| Pray for a request → sends the requester a notification | – | ✓ | ✓ | ✓ |
| Send a church-wide notice | – | – | ✓ | ✓ |
| Change a member's role up to Pastor | – | – | ✓ | ✓ |
| Promote/demote a Lead pastor | – | – | – | ✓ |
| Export the prayer log (CSV) | – | – | ✓ | ✓ |
| Transfer ownership | – | – | – | ✓ |
| Billing & subscription | – | – | – | ✓ |
| Delete the church account | – | – | – | ✓ |

**Edward's own row must be invisible on the People/admin list to everyone except Edward himself** — even Rachel, viewing Admin → People, should not see an "Edward" entry. This is a server-side filter (exclude owner row unless `viewer.id === owner.id`), not just a client hide.

## Authentication
- **Identity key: phone number.** Sign-in form asks for **name, phone number, password** (name is a display label, not a lookup key — phone is unique per account).
- **First-time flow:** name + phone + password creates the account; role defaults to `member` unless the phone matches a pre-seeded staff record (see Rollout scope — Edward and Rachel are pre-seeded before launch).
- **Returning flow:** phone + password.
- **Passwordless alternative:** "Text a code to this number" — 6-digit SMS OTP via a real SMS provider (Twilio Verify or similar), 10-minute expiry, single use.
- **Second factor for elevated roles:** after credential success, any account with role `pastor`, `agricultural_minister`, `lead_pastor`, or `owner` is prompted for a **4–5 digit PIN** set by that user at account creation (not shared across roles, not hardcoded — the prototype's fixed PINs like 2026/2210/00599 are placeholder-only). Members skip this step entirely.
- Prototype behavior to preserve: wrong PIN flashes red and clears after ~0.5s; the PIN dot row length matches the PIN's digit count.

## Screens / views
All screens are one continuous app shell: fixed header (logo + screen title + current user's name/role + notifications bell with unread badge), scrollable content area, floating rounded tab bar pinned to the bottom (tabs shown depend on role — see below), and full-screen modals for sign-in, PIN entry, SMS code entry, and the compose/admin action sheets.

### 1. Sign in
- Centered card: logo, "Prayer Wall" wordmark, title ("Sign in" / "Welcome back" once a password exists for that account), one card with Name, Phone number, Password fields (each with a small-caps label above the field).
- Primary pill button "Sign in" (or "Save it and sign in" on first setup for that phone).
- Secondary outline pill "Text a code to this number" — uses the phone number already typed.
- Inline error state (rust-red tinted card) for a phone not found in the directory.
- Footer note: "Pastors, the lead pastor, and the owner enter a PIN after this step."

### 2. PIN step (pastor / ag minister / lead pastor / owner only)
- Dark warm-gradient full-screen panel. Lock icon + kicker ("Pastoral access" / "Lead pastor access" / "Owner access"). 4–6 dot progress row sized to that role's PIN length. Numeric keypad (0–9, Clear, ⌫). Correct PIN shows "Unlocked" then proceeds; wrong PIN flashes the dots red and clears.
- "Not you? Sign out" returns to sign-in.

### 3. SMS code step
- Light panel, 6 boxed-digit entry, numeric keypad, "Use my password instead" fallback link.

### 4. Home / Wall
- **Member view:** no feed of others' requests. Top card: "Private by default" explainer (only first-time/empty state). "+" compose row ("What can we pray with you about?"). List of **their own** requests only, each showing who can see it (Pastors only / Whole church), prayed-count, and an "Mark as answered" toggle.
- **Pastor/ag-minister/lead/owner view:** dark summary card ("N requests are waiting" + "Start praying" → Pray tab). Filter chips (All / Waiting / Praise). Feed of every request (all audiences) with an "I prayed" pill button (turns solid, label becomes "Prayed — they were told") and a visibility tag per card ("Whole church" / "Pastors only").

### 5. Pray (leader roles only)
- **Idle state:** count of people waiting + "Begin" button; a no-pressure reassurance card.
- **Active state:** progress bar + step counter + optional timer, one request full-screen (avatar initial, name, request text), a plain prompt card suggesting what to pray (topic-matched, no scripture), "Prayed — next" primary button, "Skip for now" / "End here" secondary actions.
- **Done state:** dark summary card ("You prayed for N people") + "Back to requests."
- Praying for someone here (or from the Wall feed) **must trigger a real notification** to that requester: "{Pastor name} prayed for you" + a snippet of their request text.

### 6. Mine
- Your own requests (same card style as Member's Home). Leaders additionally see nothing extra here beyond their own account — no cross-role data.
- "Your account" card: avatar-initial circle, name, role/title, a Notices on/off toggle.
- "Sign out" button — **must be visible and functional for every role**, not just members.

### 7. Notices
- List of personal notifications ("{Name} prayed for you", "Notice from {sender}" for church-wide broadcasts), unread ones marked with a dot and a differently-weighted card; "Mark all read" button when any are unread. Empty state copy when there are none.

### 8. Admin (lead pastor & owner only)
- Dark summary card describing scope ("Everything but the owner keys" for lead pastor; "Full control of the church account" for owner).
- **People** list: every staff/member account (role shown per row), a "Change" button that cycles Member → Prayer team → Agricultural minister → Pastor (→ Lead pastor is owner-only from Pastor). Edward's row is filtered out server-side unless the viewer IS Edward.
- **Who can do what** matrix: read-only table, same data as the permissions table above.
- **Church-wide** section: "Send a notice to the whole church" (opens a compose sheet: textarea, "Send to everyone" button — creates one notification per account) and "Export the prayer log" (opens a sheet showing request/prayed counts, "Download CSV" button that generates a CSV of every request: name, timestamp, tag, audience, kind, prayed y/n, text).
- **Owner-only** section (owner viewer only — hidden entirely for lead pastor, not just disabled): "Add or remove a lead pastor" (jumps to/highlights the People list), "Transfer ownership" (picks a target from People, confirms, current owner becomes lead pastor), "Billing & subscription" (plan/price/next-charge summary + "Update payment method"), "Delete the church account" (type "DELETE" to enable a destructive confirm button, then signs the account out).

## Interactions & behavior
- Tab bar contents by role: Member = Home, Mine, Notices. Pastor/ag minister = Home, Pray, Mine, Notices. Lead pastor/Owner = adds Admin.
- All primary actions are pill buttons (`border-radius: 999px`), cards are 18–24px radius, no hard corners anywhere.
- Toast: a dark rounded banner slides in above the tab bar for ~3.2s confirming actions (sent, downloaded, transferred, etc.) — non-blocking, auto-dismisses.
- No scripture is quoted anywhere in the app (explicit product decision) — the Pray flow uses plain, topic-matched prompts instead of verses.
- No "heart"/"carry" secondary actions on requests — the only per-request action besides visibility is "I prayed."

## State management (client)
Minimum state needed: `currentUser` (id, name, phone, role, pinSet), `requests[]` (id, ownerId, text, tag, audience, kind, createdAt, prayedBy[], answeredAt|null), `notifications[]` (id, toUserId, title, body, createdAt, readAt|null), `session` (authStep: credentials|pin|code|authenticated), `adminModal` (null|broadcast|export|transfer|billing|delete).

## Data model (suggested)
```
User { id, name, phone (unique), passwordHash, pinHash|null, role, createdAt }
Request { id, ownerId, text, tag, audience(church|pastors), kind(request|praise), answeredAt|null, createdAt }
PrayerLog { id, requestId, prayedByUserId, createdAt }  -- also fires a Notification to Request.ownerId
Notification { id, toUserId, title, body, createdAt, readAt|null }
```

## Design tokens
- Ground: `#f6f1e9` (app bg), `#fdfaf4` (cards), `#2f2a20`→`#3a342a` gradient (dark cards/panels)
- Ink: `#26221d` (primary text), `#6e675c` (secondary text)
- Accent: `#8c6242` (clay — primary actions), `#6b4526` (deep clay — small-caps kickers/links), `#dcb98f` (light accent, on dark cards)
- Danger: `#8a3f24` text / `rgba(166,74,45,.1)` bg / `rgba(166,74,45,.3)` border
- Type: Barlow (body) / Barlow Condensed (not used here — this app uses Barlow throughout at weight 500/600), sizes 12–56px per screen above
- Radius: 24px cards, 18–20px rows/inputs, 999px pills
- Shadow: `0 1px 2px rgba(38,34,29,.05), 0 10px 24px rgba(38,34,29,.055)` on light cards; `0 10px 26px rgba(38,34,29,.16)` on dark cards

## Assets
- Church logo: `assets/logo.png` (included in this bundle)

## Files included
- `Prayer Wall.dc.html` — full source (framed/desktop preview build)
- `Prayer Wall Phone.dc.html` — phone-native build (no device bezel, safe-area aware) — closest to what a real mobile shell should feel like
- `assets/logo.png`

## Next step
This package is ready to hand to a developer or to Claude Code to scaffold the real client + backend. I can't provision the live server myself, but I can keep refining this spec, or connect this project to a GitHub repo if you start one, so future design changes stay in sync with the real build.
