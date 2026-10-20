from fastapi.testclient import TestClient


def test_mcp_is_not_exposed_outside_local(test_client: TestClient):
    # Test suite runs with APP_ENV=test, so MCP must remain unmounted.
    response = test_client.get("/mcp")
    assert response.status_code == 404

