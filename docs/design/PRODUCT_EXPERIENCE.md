# VibePulse Product Experience

Version: 1.0
Status: Authoritative — Product Architecture Blueprint

---

## About This Document

This document is the master blueprint for how developers experience VibePulse. It does not introduce new product philosophy — [[VISION.md]], [[docs/design/PRODUCT_PRINCIPLES.md]], [[docs/design/UX_PRINCIPLES.md]], [[docs/design/COPY_GUIDELINES.md]], [[docs/design/MOTION.md]], and [[docs/adr/0009-health-engine.md]] already establish who VibePulse is for, what it values, how it speaks, and how it moves. What did not exist until now was a single place that connects those principles to a concrete journey, screen structure, and navigation model — the thing a Staff Frontend Engineer actually needs before building a single screen.

Three governing decisions shape everything below, and are stated once here rather than repeated at every section:

1. **Authority.** [[docs/adr/0009-health-engine.md]] and every file under `docs/design/` are the authoritative source of current product philosophy. Root `DESIGN.md`'s "Health Score" (circular progress, large number, trend arrow, score history) and "Dashboard" framing are historical concepts, superseded by the Health Engine's actual score-free design and by VibePulse's "Developer Workspace" identity. They are not used as source material here and are expected to be corrected in a future, separate Documentation Alignment sprint.
2. **Reflection is Insights.** "Reflection" is the user-facing product name for the feature engineered, tested, and documented as `insights` (ADR-0007). There is one screen and one experience — this document never treats them as two things wearing one name.
3. **Target, not current.** This document describes where the product experience should be, independent of `SessionDetailsPage.tsx`'s present section order. Where today's implementation diverges from the architecture below, it is called out explicitly as **implementation drift**, to be resolved in a future frontend sprint — not a reason to shape this document around today's UI.

This document stays at the level of product architecture: journeys, screens, hierarchy, navigation, and roadmap. It contains no components, no wireframes, no color palettes, no markup. Those belong to the individual frontend sprints this document exists to make possible.

---

## 1. Product Experience Summary

VibePulse is a **Developer Workspace**, not an analytics dashboard, not a productivity tracker, not an AI wrapper ([[docs/design/PRODUCT_PRINCIPLES.md]], Vision). It exists to help a developer understand their own development process — to **Observe, Understand, Replay, Reflect, and Evolve** ([[docs/design/PRODUCT_PRINCIPLES.md]], Product Pillars) — without ever judging, ranking, or surveilling the person doing the work.

Five documents already define how this identity should feel and speak, and this document treats each as a fixed input rather than something to re-derive:

- **[[VISION.md]]** answers _why_ VibePulse exists — the observability gap opened by AI-assisted development — and states the product should feel Calm, Reflective, Developer-first, Timeless, and Intelligent without being intrusive.
- **[[docs/design/PRODUCT_PRINCIPLES.md]]** translates that vision into six Core Values (Clarity, Reflection, Trust, Explainability, Calm, Timelessness) and four Design Principles (Story Over Statistics, Context Before Detail, Progress Over Perfection, Simplicity Through Structure).
- **[[docs/design/UX_PRINCIPLES.md]]** translates those values into interface-level rules: one primary purpose per screen, progressive disclosure, context-first orientation, and mandatory accessibility.
- **[[docs/design/COPY_GUIDELINES.md]]** makes the product's voice consistent everywhere that voice appears — calm, direct, never fabricated, never celebratory about a developer's habits.
- **[[docs/design/MOTION.md]]** makes movement consistent with that same voice — motion communicates state, never decorates, and Replay is the one place allowed continuous, cinematic movement, because it is "an interactive story," never a video.

What none of these documents do — deliberately, since none of them were scoped to — is describe the actual sequence of screens a developer moves through, how those screens relate to each other structurally, or how VibePulse's shipped backend capabilities (Events, Analysis, Sessions, Timeline, Insights, Replay, Health) surface as a coherent, navigable product. That is this document's sole job. Everything that follows is an application of the five documents above to concrete journeys, screens, hierarchy, and navigation — never a departure from them.

---

## Workspace Philosophy

The Workspace is the developer's home.

It should answer three questions immediately:

