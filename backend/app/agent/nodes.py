from .state import AgentState
from .llms import *
from .prompts import *
from .tools.vectorstore import retriever
from .tools.web_search import web_research_tool
from .tools.supabase_tools import supabase_tools

from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser

from .schemas import *

import os
from dotenv import load_dotenv
from langchain_mistralai import ChatMistralAI
from langchain_ollama import ChatOllama

def router_node(state: AgentState):
    return {}

def route_query(state: AgentState) -> str:
    query = state["question"]
    formated_prompt = router_prompt.format(query=query)
    response = routing_llm.invoke(formated_prompt)

    print(f"Router decided: {response.datasource}")
    if response.datasource == "vectorstore":
        return "semantic_search"
    elif response.datasource == "websearch":
        return "web_search"
    elif response.datasource == "chat":
        return "chat"
    elif response.datasource == "database":
        return "database"
    else:
        return "fallback"
        
def fallback(state: AgentState):
    return {"messages": [AIMessage(content="I'm sorry, I couldn't find relevant information for this request or that feature is currently disabled.")]}

def semantic_search(state : AgentState):
    query = state["question"]
    related_docs = retriever.invoke(query)
    return {"documents": related_docs}

grader_chain = grader_prompt | grader_llm

async def grade_documents_node(state: AgentState):
    question = state["question"]
    documents = state.get("documents", [])

    if not documents:
        return {"relevant_documents":[], "web_search":"yes"}

    inputs = [{"document":d, "question":question} for d in documents]
    scores = await grader_chain.abatch(inputs)

    relevant_documents = []
    irrelevant_count = 0

    for document, score in zip(documents, scores):
        if score.is_relevant:
            relevant_documents.append(document)
        else:
            irrelevant_count += 1

    web_search = "yes" if irrelevant_count > len(documents)/2 else "no"

    return {"relevant_documents": relevant_documents, "web_search": web_search}

from langchain_core.documents import Document

optimized_query_chain = web_search_query_optimizer_prompt | ollama_llm | StrOutputParser() 

def web_search(state):
    print("---FREE WEB SEARCH (DuckDuckGo)---")
    question = state["question"]

    optimized_query = optimized_query_chain.invoke({"question":question})

    search_results = web_research_tool(optimized_query)
    
    web_results_doc = Document(page_content=search_results)
    
    return {"relevant_documents": [web_results_doc]}


refine_chain = refine_prompt | ollama_llm | StrOutputParser()

# def knowledge_refinement(state):
#     print("---REFINING KNOWLEDGE---")
#     question = state["question"]
#     relevant_documents = state.get("relevant_documents", [])
    
#     raw_text = "\n\n".join(doc.page_content for doc in relevant_documents)
    
#     refined_text = refine_chain.invoke({"question": question, "documents": raw_text})
    
#     clean_doc = Document(page_content=refined_text)
    
#     return {"final_documents_for_generation": [clean_doc]}

def route_after_grading(state):
    print("---ROUTING AFTER GRADING---")
    web_search = state["web_search"]
    
    if web_search == "yes":
        print("---ROUTE: KNOWLEDGE GAP DETECTED -> WEB SEARCH---")
        return "web_search"
    else:
        print("---ROUTE: DOCUMENTS EXCELLENT -> GENERATION---")
        return "generator"

async def generator(state : AgentState):
    formated_messages = generation_prompt.invoke({
        "context": state.get("relevant_documents", []),
        "messages": state["messages"] 
    })
    response = await mistralai_llm.ainvoke(formated_messages)
    return {"messages": [response]}

from langchain_core.runnables.config import RunnableConfig

async def database_node(state: AgentState, config: RunnableConfig):
    # Simply use ainvoke so token streaming propagates up to graph.astream
    try:
        return await database_agent.ainvoke({"messages": state.get("messages", [])}, config=config)
    except Exception as e:
        print(f"Error executing database agent: {e}")
        return {"messages": [AIMessage(content="Failed to execute database query process.")]}
    
# hallucination_llm = ollama_llm.with_structured_output(HallucinationResult)

# def check_hallucination(state: AgentState):
#     docs = state.get("final_documents_for_generation", [])
#     latest_response = state["messages"][-1].content
#     attempts = state.get("generation_attempts", 0)

#     if not docs:
#         return "no_documents"

#     if attempts >= 3:
#         print(f"Hallucination Checker: Max retries ({attempts}) reached, accepting answer")
#         return "grounded"

#     doc_text = "\n\n".join([d.page_content for d in docs])
#     prompt = f"Is this answer grounded strictly in the provided documents? \n\nDocuments: {doc_text}\n\nAnswer: {latest_response}"
#     response = hallucination_llm.invoke(prompt)

#     print(f"Hallucination Checker: {'Grounded' if response.is_grounded else 'Hallucinated'} (attempt {attempts})")
#     if response.is_grounded:
#         return "grounded"
#     else:
#         return "hallucination"

def chat(state : AgentState):
    messages = [
        ("system", "You are a friendly furniture company assistant. Respond helpfully and conversationally to the user's message."),
    ] + state["messages"]
    response = ollama_llm.invoke(messages)
    return {"messages": [response]}

