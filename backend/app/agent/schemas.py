from typing import Literal
from pydantic import BaseModel, Field

class RoutingQuery(BaseModel):
    datasource : Literal["vectorstore", "websearch", "database"] = Field(
        ...,
        description="Which data source is relevant to asnwer the user query?"
    )

class GradeResult(BaseModel):
    is_relevant : bool = Field(description="Are the documents relevant to the query?")

class HallucinationResult(BaseModel):
    is_grounded : bool = Field(description="Is the generated answer grounded in the provided documents?")