- What am I working on?
- What happened most recently?
- What should I do next?

The Workspace is intentionally quiet.

It does not compete for attention.

It orients.

Every other experience begins from here.

---

## 2. Complete Developer Journey

Every journey below follows the same shape: what the developer is trying to do, how they feel while doing it, how the product responds, what action (if any) is theirs to take, and how they — and VibePulse — know the journey is complete.

### 2.1 First Launch

- **User goal:** Understand what this tool is and whether it's worth pointing at real work, in under a minute.
- **Emotional state:** Curious but wary — another tool asking for attention, unproven.
- **Product response:** A calm, honest explanation of what VibePulse does (observes, never generates or modifies code) and what it will need (a project to watch). No setup wizard, no forced multi-step onboarding flow, no marketing language ([[docs/design/COPY_GUIDELINES.md]], "Things We Never Say").
- **Primary action:** Connect a first project.
- **Completion criteria:** The developer can state, in their own words, "it watches my work and shows it back to me" — and knows the single next step is connecting a project.

### 2.2 Connecting a Project

- **User goal:** Get VibePulse observing real work with minimal ceremony, then get back to coding.
- **Emotional state:** Slightly impatient — this is a means to an end, not the point of using the product.
- **Product response:** One clear path, stating plainly what will be observed (file changes, language, git context, session activity) and what will not (code content is never generated or altered). Confirms success with quiet confidence, not celebration ("Project connected." not "You're all set! 🎉").
- **Primary action:** Point VibePulse's daemon at a project directory.
- **Completion criteria:** The project appears as connected and in a "waiting for activity" state — never an error, never a blank unexplained screen.

### 2.3 Beginning a Session

- **User goal:** Start coding without thinking about VibePulse at all.
- **Emotional state:** Focused on the actual work; any friction here is a direct cost to that focus.
- **Product response:** A session begins automatically, in the background, the moment observed activity starts ([[VISION.md]] Principles, "Observe, don't interrupt"). No popup, no confirmation prompt, no sound.
- **Primary action:** None — this journey has no user action by design.
- **Completion criteria:** An ACTIVE session exists and is visible from Workspace Home the moment the developer chooses to look, and at no point before that.

### 2.4 Live Development

- **User goal:** Occasionally check what VibePulse has seen so far, without breaking concentration.
- **Emotional state:** Deep focus; interruption is the enemy here, not information.
- **Product response:** A live Timeline is available on demand, updated over the existing WebSocket channel, but nothing surfaces uninvited — no badges, no toasts, no attention-seeking indicators while the developer is heads-down.
- **Primary action:** Optionally glance at the current session's state.
- **Completion criteria:** Within five seconds of looking, the developer understands the current session's shape so far, and returns to work carrying zero residual attention debt.

### 2.5 Session Completion

- **User goal:** Know the session ended and that its story was captured intact.
- **Emotional state:** Mild relief, mild curiosity — "how did that actually go?"
- **Product response:** The session transitions ACTIVE → IDLE → COMPLETED automatically. A quiet, non-intrusive confirmation appears ("Session saved."); Replay, Reflection, and Health all become available the moment the transition completes.
- **Primary action:** None required — optionally, open the completed session.
- **Completion criteria:** The session shows as COMPLETED, and Replay, Reflection, and Health are all reachable from it.

### 2.6 Replay

- **User goal:** Relive the session's actual sequence of work, chapter by chapter, to understand its shape.
- **Emotional state:** Reflective, unhurried, wants to remain in control of pace rather than be carried by it.
- **Product response:** Chapter-based, deterministic playback — cinematic but understated ([[docs/design/COPY_GUIDELINES.md]], "Replay ready." / "Replay complete."). The developer always retains control; Replay never advances on its own agenda ([[docs/design/MOTION.md]], "Replay must never feel like a video. It is an interactive story.").
- **Primary action:** Play, pause, step, or jump to a chapter.
- **Completion criteria:** The developer reaches the session's end, or exits early, with a clear sense of what the session's chapters were.

### 2.7 Reflection

