"""Fail when a layer imports something it must not know about.

- app/api/**      must not import app.models, app.db, app.repositories or sqlalchemy
- app/services/** must not import fastapi or starlette
"""

import ast
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "backend" / "app"

RULES: dict[str, tuple[str, ...]] = {
    "api": ("app.models", "app.db", "app.repositories", "sqlalchemy"),
    "services": ("fastapi", "starlette"),
}


def _imported_modules(tree: ast.AST) -> list[tuple[str, int]]:
    found: list[tuple[str, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found += [(alias.name, node.lineno) for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.append((node.module, node.lineno))
    return found


def _forbidden(module: str, banned: tuple[str, ...]) -> bool:
    return any(module == b or module.startswith(b + ".") for b in banned)


def violations(app_dir: Path = APP) -> list[str]:
    problems: list[str] = []
    for layer, banned in RULES.items():
        for path in sorted((app_dir / layer).rglob("*.py")):
            tree = ast.parse(path.read_text(), filename=str(path))
            for module, line in _imported_modules(tree):
                if _forbidden(module, banned):
                    problems.append(f"{path.relative_to(app_dir.parent)}:{line} imports {module}")
    return problems


def main() -> int:
    problems = violations()
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
