from app.core.config import get_settings
from app.schemas.generation import GenerateTestCasesRequest
from app.schemas.rag import RagSearchResult
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantVectorStore


class RagService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.embeddings = EmbeddingService()
        self.vector_store = QdrantVectorStore()

    def build_query_from_work_item(self, request: GenerateTestCasesRequest) -> str:
        item = request.normalizedContent

        parts = [
            item.title,
            item.description or "",
            "\n".join(item.acceptanceCriteria),
            "\n".join(item.businessRules),
        ]

        return "\n\n".join(part for part in parts if part.strip())

    def retrieve_for_generation(
        self,
        request: GenerateTestCasesRequest,
    ) -> list[RagSearchResult]:
        query = self.build_query_from_work_item(request)

        if not query.strip():
            return []

        query_vector = self.embeddings.embed_text(query)

        return self.vector_store.search(
            project_id=request.tenantId,
            query_vector=query_vector,
            top_k=request.generationOptions.maxTestCases
            if request.generationOptions.maxTestCases < self.settings.rag_top_k
            else self.settings.rag_top_k,
        )
