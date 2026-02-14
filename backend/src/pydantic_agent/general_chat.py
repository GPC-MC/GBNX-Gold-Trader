from src.pydantic_agent.base import BasePydanticAgent, AgentConfig
from src.pydantic_agent.all_tools import get_all_tools, AgentDeps
from datetime import datetime
from src.prompt_lib import GENERAL_CHAT_REACT_PROMPT, SIMPLIFIED_GENERAL_CHAT_REACT_PROMPT
from src.tools.homepage_chat_history_tools import HomepageChatDBHandler
from src.tools.s3_tools import UnifiedS3Tools
from typing import Optional, List

class GeneralChatAgent(BasePydanticAgent[None, str]):
    def __init__(self, system_prompt: str = "You are a helpful assistant.", homepage_chat_history_handler: Optional[HomepageChatDBHandler] = None, s3_tools: Optional[UnifiedS3Tools] = None, redis_cache=None, model_name=None, tools: Optional[List] = None):
        self.redis_cache = redis_cache
        self.homepage_chat_history_handler = homepage_chat_history_handler
        self.s3_tools = s3_tools
        config = AgentConfig(
            model=f"openai:{model_name}",
            system_prompt=system_prompt
        )
        # Use custom tools if provided, otherwise use default tools
        agent_tools = tools if tools is not None else get_all_tools()
        super().__init__(config, tools=agent_tools)

    def get_conversation_history(self, thread_id: str, user_id: str = "default", limit: int = 10) -> list:
        if not thread_id:
            return []
        if self.redis_cache:
            try:
                messages = self.redis_cache.get_session_messages(user_id, thread_id, limit)
                if messages:
                    return messages
            except Exception as e:
                print(f"Redis cache error: {e}")
        in_memory_messages = self.get_message_history()
        if in_memory_messages:
            formatted = []
            for msg in in_memory_messages[-limit:]:
                if isinstance(msg, dict):
                    formatted.append({"role": msg.get("role"), "content": msg.get("content")})
                else:
                    role = getattr(msg, 'role', 'user')
                    content = str(msg) if not hasattr(msg, 'content') else msg.content
                    formatted.append({"role": role, "content": content})
            return formatted
        return []

    def save_messages_to_cache(self, user_id: str, thread_id: str, user_msg: str, assistant_msg: str):
        if not self.redis_cache:
            return
        try:
            self.redis_cache.append_message(user_id, thread_id, "user", user_msg)
            self.redis_cache.append_message(user_id, thread_id, "assistant", assistant_msg)
        except Exception as e:
            print(f"Failed to save to Redis: {e}")

    async def stream_question(self, question: str, user_id: str, thread_id: str, s3_keys: Optional[List[str]] = None, mcp_servers: Optional[dict] = None):
        await self.init_agent(user_id, mcp_servers)
        conversation_history = self.get_conversation_history(thread_id, user_id=user_id, limit=10)

        available_documents = ""
        if thread_id and self.homepage_chat_history_handler:
            documents = self.homepage_chat_history_handler.get_documents_in_conversation(thread_id)
            if documents:
                available_documents = "\n".join([f"  - {d['filename']}" for d in documents])
        available_images = ""
        if thread_id and self.homepage_chat_history_handler:
            images = self.homepage_chat_history_handler.get_images_in_conversation(
                thread_id, s3_tools=self.s3_tools
            )
            if images:
                lines = []
                #has_new_image = bool(request.image_urls)
                for img in images:
                    s3_key = img.get("s3_key", "")
                    filename = img.get("filename") or "image"
                    desc = img.get("description")
                    key_part = f"[s3_key={s3_key}] " if s3_key else ""
                    # Only show description if no new image attached (avoid context pollution)
                    #if desc and desc != "No description yet" and not has_new_image:
                    short_desc = desc[:80] + "..." if len(desc) > 80 else desc
                    lines.append(f"  - {key_part}{filename}: {short_desc}")
                    #else:
                    #    lines.append(f"  - {key_part}{filename}")
                available_images = "\n".join(lines)

        current_date = datetime.now().strftime("%Y-%m-%d (%A)")
        s3_keys_string = ''.join([f"- {k}\n" for k in s3_keys]) if s3_keys else ''
        question_with_context = f"""Conversation history: {conversation_history}
                Today date: {current_date}
                Available documents: {available_documents}
                Available images: {available_images}

                Files that user uploaded with their message: 
                {s3_keys_string}
                
                User message: {question}"""

        response_text = ""

        deps = AgentDeps(session_id=thread_id)
        async for event in self.stream_with_tool_calls(question_with_context, deps=deps):
            if event.type == "tool_call":
                tool_name = event.content["name"]
                args = event.content["args"]
                yield(f"[TOOL] {tool_name}({args})")
            elif event.type == "tool_result":
                result = event.content["result"]
                yield(f"[RESULT] {result}...")
            elif event.type == "text_delta":
                response_text += event.content
                yield event.content
            elif event.type == "done":
                pass
            elif event.type == "error":
                yield f"\n[Error: {event.content}]\n"
        self.save_messages_to_cache(user_id, thread_id, question, response_text)

    async def get_response(self, question: str, user_id: str, thread_id: str) -> str:
        conversation_history = self.get_conversation_history(thread_id, user_id=user_id, limit=10)
        current_date = datetime.now().strftime("%Y-%m-%d (%A)")
        question_with_context = f"""Conversation history: {conversation_history}
                Today date: {current_date}
                User message: {question}"""
        response = await self.run(question_with_context)
        self.save_messages_to_cache(user_id, thread_id, question, response)
        return response


