import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from scripts.export_openapi import OUTPUT, build_schema, render

REPO = Path(__file__).resolve().parents[2]
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}


def test_committed_openapi_matches_generated() -> None:
    assert OUTPUT.read_text() == render(build_schema()), (
        "run `make types` and commit docs/openapi.json"
    )


def _operations(schema: dict[str, Any]) -> list[tuple[str, str, dict[str, Any]]]:
    return [
        (path, method, op)
        for path, item in schema["paths"].items()
        if path.startswith("/api/v1")
        for method, op in item.items()
        if method in HTTP_METHODS
    ]


def _is_error_envelope(response: dict[str, Any]) -> bool:
    ref = response.get("content", {}).get("application/json", {}).get("schema", {}).get("$ref")
    return ref == "#/components/schemas/ErrorResponse"


def test_every_v1_error_response_is_the_envelope_and_every_operation_has_one() -> None:
    schema = json.loads(OUTPUT.read_text())
    operations = _operations(schema)
    assert len(operations) >= 24
    for path, method, op in operations:
        errors = {c: r for c, r in op["responses"].items() if c[0] in "45"}
        assert errors, f"{method.upper()} {path} declares no error response"
        for code, response in errors.items():
            assert _is_error_envelope(response), f"{method.upper()} {path} {code}"


def test_delete_operations_are_204_without_a_body() -> None:
    schema = json.loads(OUTPUT.read_text())
    for path, method, op in _operations(schema):
        if method == "delete":
            assert set(op["responses"]) >= {"204"}, path
            assert "content" not in op["responses"]["204"], path


def test_layering_check_passes() -> None:
    result = subprocess.run(
        [sys.executable, str(REPO / "scripts" / "check_layering.py")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr


def _layering() -> Any:
    spec = importlib.util.spec_from_file_location(
        "check_layering", REPO / "scripts" / "check_layering.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _tree(tmp_path: Path, files: dict[str, str]) -> Path:
    app = tmp_path / "app"
    for rel, source in files.items():
        (app / rel).parent.mkdir(parents=True, exist_ok=True)
        (app / rel).write_text(source)
    return app


def test_layering_check_catches_every_import_spelling(tmp_path: Path) -> None:
    app = _tree(
        tmp_path,
        {
            "api/a.py": "from app import models\n",
            "api/b.py": "from app.db import session\n",
            "api/c.py": "import sqlalchemy.orm\n",
            "api/d.py": "from ..repositories import users\n",
            "api/v1/e.py": "from ...models import User\n",
            "api/f.py": "from . import sibling\nfrom app.schemas import common\n",
            "services/g.py": "from fastapi import Depends\n",
            "services/h.py": "from starlette import status\n",
            "services/i.py": "from app.core import deps\n",
        },
    )
    found = _layering().violations(app)
    flagged = {line.split(":")[0] for line in found}
    assert flagged == {
        "app/api/a.py",
        "app/api/b.py",
        "app/api/c.py",
        "app/api/d.py",
        "app/api/v1/e.py",
        "app/services/g.py",
        "app/services/h.py",
    }


def test_layering_check_passes_on_clean_tree(tmp_path: Path) -> None:
    app = _tree(tmp_path, {"api/ok.py": "from app.schemas import common\n", "services/ok.py": ""})
    assert _layering().violations(app) == []


def test_operation_ids_are_unique_handler_names() -> None:
    schema = json.loads(OUTPUT.read_text())
    ids = [op["operationId"] for _, _, op in _operations(schema)]
    assert len(ids) == len(set(ids))
    assert {"list_meetings", "get_meeting", "create_action_item", "regenerate_summary"} <= set(ids)


def test_tags_are_plural_kebab_case() -> None:
    schema = json.loads(OUTPUT.read_text())
    tags = {t for _, _, op in _operations(schema) for t in op["tags"]}
    assert {"action-items", "summaries"} <= tags
    assert all(t == t.lower() and " " not in t for t in tags)
