

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from src.search_service.unified_search import UnifiedSearchService
from src.app_config import app_config


llm = ChatOpenAI(
    model="gpt-4o-mini",
    base_url=app_config.LITE_LLM_ENDPOINT_URL,
    api_key=app_config.LITE_LLM_API_KEY,
)


from pydantic import BaseModel

from pydantic_ai import Agent


class NewsSearchSummarize(BaseModel):
    reasoning: str
    sentiment: str
    summary: str
    url: str


from src.pydantic_agent.base import BaseAgent

class AISearchService:

    def __init__(self):
        self.service = UnifiedSearchService()
        self.agent = BaseAgent(
            llm=llm,
            model="gpt-4o-mini",
            base_url=app_config.LITE_LLM_ENDPOINT_URL,
            api_key=app_config.LITE_LLM_API_KEY,
        )

    def search():
        query = "latest news about US attacks Venezuela"
        query = "What is the weather in Tokyo?"

        print(f"Query: {query}\n")
        start_time = time.perf_counter()
        result = await service.search_and_summarize_all(
            query,
            max_results=30
        )
        end_time = time.perf_counter()