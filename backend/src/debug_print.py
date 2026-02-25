"""
Debug printing utility with Rich markdown rendering and color support.

This module provides beautiful, colorful debug output for development and debugging.
Supports markdown rendering, different log levels, and structured data display.

Usage:
    from src.debug_print import debug, info, success, warning, error, critical
    from src.debug_print import print_json, print_dict, print_panel, print_tree

    debug("This is a debug message")
    info("Processing data...")
    success("✅ Operation completed successfully!")
    warning("⚠️ This might be an issue")
    error("❌ Something went wrong")

    print_json({"key": "value"})
    print_dict(data, title="Configuration")
    print_panel("Important message", title="Alert")
"""

import os
import sys
import inspect
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.table import Table
    from rich.tree import Tree
    from rich.syntax import Syntax
    from rich.traceback import install as install_rich_traceback
    from rich import print as rprint
    from rich.pretty import pprint
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("⚠️ Rich library not installed. Install with: pip install rich")


class DebugPrinter:
    """
    Debug printer with Rich support for beautiful console output.
    """

    def __init__(self, enabled: bool = True, use_rich: bool = True):
        """
        Initialize the debug printer.

        Args:
            enabled: Whether debug printing is enabled
            use_rich: Whether to use Rich for formatting (if available)
        """
        self.enabled = enabled
        self.use_rich = use_rich and RICH_AVAILABLE

        if self.use_rich:
            self.console = Console()
            # Install rich traceback for better error messages
            install_rich_traceback(show_locals=True)
        else:
            self.console = None

    def _get_caller_info(self) -> str:
        """Get information about the caller (file, line, function)."""
        frame = inspect.currentframe()
        if frame is None:
            return "unknown"

        # Go up the stack to find the actual caller
        caller_frame = frame.f_back.f_back.f_back
        if caller_frame is None:
            return "unknown"

        filename = Path(caller_frame.f_code.co_filename).name
        line_no = caller_frame.f_lineno
        func_name = caller_frame.f_code.co_name

        return f"{filename}:{line_no}:{func_name}"

    def _format_timestamp(self) -> str:
        """Format current timestamp."""
        return datetime.now().strftime("%H:%M:%S.%f")[:-3]

    def _print_with_rich(self, message: str, style: str = "", title: Optional[str] = None):
        """Print message using Rich."""
        if not self.console:
            print(message)
            return

        timestamp = self._format_timestamp()
        caller = self._get_caller_info()

        if title:
            self.console.print(f"[dim]{timestamp}[/dim] [{style}]{title}[/{style}] [dim]({caller})[/dim]")
        else:
            self.console.print(f"[dim]{timestamp}[/dim] [dim]({caller})[/dim]")

        self.console.print(message, style=style)

    def _print_plain(self, message: str, prefix: str = ""):
        """Print message without Rich."""
        timestamp = self._format_timestamp()
        caller = self._get_caller_info()
        print(f"[{timestamp}] {prefix} ({caller})")
        print(message)

    def debug(self, message: str, markdown: bool = False):
        """Print debug message (gray/dim)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="dim cyan", title="DEBUG")
            else:
                self._print_with_rich(message, style="dim cyan", title="DEBUG")
        else:
            self._print_plain(message, prefix="[DEBUG]")

    def info(self, message: str, markdown: bool = False):
        """Print info message (blue)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="blue", title="INFO")
            else:
                self._print_with_rich(message, style="blue", title="INFO")
        else:
            self._print_plain(message, prefix="[INFO]")

    def success(self, message: str, markdown: bool = False):
        """Print success message (green)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="bold green", title="✅ SUCCESS")
            else:
                self._print_with_rich(message, style="bold green", title="✅ SUCCESS")
        else:
            self._print_plain(message, prefix="[SUCCESS]")

    def warning(self, message: str, markdown: bool = False):
        """Print warning message (yellow)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="bold yellow", title="⚠️ WARNING")
            else:
                self._print_with_rich(message, style="bold yellow", title="⚠️ WARNING")
        else:
            self._print_plain(message, prefix="[WARNING]")

    def error(self, message: str, markdown: bool = False):
        """Print error message (red)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="bold red", title="❌ ERROR")
            else:
                self._print_with_rich(message, style="bold red", title="❌ ERROR")
        else:
            self._print_plain(message, prefix="[ERROR]")

    def critical(self, message: str, markdown: bool = False):
        """Print critical message (red on white background)."""
        if not self.enabled:
            return

        if self.use_rich:
            if markdown:
                md = Markdown(message)
                self._print_with_rich(md, style="bold red on white", title="🚨 CRITICAL")
            else:
                self._print_with_rich(message, style="bold red on white", title="🚨 CRITICAL")
        else:
            self._print_plain(message, prefix="[CRITICAL]")

    def markdown(self, markdown_text: str, title: Optional[str] = None):
        """Print markdown formatted text."""
        if not self.enabled:
            return

        if self.use_rich:
            md = Markdown(markdown_text)
            if title:
                panel = Panel(md, title=title, border_style="blue")
                self.console.print(panel)
            else:
                self.console.print(md)
        else:
            if title:
                print(f"\n{'='*60}")
                print(f" {title}")
                print('='*60)
            print(markdown_text)

    def panel(self, message: str, title: str = "", style: str = "blue", markdown: bool = False):
        """Print message in a panel/box."""
        if not self.enabled:
            return

        if self.use_rich:
            content = Markdown(message) if markdown else message
            panel = Panel(content, title=title, border_style=style)
            self.console.print(panel)
        else:
            print(f"\n{'='*60}")
            if title:
                print(f" {title}")
                print('-'*60)
            print(message)
            print('='*60)

    def json(self, data: Union[Dict, List], title: Optional[str] = None):
        """Print JSON/dict data with syntax highlighting."""
        if not self.enabled:
            return

        if self.use_rich:
            import json
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            syntax = Syntax(json_str, "json", theme="monokai", line_numbers=True)

            if title:
                panel = Panel(syntax, title=title, border_style="cyan")
                self.console.print(panel)
            else:
                self.console.print(syntax)
        else:
            import json
            if title:
                print(f"\n{title}:")
            print(json.dumps(data, indent=2, ensure_ascii=False))

    def dict(self, data: Dict[str, Any], title: Optional[str] = None):
        """Print dictionary as a formatted table."""
        if not self.enabled:
            return

        if self.use_rich:
            table = Table(title=title, show_header=True, header_style="bold magenta")
            table.add_column("Key", style="cyan", no_wrap=True)
            table.add_column("Value", style="green")

            for key, value in data.items():
                table.add_row(str(key), str(value))

            self.console.print(table)
        else:
            if title:
                print(f"\n{title}:")
            for key, value in data.items():
                print(f"  {key}: {value}")

    def table(self, data: List[Dict[str, Any]], title: Optional[str] = None):
        """Print list of dictionaries as a table."""
        if not self.enabled:
            return

        if not data:
            self.warning("Empty data provided to table")
            return

        if self.use_rich:
            table = Table(title=title, show_header=True, header_style="bold magenta")

            # Add columns from first row
            for key in data[0].keys():
                table.add_column(str(key), style="cyan")

            # Add rows
            for row in data:
                table.add_row(*[str(v) for v in row.values()])

            self.console.print(table)
        else:
            if title:
                print(f"\n{title}:")

            # Print headers
            headers = list(data[0].keys())
            print(" | ".join(headers))
            print("-" * (sum(len(h) for h in headers) + len(headers) * 3))

            # Print rows
            for row in data:
                print(" | ".join(str(row.get(h, "")) for h in headers))

    def tree(self, data: Dict[str, Any], title: str = "Tree"):
        """Print nested dictionary as a tree structure."""
        if not self.enabled:
            return

        if self.use_rich:
            tree = Tree(f"[bold cyan]{title}[/bold cyan]")

            def add_branches(tree_node, data_dict):
                for key, value in data_dict.items():
                    if isinstance(value, dict):
                        branch = tree_node.add(f"[yellow]{key}[/yellow]")
                        add_branches(branch, value)
                    elif isinstance(value, list):
                        branch = tree_node.add(f"[yellow]{key}[/yellow] [dim](list)[/dim]")
                        for i, item in enumerate(value):
                            if isinstance(item, dict):
                                subbranch = branch.add(f"[dim]{i}[/dim]")
                                add_branches(subbranch, item)
                            else:
                                branch.add(f"[dim]{i}:[/dim] [green]{item}[/green]")
                    else:
                        tree_node.add(f"[yellow]{key}[/yellow]: [green]{value}[/green]")

            add_branches(tree, data)
            self.console.print(tree)
        else:
            print(f"\n{title}:")
            import json
            print(json.dumps(data, indent=2, ensure_ascii=False))

    def separator(self, char: str = "=", length: int = 60, style: str = "dim"):
        """Print a separator line."""
        if not self.enabled:
            return

        if self.use_rich:
            self.console.print(char * length, style=style)
        else:
            print(char * length)

    def code(self, code: str, language: str = "python", title: Optional[str] = None):
        """Print code with syntax highlighting."""
        if not self.enabled:
            return

        if self.use_rich:
            syntax = Syntax(code, language, theme="monokai", line_numbers=True)
            if title:
                panel = Panel(syntax, title=title, border_style="green")
                self.console.print(panel)
            else:
                self.console.print(syntax)
        else:
            if title:
                print(f"\n{title}:")
            print(code)


# Create global instance
_printer = DebugPrinter(
    enabled=os.getenv("DEBUG", "true").lower() in ("true", "1", "yes"),
    use_rich=True
)

# Export convenience functions
debug = _printer.debug
info = _printer.info
success = _printer.success
warning = _printer.warning
error = _printer.error
critical = _printer.critical
print_markdown = _printer.markdown
print_panel = _printer.panel
print_json = _printer.json
print_dict = _printer.dict
print_table = _printer.table
print_tree = _printer.tree
print_separator = _printer.separator
print_code = _printer.code


# Example usage and testing
if __name__ == "__main__":
    print("\n🎨 Debug Print Utility - Examples\n")

    # Basic messages
    debug("This is a debug message with detailed information")
    info("Processing data from API endpoint")
    success("User authentication successful!")
    warning("API rate limit approaching threshold")
    error("Failed to connect to database")
    critical("System is out of memory!")

    print_separator()

    # Markdown rendering
    markdown_text = """
    # System Status Report

    ## Current Metrics
    - **CPU Usage**: 45%
    - **Memory**: 2.3 GB / 8 GB
    - **Active Users**: 127

    ### Recent Changes
    1. Updated authentication system
    2. Fixed caching issue
    3. Improved logging

    ```python
    def hello_world():
        print("Hello from markdown!")
    ```
    """
    print_markdown(markdown_text, title="📊 Status")

    print_separator()

    # Panel
    print_panel(
        "This is an important message in a panel!",
        title="⚠️ Alert",
        style="yellow"
    )

    print_separator()

    # JSON data
    sample_data = {
        "user_id": "12345",
        "username": "john_doe",
        "email": "john@example.com",
        "preferences": {
            "theme": "dark",
            "notifications": True
        },
        "roles": ["user", "admin"]
    }
    print_json(sample_data, title="User Configuration")

    print_separator()

    # Dictionary as table
    config = {
        "API_URL": "https://api.example.com",
        "TIMEOUT": "30s",
        "RETRY_COUNT": "3",
        "DEBUG_MODE": "True"
    }
    print_dict(config, title="Application Settings")

    print_separator()

    # Table from list
    users = [
        {"id": 1, "name": "Alice", "status": "active"},
        {"id": 2, "name": "Bob", "status": "inactive"},
        {"id": 3, "name": "Charlie", "status": "active"},
    ]
    print_table(users, title="User List")

    print_separator()

    # Tree structure
    system_info = {
        "server": {
            "hostname": "prod-server-01",
            "ip": "192.168.1.100",
            "services": {
                "web": {"status": "running", "port": 8080},
                "database": {"status": "running", "port": 5432}
            }
        },
        "metrics": {
            "cpu": "45%",
            "memory": "2.3GB"
        }
    }
    print_tree(system_info, title="System Information")

    print_separator()

    # Code with syntax highlighting
    sample_code = '''
def fibonacci(n):
    """Calculate fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test it
result = fibonacci(10)
print(f"Fibonacci(10) = {result}")
'''
    print_code(sample_code, language="python", title="Example Function")

    print_separator()

    # Markdown in different contexts
    info("Regular info message", markdown=False)
    success("# Success!\n\nOperation completed **successfully**", markdown=True)
    warning("⚠️ **Warning**: Configuration file not found\n\nUsing default settings...", markdown=True)

    print("\n✨ Demo complete!\n")
