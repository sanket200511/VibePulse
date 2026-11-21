from app.core.config import Settings


def test_neon_database_url_is_normalized_for_asyncpg():
    settings = Settings(
        database_url=(
            "postgresql://db_user:db_password@db.example/neondb"
            "?sslmode=require&channel_binding=require"
        )
    )

    assert settings.database_url == (
        "postgresql+asyncpg://db_user:db_password@db.example/neondb?ssl=require"
    )
