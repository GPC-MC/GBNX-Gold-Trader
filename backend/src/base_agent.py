from langchain.agents import create_agent
from langchain_core.tools import BaseTool, StructuredTool
from langgraph.prebuilt import create_react_agent as _create_react_agent
from typing import Generator, List, Dict, Any, Optional, Callable, Sequence, Union
import queue
import threading
from dataclasses import dataclass, field
import inspect

from rich.console import Console
from rich.panel import Panel
# Progress bar removed - was causing newlines during streaming
from rich.live import Live
from rich.table import Table

console = Console()


def create_langgraph_react_agent(
    llm: Any,
    tools: Sequence[Union[Callable, BaseTool]],
    prompt: str,
):
    """
    Create a LangGraph ReAct agent, wrapping plain callables into `StructuredTool`.

    Example (function-calling tool):
        from langchain_core.tools import StructuredTool

        generate_web_tool = StructuredTool.from_function(
            func=web_gen.generate_web,
            name="generate_web",
            description="Generate a complete HTML web page about a topic.",
            args_schema=GenerateWebInput,
        )
    """
    wrapped_tools: List[BaseTool] = []
    for tool in tools:
        if isinstance(tool, BaseTool):
            wrapped_tools.append(tool)
            continue

        tool_name = getattr(tool, "__name__", tool.__class__.__name__)
        tool_desc = (getattr(tool, "__doc__", None) or "").strip() or f"Tool: {tool_name}"
        wrapped_tools.append(
            StructuredTool.from_function(func=tool, name=tool_name, description=tool_desc)
        )

    return _create_react_agent(llm, tools=wrapped_tools, prompt=prompt)

@dataclass
class ToolProgress:
    message: str
    progress: float
    step: str
    data: dict = field(default_factory=dict)


