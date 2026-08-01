import requests
import re
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langsmith import traceable

_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Upgrade-Insecure-Requests": "1"
}

MAX_RESULTS = 5
WORDS_PER_SOURCE = 800

def _clean_text(raw: str) -> str:
    text = re.sub(r'[ \t]+', ' ', raw)
    text = re.sub(r'\n+', '\n', text)
    text = "".join(ch for ch in text if ch.isprintable() or ch == '\n')
    return text.strip()

def _extract_page_content(html: str) -> str:
    soup = BeautifulSoup(html, 'html.parser')
    
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "iframe", "noscript", "svg", "dialog"]):
        tag.decompose()
        
    for unwanted in soup.find_all(class_=re.compile(r"(cookie|newsletter|popup|ad-banner|sponsor|modal)", re.I)):
        unwanted.decompose()

    content_root = (
        soup.find("article")
        or soup.find("main")
        or soup.find("div", {"role": "main"})
        or soup.find("div", class_=re.compile(r"(content|article|post|entry|guide)", re.I))
        or soup.body
        or soup
    )
    
    return _clean_text(content_root.get_text(separator='\n'))

def _fetch_single_source(index: int, result: dict, session: requests.Session) -> str:
    url     = result.get('link', '')
    title   = result.get('title', 'Untitled')
    snippet = result.get('snippet', '')
    header  = f"--- SOURCE {index}: {title} ---\nURL: {url}"

    try:
        response = session.get(url, headers=_REQUEST_HEADERS, timeout=15, allow_redirects=True)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type:
            return f"{header}\n[Non-HTML content: {content_type}]\nSnippet: {snippet}\n"

        text = _extract_page_content(response.text)
        
        words = text.split()
        truncated = " ".join(words[:WORDS_PER_SOURCE])
        
        if len(text.strip()) < 50: 
            return f"{header}\n(Page content blocked or empty. Snippet fallback)\n{snippet}\n"
            
        return f"{header}\n\n{text[:len(truncated)]}...\n"

    except Exception as e:
        fallback = f"(Snippet) {snippet}" if snippet else "(No content available)"
        return f"{header}\n[Fetch failed: {e}]\n{fallback}\n"

@traceable(name="DuckDuckGo Search", run_type="tool")   
def web_research_tool(query: str) -> str:
    """
    Searches the web using DuckDuckGo for the given query.
    Retrieves the top 5 results, fetches each page concurrently,
    extracts the main content, and returns them concatenated.
    """
    wrapper = DuckDuckGoSearchAPIWrapper(max_results=MAX_RESULTS)
    try:
        results = wrapper.results(query, max_results=MAX_RESULTS)
    except Exception as e:
        return f"Search failed: {e}"

    if not results:
        return "No results found for this query. Try rephrasing."

    final_output = [None] * len(results)
    
    with requests.Session() as session:
        adapter = requests.adapters.HTTPAdapter(pool_connections=MAX_RESULTS, pool_maxsize=MAX_RESULTS)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        with ThreadPoolExecutor(max_workers=min(len(results), MAX_RESULTS)) as pool:
            futures = {
                pool.submit(_fetch_single_source, i + 1, res, session): i
                for i, res in enumerate(results)
            }
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    final_output[idx] = future.result()
                except Exception as e:
                    final_output[idx] = f"--- SOURCE {idx + 1} ---\n[Unexpected error: {e}]\n"

    return "\n\n".join(filter(None, final_output))