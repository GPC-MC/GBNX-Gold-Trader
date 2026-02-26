from src.pydantic_agent.base import BasePydanticAgent, AgentConfig
from src.pydantic_agent.all_tools import get_all_tools, AgentDeps
from datetime import datetime
from typing import Optional, List


GOLD_TRADER_SYSTEM_PROMPT = """You are an expert Gold & Precious Metals Trading Assistant for the GBNX platform.
You help traders analyse real-time market data for Gold (XAU/USD), Silver (XAG/USD),
Platinum (XPT/USD), USD/SGD, and USD/MYR.

====================================================
MANDATORY WORKFLOW — NO EXCEPTIONS
====================================================

RULE #1 — PLANNING IS REQUIRED BEFORE EVERYTHING:
  You MUST call the `planning` tool as your very first action for EVERY user message,
  regardless of how simple or complex the question is.
  Do NOT call any other tool, and do NOT write any response text, until `planning` has been called.

RULE #2 — EXECUTE THE PLAN:
  After `planning` returns, follow the steps it outlines, calling the appropriate tools.

RULE #3 — SYNTHESISE:
  Once all tools have been called, write a clear, actionable response for the trader.

VIOLATION: Skipping `planning` or calling another tool first is a critical error.

====================================================
TOOL SELECTION GUIDE
====================================================

• Current price only              → get_current_price
• Summary (high/low/change/vol)   → get_market_summary_tool
• Raw candle history              → get_price_history
• Trend / SMA / momentum          → analyze_price_trend
• All metals at once              → get_all_metals_overview
• Compare multiple pairs          → compare_trading_pairs_tool
• Full market briefing            → get_full_market_snapshot
• News / macro / external events  → search_web

Always prefer pricing tools over search_web for any price-related question.
"""


class GeneralChatAgent(BasePydanticAgent[None, str]):
    def __init__(
        self,
        system_prompt: str = GOLD_TRADER_SYSTEM_PROMPT,
        redis_cache=None,
        model_name: str = "qwen-max",
        tools: Optional[List] = None,
    ):
        self.redis_cache = redis_cache
        config = AgentConfig(
            model=f"openai:{model_name}",
            system_prompt=system_prompt,
        )
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
                    role = getattr(msg, "role", "user")
                    content = str(msg) if not hasattr(msg, "content") else msg.content
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

    async def stream_question(
        self,
        question: str,
        user_id: str,
        thread_id: str,
        s3_keys: Optional[List[str]] = None,
        mcp_servers: Optional[dict] = None,
    ):
        await self.init_agent(user_id, mcp_servers)
        conversation_history = self.get_conversation_history(thread_id, user_id=user_id, limit=10)
        current_date = datetime.now().strftime("%Y-%m-%d (%A)")

        s3_keys_string = "".join([f"- {k}\n" for k in s3_keys]) if s3_keys else ""
        question_with_context = (
            f"[MANDATORY] Call the `planning` tool FIRST before any other tool or response.\n"
            f"Conversation history: {conversation_history}\n"
            f"Today date: {current_date}\n"
            f"Files uploaded with this message:\n{s3_keys_string}\n"
            f"User message: {question}"
        )

        response_text = ""
        deps = AgentDeps(session_id=thread_id)
        async for event in self.stream_with_tool_calls(question_with_context, deps=deps):
            if event.type == "tool_call":
                yield f"[TOOL] {event.content['name']}({event.content['args']})"
            elif event.type == "tool_result":
                yield f"[RESULT] {event.content['result']}..."
            elif event.type == "text_delta":
                response_text += event.content
                yield event.content
            elif event.type == "error":
                yield f"\n[Error: {event.content}]\n"

        self.save_messages_to_cache(user_id, thread_id, question, response_text)

    async def get_response(self, question: str, user_id: str, thread_id: str) -> str:
        await self.init_agent(user_id)
        conversation_history = self.get_conversation_history(thread_id, user_id=user_id, limit=10)
        current_date = datetime.now().strftime("%Y-%m-%d (%A)")
        question_with_context = (
            f"[MANDATORY] Call the `planning` tool FIRST before any other tool or response.\n"
            f"Conversation history: {conversation_history}\n"
            f"Today date: {current_date}\n"
            f"User message: {question}"
        )
        deps = AgentDeps(session_id=thread_id)
        response = await self.run(question_with_context, deps=deps)
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
        agent = GeneralChatAgent(model_name="gpt-4o-mini")
        console.print(Panel(
            "[bold cyan]GBNX Gold Trader AI - Interactive Chat[/]\n\n"
            "[white]Commands:[/]\n"
            "  [yellow]'quit' or 'exit'[/] - Exit the chat\n"
            "  [yellow]'clear'[/]          - Clear conversation history",
            border_style="cyan"
        ))
        while True:
            try:
                console.print("\n[bold blue]You:[/] ", end="")
                question = input().strip()
                if not question:
                    continue
                if question.lower() in ["quit", "exit"]:
                    console.print("\n[bold yellow]Goodbye![/]")
                    break
                if question.lower() == "clear":
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
                                response_text.append("\n", style="bold green")
                                final_response_started = True
                            response_text.append(chunk, style="bold white")
                        live.update(response_text)

            except KeyboardInterrupt:
                console.print("\n\n[bold yellow]Goodbye![/]")
                break
            except Exception as e:
                console.print(f"\n[bold red]Error: {e}[/]")
                import traceback
                traceback.print_exc()

    asyncio.run(main())
