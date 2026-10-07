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


def _package_of(path: Path, app_dir: Path) -> list[str]:
    return [app_dir.name, *path.relative_to(app_dir).parts[:-1]]


def _imported_modules(tree: ast.AST, package: list[str]) -> list[tuple[str, int]]:
    """Absolute dotted names for every import, resolving relative ones against `package`."""
    found: list[tuple[str, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found += [(alias.name, node.lineno) for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            base = package[: len(package) - (node.level - 1)] if node.level else []
            parts = [*base, *(node.module.split(".") if node.module else [])]
            # `from app import models` imports the submodule app.models, so name it.
            found += [(".".join([*parts, a.name]), node.lineno) for a in node.names]
            found.append((".".join(parts), node.lineno))
    return found


def _forbidden(module: str, banned: tuple[str, ...]) -> bool:
    return any(module == b or module.startswith(b + ".") for b in banned)


def violations(app_dir: Path = APP) -> list[str]:
    problems: list[str] = []
    for layer, banned in RULES.items():
        for path in sorted((app_dir / layer).rglob("*.py")):
            tree = ast.parse(path.read_text(), filename=str(path))
            for module, line in _imported_modules(tree, _package_of(path, app_dir)):
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
