from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Test Case Generation Service"
    app_env: str = "local"
    api_prefix: str = "/v1"

    # Main LLM provider for manual test case generation
    llm_provider: str = "fake"
    llm_fallback_provider: str | None = "ollama"

    default_model: str = "gpt-4.1-mini"
    prompt_version: str = "test_case_generation_v1"

    # OpenAI
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    openai_temperature: float = 0.1
    openai_max_output_tokens: int = 4000
    openai_embedding_model: str = "text-embedding-3-small"

    # Local Ollama fallback
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:0.6b"
    ollama_timeout_seconds: int = 120
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 700
    ollama_num_ctx: int = 2048

    # Qdrant / RAG
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "project_knowledge"
    rag_top_k: int = 5

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # Page inspection
    page_inspection_timeout_ms: int = 30000
    page_inspection_wait_until: str = "networkidle"
    page_inspection_max_text_items: int = 80
    page_inspection_max_elements: int = 80
    page_inspection_allow_private_urls: bool = True

    # Main LLM provider for automation script generation
    script_llm_provider: str = "openai"
    script_llm_fallback_provider: str | None = "ollama"

    script_prompt_version: str = "automation_script_generation_v1"
    script_openai_model: str = "gpt-4.1-mini"
    script_openai_temperature: float = 0.1
    script_openai_max_output_tokens: int = 6000

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