- **User goal:** Understand what the session's activity actually meant, not just what happened.
- **Emotional state:** Open to learning something about their own process — wants to feel understood, not evaluated.
- **Product response:** Narrative-first interpretation, organized into meaningful categories, every conclusion traceable to its evidence ([[docs/design/PRODUCT_PRINCIPLES.md]], Explainability). Health's five categorical reads (Focus, Momentum, Flow, Stability, Completion) sit alongside this as observations about the session's shape, phrased exactly as [[docs/design/COPY_GUIDELINES.md]]'s Health tone specifies — never as a verdict on the developer.
- **Primary action:** Read; optionally drill into the evidence behind any single observation.
- **Completion criteria:** The developer can answer "why did this session feel the way it did" using only what's on screen — no raw number required to make sense of it.

### 2.8 Reviewing History

- **User goal:** Find a specific past session, or notice a pattern across several.
- **Emotional state:** Investigative — often preparing for a standup, a retro, or just personal curiosity.
- **Product response:** A chronological, per-project session history. No forced cross-session scoring or ranking (Health explicitly never compares sessions or developers, per ADR-0009) — history is for finding and reopening, not for leaderboards.
- **Primary action:** Select a past session to reopen its Timeline, Replay, and Reflection.
- **Completion criteria:** The developer locates and reopens the specific session they had in mind.

### 2.9 Returning the Next Day

- **User goal:** Pick up the thread of yesterday's work quickly, without repeating a full review.
- **Emotional state:** Re-orienting — wants "where did I leave off," not a guilt-inducing streak count.
- **Product response:** Workspace Home surfaces the most recent session and any notable carryover context, phrased the same calm, non-judgmental way as everything else in the product.
- **Primary action:** Open the most recent session, or begin a new one by starting to code.
- **Completion criteria:** The developer knows "where things stand" within seconds of opening VibePulse.

### 2.10 Future AI-Assisted Workflow

- **User goal:** See AI-derived interpretation (an AI Fingerprint, a correlated prompt from the Prompt Vault) without losing confidence that the deterministic layer underneath still stands on its own.
- **Emotional state:** Curious, appropriately skeptical of AI claims — the same posture [[docs/design/COPY_GUIDELINES.md]] asks AI copy to respect ("One possible explanation..." never "Definitely...").
- **Product response:** AI-derived content is visibly and structurally distinguished from deterministic content (its provenance is never ambiguous), never replaces Reflection or Health, and always has a working non-AI state to fall back to ([[docs/design/PRODUCT_PRINCIPLES.md]], AI Philosophy).
- **Primary action:** Optionally open an AI Fingerprint or Prompt Vault view for a session.
- **Completion criteria:** The developer can state which parts of what they saw were deterministic and which were AI-interpreted, and trusts both.

---

## 3. Screen Inventory

Every screen below is described the same way: its purpose, the developer it's built for, the one action it exists to enable, the secondary actions it supports, what it depends on, how it scales, and who — conceptually — owns its correctness. Future screens are included and marked as such; they are placed here to prove the architecture accommodates them, not to schedule their delivery (see Section 8).

### 3.1 Workspace Home

- **Purpose:** Orient the developer — what's happening now, what happened most recently, where their projects stand.
- **Primary user:** A developer opening VibePulse at the start of a day, or returning mid-day.
- **Primary action:** Open the current or most recent session.
- **Secondary actions:** Switch projects, jump to History, connect a new project.
- **Dependencies:** Sessions (current status), Timeline (last-session summary).
- **Future scalability:** Becomes team-aware once Team Workspaces ship (Section 7), without changing its structure — only its scope.
- **Ownership within product:** The single entry point; every other screen is one step away from here.

### 3.2 Connect Project

- **Purpose:** Bring a new project under observation, with full transparency about what will and won't be captured.
- **Primary user:** A developer setting up VibePulse for the first time, or adding an additional project.
- **Primary action:** Point VibePulse at a project directory.
- **Secondary actions:** Review what is/isn't observed before confirming.
- **Dependencies:** Daemon connectivity.
- **Future scalability:** Extends naturally to Cloud Sync (Section 7) as an additional connection method, not a redesign.
- **Ownership within product:** The only place a project relationship begins.

### 3.3 Session Detail

