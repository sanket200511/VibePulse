# AI Engineering Copilot Foundation Architecture

```mermaid
flowchart TD
    UserQuery["Engineer Natural Query\n(e.g., 'What should I fix first?')"]

    Classifier["Deterministic Query Classifier\n(Regex & Intent Parser across 16 Families)"]
    Gate{"Answerability Gate\n(In-Scope Domain Check)"}

    Reject["Answerable: False\n[UNKNOWN] & Evidence: INSUFFICIENT\nNo Hallucination"]

    Retriever["Multi-Domain Canonical Retriever\n(Composes Health, Security, Predictions, KG)"]
    ContextBuilder["Evidence Context Synthesizer\n(Fact Item Construction)"]

    Observed["[OBSERVED] Facts\n(Direct Telemetry)"]
    Inferred["[INFERRED] Facts\n(Derived Projections)"]
    Unknown["[UNKNOWN] Facts\n(Explicit Boundaries)"]

    Sanitizer["Secret Redaction Sanitizer\n(Masks Tokens to [REDACTED])"]
    Response["Structured Copilot Response\n(Summary, Facts, Priorities, Deep Links)"]

    UserQuery --> Classifier
    Classifier --> Gate
    Gate -->|Out of Scope (e.g. Crypto, Weather)| Reject
    Gate -->|In Scope| Retriever
    Retriever --> ContextBuilder
    ContextBuilder --> Observed
    ContextBuilder --> Inferred
    ContextBuilder --> Unknown
    Observed --> Sanitizer
    Inferred --> Sanitizer
    Unknown --> Sanitizer
    Sanitizer --> Response
```
