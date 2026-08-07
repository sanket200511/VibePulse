```mermaid
flowchart TD
    Input[Raw DevelopmentEvent]

    subgraph Analysis Pipeline [Background Task]
        direction TB
        Registry[Analyzer Registry]

        A1[LanguageAnalyzer]
        A2[FileMetadataAnalyzer]
        A3[StaticAnalysisAnalyzer\nTree-Sitter]
        A4[SecurityAnalyzer\nRegex/Pattern]

        Registry --> A1
        Registry --> A2
        Registry --> A3
        Registry --> A4

        A1 -- findings --> Aggregator
        A2 -- findings --> Aggregator
        A3 -- findings --> Aggregator
        A4 -- findings --> Aggregator

        Aggregator[Pipeline Aggregator]
    end

    Input --> Analysis Pipeline
    Aggregator -- "INSERT ON CONFLICT DO UPDATE" --> DB[(event_analyses)]
```
