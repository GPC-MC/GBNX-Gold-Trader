import logging
import os
from typing import Any, Dict, List, Optional, Sequence, Type, Union

from google import genai
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import AIMessage
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from openai import OpenAI
import logging
from typing import Any, Dict, List, Optional, Sequence, Type, Union
from copy import deepcopy

from google import genai
from google.genai import types
from langchain_core.messages import AIMessage, ToolCall
from langchain_core.tools import BaseTool
from pydantic import BaseModel



from src.app_config import app_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)






class GeminiClientWrapper:
    """
    Wrapper for Google GenAI client to provide LangChain-compatible interface.
    
    Supports tool/function binding for use with LangChain agents.
    """
    
    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        temperature: Optional[float] = None,
    ):
        self.model = model
        self.temperature = temperature
        gemini_api_key = api_key or app_config.GEMINI_API_KEY
        self.client = genai.Client(api_key=gemini_api_key) if gemini_api_key else genai.Client()
        
        # Tool binding state
        self._tools: Optional[List[types.Tool]] = None
        self._tool_choice: Optional[str] = None
        self._original_tools: Optional[List] = None  # Store original for cloning
        
        logger.info(f"Created Gemini client for model: {model}")
    
    def _convert_tool_to_gemini_format(self, tool: Union[Dict, Type[BaseModel], BaseTool]) -> types.FunctionDeclaration:
        """Convert a LangChain tool to Gemini FunctionDeclaration format."""
        if isinstance(tool, type) and issubclass(tool, BaseModel):
            # Pydantic model (schema-based tool)
            schema = tool.model_json_schema()
            return types.FunctionDeclaration(
                name=schema.get("title", tool.__name__),
                description=schema.get("description", ""),
                parameters=self._convert_schema_to_gemini(schema),
            )
        elif isinstance(tool, BaseTool):
            # LangChain BaseTool
            return types.FunctionDeclaration(
                name=tool.name,
                description=tool.description or "",
                parameters=self._convert_schema_to_gemini(tool.args_schema.model_json_schema() if tool.args_schema else {}),
            )
        elif isinstance(tool, dict):
            # OpenAI-style function dict
            func = tool.get("function", tool)
            return types.FunctionDeclaration(
                name=func.get("name", ""),
                description=func.get("description", ""),
                parameters=self._convert_schema_to_gemini(func.get("parameters", {})),
            )
        else:
            raise ValueError(f"Unsupported tool type: {type(tool)}")
    
    def _convert_schema_to_gemini(self, schema: Dict) -> Optional[types.Schema]:
        """Convert JSON Schema to Gemini Schema format."""
        if not schema:
            return None
        
        # Remove unsupported fields and convert
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        if not properties:
            return None
        
        gemini_properties = {}
        for name, prop in properties.items():
            gemini_properties[name] = types.Schema(
                type=self._map_json_type_to_gemini(prop.get("type", "string")),
                description=prop.get("description", ""),
                enum=prop.get("enum"),
            )
        
        return types.Schema(
            type="OBJECT",
            properties=gemini_properties,
            required=required,
        )
    
    def _map_json_type_to_gemini(self, json_type: str) -> str:
        """Map JSON Schema types to Gemini types."""
        type_map = {
            "string": "STRING",
            "number": "NUMBER",
            "integer": "INTEGER",
            "boolean": "BOOLEAN",
            "array": "ARRAY",
            "object": "OBJECT",
        }
        return type_map.get(json_type, "STRING")
    
    def bind_tools(
        self,
        tools: Sequence[Union[Dict[str, Any], Type[BaseModel], BaseTool]],
        tool_choice: Optional[Union[dict, str, bool]] = None,
        **kwargs: Any,
    ) -> "GeminiClientWrapper":
        """
        Bind tools to the model, returning a new instance.
        
        Args:
            tools: List of tools (LangChain BaseTool, Pydantic models, or dicts)
            tool_choice: Tool choice mode ("auto", "any", "none", or specific tool name)
        
        Returns:
            New GeminiClientWrapper instance with tools bound
        """
        # Create a new instance to maintain immutability
        new_instance = GeminiClientWrapper(
            model=self.model,
            api_key=None,  # Will use existing client
            temperature=self.temperature,
        )
        new_instance.client = self.client  # Share the client
        
        # Convert tools to Gemini format
        function_declarations = [self._convert_tool_to_gemini_format(t) for t in tools]
        new_instance._tools = [types.Tool(function_declarations=function_declarations)]
        new_instance._original_tools = list(tools)
        
        # Handle tool_choice
        if tool_choice:
            if isinstance(tool_choice, str):
                new_instance._tool_choice = tool_choice
            elif isinstance(tool_choice, dict) and "function" in tool_choice:
                new_instance._tool_choice = tool_choice["function"]["name"]
        
        logger.info(f"Bound {len(tools)} tools to Gemini client")
        return new_instance
    
    def _build_generation_config(self) -> Optional[types.GenerateContentConfig]:
        """Build generation config with tools if bound."""
        config_params = {}
        
        if self.temperature is not None:
            config_params["temperature"] = self.temperature
        
        if self._tools:
            config_params["tools"] = self._tools

            # Set tool config based on tool_choice
            if self._tool_choice in ["any", "required"]:
                # "required" is the OpenAI/LangChain equivalent of Gemini's "ANY"
                config_params["tool_config"] = types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="ANY")
                )
            elif self._tool_choice == "none":
                config_params["tool_config"] = types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="NONE")
                )
            elif self._tool_choice and self._tool_choice != "auto":
                # Specific function name
                config_params["tool_config"] = types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode="ANY",
                        allowed_function_names=[self._tool_choice]
                    )
                )
        
        return types.GenerateContentConfig(**config_params) if config_params else None
    
    def _convert_input_to_contents(self, input_data: Any) -> list:
        """Convert various input formats to Gemini contents format."""
        if hasattr(input_data, "content"):
            return [input_data.content]
        elif isinstance(input_data, str):
            return [input_data]
        elif isinstance(input_data, list):
            contents = []
            for item in input_data:
                if hasattr(item, "content"):
                    contents.append(item.content)
                else:
                    contents.append(str(item))
            return contents
        return [str(input_data)]
    
    def _parse_response(self, response) -> AIMessage:
        """Parse Gemini response into AIMessage with tool calls if present."""
        # Check for function calls
        tool_calls = []
        text_content = ""
        
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    fc = part.function_call
                    tool_calls.append(
                        ToolCall(
                            name=fc.name,
                            args=dict(fc.args) if fc.args else {},
                            id=f"call_{fc.name}_{len(tool_calls)}",
                        )
                    )
                elif hasattr(part, "text") and part.text:
                    text_content += part.text
        
        return AIMessage(
            content=text_content,
            tool_calls=tool_calls if tool_calls else [],
        )
    
    def invoke(self, input_data: Any, tools=None, **kwargs) -> AIMessage:
        """Invoke the model with optional tool calling."""
        contents = self._convert_input_to_contents(input_data)
        config = self._build_generation_config()
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )
        
        return self._parse_response(response)
    
    async def ainvoke(self, input_data: Any, config=None, **kwargs) -> AIMessage:
        """Async invoke (uses sync under the hood as genai lacks native async)."""
        return self.invoke(input_data, **kwargs)
    
    def stream(self, input_data: Any, config=None, **kwargs):
        """Stream tokens from the model."""
        contents = self._convert_input_to_contents(input_data)
        gen_config = self._build_generation_config()
        
        response = self.client.models.generate_content_stream(
            model=self.model,
            contents=contents,
            config=gen_config,
        )
        
        for chunk in response:
            # Handle streaming with potential tool calls
            if chunk.candidates:
                for part in chunk.candidates[0].content.parts:
                    if hasattr(part, "text") and part.text:
                        yield AIMessage(content=part.text)
                    elif hasattr(part, "function_call") and part.function_call:
                        fc = part.function_call
                        yield AIMessage(
                            content="",
                            tool_calls=[ToolCall(
                                name=fc.name,
                                args=dict(fc.args) if fc.args else {},
                                id=f"call_{fc.name}",
                            )]
                        )
    
    async def astream(self, input_data: Any, config=None, **kwargs):
        """Async stream (wraps sync stream)."""
        for chunk in self.stream(input_data, config, **kwargs):
            yield chunk
    
    def batch(self, inputs: List[Any], config=None, **kwargs) -> List[AIMessage]:
        """Batch invoke."""
        return [self.invoke(inp, **kwargs) for inp in inputs]
    
    async def abatch(self, inputs: List[Any], config=None, **kwargs) -> List[AIMessage]:
        """Async batch invoke."""
        return self.batch(inputs, config, **kwargs)


