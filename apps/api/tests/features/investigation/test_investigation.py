from app.features.investigation.domain import parse_investigation_query


def test_parse_investigation_query_empty():
    query = parse_investigation_query("")
    assert len(query.full_text_terms) == 0
    assert len(query.filters) == 0


def test_parse_investigation_query_hybrid():
    qs = "severity:HIGH file:auth.py authentication jwt"
    query = parse_investigation_query(qs)

    assert len(query.full_text_terms) == 2
    assert "authentication" in query.full_text_terms
    assert "jwt" in query.full_text_terms

    assert len(query.filters) == 2
    filters = {f.key: f.value for f in query.filters}
    assert filters.get("severity") == "HIGH"
    assert filters.get("file") == "auth.py"


def test_parse_investigation_query_quotes():
    qs = 'event:FILE_MODIFIED "user auth"'
    query = parse_investigation_query(qs)

    assert len(query.filters) == 1
    assert query.filters[0].key == "event"
    assert query.filters[0].value == "FILE_MODIFIED"

    assert len(query.full_text_terms) == 1
    assert query.full_text_terms[0] == "user auth"
