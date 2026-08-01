import os
from dotenv import load_dotenv

from .state import AgentState
from .nodes import router_node, route_query, fallback, semantic_search, grade_documents_node, web_search,  route_after_grading, generator, chat, database_node

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT")

workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("semantic_search", semantic_search)
workflow.add_node("grade_documents", grade_documents_node)
workflow.add_node("web_search", web_search)
# workflow.add_node("knowledge_refinement", knowledge_refinement)
workflow.add_node("generator", generator)
workflow.add_node("fallback", fallback)
workflow.add_node("database", database_node)

workflow.add_edge(START, "router")

# workflow.add_conditional_edges(
#     "guardrail", 
#     check_safety,
#     {
#         "safe": "router",
#         "unsafe": "refusal"
#     }
# )

workflow.add_conditional_edges(
    "router", 
    route_query,
    {
        "semantic_search": "semantic_search",
        "web_search": "web_search",
        "database": "database",
        "fallback": "fallback"
    }
)

workflow.add_edge("semantic_search", "grade_documents")

workflow.add_conditional_edges(
    "grade_documents", 
    route_after_grading,
    {
        "generator": "generator",
        "web_search": "web_search"
    }
)

# workflow.add_edge("knowledge_refinement", "generator")

# workflow.add_conditional_edges(
#     "generator", 
#     check_hallucination,
#     {
#         "grounded": END,
#         "hallucination": "generator",
#         "no_documents": "fallback"
#     }
# )

workflow.add_edge("web_search", "generator")
workflow.add_edge("generator", END)
workflow.add_edge("fallback", END)
workflow.add_edge("database", END)

memory = MemorySaver()
graph = workflow.compile(checkpointer=memory)