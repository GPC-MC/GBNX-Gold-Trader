import logging
import os
from typing import Any, Dict, List, Optional, Sequence, Type, Union

from langchain.prompts import ChatPromptTemplate
from langchain_anthropic import ChatAnthropic
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.tools import BaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from openai import OpenAI

from src.app_config import app_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if app_config.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = app_config.OPENAI_API_KEY
if app_config.ANTHROPIC_API_KEY:
    os.environ["ANTHROPIC_API_KEY"] = app_config.ANTHROPIC_API_KEY
if app_config.GOOGLE_API_KEY:
    os.environ["GOOGLE_API_KEY"] = app_config.GEMINI_API_KEY


class FallbackLLM(Runnable):
    def __init__(
        self,
        openai_model: str = "gpt-4o-mini",
        claude_model: str = "claude-3-5-sonnet-20240620",
        gemini_model: str = "gemini-2.5-flash",
        temperature: float = 0.2,
        timeout: int = 30,
        enable_web_search: bool = False,
    ):
        self.openai_model = openai_model
        self.claude_model = claude_model
        self.gemini_model = gemini_model
        self.temperature = temperature
        self.timeout = timeout
        self.enable_web_search = enable_web_search
        self.chain = self._build_chain()
        self._bound_tools = None
        self._tool_choice = None
        self._client = OpenAI(api_key=app_config.OPENAI_API_KEY)
        self._openai_responses_client = OpenAI(api_key=app_config.OPENAI_API_KEY) if app_config.OPENAI_API_KEY else None

    def _openai_llm(self) -> Optional[ChatOpenAI]:
        if not app_config.OPENAI_API_KEY:
            logger.warning("OpenAI API key not found, skipping OpenAI LLM")
            return None
        try:
            return ChatOpenAI(
                model=self.openai_model,
                temperature=self.temperature,
                timeout=self.timeout,
            )
        except Exception as e:
            logger.error(f"Failed to create OpenAI LLM: {e}")
            return None

    def _claude_llm(self) -> Optional[ChatAnthropic]:
        """Create Claude LLM if API key is available."""
        if not app_config.ANTHROPIC_API_KEY:
            logger.warning("Anthropic API key not found, skipping Claude LLM")
            return None

        try:
            return ChatAnthropic(
                model=self.claude_model,
                temperature=self.temperature,
                timeout=self.timeout,
            )
        except Exception as e:
            logger.error(f"Failed to create Claude LLM: {e}")
            return None

    def _gemini_llm(self) -> Optional[ChatGoogleGenerativeAI]:
        """Create Gemini LLM if API key is available."""
        if not app_config.GOOGLE_API_KEY:
            logger.warning("Google API key not found, skipping Gemini LLM")
            return None

        try:
            return ChatGoogleGenerativeAI(
                model=self.gemini_model,
                temperature=self.temperature,
                timeout=self.timeout,
                google_api_key=app_config.GOOGLE_API_KEY,
            )
        except Exception as e:
            logger.error(f"Failed to create Gemini LLM: {e}")
            return None

    def _build_chain(self) -> Runnable:
        """Build the primary chain with fallbacks."""
        openai_llm = self._openai_llm()
        claude_llm = self._claude_llm()
        gemini_llm = self._gemini_llm()

        if not openai_llm and not claude_llm and not gemini_llm:
            raise ValueError(
                "No valid LLM configurations found. Please check your API keys."
            )

        # Store available LLMs for fallback logic
        self.available_llms = []
        if openai_llm:
            self.available_llms.append(("OpenAI", openai_llm))
        if gemini_llm:
            self.available_llms.append(("Gemini", gemini_llm))
        if claude_llm:
            self.available_llms.append(("Claude", claude_llm))
        return self.available_llms[0][1]

    def _use_web_search_with_openai(self, input_data: Any, reasoning_level: Optional[str] = None) -> Any:
        """
        Use OpenAI's Responses API with web search capability.
        
        Args:
            input_data: The input prompt/query
            reasoning_level: Optional reasoning level for models like GPT-5 ('low', 'medium', 'high')
        
        Returns:
            Response from OpenAI with web search results
        """
        if not self._openai_responses_client:
            raise ValueError("OpenAI client not available for web search")
        
        try:
            # Convert input to string if it's a message or other format
            if hasattr(input_data, 'content'):
                query = input_data.content
            elif isinstance(input_data, str):
                query = input_data
            elif isinstance(input_data, list) and len(input_data) > 0:
                # Handle list of messages
                query = input_data[-1].content if hasattr(input_data[-1], 'content') else str(input_data[-1])
            else:
                query = str(input_data)
            
            # Prepare the request parameters
            request_params = {
                "model": self.openai_model,
                "tools": [{"type": "web_search"}],
                "input": query,
            }
            
            # Add reasoning level if specified and model supports it
            if reasoning_level and self.openai_model in ["gpt-5", "o3-deep-research", "o4-mini-deep-research"]:
                request_params["reasoning_level"] = reasoning_level
            
            logger.info(f"Using OpenAI web search with query: {query[:100]}...")
            response = self._openai_responses_client.responses.create(**request_params)
            
            # Convert to AIMessage format for consistency
            return AIMessage(content=response.output_text)
            
        except Exception as e:
            logger.error(f"OpenAI web search failed: {e}")
            raise e

    def bind_tools(
        self,
        tools: Sequence[Union[Dict[str, Any], Type[BaseTool], BaseTool]],
        tool_choice: Optional[Union[dict, str, bool]] = None,
        **kwargs: Any,
    ) -> "FallbackLLM":
        """
        Bind tools to the LLM.

        Args:
            tools: List of tools to bind
            tool_choice: Tool choice strategy
            **kwargs: Additional arguments

        Returns:
            A new FallbackLLM instance with tools bound
        """
        # Create a new instance to maintain immutability
        new_instance = FallbackLLM(
            openai_model=self.openai_model,
            claude_model=self.claude_model,
            gemini_model=self.gemini_model,
            temperature=self.temperature,
            timeout=self.timeout,
            enable_web_search=self.enable_web_search,
        )

        # Bind tools to each available LLM
        new_instance.available_llms = []
        for provider_name, llm in self.available_llms:
            if hasattr(llm, "bind_tools"):
                bound_llm = llm.bind_tools(tools, tool_choice=tool_choice, **kwargs)
                new_instance.available_llms.append((provider_name, bound_llm))
            else:
                logger.warning(f"{provider_name} does not support tool binding")
                new_instance.available_llms.append((provider_name, llm))

        new_instance._bound_tools = tools
        new_instance._tool_choice = tool_choice

        return new_instance

    def with_web_search(self, enable: bool = True, reasoning_level: Optional[str] = None) -> "FallbackLLM":
        """
        Create a new instance with web search enabled/disabled.
        
        Args:
            enable: Whether to enable web search
            reasoning_level: Reasoning level for OpenAI models ('low', 'medium', 'high')
        
        Returns:
            A new FallbackLLM instance with web search configuration
        """
        new_instance = FallbackLLM(
            openai_model=self.openai_model,
            claude_model=self.claude_model,
            gemini_model=self.gemini_model,
            temperature=self.temperature,
            timeout=self.timeout,
            enable_web_search=enable,
        )
        
        new_instance._reasoning_level = reasoning_level
        new_instance._bound_tools = self._bound_tools
        new_instance._tool_choice = self._tool_choice
        
        return new_instance

    def invoke(self, input_data: Any, tools=None, use_web_search: Optional[bool] = None, reasoning_level: Optional[str] = None) -> AIMessage:
        """
        Invoke with automatic fallback and optional web search.
        
        Args:
            input_data: Input data for the model
            tools: Optional tools to use
            use_web_search: Override web search setting for this request
            reasoning_level: Reasoning level for web search ('low', 'medium', 'high')
        """
        # Determine if web search should be used for this request
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        # If web search is requested and OpenAI is available, try web search first
        if should_use_web_search and self._openai_responses_client:
            try:
                return self._use_web_search_with_openai(input_data, reasoning_level)
            except Exception as e:
                logger.warning(f"Web search failed, falling back to regular LLMs: {e}")
        
        # Regular fallback logic
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to use {provider_name}")
                result = llm.invoke(input_data, tools)
                logger.info(f"Successfully used {provider_name}")
                return result
            except Exception as e:
                logger.error(f"{provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed")
                    raise e
                continue

    async def ainvoke(self, input_data: Any, config=None, use_web_search: Optional[bool] = None, reasoning_level: Optional[str] = None) -> AIMessage:
        """
        Async invoke with automatic fallback and optional web search.
        
        Args:
            input_data: Input data for the model
            config: Configuration for the request
            use_web_search: Override web search setting for this request
            reasoning_level: Reasoning level for web search ('low', 'medium', 'high')
        """
        # Determine if web search should be used for this request
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        # Note: OpenAI Responses API doesn't have async support yet, so we'll fall back to regular LLMs
        if should_use_web_search:
            logger.warning("Async web search not supported yet, falling back to regular LLMs")
        
        # Regular async fallback logic
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to use {provider_name} (async)")
                result = await llm.ainvoke(input_data, config)
                logger.info(f"Successfully used {provider_name} (async)")
                return result
            except Exception as e:
                logger.error(f"{provider_name} failed (async): {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed (async)")
                    raise e
                continue

    def stream(self, input_data: Any, config=None, use_web_search: Optional[bool] = None):
        """Stream tokens with fallback. Note: Web search doesn't support streaming."""
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        if should_use_web_search:
            logger.warning("Web search doesn't support streaming, falling back to regular LLMs")
        
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to stream with {provider_name}")
                return llm.stream(input_data, config)
            except Exception as e:
                logger.error(f"Streaming with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for streaming")
                    raise e
                continue

    async def astream(self, input_data: Any, config=None, use_web_search: Optional[bool] = None):
        """Async stream tokens with fallback. Note: Web search doesn't support streaming."""
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        if should_use_web_search:
            logger.warning("Web search doesn't support streaming, falling back to regular LLMs")
        
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to async stream with {provider_name}")
                async for chunk in llm.astream(input_data, config):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"Async streaming with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for async streaming")
                    raise e
                continue

    def batch(self, inputs: List[Any], config=None, use_web_search: Optional[bool] = None) -> List[AIMessage]:
        """Batch invoke with fallback. Note: Web search doesn't support batch operations."""
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        if should_use_web_search:
            logger.warning("Web search doesn't support batch operations, falling back to regular LLMs")
        
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting batch with {provider_name}")
                return llm.batch(inputs, config)
            except Exception as e:
                logger.error(f"Batch with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for batch")
                    raise e
                continue

    async def abatch(self, inputs: List[Any], config=None, use_web_search: Optional[bool] = None) -> List[AIMessage]:
        """Async batch invoke with fallback. Note: Web search doesn't support batch operations."""
        should_use_web_search = use_web_search if use_web_search is not None else self.enable_web_search
        
        if should_use_web_search:
            logger.warning("Web search doesn't support batch operations, falling back to regular LLMs")
        
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting async batch with {provider_name}")
                return await llm.abatch(inputs, config)
            except Exception as e:
                logger.error(f"Async batch with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for async batch")
                    raise e
                continue

    @property
    def config_specs(self):
        """Return config specs from the primary LLM."""
        if self.available_llms:
            primary_llm = self.available_llms[0][1]
            return getattr(primary_llm, "config_specs", [])
        return []


