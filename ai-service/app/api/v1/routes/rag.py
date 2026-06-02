from fastapi import APIRouter
from app.schemas.rag import RagDocumentChunk, RagSearchRequest, RagSearchResult
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantVectorStore

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/chunks")
def index_chunk(chunk: RagDocumentChunk):
    embeddings = EmbeddingService()
    vector_store = QdrantVectorStore()

    vector = embeddings.embed_text(chunk.content)
    vector_store.upsert_chunk(chunk, vector)

    return {
        "status": "indexed",
        "chunkId": chunk.id,
        "projectId": chunk.projectId,
        "sourceType": chunk.sourceType,
    }


@router.post("/search", response_model=list[RagSearchResult])
def search_chunks(payload: RagSearchRequest):
    embeddings = EmbeddingService()
    vector_store = QdrantVectorStore()

    vector = embeddings.embed_text(payload.query)

    return vector_store.search(
        project_id=payload.projectId,
        query_vector=vector,
        top_k=payload.topK,
    )
