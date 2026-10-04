"""Entry point for the frozen binary.

PyInstaller executes this file as ``__main__`` with no parent package, so the
relative import in ``polyinit.__main__`` would fail with "attempted relative
import with no known parent package". An absolute import is required here.
"""

from polyinit.cli import app

if __name__ == "__main__":
    app()