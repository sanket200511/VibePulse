```mermaid
flowchart TD
    subgraph Data Layer
        E[(development_events)]
        A[(event_analyses)]
    end

    subgraph Provenance Engine
        F1[Fetch Event Stream]
        F2[Extract Typing Velocity (ms between events)]
        F3[Extract AST Complexity Delta (Lines/Functions added)]
        F4[Extract Copy/Paste Heuristics]

        Stats[Statistical Classifier]

        F1 --> F2 & F3 & F4
        F2 --> Stats
        F3 --> Stats
        F4 --> Stats

        Stats --> P[Likelihood Probability Distribution]
    end

    E & A --> F1
    P --> UI[Dashboard: AI Provenance Screen]
```
