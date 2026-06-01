from uuid import NAMESPACE_URL, uuid5

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import get_settings
from app.schemas.rag import RagDocumentChunk, RagSearchResult


class QdrantVectorStore:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = QdrantClient(url=self.settings.qdrant_url)
        self.collection = self.settings.qdrant_collection

    def ensure_collection(self, vector_size: int) -> None:
        existing = [c.name for c in self.client.get_collections().collections]

        if self.collection in existing:
            return

        self.client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )

    def _to_qdrant_point_id(self, chunk_id: str) -> str:
        """
        Qdrant point IDs must be an unsigned integer or a valid UUID.
        Your app chunk IDs can look like:
        work-item-4b15baa3-fcab-4766-a036-aff36c00d7a2

        uuid5 creates a stable valid UUID from that custom chunk ID.
        This prevents duplicate points when the same chunk is upserted again.
        """
        return str(uuid5(NAMESPACE_URL, chunk_id))

    def upsert_chunk(self, chunk: RagDocumentChunk, vector: list[float]) -> None:
        self.ensure_collection(vector_size=len(vector))

        qdrant_point_id = self._to_qdrant_point_id(chunk.id)

        self.client.upsert(
            collection_name=self.collection,
            points=[
                PointStruct(
                    id=qdrant_point_id,
                    vector=vector,
                    payload={
                        "chunkId": chunk.id,
                        "projectId": chunk.projectId,
                        "sourceType": chunk.sourceType,
                        "sourceId": chunk.sourceId,
                        "title": chunk.title,
                        "content": chunk.content,
                        "metadata": chunk.metadata,
                    },
                )
            ],
        )

    def search(
        self,
        project_id: str,
        query_vector: list[float],
        top_k: int,
    ) -> list[RagSearchResult]:
        response = self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            limit=top_k,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="projectId",
                        match=MatchValue(value=project_id),
                    )
                ]
            ),
            with_payload=True,
        )

        points = response.points

        return [
            RagSearchResult(
                id=point.payload.get("chunkId", str(point.id)),
                score=point.score,
                sourceType=point.payload.get("sourceType", "UNKNOWN"),
                sourceId=point.payload.get("sourceId"),
                title=point.payload.get("title"),
                content=point.payload.get("content", ""),
                metadata=point.payload.get("metadata", {}),
            )
            for point in points
        ]