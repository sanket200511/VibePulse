# VibePulse GIF Recording Plan

High-quality GIFs and short MP4s are critical for communicating the dynamic nature of VibePulse.

All recordings should be made using tools like CleanShot X or ScreenFlow to ensure smooth 60fps captures without desktop clutter.

## 1. The 15-Second Quick Overview

- **Duration**: 15 seconds
- **Recording Path**: `/` -> click a Session -> scroll Timeline
- **Narration/Subtitle**: "VibePulse passively observes your engineering activity and structures it into semantic sessions."
- **Start State**: Workspace home page, showing a list of recent sessions.
- **End State**: Scrolling down the Architecture Timeline of a completed session.
- **Filename**: `demo-quick-overview.gif`

## 2. Engineering Replay Demonstration

- **Duration**: 30 seconds
- **Recording Path**: `/sessions/:sessionId/replay`
- **Narration/Subtitle**: "Play back your code evolution like a video. Navigate by semantic chapters."
- **Start State**: Replay paused at the beginning.
- **End State**: User clicks "Play", scrubs forward, and clicks the `IDLE_GAP` chapter jump button.
- **Filename**: `demo-replay-engine.mp4`

## 3. Investigation Engine Workflow

- **Duration**: 25 seconds
- **Recording Path**: `/investigate`
- **Narration/Subtitle**: "Query your engineering history with deterministic precision."
- **Start State**: Empty investigation search bar.
- **End State**: User types `language:python has:security_todo`, presses enter, and expands a matched event payload.
- **Filename**: `demo-investigation.gif`

## 4. AI Provenance Analysis

- **Duration**: 20 seconds
- **Recording Path**: `/sessions/:sessionId/provenance`
- **Narration/Subtitle**: "Statistically classify the likelihood of AI-assisted authorship."
- **Start State**: AI Provenance dashboard for a highly-assisted session.
- **End State**: Hovering over the statistical distribution chart to show tooltip data.
- **Filename**: `demo-ai-provenance.gif`

## 5. Time Machine Rollback

- **Duration**: 20 seconds
- **Recording Path**: `/projects/:projectId/time-machine`
- **Narration/Subtitle**: "Slide back in time to view the architectural state of your repository."
- **Start State**: Time Machine set to `Today`.
- **End State**: Dragging the slider back 3 weeks, watching the architectural blocks shrink or disappear.
- **Filename**: `demo-time-machine.gif`

## 6. Presentation Mode

- **Duration**: 15 seconds
- **Recording Path**: `/sessions/:sessionId/presentation`
- **Narration/Subtitle**: "Distraction-free replay for code reviews and retrospectives."
- **Start State**: Standard session detail view. User clicks "Enter Presentation Mode".
- **End State**: Full-screen, distraction-free playback of code edits.
- **Filename**: `demo-presentation.gif`
