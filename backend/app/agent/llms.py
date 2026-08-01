from .schemas import *
from .prompts import database_prompt
from .tools.supabase_tools import supabase_tools

import os
from dotenv import load_dotenv
from langchain_mistralai import ChatMistralAI
from langchain_openrouter import ChatOpenRouter

from langchain.agents import create_agent

load_dotenv()

mistralai_llm = ChatMistralAI(
    model_name="mistral-large-latest",
    api_key=os.getenv("MISTRALAI_API_KEY"),
    temperature=0.7
)

ollama_llm = ChatOpenRouter(
    model="openrouter/free",
    temperature=0.3,
    api_key=os.getenv("OPENROUTER_API_KEY")
)

routing_llm = ollama_llm.with_structured_output(RoutingQuery)

grader_llm = ollama_llm.with_structured_output(GradeResult)

database_agent = create_agent(
    model=mistralai_llm,
    tools=supabase_tools,
    system_prompt=database_prompt
)