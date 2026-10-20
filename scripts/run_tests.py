import os, sys
from pathlib import Path
import pytest
os.chdir(Path(__file__).resolve().parents[1])
sys.path.insert(0, str(Path.cwd()))
os.environ.update(APP_ENV="test", DATABASE_URL="sqlite:///:memory:", PLAID_CLIENT_ID="test-client", PLAID_SECRET="test-secret", FRONTEND_URL="http://localhost:5175")
raise SystemExit(pytest.main(["backend/tests", "-q"] + sys.argv[1:]))