class FallbackLLM(Runnable):
    """
    LLM wrapper with fallback support using LiteLLM proxy.

    LiteLLM provides an OpenAI-compatible API that routes requests to various
    LLM providers (OpenAI, Anthropic, Google, etc.) based on the model name.
    This class maintains fallback logic across multiple providers.
    """
    def __init__(
        self,
        model: str = "gpt-4o-mini",
        openai_model: Optional[str] = "gpt-4o-mini",
        claude_model: str = "claude-3-5-sonnet-20240620",
        gemini_model: str = "gemini-2.5-flash",
        temperature: float = 0.2,
        timeout: int = 30,
        enable_web_search: bool = False,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        priority: str = "openai",
    ):
        """
        Initialize the LLM with LiteLLM proxy and fallback support.

        Args:
            model: Primary OpenAI model to use (default: gpt-5-nano)
            openai_model: Deprecated, use 'model' instead. Kept for backwards compatibility.
            claude_model: Claude model name for fallback
            gemini_model: Gemini model name for fallback
            temperature: Sampling temperature
            timeout: Request timeout in seconds
            enable_web_search: Whether to enable web search capability
            base_url: LiteLLM proxy base URL (default: from env or hardcoded)
            api_key: LiteLLM API key (default: from env or hardcoded)
            priority: Which LLM to try first ("openai", "gemini", or "claude")
        """
        # For backwards compatibility, prefer openai_model if provided
        self.openai_model = openai_model if openai_model else model
        self.claude_model = claude_model
        self.gemini_model = gemini_model
        self.temperature = temperature
        self.timeout = timeout
        self.enable_web_search = enable_web_search
        self.base_url = base_url or app_config.LITE_LLM_ENDPOINT_URL
        self.api_key = api_key or app_config.LITE_LLM_API_KEY
        self.priority = priority.lower()

        self._bound_tools = None
        self._tool_choice = None
        self._reasoning_level = None

        # Build the LLM chain with fallbacks
        self.chain = self._build_chain()

        # OpenAI client for web search (uses LiteLLM proxy)
        self._client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )
        self._openai_responses_client = self._client

    def _create_llm(self, model: str) -> Optional[ChatOpenAI]:
        """Create a ChatOpenAI instance pointing to LiteLLM proxy for the given model."""
        try:
            params = {
                "model": model,
                "timeout": self.timeout,
                "openai_api_key": self.api_key,
                "openai_api_base": self.base_url,
            }
            # GPT-5 and reasoning models don't support temperature
            if "gpt-5" not in model.lower() and "o1" not in model.lower():
                params["temperature"] = self.temperature

            llm = ChatOpenAI(**params)
            logger.info(f"Created LiteLLM client for model: {model}")
            return llm
        except Exception as e:
            logger.error(f"Failed to create LiteLLM client for {model}: {e}")
            return None

    def _openai_llm(self) -> Optional[ChatOpenAI]:
        """Create OpenAI LLM via LiteLLM proxy."""
        return self._create_llm(self.openai_model)

    def _claude_llm(self) -> Optional[ChatOpenAI]:
        """Create Claude LLM via LiteLLM proxy."""
        return self._create_llm(self.claude_model)

    def _gemini_llm(self) -> Optional[GeminiClientWrapper]:
        """Create Gemini LLM using direct genai.Client()."""
        try:
            return GeminiClientWrapper(model=self.gemini_model)
        except Exception as e:
            logger.error(f"Failed to create Gemini client for {self.gemini_model}: {e}")
            return None

    def _build_chain(self) -> Runnable:
        """Build the primary chain with fallbacks."""
        openai_llm = self._openai_llm()
        gemini_llm = self._gemini_llm()
        claude_llm = None

        if not openai_llm and not claude_llm and not gemini_llm:
            raise ValueError(
                "No valid LLM configurations found. Please check your LiteLLM proxy."
            )

        # Store available LLMs for fallback logic, ordered by priority
        llm_map = {
            "openai": ("OpenAI", openai_llm),
            "gemini": ("Gemini", gemini_llm),
            "claude": ("Claude", claude_llm),
        }

        self.available_llms = []

        # Add priority LLM first
        if self.priority in llm_map and llm_map[self.priority][1]:
            self.available_llms.append(llm_map[self.priority])

        # Add remaining LLMs as fallbacks
        for key, (name, llm) in llm_map.items():
            if key != self.priority and llm:
                self.available_llms.append((name, llm))

        logger.info(f"LLM priority order: {[name for name, _ in self.available_llms]}")
        return self.available_llms[0][1]

    def _use_web_search_with_openai(
        self, input_data: Any, reasoning_level: Optional[str] = None
    ) -> Any:
        """
        Use OpenAI's Responses API with web search capability via LiteLLM.

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
            if hasattr(input_data, "content"):
                query = input_data.content
            elif isinstance(input_data, str):
                query = input_data
            elif isinstance(input_data, list) and len(input_data) > 0:
                # Handle list of messages
                query = (
                    input_data[-1].content
                    if hasattr(input_data[-1], "content")
                    else str(input_data[-1])
                )
            else:
                query = str(input_data)

            # Prepare the request parameters
            request_params = {
                "model": self.openai_model,
                "tools": [{"type": "web_search"}],
                "input": query,
            }

            # Add reasoning level if specified and model supports it
            if reasoning_level and self.openai_model in [
                "gpt-5",
                "o3-deep-research",
                "o4-mini-deep-research",
            ]:
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
            base_url=self.base_url,
            api_key=self.api_key,
            priority=self.priority,
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

    def with_web_search(
        self, enable: bool = True, reasoning_level: Optional[str] = None
    ) -> "FallbackLLM":
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
            base_url=self.base_url,
            api_key=self.api_key,
            priority=self.priority,
        )

        new_instance._reasoning_level = reasoning_level
        new_instance._bound_tools = self._bound_tools
        new_instance._tool_choice = self._tool_choice

        return new_instance

    def enable_web_search(
        self, enable: bool = True, reasoning_level: Optional[str] = None
    ) -> "FallbackLLM":
        """
        Backwards-compatible API expected by callers.
        Delegates to with_web_search and returns a new instance.
        """
        return self.with_web_search(enable=enable, reasoning_level=reasoning_level)

    def invoke(
        self,
        input_data: Any,
        tools=None,
        use_web_search: Optional[bool] = None,
        reasoning_level: Optional[str] = None,
    ) -> AIMessage:
        """
        Invoke with automatic fallback and optional web search.

        Args:
            input_data: Input data for the model
            tools: Optional tools to use
            use_web_search: Override web search setting for this request
            reasoning_level: Reasoning level for web search ('low', 'medium', 'high')
        """
        # Determine if web search should be used for this request
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        # If web search is requested and OpenAI is available, try web search first
        if should_use_web_search and self._openai_responses_client:
            try:
                return self._use_web_search_with_openai(input_data, reasoning_level)
            except Exception as e:
                logger.warning(f"Web search failed, falling back to regular LLMs: {e}")

        # Regular fallback logic
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to use {provider_name} via LiteLLM")
                result = llm.invoke(input_data, tools)
                logger.info(f"Successfully used {provider_name}")
                return result
            except Exception as e:
                logger.error(f"{provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed")
                    raise e
                continue

    async def ainvoke(
        self,
        input_data: Any,
        config=None,
        use_web_search: Optional[bool] = None,
        reasoning_level: Optional[str] = None,
    ) -> AIMessage:
        """
        Async invoke with automatic fallback and optional web search.

        Args:
            input_data: Input data for the model
            config: Configuration for the request
            use_web_search: Override web search setting for this request
            reasoning_level: Reasoning level for web search ('low', 'medium', 'high')
        """
        # Determine if web search should be used for this request
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        # Note: OpenAI Responses API doesn't have async support yet, so we'll fall back to regular LLMs
        if should_use_web_search:
            logger.warning(
                "Async web search not supported yet, falling back to regular LLMs"
            )

        # Regular async fallback logic
        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to use {provider_name} via LiteLLM (async)")
                result = await llm.ainvoke(input_data, config)
                logger.info(f"Successfully used {provider_name} (async)")
                return result
            except Exception as e:
                logger.error(f"{provider_name} failed (async): {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed (async)")
                    raise e
                continue

    def stream(
        self, input_data: Any, config=None, use_web_search: Optional[bool] = None
    ):
        """Stream tokens with fallback. Note: Web search doesn't support streaming."""
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        if should_use_web_search:
            logger.warning(
                "Web search doesn't support streaming, falling back to regular LLMs"
            )

        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to stream with {provider_name} via LiteLLM")
                return llm.stream(input_data, config)
            except Exception as e:
                logger.error(f"Streaming with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for streaming")
                    raise e
                continue

    async def astream(
        self, input_data: Any, config=None, use_web_search: Optional[bool] = None
    ):
        """Async stream tokens with fallback. Note: Web search doesn't support streaming."""
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        if should_use_web_search:
            logger.warning(
                "Web search doesn't support streaming, falling back to regular LLMs"
            )

        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting to async stream with {provider_name} via LiteLLM")
                async for chunk in llm.astream(input_data, config):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"Async streaming with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for async streaming")
                    raise e
                continue

    def batch(
        self, inputs: List[Any], config=None, use_web_search: Optional[bool] = None
    ) -> List[AIMessage]:
        """Batch invoke with fallback. Note: Web search doesn't support batch operations."""
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        if should_use_web_search:
            logger.warning(
                "Web search doesn't support batch operations, falling back to regular LLMs"
            )

        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting batch with {provider_name} via LiteLLM")
                return llm.batch(inputs, config)
            except Exception as e:
                logger.error(f"Batch with {provider_name} failed: {e}")
                if llm == self.available_llms[-1][1]:  # Last LLM
                    logger.error("All LLM providers failed for batch")
                    raise e
                continue

    async def abatch(
        self, inputs: List[Any], config=None, use_web_search: Optional[bool] = None
    ) -> List[AIMessage]:
        """Async batch invoke with fallback. Note: Web search doesn't support batch operations."""
        should_use_web_search = (
            use_web_search if use_web_search is not None else self.enable_web_search
        )

        if should_use_web_search:
            logger.warning(
                "Web search doesn't support batch operations, falling back to regular LLMs"
            )

        for provider_name, llm in self.available_llms:
            try:
                logger.info(f"Attempting async batch with {provider_name} via LiteLLM")
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


