import os
import tempfile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


def parse_pdf_bytes(file_bytes: bytes) -> list[dict]:
    """Parse raw PDF bytes and return page-referenced text chunks."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        docs = loader.load()
        chunks = _splitter.split_documents(docs)
        return [
            {
                "text": chunk.page_content,
                "page": chunk.metadata.get("page", 0) + 1,
            }
            for chunk in chunks
        ]
    finally:
        os.unlink(tmp_path)
