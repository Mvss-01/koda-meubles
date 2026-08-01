import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from supabase import create_client, Client

from langchain_core.tools import tool, StructuredTool

from app.api.tool_state import pending_popups
import threading

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@tool(description="Return all the available products")
def get_all_products(fetch_all_pages: bool = True):
    """
    Fetches products from the public.products table and cleans/formats the output.
    
    :param fetch_all_pages: If True, handles Supabase's default 1,000 row page limit 
                            by paginating until all products are retrieved.
    :return: List of formatted product dictionaries.
    """
    try:
        raw_products = []
        
        if not fetch_all_pages:
            # Simple query
            response = supabase.table("products").select("*").execute()
            raw_products = response.data or []
        else:
            # Paginated fetch
            page_size = 1000
            start = 0

            while True:
                end = start + page_size - 1
                response = (
                    supabase.table("products")
                    .select("*")
                    .range(start, end)
                    .execute()
                )
                
                data = response.data
                if not data:
                    break
                    
                raw_products.extend(data)
                
                if len(data) < page_size:
                    break
                    
                start += page_size

        # Format and filter the fields
        formatted_products = []
        for product in raw_products:
            formatted_products.append({
                "name": product.get("name"),
                "price": f"{product.get('price')} DZD",
                "width_cm": product.get("width_cm"),
                "height_cm": product.get("height_cm"),
                "weight_kg": product.get("weight_kg"),
                "stock": product.get("stock"),
                "rating": product.get("rating"),
                "rating_count": product.get("rating_count"),
                "description": product.get("description"),
            })

        return formatted_products

    except Exception as e:
        print(f"Error fetching products: {e}")
        return []

class SearchSchema(BaseModel):
    query: Optional[str] = Field(
        default=None,
        description="Search term matching product name or description (case-insensitive).",
    )
    category_id : Optional[int] = Field(
        default=None,
        description="id of the category of the product"
    )
    subcategory_id : Optional[int] = Field(
        default=None,
        description="id of the subcategory of the product"
    )
    min_price: Optional[float] = Field(
        default=None,
        description="Filter products with price greater than or equal to this value.",
    )
    max_price: Optional[float] = Field(
        default=None,
        description="Filter products with price less than or equal to this value.",
    )
    min_rating: Optional[float] = Field(
        default=None,
        description="Filter products with rating greater than or equal to this value.",
    )
    in_stock_only: bool = Field(
        default=False, description="If True, only returns products where stock > 0."
    )

def search_products(
    query: Optional[str] = None,
    category_id : Optional[int] = None,
    subcategory_id : Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock_only: bool = False
) -> List[Dict[str, Any]]:
    try:
        db_query = supabase.table("products").select("*")

        if category_id is not None:
            db_query = db_query.eq("category_id", category_id)

        if subcategory_id is not None:
            db_query = db_query.eq("subcategory_id", subcategory_id)    

        if min_price is not None:
            db_query = db_query.gte("price", min_price)

        if max_price is not None:
            db_query = db_query.lte("price", max_price)

        if min_rating is not None:
            db_query = db_query.gte("rating", min_rating)

        if in_stock_only:
            db_query = db_query.gt("stock", 0)

        if query:
            db_query = db_query.or_(f"name.ilike.%{query}%,description.ilike.%{query}%")

        response = db_query.limit(50).execute()
        raw_products = response.data or []

        return [
            {
                "name": p.get("name"),
                "price": f"{p.get('price')} DZD" if p.get("price") is not None else None,
                "width_cm": p.get("width_cm"),
                "height_cm": p.get("height_cm"),
                "weight_kg": p.get("weight_kg"),
                "stock": p.get("stock"),
                "rating": p.get("rating"),
                "rating_count": p.get("rating_count"),
                "description": p.get("description"),
            }
            for p in raw_products
        ]

    except Exception as e:
        print(f"Error searching products: {e}")
        return []

search_products_tool = StructuredTool.from_function(
    name="search_products",
    func=search_products,
    args_schema=SearchSchema,
    description="Filter products"
)

from langchain_core.runnables.config import RunnableConfig

@tool(description="Get all current user's orders with their products")
def get_user_orders_with_products(config: RunnableConfig) -> list | str:
    try:
        user_id = config.get("configurable", {}).get("user_id")
        print(f"Fetching orders for user_id: {user_id}")
        
        if not user_id:
            print("No user ID found in config")
            return "No user ID was provided in the context configuration."

        query = """
            id,
            status,
            total_amount,
            adress,
            phone_number,
            wilaya,
            full_name,
            order_items (
                id,
                quantity,
                unit_price,
                products (
                    id,
                    category_id,
                    name,
                    width_cm,
                    height_cm,
                    weight_kg,
                    description
                )
            )
        """

        response = (
            supabase.table("orders")
            .select(query)
            .eq("user_id", user_id)
            .execute()
        )

        print(f"Fetched data: {response.data}")
        
        if not response.data:
            return "You don't have any orders."

        return response.data

    except Exception as e:
        print("Error fetching orders:", e)
        return "There was an error fetching user orders."


@tool(description="Delete all current user's orders. This tool pauses execution to prompt the user for confirmation on the frontend.")
def delete_all_user_orders(config: RunnableConfig) -> str:
    try:
        user_id = config.get("configurable", {}).get("user_id")
        thread_id = config.get("configurable", {}).get("thread_id")
        
        if not user_id or not thread_id:
            return "Missing user ID or thread ID in context."

        print(f"Requesting frontend confirmation to delete orders for user_id: {user_id}")
        
        event = threading.Event()
        pending_popups[thread_id] = {"type": "confirm_delete", "event": event, "result": None}
        
        # Block until the frontend sends a response or timeout
        event.wait(timeout=120)
        
        result = pending_popups.get(thread_id, {}).get("result")
        if thread_id in pending_popups:
            del pending_popups[thread_id]
            
        if result == "confirm":
            response = (
                supabase.table("orders")
                .delete()
                .eq("user_id", user_id)
                .execute()
            )
            print(f"Deleted orders: {response.data}")
            return "success"
        else:
            print("Order deletion canceled by user.")
            return "order deletiion canceled"

    except Exception as e:
        print("Error deleting orders:", e)
        return "There was an error deleting user orders."


supabase_tools = [get_all_products, search_products_tool, get_user_orders_with_products, delete_all_user_orders]


