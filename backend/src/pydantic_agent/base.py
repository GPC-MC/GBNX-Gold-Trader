"""
Base class for Pydantic AI agents with configurable prompts, tools, and streaming support.

This module provides a flexible base class for creating Pydantic AI agents with:
- Configurable system prompts and models
- Dynamic tool registration
- Streaming and non-streaming execution
- Message history management
- Environment configuration support
"""

from typing import Any, Callable, TypeVar, Generic, Optional, AsyncIterator, Union
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelMessage
from dotenv import load_dotenv
import os
import logging
import asyncio
from src.mcp_client import mcp_client
import json
import hashlib


def _mcp_signature(config: Optional[dict]) -> Optional[str]:
    if not config:
        return None
    try:
        payload = json.dumps(config, sort_keys=True, ensure_ascii=False)
    except Exception:
        payload = str(config)
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()

# Type variables for generic typing
DepsT = TypeVar('DepsT')
OutputT = TypeVar('OutputT')


class StreamEvent(BaseModel):
    """Event emitted during streaming."""
    type: str
    content: Any
    metadata: Optional[dict] = None


class AgentConfig(BaseModel):
    """Configuration for a Pydantic AI agent."""
    model: str = "openai:gemini-2.5-flash"
    system_prompt: Optional[str] = None
    retries: int = 1
    output_type: Optional[type] = None
    load_env: bool = True
    litellm_base_url: Optional[str] = None
    litellm_api_key: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True