if __name__ == "__main__":
    import asyncio

    def test_gemini():
        """Test GeminiClientWrapper directly."""
        print("=" * 50)
        print("Testing Gemini Client")
        print("=" * 50)
        try:
            gemini = GeminiClientWrapper(model="gemini-2.5-flash")
            response = gemini.invoke("Say hello in one sentence.")
            print(f"Gemini Response: {response.content}")
            print("✅ Gemini test passed!")
        except Exception as e:
            print(f"❌ Gemini test failed: {e}")

    def test_openai():
        """Test OpenAI via FallbackLLM."""
        print("\n" + "=" * 50)
        print("Testing OpenAI via FallbackLLM")
        print("=" * 50)
        try:
            llm = FallbackLLM(openai_model="gpt-4.1-mini", temperature=0.2)
            response = llm.invoke("Say hello in one sentence.")
            print(f"OpenAI Response: {response.content}")
            print("✅ OpenAI test passed!")
        except Exception as e:
            print(f"❌ OpenAI test failed: {e}")

    def test_fallback_llm():
        """Test FallbackLLM with default settings (uses Gemini first)."""
        print("\n" + "=" * 50)
        print("Testing FallbackLLM (default: Gemini -> OpenAI)")
        print("=" * 50)
        try:
            llm = FallbackLLM()
            print(f"Available LLMs: {[name for name, _ in llm.available_llms]}")
            response = llm.invoke("What is 2 + 2? Answer in one word.")
            print(f"Response: {response.content}")
            print("✅ FallbackLLM test passed!")
        except Exception as e:
            print(f"❌ FallbackLLM test failed: {e}")

    def test_streaming():
        """Test streaming with FallbackLLM."""
        print("\n" + "=" * 50)
        print("Testing Streaming")
        print("=" * 50)
        try:
            llm = FallbackLLM()
            print("Streaming response: ", end="")
            for chunk in llm.stream("Count from 1 to 5."):
                print(chunk.content, end="", flush=True)
            print("\n✅ Streaming test passed!")
        except Exception as e:
            print(f"\n❌ Streaming test failed: {e}")

    async def test_async():
        """Test async invoke."""
        print("\n" + "=" * 50)
        print("Testing Async Invoke")
        print("=" * 50)
        try:
            llm = FallbackLLM()
            response = await llm.ainvoke("Say 'async works' in one sentence.")
            print(f"Async Response: {response.content}")
            print("✅ Async test passed!")
        except Exception as e:
            print(f"❌ Async test failed: {e}")



    from langchain_core.tools import tool

    @tool
    def get_weather(location: str) -> str:
        """Get weather for a location."""
        return f"Weather in {location}: Sunny, 72°F"

    # Bind tools to Gemini
    llm = FallbackLLM(gemini_model="gemini-2.5-flash", openai_model="skip")
    llm_with_tools = llm.bind_tools([get_weather])
    response = llm_with_tools.invoke("What's the weather in Tokyo?")
    print(response.tool_calls)  # [ToolCall(name='get_weather', args={'location': 'Tokyo'}, ...)]
    # import pdb; pdb.set_trace()

    # def test_openai_web_search():
    #     """Test OpenAI with web search enabled."""
    #     print("\n" + "=" * 50)
    #     print("Testing OpenAI with Web Search")
    #     print("=" * 50)
    #     try:
    #         llm = FallbackLLM(
    #             openai_model="gpt-4.1-mini",
    #             enable_web_search=True,
    #             temperature=0.2
    #         )
    #         # Ask a question that benefits from web search (current events)
    #         response = llm.invoke(
    #             "What is the current price of Bitcoin today? Give a brief answer.",
    #             use_web_search=True
    #         )
    #         print(f"Web Search Response: {response.content}")
    #         print("✅ OpenAI web search test passed!")
    #     except Exception as e:
    #         print(f"❌ OpenAI web search test failed: {e}")

    # def test_openai_web_search_with_reasoning():
    #     """Test OpenAI with web search and reasoning level."""
    #     print("\n" + "=" * 50)
    #     print("Testing OpenAI Web Search with Reasoning Level")
    #     print("=" * 50)
    #     try:
    #         llm = FallbackLLM(
    #             openai_model="gpt-4.1-mini",
    #             enable_web_search=True,
    #             temperature=0.2
    #         )
    #         # Test with_web_search method
    #         llm_with_search = llm.with_web_search(enable=True, reasoning_level="medium")
    #         response = llm_with_search.invoke(
    #             "What are the latest news about AI today? Summarize briefly."
    #         )
    #         print(f"Web Search with Reasoning Response: {response.content}")
    #         print("✅ OpenAI web search with reasoning test passed!")
    #     except Exception as e:
    #         print(f"❌ OpenAI web search with reasoning test failed: {e}")

    # Run all tests
    print("\n🚀 Starting LLM Tests\n")
    
    test_gemini()
    test_openai()
    test_fallback_llm()
    test_streaming()
    asyncio.run(test_async())
    # test_openai_web_search()
    # test_openai_web_search_with_reasoning()
    
    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)







