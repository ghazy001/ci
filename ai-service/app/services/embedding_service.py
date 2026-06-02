from openai import OpenAI
from app.core.config import get_settings


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()

        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is missing")

        self.client = OpenAI(api_key=self.settings.openai_api_key)

    def embed_text(self, text: str) -> list[float]:
        clean_text = text.strip()

        if not clean_text:
            raise ValueError("Cannot embed empty text")

        response = self.client.embeddings.create(
            model=self.settings.openai_embedding_model,
            input=clean_text,
        )

        return response.data[0].embedding
