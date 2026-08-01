import os
import sys
from dotenv import load_dotenv
from supabase.client import Client, create_client
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

load_dotenv()

# -------------------------------------------------------------------
# STEP 1: Verify Environment Variables
# -------------------------------------------------------------------
print("=== Step 1: Checking Environment Variables ===")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
openrouter_key = os.getenv("OPENROUTER_API_KEY")

missing = []
if not supabase_url: missing.append("SUPABASE_URL")
if not supabase_key: missing.append("SUPABASE_ANON_KEY")
if not openrouter_key: missing.append("OPENROUTER_API_KEY")

if missing:
    print(f"❌ Missing required keys in .env: {', '.join(missing)}")
    sys.exit(1)

print("✅ All environment variables loaded successfully.\n")


# -------------------------------------------------------------------
# STEP 2: Test OpenRouter Embeddings Generation
# -------------------------------------------------------------------
print("=== Step 2: Testing OpenRouter Embedding Generation ===")
try:
    embeddings = OpenAIEmbeddings(
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=openrouter_key,
        model="qwen/qwen3-embedding-4b",
        check_embedding_ctx_length=False
    )
    
    test_query = "What is the Koda knowledge base?"
    test_vec = embeddings.embed_query(test_query)
    vector_dim = len(test_vec)
    
    print(f"✅ Embedding API works!")
    print(f"   Generated vector length: {vector_dim}")
    print(f"   ⚠️  Ensure your Supabase column and SQL RPC function use vector({vector_dim})\n")

except Exception as e:
    print(f"❌ Failed generating embedding from OpenRouter:\n   {e}\n")
    sys.exit(1)


# -------------------------------------------------------------------
# STEP 3: Initialize Supabase Client
# -------------------------------------------------------------------
print("=== Step 3: Connecting to Supabase ===")
try:
    supabase: Client = create_client(supabase_url, supabase_key)
    print("✅ Supabase client initialized.\n")
except Exception as e:
    print(f"❌ Failed to connect to Supabase:\n   {e}\n")
    sys.exit(1)


# -------------------------------------------------------------------
# STEP 4: Test Supabase Vector Store Search
# -------------------------------------------------------------------
print("=== Step 4: Testing Vector Store & RPC Function ===")
try:
    vectorstore = SupabaseVectorStore(
        client=supabase,
        embedding=embeddings,
        table_name="koda_knowledge",
        query_name="match_koda_documents",
    )

    # Test raw vector store search
    docs = vectorstore.similarity_search("test query", k=2)
    print(f"✅ Raw similarity search executed successfully!")
    print(f"   Documents retrieved: {len(docs)}")
    for i, doc in enumerate(docs, 1):
        preview = doc.page_content[:80].replace('\n', ' ')
        print(f"   [{i}] {preview}...")

except Exception as e:
    print(f"❌ Supabase Vector Store search failed:\n   {e}\n")
    print("💡 Common causes for failure in Step 4:")
    print(f"   1. RPC function 'match_koda_documents' doesn't exist in Supabase SQL Editor.")
    print(f"   2. RPC dimension mismatch (e.g. expected vector(1536) but got vector({vector_dim})).")
    print("   3. Row Level Security (RLS) policies on 'koda_knowledge' are blocking reading.\n")
    sys.exit(1)


# -------------------------------------------------------------------
# STEP 5: Test LangChain Retriever Wrapper
# -------------------------------------------------------------------
print("\n=== Step 5: Testing Retriever API ===")
try:
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 2}
    )
    
    # Invoking retriever using standard LangChain syntax
    results = retriever.invoke("What is the Koda knowledge base?")
    print(f"✅ Retriever invoked successfully!")
    print(f"   Returned {len(results)} document(s).")

except Exception as e:
    print(f"❌ Retriever invoke failed:\n   {e}")