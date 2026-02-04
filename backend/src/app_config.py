from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    MONGODB_URL: Optional[str] = None
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_API_SECRET: Optional[str] = None
    APIKEY_GPT4: Optional[str] = None
    API_KEY_QDRANT: Optional[str] = None
    COLLECTION_NAME: Optional[str] = None
    COLLECTION_NAME_MEM: Optional[str] = None
    DATA_PATH: Optional[str] = None
    MODEL_NAME: str = "gpt-5.1-2025-11-13"
    QDRANT_URL: Optional[str] = None
    CRYPTO_COMPARE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    REDDIT_USER_AGENT: Optional[str] = None
    OPENAI_ENGINE: Optional[str] = None
    EMBEDDING_MODEL: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    API_HASH: Optional[str] = None
    API_ID: Optional[int] = None
    TAVILY_API_KEY: Optional[str] = None
    CRYPTO_NEWS_API_KEY: Optional[str] = None
    FINNHUB_API_KEY: Optional[str] = None
    CRYPTO_PANIC_API_KEY: Optional[str] = None
    COINMARKETCAP_KEY: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    SECRET_KEY: Optional[str] = None
    AURA_INSTANCEID: Optional[str] = None
    AURA_INSTANCENAME: Optional[str] = None
    GETZEP: Optional[str] = None
    COMPOSIO_API_KEY: Optional[str] = None  # Ensure this is optional too
    STAGING_DB: Optional[str] = None
    STAGING_USER: Optional[str] = None
    STAGING_PASS: Optional[str] = None
    PRODUCT_DB: Optional[str] = None
    PRODUCT_USER: Optional[str] = None
    PRODUCT_PASS: Optional[str] = None

    TABLE_NAME: Optional[str] = None
    COMPOSIO_API_KEY_MISS_CHINA_AI: Optional[str] = None
    COMPOSIO_API_KEY_ARNOLD_AI: Optional[str] = None
    COMPOSIO_API_KEY_WARREN_AI: Optional[str] = None
    COMPOSIO_API_KEY_GRETE_AI: Optional[str] = None
    COMPOSIO_API_KEY_FREUD_AI: Optional[str] = None
    COMPOSIO_API_KEY_CASANOVA_AI: Optional[str] = None
    # COMPOSIO_API_KEY_CLEOPATRA_AI: Optional[str] = None
    COMPOSIO_API_KEY_NIKOLA_AI: Optional[str] = None
    COMPOSIO_API_KEY_DOOLITTLE_AI: Optional[str] = None
    COMPOSIO_API_KEY_GAMA_AI: Optional[str] = None
    COMPOSIO_API_KEY_CZ: Optional[str] = None
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: Optional[str] = None
    MONGODB_COLLECTION_NAME: Optional[str] = None
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION_NAME: Optional[str] = None
    # QDRANT_VECTOR_SIZE: Optional[int] = None
    DB_NAME: Optional[str] = None
    DB_USER: Optional[str] = None
    DB_PASS: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None

    GOLDIO: Optional[str] = None
    SERPI_API_KEY: Optional[str] = None

    GAMA_X_API_KEY: Optional[str] = None
    GAMA_X_API_SECRET_KEY: Optional[str] = None
    GAMA_X_CLIENT_ID: Optional[str] = None
    GAMA_X_CLIENT_SECRET: Optional[str] = None
    GAMA_X_ACCESS_TOKEN: Optional[str] = None
    GAMA_X_ACCESS_TOKEN_SECRET: Optional[str] = None

    CZ_X_API_KEY: Optional[str] = None
    CZ_X_API_SECRET_KEY: Optional[str] = None
    CZ_X_CLIENT_ID: Optional[str] = None
    CZ_X_CLIENT_SECRET: Optional[str] = None
    CZ_X_ACCESS_TOKEN: Optional[str] = None
    CZ_X_ACCESS_TOKEN_SECRET: Optional[str] = None

    ARNOLD_X_API_KEY: Optional[str] = None
    ARNOLD_X_API_SECRET_KEY: Optional[str] = None
    ARNOLD_X_CLIENT_ID: Optional[str] = None
    ARNOLD_X_CLIENT_SECRET: Optional[str] = None
    ARNOLD_X_ACCESS_TOKEN: Optional[str] = None
    ARNOLD_X_ACCESS_TOKEN_SECRET: Optional[str] = None

    CASANOVA_X_API_KEY: Optional[str] = None
    CASANOVA_X_API_SECRET_KEY: Optional[str] = None
    CASANOVA_X_ACCESS_TOKEN: Optional[str] = None
    CASANOVA_X_ACCESS_TOKEN_SECRET: Optional[str] = None
    CASANOVA_X_CLIENT_ID: Optional[str] = None
    CASANOVA_X_CLIENT_SECRET: Optional[str] = None

    CLEOPATRA_X_API_KEY: Optional[str] = None
    CLEOPATRA_X_API_SECRET_KEY: Optional[str] = None
    CLEOPATRA_X_ACCESS_TOKEN: Optional[str] = None
    CLEOPATRA_X_ACCESS_TOKEN_SECRET: Optional[str] = None
    CLEOPATRA_X_CLIENT_ID: Optional[str] = None
    CLEOPATRA_X_CLIENT_SECRET: Optional[str] = None

    WARREN_X_API_KEY: Optional[str] = None
    WARREN_X_API_SECRET_KEY: Optional[str] = None
    WARREN_X_ACCESS_TOKEN: Optional[str] = None
    WARREN_X_ACCESS_TOKEN_SECRET: Optional[str] = None
    WARREN_X_CLIENT_ID: Optional[str] = None
    WARREN_X_CLIENT_SECRET: Optional[str] = None

    PRODUCT_COLLECTION_NAME: Optional[str] = None
    TEAM_MEMBERS: Optional[list[str]] = [
        "search_agent",
        "itinerary_agent",
        "knowledge_agent",
        "budget_agent",
    ]
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = None
    AWS_BUCKET_NAME: Optional[str] = None

    # Google Cloud Storage Configuration
    GCS_BUCKET_NAME: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    AVIATIONSTACK_API_KEY: Optional[str] = None
    PHONE_NUMBER: Optional[str] = None
    TARGET_CHANNEL: Optional[str] = None
    SESSION_NAME: Optional[str] = None
    TELEGRAM_API_ID: Optional[int] = None
    TELEGRAM_API_HASH: Optional[str] = None
    TELEGRAM_PHONE_NUMBER: Optional[str] = None
    TELEGRAM_SESSION_STR: Optional[str] = None
    BITQUERY_API_KEY: Optional[str] = None
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LITE_LLM_ENDPOINT_URL: Optional[str] = None
    LITE_LLM_API_KEY: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None

    # Google Search Configuration
    GOOGLE_SEARCH_API_KEY: Optional[str] = None
    GOOGLE_SEARCH_ENGINE_ID: Optional[str] = None




    # Redis Configuration
    REDIS_HOST: Optional[str] = "localhost"
    REDIS_PORT: Optional[int] = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: Optional[int] = 0
    REDIS_CHAT_TTL: Optional[int] = None  # TTL in seconds, None = no expiry
    OPENAI_BASE_URL: Optional[str] = None
    PERPLEXITY_API_KEY: Optional[str] = None


# Initialize the configuration
app_config = AppConfig()