if __name__ == "__main__":
    import asyncio
    from rich.console import Console
    from rich.panel import Panel
    from rich.live import Live
    from rich.text import Text

    console = Console()

    async def main():
        user_id = "test_user_1"
        thread_id = "test_thread_1"
        agent = GeneralChatAgent(system_prompt=SIMPLIFIED_GENERAL_CHAT_REACT_PROMPT, model_name="qwen-max")
        console.print(Panel(
            "[bold cyan]GeneralChatAgent - Interactive Chat[/]\n\n"
            "[white]Commands:[/]\n"
            "  [yellow]'quit' or 'exit'[/] - Exit the chat\n"
            "  [yellow]'clear'[/] - Clear conversation history",
            border_style="cyan"
        ))
        while True:
            try:
                console.print("\n[bold blue]You:[/] ", end="")
                question = input().strip()
                question += f"Today date: {datetime.now().strftime('%Y-%m-%d (%A)')}"
                if not question:
                    continue
                if question.lower() in ['quit', 'exit']:
                    console.print("\n[bold yellow]Goodbye![/]")
                    break
                if question.lower() == 'clear':
                    agent.clear_message_history()
                    console.print("\n[green]Conversation history cleared![/]")
                    continue

                console.print("\n[bold green]Assistant:[/]")
                response_text = Text()
                final_response_started = False
                with Live(response_text, console=console, refresh_per_second=20) as live:
                    async for chunk in agent.stream_question(question, user_id, thread_id):
                        if "[TOOL]" in chunk:
                            response_text.append(chunk + "\n", style="dim cyan")
                        elif "[RESULT]" in chunk:
                            response_text.append(chunk + "\n", style="dim green")
                        elif "[Error:" in chunk:
                            response_text.append(chunk + "\n", style="bold red")
                        else:
                            if not final_response_started:
                                response_text.append("\nFinal response:\n", style="bold green")
                                final_response_started = True
                            response_text.append(chunk, style="bold blue")
                        live.update(response_text)

            except KeyboardInterrupt:
                console.print("\n\n[bold yellow]Goodbye![/]")
                break
            except Exception as e:
                console.print(f"\n[bold red]Error: {e}[/]")
                import traceback
                traceback.print_exc()
    asyncio.run(main())