class BasePydanticAgent(Generic[DepsT, OutputT]):
    """
    Base class for Pydantic AI agents with configurable tools and prompts.

    This class provides a foundation for building AI agents with:
    - Flexible configuration
    - Tool management
    - Streaming support
    - Message history tracking

    Example:
        ```python
        class MyAgent(BasePydanticAgent[None, str]):
            def __init__(self):
                config = AgentConfig(
                    model="openai:gemini-2.5-flash",
                    system_prompt="You are a helpful assistant"
                )
                super().__init__(config)
                self.register_default_tools()

            def register_default_tools(self):
                @self.agent.tool
                def my_tool(ctx: RunContext[None], arg: str) -> str:
                    return f"Result: {arg}"
        ```
    """

    def __init__(
        self,
        config: Optional[AgentConfig] = None,
        deps_type: Optional[type] = None,
        tools: Optional[list[Callable]] = None,
    ):
        """
        Initialize the base agent.

        Args:
            config: Agent configuration (uses defaults if not provided)
            deps_type: Type hint for dependencies (e.g., database connection)
            tools: Optional list of tool functions to register automatically
        """
        self.config = config or AgentConfig()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.deps_type = deps_type
        self.init_tools = tools

        self.cache_agents = {}
        self.cache_agent_mcp_signature = {}

        # Load environment variables if requested
        if self.config.load_env:
            self._setup_environment()

        # Initialize the Pydantic AI agent
        self.agent = None

        # Store message history
        self._message_history: list[ModelMessage] = []

        # Tool registry for tracking
        self._tools: dict[str, Callable] = {}

        # Event queue for streaming tool calls and text
        self._event_queue: Optional[asyncio.Queue] = None

        # Auto-register tools if provided
        #if tools:
        #    for tool in tools:
        #        self.register_tool(tool)

    async def init_agent(self, user_id: str = None, mcp_servers: Optional[dict] = None):
        if not user_id:
            self.agent = self._create_agent(self.deps_type)
            self._tools: dict[str, Callable] = {}
            if self.init_tools:
                for tool in self.init_tools:
                    self.register_tool(tool)
        else:
            await self.switch_agent(user_id, mcp_servers)

    async def switch_agent(self, user_id: str, mcp_servers: Optional[dict] = None):
        desired_sig = _mcp_signature(mcp_servers)
        current_sig = self.cache_agent_mcp_signature.get(user_id)
        needs_rebuild = user_id not in self.cache_agents or (desired_sig is not None and desired_sig != current_sig)
        if needs_rebuild:
            mcp_tools = await self.get_mcp_tools(mcp_servers)
            self.agent = self._create_agent(self.deps_type)
            all_tools = self.init_tools + mcp_tools

            for tool in all_tools:
                self.register_tool(tool)

            self.cache_agents[user_id] = {
                "agent": self.agent,
                "tools": self._tools
            }
            self.cache_agent_mcp_signature[user_id] = desired_sig
            self.logger.info(f"Created and cached new React agent for user_id: {user_id}")
        else:
            self.agent = self.cache_agents[user_id]["agent"]
            self._tools = self.cache_agents[user_id]["tools"]

    def wrap_structured_tool(self, tool):
        async def _tool_wrapper(*args, **kwargs):
            if args and isinstance(args[0], dict):
                return await tool.arun(args[0])
            return await tool.arun(kwargs)

        _tool_wrapper.__name__ = tool.name
        _tool_wrapper.__doc__ = tool.description or ""
        return _tool_wrapper

    async def get_mcp_tools(self, mcp_servers: Optional[dict] = None):
        wrapped_tools = []
        if mcp_servers:
            servers = mcp_servers.get("mcpServers") if isinstance(mcp_servers, dict) else None
            server_count = len(servers) if isinstance(servers, dict) else (len(mcp_servers) if isinstance(mcp_servers, dict) else 0)
            mcp_client.configure(mcp_servers, tool_name_prefix=server_count > 1)
            mcp_tools = await mcp_client.get_tools()
            wrapped_tools = [self.wrap_structured_tool(tool) for tool in mcp_tools]
        return wrapped_tools

    def _setup_environment(self) -> None:
        """Setup environment variables for LiteLLM or other providers."""
        load_dotenv()

        # Use config values or fall back to environment variables
        lite_base_url = self.config.litellm_base_url or os.getenv("LITE_LLM_ENDPOINT_URL")
        lite_api_key = self.config.litellm_api_key or os.getenv("LITE_LLM_API_KEY")

        if lite_base_url:
            os.environ["OPENAI_BASE_URL"] = lite_base_url
            self.logger.info(f"Set OPENAI_BASE_URL to {lite_base_url}")

        if lite_api_key:
            os.environ["OPENAI_API_KEY"] = lite_api_key
            self.logger.info("Set OPENAI_API_KEY from config/env")

    def _create_agent(self, deps_type: Optional[type] = None) -> Agent:
        """
        Create the Pydantic AI agent with configuration.

        Args:
            deps_type: Optional type for dependencies

        Returns:
            Configured Pydantic AI Agent
        """
        agent_kwargs = {
            "model": self.config.model,
            "retries": self.config.retries,
        }

        if self.config.system_prompt:
            agent_kwargs["system_prompt"] = self.config.system_prompt

        if self.config.output_type:
            agent_kwargs["output_type"] = self.config.output_type

        if deps_type:
            agent_kwargs["deps_type"] = deps_type

        return Agent(**agent_kwargs)

    def _wrap_tool_with_events(self, func: Callable, tool_name: str) -> Callable:
        """
        Wrap a tool function to automatically emit events.

        Args:
            func: The tool function to wrap
            tool_name: Name of the tool

        Returns:
            Wrapped function that emits events
        """
        import inspect
        from functools import wraps

        # Check if function is already async
        is_async = inspect.iscoroutinefunction(func)

        if is_async:
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Emit tool call event
                await self._emit_tool_event("tool_call", {
                    "name": tool_name,
                    "args": kwargs if kwargs else {f"arg{i}": arg for i, arg in enumerate(args[1:])}  # Skip ctx
                })

                # Call original function
                result = await func(*args, **kwargs)

                # Emit tool result event
                await self._emit_tool_event("tool_result", {
                    "name": tool_name,
                    "result": str(result)
                })

                return result

            return async_wrapper
        else:
            # For sync functions, create async wrapper
            @wraps(func)
            async def sync_to_async_wrapper(*args, **kwargs):
                # Emit tool call event
                await self._emit_tool_event("tool_call", {
                    "name": tool_name,
                    "args": kwargs if kwargs else {f"arg{i}": arg for i, arg in enumerate(args[1:])}  # Skip ctx
                })

                # Call original function (sync)
                result = func(*args, **kwargs)

                # Emit tool result event
                await self._emit_tool_event("tool_result", {
                    "name": tool_name,
                    "result": str(result)
                })

                return result

            return sync_to_async_wrapper

    def register_tool(
        self,
        func: Optional[Callable] = None,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        auto_emit_events: bool = True,
    ) -> Callable:
        """
        Register a tool with the agent.

        Can be used as a decorator or called directly.

        Args:
            func: The tool function to register
            name: Optional custom name for the tool
            description: Optional description for the tool
            auto_emit_events: If True, automatically wrap tool to emit events

        Returns:
            The decorated function

        Example:
            ```python
            # As decorator
            @agent.register_tool
            def my_tool(ctx: RunContext, arg: str) -> str:
                return f"Result: {arg}"

            # Or directly
            agent.register_tool(my_tool, name="custom_name")

            # Or pass to constructor
            agent = MyAgent(tools=[my_tool])
            ```
        """
        def decorator(f: Callable) -> Callable:
            tool_name = name or f.__name__
            self._tools[tool_name] = f

            # Wrap with event emission if requested
            if auto_emit_events:
                wrapped_func = self._wrap_tool_with_events(f, tool_name)
            else:
                wrapped_func = f

            # Register with the Pydantic AI agent
            decorated = self.agent.tool(wrapped_func)

            self.logger.info(f"Registered tool: {tool_name}")
            return decorated

        if func is None:
            return decorator
        return decorator(func)

    async def run(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        **kwargs
    ) -> OutputT:
        """
        Run the agent with a prompt (non-streaming).

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            **kwargs: Additional arguments to pass to agent.run()

        Returns:
            The agent's output

        Example:
            ```python
            result = await agent.run("What's the weather?")
            print(result)
            ```
        """
        result = await self.agent.run(
            prompt,
            deps=deps,
            message_history=message_history or self._message_history,
            **kwargs
        )

        # Update message history
        self._message_history = result.all_messages()

        return result.output

    def run_sync(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        **kwargs
    ) -> OutputT:
        """
        Run the agent synchronously (non-streaming).

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            **kwargs: Additional arguments to pass to agent.run_sync()

        Returns:
            The agent's output

        Example:
            ```python
            result = agent.run_sync("What's the weather?")
            print(result)
            ```
        """
        result = self.agent.run_sync(
            prompt,
            deps=deps,
            message_history=message_history or self._message_history,
            **kwargs
        )

        # Update message history
        self._message_history = result.all_messages()

        return result.output

    async def stream(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        delta: bool = True,
        debounce_by: Optional[float] = None,
        **kwargs
    ) -> AsyncIterator[str]:
        """
        Stream the agent's response token by token.

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            delta: If True, stream individual tokens; if False, stream accumulated text
            debounce_by: Optional debounce time in seconds
            **kwargs: Additional arguments to pass to agent.run_stream()

        Yields:
            Text chunks (tokens if delta=True, accumulated text if delta=False)

        Example:
            ```python
            async for token in agent.stream("Tell me a story"):
                print(token, end="", flush=True)
            ```
        """
        async with self.agent.run_stream(
            prompt,
            deps=deps,
            message_history=message_history or self._message_history,
            **kwargs
        ) as result:
            async for chunk in result.stream_text(delta=delta, debounce_by=debounce_by):
                yield chunk

            # Update message history after streaming completes
            self._message_history = result.all_messages()

    async def stream_with_metadata(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        delta: bool = True,
        debounce_by: Optional[float] = None,
        **kwargs
    ) -> tuple[AsyncIterator[str], dict]:
        """
        Stream the agent's response and return metadata.

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            delta: If True, stream individual tokens; if False, stream accumulated text
            debounce_by: Optional debounce time in seconds
            **kwargs: Additional arguments to pass to agent.run_stream()

        Returns:
            Tuple of (text stream, metadata dict with usage and final output)

        Example:
            ```python
            stream, metadata = await agent.stream_with_metadata("Hello")
            async for token in stream:
                print(token, end="")
            print(f"\\nUsage: {metadata['usage']}")
            ```
        """
        metadata = {}

        async def _stream():
            async with self.agent.run_stream(
                prompt,
                deps=deps,
                message_history=message_history or self._message_history,
                **kwargs
            ) as result:
                async for chunk in result.stream_text(delta=delta, debounce_by=debounce_by):
                    yield chunk

                # Collect metadata
                metadata['output'] = await result.get_output()
                metadata['usage'] = result.usage()
                metadata['messages'] = result.all_messages()

                # Update message history
                self._message_history = result.all_messages()

        return _stream(), metadata

    async def stream_events(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        delta: bool = True,
        debounce_by: Optional[float] = None,
        **kwargs
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream events including text chunks and metadata.

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            delta: If True, stream individual tokens; if False, stream accumulated text
            debounce_by: Optional debounce time in seconds
            **kwargs: Additional arguments to pass to agent.run_stream()

        Yields:
            StreamEvent objects with type and content

        Example:
            ```python
            async for event in agent.stream_events("Hello"):
                if event.type == "text_delta":
                    print(event.content, end="")
                elif event.type == "done":
                    print(f"\\nFinal: {event.content}")
            ```
        """
        async with self.agent.run_stream(
            prompt,
            deps=deps,
            message_history=message_history or self._message_history,
            **kwargs
        ) as result:
            # Stream text chunks
            async for chunk in result.stream_text(delta=delta, debounce_by=debounce_by):
                yield StreamEvent(
                    type="text_delta" if delta else "text_full",
                    content=chunk
                )

            # Get final output
            final_output = await result.get_output()

            # Update message history
            self._message_history = result.all_messages()

            # Yield completion event
            yield StreamEvent(
                type="done",
                content=final_output,
                metadata={
                    "usage": result.usage(),
                    "message_count": len(self._message_history)
                }
            )

    async def stream_with_tool_calls(
        self,
        prompt: str,
        *,
        deps: Optional[DepsT] = None,
        message_history: Optional[list[ModelMessage]] = None,
        delta: bool = True,
        debounce_by: Optional[float] = None,
        **kwargs
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream events including tool calls and text chunks.

        This method captures tool executions and yields them as events
        along with the text response.

        Args:
            prompt: The user's prompt
            deps: Optional dependencies to pass to tools
            message_history: Optional message history for context
            delta: If True, stream individual tokens; if False, stream accumulated text
            debounce_by: Optional debounce time in seconds
            **kwargs: Additional arguments to pass to agent.run_stream()

        Yields:
            StreamEvent objects with types:
            - "tool_call": When a tool starts executing
            - "tool_result": When a tool returns a result
            - "text_delta": Individual text tokens (if delta=True)
            - "text_full": Accumulated text (if delta=False)
            - "done": Completion event with metadata

        Example:
            ```python
            async for event in agent.stream_with_tool_calls("Hello"):
                if event.type == "tool_call":
                    print(f"[TOOL] {event.content['name']}({event.content['args']})")
                elif event.type == "tool_result":
                    print(f"[RESULT] {event.content}")
                elif event.type == "text_delta":
                    print(event.content, end="")
            ```
        """
        # Create event queue
        self._event_queue = asyncio.Queue()

        async def run_agent():
            """Run the agent and stream results to the queue."""
            try:
                async with self.agent.run_stream(
                    prompt,
                    deps=deps,
                    message_history=message_history or self._message_history,
                    **kwargs
                ) as result:
                    # Stream text chunks
                    async for chunk in result.stream_text(delta=delta, debounce_by=debounce_by):
                        await self._event_queue.put(StreamEvent(
                            type="text_delta" if delta else "text_full",
                            content=chunk
                        ))

                    # Get final output
                    final_output = await result.get_output()

                    # Update message history
                    self._message_history = result.all_messages()

                    # Yield completion event
                    await self._event_queue.put(StreamEvent(
                        type="done",
                        content=final_output,
                        metadata={
                            "usage": result.usage(),
                            "message_count": len(self._message_history)
                        }
                    ))

                    # Signal completion
                    await self._event_queue.put(None)

            except Exception as e:
                # Put error event
                await self._event_queue.put(StreamEvent(
                    type="error",
                    content=str(e)
                ))
                await self._event_queue.put(None)

        # Start agent task
        agent_task = asyncio.create_task(run_agent())

        try:
            # Yield events as they arrive
            while True:
                event = await self._event_queue.get()
                if event is None:  # Sentinel value
                    break
                yield event

            # Ensure agent task completes
            await agent_task

        finally:
            # Clean up
            self._event_queue = None

    async def _emit_tool_event(self, event_type: str, content: Any) -> None:
        """
        Emit a tool event to the event queue.

        Args:
            event_type: Type of event ("tool_call" or "tool_result")
            content: Event content
        """
        if self._event_queue is not None:
            await self._event_queue.put(StreamEvent(
                type=event_type,
                content=content
            ))

    def get_message_history(self) -> list[ModelMessage]:
        """
        Get the current message history.

        Returns:
            List of messages in the conversation history
        """
        return self._message_history.copy()

    def set_message_history(self, messages: list[ModelMessage]) -> None:
        """
        Set the message history.

        Args:
            messages: List of messages to set as history
        """
        self._message_history = messages.copy()

    def clear_message_history(self) -> None:
        """Clear the message history."""
        self._message_history = []

    def get_registered_tools(self) -> dict[str, Callable]:
        """
        Get all registered tools.

        Returns:
            Dictionary mapping tool names to their functions
        """
        return self._tools.copy()

    def update_system_prompt(self, new_prompt: str) -> None:
        """
        Update the system prompt.

        Note: This recreates the agent, so tools need to be re-registered.

        Args:
            new_prompt: The new system prompt
        """
        self.config.system_prompt = new_prompt
        old_tools = self._tools.copy()
        self.agent = self._create_agent()
        self._tools = {}

        # Re-register tools
        for name, func in old_tools.items():
            self.register_tool(func, name=name)

        self.logger.info("Updated system prompt and recreated agent")

    def __repr__(self) -> str:
        """String representation of the agent."""
        return (
            f"{self.__class__.__name__}("
            f"model={self.config.model}, "
            f"tools={len(self._tools)}, "
            f"messages={len(self._message_history)})"
        )
