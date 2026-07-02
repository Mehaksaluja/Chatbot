import os
from pinecone import Pinecone, ServerlessSpec
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

_INDEX_NAME = "multimodal-rag"
_DIMENSION = 1536  # text-embedding-3-small

_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
_pc: Pinecone | None = None
_index = None
_store: PineconeVectorStore | None = None


def _get_pinecone_index():
    global _pc, _index
    if _index is not None:
        return _index

    _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    existing = [i.name for i in _pc.list_indexes()]
    if _INDEX_NAME not in existing:
        _pc.create_index(
            name=_INDEX_NAME,
            dimension=_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    _index = _pc.Index(_INDEX_NAME)
    return _index


def get_vectorstore() -> PineconeVectorStore:
    global _store
    if _store is None:
        index = _get_pinecone_index()
        _store = PineconeVectorStore(index=index, embedding=_embeddings, text_key="text")
    return _store


def upsert_chunks(chunks: list[dict], source_id: str, source_type: str) -> int:
    """Embed and store chunks tagged with source metadata."""
    store = get_vectorstore()
    texts = [c["text"] for c in chunks]
    metadatas = [
        {**{k: v for k, v in c.items() if k != "text"}, "source_id": source_id, "source_type": source_type}
        for c in chunks
    ]
    store.add_texts(texts=texts, metadatas=metadatas)
    return len(texts)


def similarity_search(query: str, source_ids: list[str], k: int = 6) -> list[dict]:
    """Search for relevant chunks, optionally filtered to specific sources."""
    store = get_vectorstore()
    filter_dict = {"source_id": {"$in": source_ids}} if source_ids else {}
    print(f"[vectorstore] searching — sources={source_ids}, filter={filter_dict}, k={k}")
    docs = store.similarity_search(query, k=k, filter=filter_dict)
    print(f"[vectorstore] retrieved {len(docs)} docs")
    for d in docs:
        print(f"  source_id={d.metadata.get('source_id')} source_type={d.metadata.get('source_type')} text[:80]={d.page_content[:80]!r}")
    return [{"text": doc.page_content, **doc.metadata} for doc in docs]
