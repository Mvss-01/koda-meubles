import os
from dotenv import load_dotenv
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_pymupdf4llm import PyMuPDF4LLMLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from supabase.client import Client, create_client

load_dotenv()

def get_supabase_client() -> Client:
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", "")
    
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase credentials missing.")
        
    return create_client(supabase_url, supabase_key)

def ingest_pdf(file_path: str, table_name: str = "koda_knowledge"):
    supabase = get_supabase_client()
    embeddings = OllamaEmbeddings(model="qwen3-embedding:4b")

    # 1. Use PyMuPDF4LLM to convert PDF layout to structured Markdown
    loader = PyMuPDF4LLMLoader(file_path)
    docs = loader.load()

    # 2. Split by Markdown headers/sections first to preserve semantic blocks
    # (Extracts sections like "01. FICHE SIGNALÉTIQUE", "02. CATALOGUE")
    text_splitter = RecursiveCharacterTextSplitter.from_language(
        language="markdown",
        chunk_size=500,     # Reduced chunk size for high-precision retrieval
        chunk_overlap=50
    )
    chunks = text_splitter.split_documents(docs)

    # 3. Upsert to Supabase
    SupabaseVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        client=supabase,
        table_name=table_name,
        query_name="match_koda_documents",
        chunk_size=500
    )

if __name__ == "__main__":
    target_pdf = "koda_knowledge.pdf"
    
    if os.path.exists(target_pdf):
        ingest_pdf(target_pdf)
    else:
        print(f"Error: Could not find {target_pdf}")