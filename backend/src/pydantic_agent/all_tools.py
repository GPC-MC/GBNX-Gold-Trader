from pydantic_ai import RunContext
from src.search_service.unified_search import UnifiedSearchService
from src.schemas.streaming_schema import ImageStyle
from dataclasses import dataclass
from typing import List, Optional, Generator
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os

load_dotenv()
from src.tools.image_analysis_tools import ImageAnalysisTools
from src.tools.s3_tools import UnifiedS3Tools
from src.tools.homepage_chat_tools import HomepageChatTools
from src.tools.design_tools import UnifiedDesignTools
from src.tools.document_handler import DocumentHandler
from src.tools.homepage_chat_history_tools import HomepageChatDBHandler
from src.tools.chunking_tools import ChunkingDBHandler
import re
from urllib.parse import unquote
from src.app_config import app_config
from langchain_huggingface import HuggingFaceEmbeddings
from src.debug_print import debug, info, success, warning, error, critical

embedding_model = HuggingFaceEmbeddings(
    model_name=app_config.EMBEDDING_MODEL,
    model_kwargs={"trust_remote_code": True}
)

llm = ChatOpenAI(
    model="gpt-4o-mini",
    base_url=app_config.LITE_LLM_ENDPOINT_URL,
    api_key=app_config.LITE_LLM_API_KEY,
)

qwen_llm = ChatOpenAI(
    model="qwen-max",
    base_url=app_config.LITE_LLM_ENDPOINT_URL,
    api_key=app_config.LITE_LLM_API_KEY,
)

s3_tools = UnifiedS3Tools()
document_handler = DocumentHandler(s3_tools=s3_tools)

unified_search = UnifiedSearchService()
chunking_handler = ChunkingDBHandler(
    connection_string=app_config.MONGODB_URI,
    username=app_config.MONGODB_USERNAME,
    password=app_config.MONGODB_PASSWORD,
    db_name="nexira_ai",
    collection_name="conversation_document_chunks",
    embedding_model=embedding_model,
    document_handler=document_handler
)
homepage_chat_handler = HomepageChatDBHandler(
    connection_string=app_config.MONGODB_URI,
    username=app_config.MONGODB_USERNAME,
    password=app_config.MONGODB_PASSWORD,
    db_name="nexira_ai",
    collection_name="homepage_chat_history",
    embedding_model=embedding_model
)
design_tools = UnifiedDesignTools(s3_tools)
image_analysis_tools = ImageAnalysisTools()
homepage_tools = HomepageChatTools(document_handler=document_handler)

homepage_chat_handler.connect_to_database()
chunking_handler.connect_to_database()
chunking_handler.create_indexes()

@dataclass
class AgentDeps:
    session_id: Optional[str]

"""
async def search_web(ctx: RunContext[None], query: str) -> str:
    result = await unified_search.search_and_summarize_all(
        query=query,
        max_results=10
    )
    return result
"""

async def planning(ctx: RunContext[None], question: str) -> str:
    prompt = f"""You are an expert planning assistant. Create a detailed, natural-language plan for answering the following question.
        User Question: {question}
        Available Tools:
        - general_knowledge: For answering general knowledge questions using existing knowledge (use this for most questions)
        - coding_assistance: For coding help, programming questions, debugging, code examples
        - search_web: ONLY for current events, real-time information, latest news, or when you have no knowledge about the topic
        - get_current_time: For date/time information
        - get_conversation_summary: For conversation context
        - generate_image: For image generation
        - qa_for_image: For image analysis
        - fetch_image_url: For image fetching
        - summarize_document: For document summarization
        - retrieve_documents: For document retrieval
        - write_content: For content writing
        IMPORTANT: Prefer general_knowledge or coding_assistance for most questions. Only use search_web when:
        - The question asks about current events, latest news, or real-time information
        - The question requires up-to-date facts from 2025 onwards
        - You have no knowledge about the specific topic
        Your Planning Task:
        Write a clear, professional paragraph (3-5 sentences) that explains:
        1. What information you need to gather
        2. Which tool(s) you will use and why
        3. How you will analyze the retrieved information
        4. How you will synthesize findings into a useful response
        Format your response as a natural planning paragraph, not a checklist.
        Example Plans:
        - For a coding question: "This is a programming question about Python list comprehensions. I will use the coding_assistance tool to provide a clear explanation with code examples and best practices."
        - For a general question: "This question about photosynthesis can be answered using existing knowledge. I will use the general_knowledge tool to provide a comprehensive explanation of the process."
        - For a current event: "This question asks about today's news. I will use the search_web tool to gather the latest information from reliable sources and synthesize the key developments."
        - For a content writing question: "This question asks to write a blog post about the topic of AI. I will use the write_content tool to write the blog post."
        Your Plan:"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    debug(f"Planning response: {response.content}")
    return response.content if hasattr(response, 'content') else str(response)



async def general_knowledge(ctx: RunContext[None], question: str) -> str:
    prompt = f"""You are an expert general knowledge assistant. Answer the following question based on the available knowledge.
        User Question: {question}
        Your Answer:"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    debug(f"General knowledge response: {response.content}")
    return response.content if hasattr(response, 'content') else str(response)



async def search_web(
    ctx: RunContext[AgentDeps],
    query: str,
    max_results: int = 10,
) -> str:
    """
    Search the web using unified search across Google, NewsAPI, and Tavily.
    """
    response = await unified_search.search_and_summarize_all(
        query=query,
        max_results=max_results,
    )
    return response

async def retrieve_documents(
    ctx: RunContext[AgentDeps],
    query: str,
    top_k: int = 5,
) -> str:
    """
    Retrieve relevant document chunks from uploaded documents in the conversation.

    IMPORTANT:
    - If the document contains images and it is relevant to the question, return the image links as they are in the documents without adding any additional headers or parameters.
    """
    if not ctx.deps.session_id:
        return "Error: No session context available for document retrieval"

    if not chunking_handler:
        return "Document retrieval not available"

    results = chunking_handler.get_similar_texts(
        query=query,
        conversation_id=ctx.deps.session_id,
        top_k=top_k,
    )

    return json.dumps(results, ensure_ascii=False) if isinstance(results, list) else str(results)

async def summarize_document(
    ctx: RunContext[AgentDeps],
    filename: str,
    language: str = "en",
) -> str:
    """
    Summarize a document that has been uploaded to the conversation.

    IMPORTANT:
    - If the document contains images and it is relevant to the question, return the image links as they are in the documents without adding any additional headers or parameters.
    """
    if not ctx.deps.session_id:
        return "No active conversation"

    s3_key = homepage_chat_handler.get_document_s3_key(
        ctx.deps.session_id, filename
    )

    if not s3_key:
        return f"Document '{filename}' not found in conversation"

    return await homepage_tools.summarize_document(
        filename=filename,
        language=language,
        s3_key=s3_key,
    )





def get_all_tools():
    return [
        search_web,
        planning,
        retrieve_documents,
        summarize_document,
        general_knowledge
    ]