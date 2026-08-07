# VibePulse 5-Minute Technical Demo Script

This script is designed for a technical audience (engineers, CTOs, open-source communities). It should be delivered at a brisk pace, focusing on showing rather than just telling.

---

## 0:00 - 0:30 | The Problem

_(Screen: Blank terminal or a massive, incomprehensible Git diff)_

**Speaker:**
"Git tells us _what_ changed and _why_, but it completely fails to tell us _how_. As AI coding assistants allow us to write code faster than ever, pull requests are getting massive. We’re losing the ability to understand the evolution of our own code.

Enter VibePulse. It’s an Engineering Search and Investigation Engine that sits passively on your filesystem, observing how code is written, and turning that into deterministic intelligence. Let me show you."

---

## 0:30 - 1:00 | Live Observability & Architecture

_(Screen: VibePulse Dashboard Home -> Live Event Feed)_

**Speaker:**
"VibePulse uses a completely decoupled architecture. A lightweight Node.js daemon watches the filesystem and streams events to a Python FastAPI backend.

Right now, you can see live telemetry flowing in. It detects language context shifts, git branch changes, and structural modifications instantly, without ever executing the code."

---

## 1:00 - 2:00 | The Replay Engine

_(Screen: Navigate to a Session Detail Page -> Click Play on the Replay Engine)_

**Speaker:**
"But raw events are noisy. VibePulse automatically groups these events into lifecycle-aware Sessions.

This is the Replay Engine. It reconstructs a coding session like a video player. But notice the timeline—these aren't just timestamps. VibePulse deterministically derives semantic chapters. It knows when I was doing deep `WORK`, when there was an `IDLE_GAP`, and when I shifted context.

I can step through every structural change I made over a 3-hour session in about 30 seconds."

---

## 2:00 - 2:45 | Engineering DNA

_(Screen: Click into the Engineering DNA tab for a project)_

**Speaker:**
"Because we parse the AST locally without sending your code to the cloud, we can extract what we call Engineering DNA.

Look here: VibePulse has identified all the functions I created, the classes I modified, and even flagged a security TODO I left behind. This isn't a text search; this is true structural understanding, achieved passively."

---

## 2:45 - 3:30 | Investigation Engine

_(Screen: Open the Investigation Engine search palette)_

**Speaker:**
"Now, what happens when you want to cross-reference this data?

The Investigation Engine is like Kibana for your engineering process. If I want to find every time someone modified a Python file, introduced a security pattern, and worked for more than 2 hours... I just type that query.

_(Types: `language:python has:security_pattern duration:>2h`)_

Instantly, it correlates those observations across every recorded session."

---

## 3:30 - 4:15 | Time Machine & AI Provenance

_(Screen: Project Time Machine slider, then AI Provenance dashboard)_

**Speaker:**
"If you want the macro view, the Time Machine lets you slide a dial to roll back the entire architectural state of your repository to any day in the past.

And for the micro view: AI Provenance. VibePulse analyzes event timing, velocity, and AST complexity to statistically classify the likelihood of AI-assisted authorship. We don't guess—we provide the probability distribution based on how the code arrived on disk."

---

## 4:15 - 5:00 | Closing Summary

_(Screen: Back to Dashboard Home, showing the "Production Ready" GitHub banner)_

**Speaker:**
"VibePulse doesn't generate code. It observes, it derives, and it structures.

Whether you're doing a code review in Presentation Mode, auditing security patterns, or just trying to understand a massive AI-generated PR, VibePulse gives you the fidelity you've been missing.

VibePulse v1.0.0 is open-source and production-ready today. Thank you."
