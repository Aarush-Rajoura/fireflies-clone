"""backend/requirements.txt (pip install on PythonAnywhere) must match uv.lock."""

import shutil
import subprocess
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
EXPORT = ["export", "--no-dev", "--no-hashes", "--no-emit-project", "--format", "requirements-txt"]


@pytest.mark.skipif(shutil.which("uv") is None, reason="uv not installed")
def test_requirements_txt_matches_lock() -> None:
    uv = shutil.which("uv")
    assert uv is not None
    exported = subprocess.run(
        [uv, *EXPORT, "-q"], cwd=BACKEND, capture_output=True, text=True, check=True
    ).stdout
    assert exported == (BACKEND / "requirements.txt").read_text(), "run `make requirements`"
