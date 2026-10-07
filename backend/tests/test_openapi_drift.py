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
