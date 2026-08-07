"""
Investigation Engine Domain.
Provides a pure AST for structured search and parsing logic.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import StrEnum


class FilterOperator(StrEnum):
    EQUALS = "eq"
    NOT_EQUALS = "neq"
    CONTAINS = "contains"
    GREATER_THAN = "gt"
    LESS_THAN = "lt"


@dataclass(frozen=True)
class InvestigationFilter:
    key: str
    operator: FilterOperator
    value: str


@dataclass(frozen=True)
class ParsedInvestigationQuery:
    full_text_terms: list[str] = field(default_factory=list)
    filters: list[InvestigationFilter] = field(default_factory=list)


def parse_investigation_query(query_string: str) -> ParsedInvestigationQuery:
    """
    Parses a hybrid search string into a structured AST.
    Example: `severity:HIGH file:auth.py authentication jwt`
    """
    if not query_string:
        return ParsedInvestigationQuery()

    full_text_terms: list[str] = []
    filters: list[InvestigationFilter] = []

    # Regex to match key:value pairs or standalone words.
    # We want to support keys like `file`, `ai.provider`, `severity`, etc.
    # It splits correctly by respecting spaces. To support quoted values,
    # a more robust regex or state machine could be used, but for now
    # simple word matching suffices for deterministic keys.
    tokens = re.findall(r'(?:[^\s"]+|"[^"]*")+', query_string)

    for token in tokens:
        if token.startswith('"') and token.endswith('"'):
            token = token[1:-1]

        # Check if it's a filter like key:value
        if ":" in token and not token.startswith(":"):
            parts = token.split(":", 1)
            key = parts[0].lower()
            value = parts[1]
            filters.append(
                InvestigationFilter(key=key, operator=FilterOperator.EQUALS, value=value)
            )
        else:
            full_text_terms.append(token)

    return ParsedInvestigationQuery(
        full_text_terms=full_text_terms,
        filters=filters,
    )