class StreamingReactAgent:
    def __init__(
        self,
        model: Any,
        tools: List[Callable],
        system_prompt: str = "",
        agent_name: str = "StreamingReactAgent",
        max_history: Optional[int] = None,
    ):
        self.model = model
        self.original_tools = tools
        self.system_prompt = system_prompt
        self.agent_name = agent_name
        self.max_history = max_history
        self._progress_queue = queue.Queue()
        self._string_progress_queue = queue.Queue()  # For string progress messages
        self._wrapped_tools = self._wrap_tools(tools)
        
        self.agent = create_agent(
            self.model,
            tools=self._wrapped_tools,
            system_prompt=self.system_prompt
        )
        self.chat_history: List[Dict[str, str]] = []
        console.print(Panel(f"[bold green]{agent_name}[/] initialized with [cyan]{len(tools)}[/] tools", title="Agent Ready"))
    
    def _is_generator_function(self, func: Callable) -> bool:
        return inspect.isgeneratorfunction(func)
    
    def _wrap_tools(self, tools: List[Callable]) -> List[StructuredTool]:
        wrapped = []
        for tool in tools:
            if isinstance(tool, StructuredTool):
                original_func, tool_name = tool.func, tool.name
                tool_desc, tool_schema = tool.description, tool.args_schema
            else:
                original_func = tool
                tool_name = getattr(tool, '__name__', 'unknown')
                tool_desc, tool_schema = getattr(tool, '__doc__', ''), None
            
            if self._is_generator_function(original_func):
                console.print(f"[dim]🔄 Wrapping generator tool:[/] [yellow]{tool_name}[/]")
                wrapped.append(self._create_generator_wrapper(original_func, tool_name, tool_desc, tool_schema))
            else:
                if isinstance(tool, StructuredTool):
                    wrapped.append(tool)
                else:
                    wrapped.append(StructuredTool.from_function(func=original_func, name=tool_name, description=tool_desc))
        return wrapped
    
    def _create_generator_wrapper(self, gen_func: Callable, name: str, desc: str, schema: Any = None) -> StructuredTool:
        string_progress_queue = self._string_progress_queue
        
        def wrapped_func(**kwargs) -> str:
            final_result = None
            console.print(f"\n[bold blue]🚀 Starting {name}[/]", style="bold")
            console.print(f"[dim]Args: {kwargs}[/]")
            
            try:
                for item in gen_func(**kwargs):
                    if isinstance(item, str):
                        # Put string progress messages into queue for streaming to user
                        string_progress_queue.put(item)
                        console.print(f"[cyan]{item}[/]")
                        # Keep track of the last item as the final result (URL)
                        final_result = item
                    elif isinstance(item, ToolProgress):
                        # ToolProgress is for internal progress tracking
                        string_progress_queue.put(item.message)
                        console.print(f"[cyan]{item.message}[/]")
            except Exception as e:
                console.print(f"[bold red]❌ {name} failed: {e}[/]")
                return f"Error in {name}: {str(e)}"
            
            console.print(f"[bold green]✅ {name} completed[/]")
            return f"✅ TASK COMPLETE - {final_result}\n\nDo not call any more tools. Respond to the user with this result."
        
        return StructuredTool.from_function(func=wrapped_func, name=name, description=desc, args_schema=schema)
    
    def _build_messages(self, user_message: str) -> List[Dict[str, str]]:
        msgs = [{"role": m["role"], "content": m["content"]} for m in self.chat_history]
        msgs.append({"role": "user", "content": user_message})
        return msgs
    
    def _update_history(self, user_message: str, assistant_response: str):
        self.chat_history.append({"role": "user", "content": user_message})
        self.chat_history.append({"role": "assistant", "content": assistant_response})
        if self.max_history and len(self.chat_history) > self.max_history * 2:
            self.chat_history = self.chat_history[-(self.max_history * 2):]
    
    def stream(self, user_message: str) -> Generator[str, None, None]:
        """Stream only final response tokens to user. Logs intermediate steps to console."""
        messages = self._build_messages(user_message)
        console.print(Panel(f"[white]{user_message}[/]", title="[bold cyan]📨 User Input[/]", border_style="cyan"))
        
        while not self._progress_queue.empty():
            try: self._progress_queue.get_nowait()
            except queue.Empty: break
        
        while not self._string_progress_queue.empty():
            try: self._string_progress_queue.get_nowait()
            except queue.Empty: break
        
        full_response = ""
        seen_tool_calls = seen_tool_results = streaming_final = False
        current_tool = {}
        result_queue = queue.Queue()
        printed_result_prefix = False
        previous_node = None
        
        def run_agent():
            try:
                for token, meta in self.agent.stream({"messages": messages}, stream_mode="messages"):
                    result_queue.put(("token", token, meta))
                result_queue.put(("done", None, None))
            except Exception as e:
                result_queue.put(("error", str(e), None))
        
        agent_thread = threading.Thread(target=run_agent, daemon=True)
        agent_thread.start()
        
        while True:
            # Yield string progress messages to user (from generator tools)
            try:
                while True:
                    progress_msg = self._string_progress_queue.get_nowait()
                    if isinstance(progress_msg, str):
                        yield progress_msg + "\n"
                        full_response += progress_msg + "\n"
            except queue.Empty:
                pass
            
            # Log tool progress to console (not yielded)
            try:
                while True:
                    p = self._progress_queue.get_nowait()
                    if isinstance(p, ToolProgress):
                        console.print(f"[cyan]⏳ {p.message} ({int(p.progress * 100)}%)[/]")
            except queue.Empty:
                pass
            
            try:
                msg_type, token, meta = result_queue.get(timeout=0.1)
                
                if msg_type == "done":
                    break
                elif msg_type == "error":
                    console.print(f"[bold red]❌ Error: {token}[/]")
                    break
                elif msg_type == "token":
                    node = meta.get('langgraph_node', '')

                    # If we're transitioning away from 'tools' node, add a newline
                    if previous_node == 'tools' and node != 'tools':
                        console.print()  # Add newline after tool result
                    previous_node = node

                    if node == 'model':
                        for block in token.content_blocks:
                            if block['type'] == 'tool_call_chunk':
                                seen_tool_calls = True
                                if block.get('name'):
                                    current_tool['name'] = block['name']
                            elif block['type'] == 'tool_call':
                                console.print(f"\n[bold yellow]🔧 Tool Call:[/] [green]{block['name']}[/]")
                                if block.get('args'):
                                    console.print(f"[dim]   Args: {block['args']}[/]")
                                # Reset the result prefix flag for the new tool call
                                printed_result_prefix = False
                    
                    if node == 'tools':
                        seen_tool_results = True
                        # Only print the "Result: " prefix once per tool call
                        if not printed_result_prefix:
                            console.print(f"[dim]   Result: [/]", end="")
                            printed_result_prefix = True

                        for block in token.content_blocks:
                            if block['type'] == 'text':
                                preview = block['text'][:150] + "..." if len(block['text']) > 150 else block['text']
                                console.print(f"[dim]{preview}[/]", end="")
                        continue
                    
                    if seen_tool_calls and seen_tool_results and node == 'model':
                        streaming_final = True
                    
                    # Only yield final response tokens
                    if streaming_final:
                        for block in token.content_blocks:
                            if block['type'] == 'text' and block.get('text'):
                                full_response += block['text']
                                yield block['text']
                                
            except queue.Empty:
                if not agent_thread.is_alive():
                    break
        
        agent_thread.join(timeout=1.0)
        self._update_history(user_message, full_response)
        console.print(f"\n[dim]💬 Response complete ({len(full_response)} chars)[/]")
    
    def invoke(self, user_message: str) -> str:
        return "".join(self.stream(user_message))
    
    def clear_history(self):
        self.chat_history = []
        console.print("[yellow]Chat history cleared[/]")