- **Purpose:** The single home for understanding one session, whether it is currently ACTIVE or already COMPLETED. Presents Overview, Timeline, Replay, Reflection, and Health as progressively-disclosed sections of one screen, not five separate destinations ([[docs/design/UX_PRINCIPLES.md]], Progressive Disclosure).
- **Primary user:** A developer checking in on live work, or reflecting on a finished one.
- **Primary action:** Understand the session — via Timeline while it's live, via Replay/Reflection/Health once complete.
- **Secondary actions:** Step through Replay chapters, drill into a Reflection observation's evidence, return to Workspace Home or History.
- **Dependencies:** Sessions, Timeline (always); Replay, Reflection (Insights), Health (only once the session is COMPLETED — see ADR-0008 §5, ADR-0009 §8).
- **Future scalability:** AI Fingerprint and Prompt Vault (Section 7) extend this screen as new sections, never as new routes — exactly the extensibility ADR-0008 and ADR-0009 already designed for.
- **Ownership within product:** The screen every other screen ultimately leads to; the product's single unit of "a session's story."

### 3.4 Session History

- **Purpose:** Find a specific past session, within a project, in reverse-chronological order.
- **Primary user:** A developer looking for a session they remember, or scanning recent activity before a standup or retro.
- **Primary action:** Reopen a past session into Session Detail.
- **Secondary actions:** Filter by recency or project.
- **Dependencies:** Sessions, Timeline (per-session summary line).
- **Future scalability:** Becomes cross-project or cross-team scoped once Analytics/Team Workspaces (Section 7) ship, without adding a new screen.
- **Ownership within product:** The one place the past lives; never a ranking, always a record.

### 3.5 Projects

- **Purpose:** See every connected project and its live status at a glance.
- **Primary user:** A developer working across more than one codebase.
- **Primary action:** Switch to a project's Workspace Home / History.
- **Secondary actions:** Connect a new project, disconnect one.
- **Dependencies:** Project connection state (Section 3.2).
- **Future scalability:** Gains a Team-scoped grouping level (Section 7) without changing its per-project purpose.
- **Ownership within product:** The map of everything VibePulse currently watches.

### 3.6 Developer Profile _(future)_

- **Purpose:** Aggregate a developer's own patterns across sessions and projects over time — a longer-arc view of the same reflective questions Session Detail answers per-session.
- **Primary user:** A developer curious about how their process has evolved, not how it compares to anyone else's.
- **Primary action:** Review personal patterns over time.
- **Secondary actions:** Jump into any specific session referenced by a pattern.
- **Dependencies:** Health and Reflection data across many completed sessions.
- **Future scalability:** Stays strictly personal even under Team Workspaces — never becomes a leaderboard (Core Value: Reflection, never judgment).
- **Ownership within product:** The long-arc counterpart to Session Detail's single-session view.

### 3.7 AI Fingerprint _(future, Phase 4)_

- **Purpose:** Show, with explicit uncertainty where it exists, how much of a session's work carries the signature of AI assistance.
- **Primary user:** A developer or reviewer asking "how was this actually written?"
- **Primary action:** Review the fingerprint for one session.
- **Secondary actions:** Drill into which files/frames the signal was strongest on.
- **Dependencies:** Replay's `ReplayFrame.insights` (already exposes analyzer findings verbatim, per ADR-0008 Extensibility), Health's `HealthReport`.
- **Future scalability:** Extends naturally into Developer Profile as an aggregated view.
- **Ownership within product:** A Session Detail section, not a separate destination.

### 3.8 Prompt Vault _(future, Phase 4)_

