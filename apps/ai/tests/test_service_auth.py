import os
import sys
import types
import unittest
import asyncio
import json
from unittest.mock import Mock, patch
from pathlib import Path
from fastapi import FastAPI

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DATABASE_URL', 'postgresql://unused:unused@localhost/unused')

# Import the router without constructing a database pool or a Gemini client.
stub = types.ModuleType('services.audit_pr_service')
stub.audit_pr = Mock()
with patch.dict(sys.modules, {'services.audit_pr_service': stub}):
    from routers import audit_pr as router_module

def post(app, headers=None):
    messages = []
    body = json.dumps({'prId': 'test-id'}).encode()
    async def receive():
        return {'type': 'http.request', 'body': body, 'more_body': False}
    async def send(message):
        messages.append(message)
    scope = {
        'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1',
        'method': 'POST', 'scheme': 'http', 'path': '/ai/audit-pr', 'raw_path': b'/ai/audit-pr',
        'query_string': b'', 'root_path': '', 'server': ('test', 80), 'client': ('test', 1),
        'headers': [(b'content-type', b'application/json')] + [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
    }
    asyncio.run(app(scope, receive, send))
    return next(m['status'] for m in messages if m['type'] == 'http.response.start')

class ServiceAuthTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(router_module.router)
        self.app = app
        stub.audit_pr.reset_mock()

    def test_missing_and_wrong_key_never_call_audit(self):
        with patch.object(router_module, 'AI_SERVICE_API_KEY', 'test-secret'):
            for headers in ({}, {'X-AI-Service-Key': 'wrong'}):
                self.assertEqual(post(self.app, headers), 401)
        stub.audit_pr.assert_not_called()

    def test_unconfigured_service_fails_closed(self):
        with patch.object(router_module, 'AI_SERVICE_API_KEY', ''):
            self.assertEqual(post(self.app), 503)
        stub.audit_pr.assert_not_called()

    def test_valid_key_calls_mock_service(self):
        stub.audit_pr.return_value = {
            'riskScore': 1, 'riskLevel': 'LOW', 'findings': [],
            'budgetImpact': {'remainingBefore': 100, 'remainingAfter': 80, 'usagePercentage': 20},
            'recommendation': {'action': 'APPROVE', 'justification': 'Test'},
        }
        with patch.object(router_module, 'AI_SERVICE_API_KEY', 'test-secret'):
            self.assertEqual(post(self.app, {'X-AI-Service-Key': 'test-secret'}), 200)
        stub.audit_pr.assert_called_once_with('test-id')

    def test_example_database_url_parses(self):
        from dotenv import dotenv_values
        from psycopg2.extensions import parse_dsn
        settings = dotenv_values(Path(__file__).resolve().parents[1] / '.env.example')
        self.assertEqual(parse_dsn(settings['DATABASE_URL'])['dbname'], 'procureflow_erp')

if __name__ == '__main__':
    unittest.main()
