from operator import add
from typing import TypedDict, Annotated, List

from langgraph.graph.message import add_messages
from langchain_core.documents import Document


class AgentState(TypedDict):
    question : str
    messages : Annotated[list, add_messages]
    documents : Annotated[List[Document], add]
    relevant_documents : List[Document]
    final_documents_for_generation : List[Document]
    web_search : str