if __name__ == "__main__":
    import requests
    from pydantic import BaseModel, Field
    from src.agents.web_generator.tools import WebGenerator
    from src.agents.web_generator.edit_tool import HTMLTransformer
    from src.llm import FallbackLLM

    # API configuration
    API_BASE_URL = "http://localhost:8070"

    def get_page_result_by_thread(thread_id: str, limit: int = 10) -> list:
        """
        Retrieve page result links by thread_id from the API.
        
        Args:
            thread_id: The thread ID to retrieve page results for
            limit: Maximum number of results to return
            
        Returns:
            List of page result links
        """
        try:
            response = requests.post(
                f"{API_BASE_URL}/get_page_result_by_thread",
                json={"thread_id": thread_id, "limit": limit},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "success" and data.get("results"):
                return [result.get("page_result_link") for result in data["results"] if result.get("page_result_link")]
            return []
        except requests.RequestException as e:
            console.print(f"[yellow]Warning: Could not fetch page results: {e}[/]")
            return []

    def insert_page_result(conversation: str, thread_id: str, user_id: int = 0) -> dict:
        """
        Extract URLs from conversation and insert them into the database.
        
        Args:
            conversation: The conversation text containing URLs
            thread_id: Thread ID to associate with the page results
            user_id: User ID
            
        Returns:
            Dict with insertion status and results
        """
        try:
            response = requests.post(
                f"{API_BASE_URL}/insert_page_result",
                json={
                    "conversation": conversation,
                    "thread_id": thread_id,
                    "user_id": user_id
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            console.print(f"[yellow]Warning: Could not insert page results: {e}[/]")
            return {"status": "error", "message": str(e)}

    html_transformer = HTMLTransformer()
    web_gen = WebGenerator()

    # Input schemas
    class RetrieveUrlInput(BaseModel):
        thread_id: str = Field(description="The ID of the thread to retrieve the HTML URL for")

    class ChangeVisualInput(BaseModel):
        html_url: str = Field(description="URL to the HTML page to transform")
        visual_instructions: str = Field(description="Instructions for visual changes (colors, fonts, spacing, etc.)")

    class GenerateWebInput(BaseModel):
        page_name: str = Field(description="Name for the page")
        topic: str = Field(default=None, description="Main topic")
        description: str = Field(default=None, description="Additional context")
        style: str = Field(default="modern", description="Visual style")


    change_visual_tool = StructuredTool.from_function(
        func=html_transformer.change_visual,
        name="change_visual",
        description="Change the visual styling of an HTML page from a URL. Fetches the HTML, applies visual transformations based on instructions, and uploads the result to GCS.",
        args_schema=ChangeVisualInput,
    )

    generate_web_tool = StructuredTool.from_function(
        func=web_gen.generate_web,
        name="generate_web",
        description="Generate a complete HTML web page about a topic.",
        args_schema=GenerateWebInput,
    )

    # Initialize agent
    model = FallbackLLM()
    agent = StreamingReactAgent(
        model=model,
        tools=[generate_web_tool, change_visual_tool],
        system_prompt="""You are a web generator agent that creates beautiful web pages.
When the user asks to generate a web page, use the generate_web tool with appropriate parameters.
When the user asks to change the visual styling of a web page, use the change_visual tool with appropriate parameters.

If a current HTML link is provided in the context, you can use it with the change_visual tool to modify the existing page.
""",
        agent_name="WebGenAgent",
    )

    # Interactive loop with chat history
    chat_history = []
    user_thread_id = "xxxxxxxxxyyyyyyy"
    user_id = 0
    
    print("\n=== Web Generator Chat (type 'quit' to exit, 'history' to view chat history, 'clear' to clear history) ===\n")
    
    while True:
        question = input("User: ").strip()
        
        if not question:
            continue
        
        if question.lower() == "quit":
            print("Goodbye!")
            break
        
        if question.lower() == "history":
            print("\n--- Chat History ---")
            for entry in chat_history:
                print(f"{entry['role'].capitalize()}: {entry['content'][:200]}{'...' if len(entry['content']) > 200 else ''}")
            print("--- End History ---\n")
            continue
        
        if question.lower() == "clear":
            chat_history = []
            agent.clear_history()
            print("Chat history cleared.\n")
            continue
        
        # Fetch existing HTML URLs for this thread at the beginning of conversation
        existing_html_links = get_page_result_by_thread(user_thread_id, limit=1)        
        # Construct the message with context about existing HTML links
        if existing_html_links:
            html_context = "Current html link: " + ", ".join(existing_html_links)
            augmented_question = f"{html_context}\n\nUser request: {question}"
            console.print(f"[dim]📎 Found {len(existing_html_links)} existing HTML link(s) for this thread[/]")
        else:
            augmented_question = question
        
        # Add user message to history (original question without context for display)
        chat_history.append({"role": "user", "content": question})
        
        print("Assistant: ", end="", flush=True)
        response = ""
        for chunk in agent.stream(augmented_question):
            print(chunk, end="", flush=True)
            response += chunk
        print("\n")
        
        # Add assistant response to history
        chat_history.append({"role": "assistant", "content": response})
        
        # At the end of conversation, insert any new URLs from the response
        full_conversation = f"{question}\n{response}"
        insert_result = insert_page_result(
            conversation=full_conversation,
            thread_id=user_thread_id,
            user_id=user_id
        )
        if insert_result.get("status") == "success" and insert_result.get("inserted_count", 0) > 0:
            console.print(f"[dim]💾 Saved {insert_result['inserted_count']} new URL(s) to database[/]")