class PrintStream(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        print(token, end="", flush=True)


# Example usage with web search
if __name__ == "__main__":
    from langchain_core.prompts import PromptTemplate
    
    # Create LLM with web search disabled by default
    llm = FallbackLLM(openai_model="gpt-4o-mini")
    
    # Original prompt template
    SOCIAL_CREATOR_PROMPT_RANDOM_TOPIC = PromptTemplate.from_template(
        """
    Topic:{topic} 
    Keyword:{keyword} 
    Draft idea:{draft_idea}

    Based on above information, please help me to generate a random and very specific details headline or topic that I can write for an article
    Prioritise on news topics which is hot and latest trend.
    Your answer is a single topic that is under 10 words.
    Your answer:
    """
    )
    
    # Example 1: Regular usage without web search
    regular_llm = SOCIAL_CREATOR_PROMPT_RANDOM_TOPIC | llm
    result = regular_llm.invoke(
        {"topic": "crypto", "keyword": "bitcoin", "draft_idea": "bitcoin price"}
    )
    print("Regular result:", result.content)
    # import pdb; pdb.set_trace()
    # Example 2: Enable web search for latest information
    web_search_llm = llm.with_web_search(enable=True)
    result_with_search = web_search_llm.invoke("what is the current price of bitcoin?")
    print("Web search result:", result_with_search.content)
    
    # Example 3: One-time web search usage
    # result_one_time = llm.invoke(
    #     "What happened in the stock market today?", 
    #     use_web_search=True, 
    #     reasoning_level="medium"
    # )
    # print("One-time web search result:", result_one_time.content)
    
    # Example 4: Deep research for complex topics (requires GPT-5 or o3/o4 models)
    # deep_research_llm = FallbackLLM(openai_model="o3-deep-research", enable_web_search=True)
    # deep_result = deep_research_llm.invoke(
    #     "Comprehensive analysis of recent developments in AI and their impact on the job market",
    #     reasoning_level="high"
    # )
    # print("Deep research result:", deep_result.content)