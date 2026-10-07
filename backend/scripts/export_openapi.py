"""Write the OpenAPI schema to docs/openapi.json (the frontend types are generated from it)."""

import json
import sys
from pathlib import Path

from app.core.config import Settings
from app.main import create_app

OUTPUT = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"


def build_schema() -> dict[str, object]:
    # Fixed in-memory settings: the schema must not depend on the developer's .env.
    return create_app(Settings(database_url="sqlite://")).openapi()


def render(schema: dict[str, object]) -> str:
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main() -> int:
    OUTPUT.write_text(render(build_schema()))
    print(f"wrote {OUTPUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