- **Purpose:** Correlate a captured prompt with the resulting changes it produced.
- **Primary user:** A developer or reviewer asking "what prompt led to this change?"
- **Primary action:** View the prompt(s) behind a Timeline/Replay entry.
- **Secondary actions:** Navigate from a prompt to the frame(s) it produced, and back.
- **Dependencies:** A new Timeline marker/entry kind and matching Replay frame kind (ADR-0008 Extensibility already anticipates this — Replay's frame-lifting step is generic over entry kind).
- **Future scalability:** Slots into Timeline and Replay as new content, not new structure.
- **Ownership within product:** A Session Detail section, surfaced inline where the correlated change occurred.

### 3.9 Settings _(future)_

- **Purpose:** Account-level and accessibility-level preferences — never product-philosophy toggles.
- **Primary user:** Any developer adjusting how the product behaves for them personally.
- **Primary action:** Change a preference (e.g. reduced motion, notification behavior).
- **Secondary actions:** Manage connected projects, manage Cloud Sync connection.
- **Dependencies:** None functional — purely presentational/preference state.
- **Future scalability:** Naturally absorbs Cloud Sync account state and Team membership settings.
- **Ownership within product:** The one place "how VibePulse behaves for me" lives; deliberately never contains a toggle that would let a user hide Reflection's honesty (e.g. no "don't tell me about interruptions").

### 3.10 Notifications _(future)_

- **Purpose:** A calm, opt-in summary of what happened while the developer wasn't looking (e.g. a session completed).
- **Primary user:** A developer who wants a quiet record of activity, not an alert stream.
- **Primary action:** Review recent notifications.
- **Secondary actions:** Dismiss, adjust notification preferences (routes to Settings).
- **Dependencies:** Session lifecycle events.
- **Future scalability:** Scales to team-level notifications (e.g. a teammate's session) without changing its ambient, non-intrusive nature.
- **Ownership within product:** Deliberately not a badge-driven attention system — "Observe, don't interrupt" applies here most literally.

### 3.11 Team Workspace _(future, Post-v1)_

- **Purpose:** Extend Workspace Home, Projects, and History to a team's shared set of projects.
- **Primary user:** A member of an engineering team using VibePulse together.
- **Primary action:** Move between personal and team-scoped views.
- **Secondary actions:** Manage team membership (depends on Phase 5 auth).
- **Dependencies:** Authentication and multi-tenancy (Phase 5, per [[ROADMAP.md]]).
- **Future scalability:** The reason Section 7 exists — proving this doesn't require restructuring any of the above.
- **Ownership within product:** A scope change applied to existing screens, not a new product surface.

---

## 4. Navigation Architecture

**Chosen model: Contextual Navigation, anchored by a minimal, permanently stable set of orientation anchors.**

A small, fixed set of anchors — **Workspace Home, Projects, History** — is always reachable and never grows in count as the product grows. Everything else — Timeline, Replay, Reflection, Health, and every future addition (AI Fingerprint, Prompt Vault) — lives as a progressively-disclosed section _within_ Session Detail, reached contextually from wherever a session is referenced, never as an additional item competing for space in a persistent structure.

This is the model that satisfies [[docs/design/UX_PRINCIPLES.md]]'s Navigation Principles directly: navigation answers "what is the developer trying to accomplish right now," stays shallow, and prefers context over complexity. Settings, Developer Profile, and (later) Team Workspace join the anchor set as peer, account-level destinations — a handful of additions over years, not a growing feature list.

### Alternatives considered and rejected

- **Left sidebar (rejected).** A persistent sidebar tends to accrete one entry per feature over time, which is precisely the "generic SaaS dashboard" pattern [[docs/design/UX_PRINCIPLES.md]] explicitly warns against (§6, "Familiar Without Being Generic"). It also invites permanent badges and unread indicators per nav item — a structural pull toward the attention-seeking behavior "Observe, don't interrupt" forbids.
- **Top navigation (rejected).** Workable only for a small, fixed set of destinations. Once Settings, Developer Profile, AI Fingerprint, and Team Workspace all exist, a top nav either overflows into a hidden menu (reintroducing the nesting this model exists to avoid) or crowds the calm, whitespace-respecting header [[docs/design/UX_PRINCIPLES.md]] asks for.
- **Hybrid (sidebar + top nav) (rejected).** Combines both structures' weaknesses — two places a developer must scan to orient themselves — without resolving either one's long-term scaling problem. It defers the sidebar's feature-list accretion rather than preventing it.
- **Command palette as primary navigation (rejected).** An excellent secondary accelerator for experienced users, but unsuitable as the _sole_ primary navigation: it hides the product's structure from a first-time developer, directly conflicting with the Five-Second Rule (Section 5) and with "familiar without being generic" — a new developer should not need to already know a shortcut exists to discover Replay.

A command palette remains a valid **future, additive** accelerator layered on top of Contextual Navigation (Section 7 implicitly allows this — it changes nothing about the anchor set or the Session Detail structure), which is exactly why it is rejected here only as the _primary_ model, not excluded from the product altogether.

### Why this scales without redesign

Every future capability named in this document's Section 7 fits one of exactly two places: a new section inside Session Detail (AI Fingerprint, Prompt Vault), or a new peer anchor at the same structural level as Projects and History (Settings, Developer Profile, Team Workspace). Neither path requires restructuring an existing screen or renegotiating the anchor set's shallowness — which is the concrete test of "must scale to future features without redesign."

---

## 5. Information Hierarchy

Every screen below is evaluated against the Five-Second Rule: a developer must understand what to do next within five seconds of the screen appearing. Order is justified by [[docs/design/UX_PRINCIPLES.md]]'s Context First principle — _where am I, what happened, what should I do next_ — applied concretely.

### Workspace Home

1. **Current or most recent session state** — answers "where am I / what's happening right now" first, because that is the single most common reason to open the product.
2. **Quick entry into the most recent completed session's story** — the natural next question once "what's happening now" is answered.
3. **Connected projects at a glance** — relevant, but secondary to the developer's own immediate work.
4. **Global anchors (Projects, History)** — always present, always last, because they are wayfinding, not content.

_Five-second check: the very first thing on screen already tells the developer whether something is in progress, and if not, what to open next._

### Session Detail

1. **Overview / Outcome** — duration, primary language, distinct files, a plain-language summary. Orientation before interpretation.
2. **Timeline** — the chronological record. Comes before Replay because Replay is literally a way of stepping through what Timeline already shows; understanding the record before stepping through it is Context Before Detail applied directly.
3. **Replay** _(once COMPLETED)_ — now that the developer has context, they can step through the session's shape chapter by chapter.
4. **Reflection** _(once COMPLETED)_ — interpretation of what the session meant, once its shape has been seen.
5. **Health** _(once COMPLETED, last)_ — the most reflective, least action-oriented read of the session; deliberately placed last, since it invites lingering rather than doing.

> **Note on this ordering.** [[docs/design/UX_PRINCIPLES.md]]'s own "Information Hierarchy" section ranks Replay above Timeline and lists "Reflection" and "Insights" as separate entries with no mention of Health at all — because it was written before the Reflection/Insights terminology was consolidated (Decision 2, this sprint) and before the Health Engine existed (Sprint 7). The ordering above is that same principle applied to the product as it actually stands today, not a departure from it.
>
> **Implementation drift.** The current `SessionDetailsPage.tsx` renders Reflection (as "Insights") first, before the Overview and Timeline, with Replay and Health appearing afterward in the correct relative order. This is flagged as drift for a future frontend sprint to correct — not a reason to change the target order above (Decision 3).

_Five-second check: Overview alone — duration, primary language, a plain summary sentence — is enough to know what this session was and whether there's more worth opening below it._

### Session History

1. **Sessions in reverse-chronological order** — most recent first, matching how developers actually think about "recent work."
2. **Status at a glance** (ACTIVE / IDLE / COMPLETED) — tells the developer immediately which sessions are fully explorable (Replay/Reflection/Health require COMPLETED).
3. **A one-line outcome per session** — enough context to recognize the right one without opening it.
4. **Filters** — present, but last, since most visits are "find the one I remember," not "construct a query."

_Five-second check: status badges alone tell the developer which sessions they can replay right now._

### Projects

1. **Connected projects with live status** — observing vs. idle, answering "is this project actually being watched?" first.
2. **Each project's most recent session summary** — the natural next thing a developer wants once they've found the right project.
3. **Connect a new project** — always available, always last, since it's the least frequent action on this screen.

_Five-second check: live status per project is visible without opening anything._

### Connect Project

1. **A plain explanation of what will and won't be observed** — trust before action, per Core Value: Trust.
2. **The single action to connect** — exactly one clear thing to do.
3. **Confirmation once connected** — last, because it closes the loop rather than starting it.

_Five-second check: a first-time developer can tell, before doing anything, exactly what they're agreeing to._

---

## 6. Interaction Model

VibePulse's natural movement follows one path, with two peer on-ramps: **Workspace → Session → (Replay → Reflection, within Session) → History → Projects → Future AI (within Session)**.

**Workspace Home is the hub.** From here, a developer opens the current or most recent Session. History and Projects are peer entry points that also lead into a Session — they exist to help a developer _find_ the right session, not to compete with Workspace Home as an alternate hub.

**Session Detail is the destination, not a waypoint.** Once inside a session, movement through Timeline → Replay → Reflection → Health happens entirely through progressive disclosure — expanding, scrolling, stepping through chapters — never through a route change. This is deliberate: [[docs/design/MOTION.md]]'s "Preserve Spatial Memory" principle applies at the level of the whole screen graph, not just individual transitions. A developer moving from Timeline into Replay never loses their place, because they never actually left the screen whose one purpose is "understand this session."

**History and Projects are peer hubs, not destinations in themselves.** Their entire job is to get a developer to the right Session Detail screen quickly; neither one is designed to be lingered in.

**Future AI (AI Fingerprint, Prompt Vault) inserts as depth, not as a new hop.** Both extend Session Detail with additional progressively-disclosed sections, exactly as ADR-0008 and ADR-0009 already designed their domain models to allow (open `dict[str, Any]` buckets, generic frame-lifting over entry kind). The interaction model does not grow a new destination when these ship — it grows deeper at a destination developers already know how to reach.

The result: a developer is never more than one hop from Workspace Home, never more than one hop from any Session, and never forced to context-switch between screens to understand a single session's full story.

---

## Component Philosophy

1. Components should reveal information, not decorate.

2. Cards group meaningfully related information.

3. Buttons represent actions, not navigation.

4. Typography creates hierarchy before color does.

5. Color communicates status, not importance.

6. Icons support recognition rather than replace labels.

---

## 7. Future Product Expansion

Every capability named in the product's roadmap fits the architecture above without requiring navigation redesign. This section demonstrates where, specifically.

- **AI Fingerprint** — a new Session Detail section, adjacent to Reflection, reading `ReplayFrame.insights` and `HealthReport` exactly as ADR-0008 §7 and ADR-0009 §"Extensibility" already anticipate. Its AI-derived content is visibly distinguished from deterministic content per [[docs/design/COPY_GUIDELINES.md]]'s AI Features tone.
- **Prompt Vault** — a new Timeline marker and matching Replay frame kind, surfacing inline wherever the correlated change occurred. No new screen; Replay's frame-lifting is already generic over entry kind (ADR-0008 §2).
- **Team Workspaces** — Workspace Home, Projects, and History each gain a team-scoped view of the same structure; the anchor set doesn't grow, its scope does. Depends on Phase 5 authentication per [[ROADMAP.md]].
- **Cloud Synchronization** — a Settings concern (connection/account status), surfaced as an indicator rather than a destination; extends Connect Project as an additional connection method.
- **Notifications** — an ambient, opt-in, dismissible panel reachable from the anchor set, never a badge-driven interruption system — consistent with "Observe, don't interrupt" applied to the product's own behavior, not just the daemon's.
- **Settings** — a peer anchor for account- and accessibility-level preferences, deliberately excluding any toggle that would let a developer suppress Reflection's or Health's honesty.
- **Developer Profile** — a peer anchor aggregating a developer's own patterns across sessions over time; stays strictly personal even under Team Workspaces, since Health and Reflection never compare developers to each other.

None of the above requires a new navigation model, a new anchor category beyond the ones already named, or a restructuring of Session Detail's five-section shape. Each is either new depth inside an existing screen or a new peer anchor at the same structural level as Projects, History, and Settings.

---

## 8. Product Experience Roadmap

Each sprint below is independently shippable: it has one clear objective, can be tested and reviewed on its own, and leaves VibePulse in a releasable state when it lands — following the same Capability → Review → Hardening → Next Capability discipline already established in [[ROADMAP.md]].

- **PX-1 — Workspace Shell.** Build the persistent anchor set (Workspace Home, Projects, History), the Contextual Navigation model, and the shared empty/loading/error state system. No feature content yet. _Testable/reviewable as: can a developer move between the three anchors and understand where they are, with nothing else built yet?_
- **PX-2 — Home Experience.** Workspace Home's full Information Hierarchy: current/recent session state, quick entry to the last completed session, project quick-switch.
- **PX-3 — Project Connection & Projects Screen.** Connect Project onboarding plus the Projects screen (live status, per-project summary).
- **PX-4 — Session Detail: Overview & Timeline.** The Session Detail screen's scaffold, with Overview and Timeline wired to both live (ACTIVE/IDLE) and COMPLETED sessions. Establishes the progressive-disclosure pattern later sprints build on.
- **PX-5 — Replay Experience.** The Replay section within Session Detail — playback controls, chapter scrubber, jump-to-chapter — built to [[docs/design/MOTION.md]]'s Replay Motion rules exactly.
- **PX-6 — Reflection Experience.** The Reflection (Insights) section — narrative-first cards, evidence drill-down, copy consistent with [[docs/design/COPY_GUIDELINES.md]]'s Reflection tone.
- **PX-7 — Health Experience.** The Health section — five fixed-order metric cards, guidance list, and a deliberate UI-level enforcement that no numeric score is ever rendered anywhere near it.
- **PX-8 — Session History.** The History screen — reverse-chronological session list, status badges, filters, reopening into Session Detail.
- **PX-9 — Accessibility & Motion Hardening.** A dedicated audit of PX-1 through PX-8 against WCAG accessibility requirements, `prefers-reduced-motion`, full keyboard-only task completion, and screen-reader narration of Replay/Reflection/Health specifically, since they are the product's most novel interaction patterns.
- **PX-10 — AI Fingerprint Experience** _(depends on Phase 4 backend)._ New Session Detail section with explicit AI-provenance labeling.
- **PX-11 — Prompt Vault Experience** _(depends on Phase 4 backend)._ New Timeline marker/Replay frame rendering.
- **PX-12 — Developer Profile & Settings.** Two peer anchors: personal cross-session patterns, and account/accessibility preferences.
- **PX-13 — Team Workspaces** _(depends on Phase 5 backend)._ Team-scoped views of Workspace Home, Projects, and History.

Each sprint's review should include the same checklist [[ENGINEERING.md]] already establishes for UI work: a UX review against this document, an accessibility review, a mobile-responsiveness review, and a check of loading/error/empty states — nothing here introduces a new review process, only applies the existing one to a defined scope.

---

## 9. Success Metrics

**Quantitative:**

- **Time to understand Workspace Home** — a first-time or returning developer can state what's happening and what to do next within 5 seconds of the screen appearing (the Five-Second Rule, measured via task-based usability testing).
- **Navigation discoverability** — the proportion of developers who find Replay, Reflection, and Health without assistance during their first completed session, without needing a tour or a hint.
- **Replay usability** — the proportion of developers who can correctly describe what happened in a specific chapter after using Replay unaided.
- **Accessibility compliance** — 100% pass rate on WCAG 2.1 AA automated and manual audits for every shipped screen; every primary action completable keyboard-only.
- **Motion compliance** — zero animations exceeding [[docs/design/MOTION.md]]'s timing table without documented justification; 100% of motion respects `prefers-reduced-motion`.

**Qualitative:**

- **Perceived cognitive load** — post-session survey response trending toward "calm" and "clear," away from "cluttered" or "confusing," each time a new PX sprint ships.
- **User confidence** — developers report feeling more aware of how they work after using Reflection and Health, never more anxious — tested directly against [[docs/design/PRODUCT_PRINCIPLES.md]]'s stated Purpose.
- **Trust** — no reported instances of a developer feeling judged, ranked, or surveilled by Reflection or Health copy — tested directly against Core Values: Reflection and Trust.
- **Timelessness** — a twelve-month check for whether the interface still feels current without a redesign, and whether PX-10 through PX-13 shipped without requiring any change to the anchor set or navigation model established in PX-1 — the concrete test of whether this document's architecture actually held.

---

## Final Principle

Every future frontend implementation should optimize for developer understanding before visual sophistication.

If a design choice improves appearance but reduces clarity, clarity wins.
