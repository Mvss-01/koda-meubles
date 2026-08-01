import os
from dotenv import load_dotenv
from supabase.client import Client, create_client
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

load_dotenv()

# Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL_KNOWLEDGE")
supabase_key = os.getenv("SUPABASE_ANON_KEY_KNOWLEDGE")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

embeddings = OpenAIEmbeddings(
    openai_api_base="https://openrouter.ai/api/v1",
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    model="qwen/qwen3-embedding-4b", # Ensure exact slug matches OpenRouter docs
    check_embedding_ctx_length=False  # Required for non-OpenAI endpoints
)

vectorstore = SupabaseVectorStore(
    client=supabase,
    embedding=embeddings,
    table_name="koda_knowledge",
    query_name="match_koda_documents",
)

retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 2}  
)