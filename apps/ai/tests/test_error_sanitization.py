import sys
import types
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
stub_connection = types.ModuleType('db.connection')
stub_connection.get_db = lambda: None
stub_queries = types.ModuleType('db.queries')
stub_queries.get_pr_with_items = lambda *_: None
stub_queries.get_budget_data = lambda *_: None
with patch.dict(sys.modules, {'db.connection': stub_connection, 'db.queries': stub_queries}):
    from services import audit_pr_service


@contextmanager
def fake_db():
    yield object()


class ErrorSanitizationTests(unittest.TestCase):
    def test_missing_model_keeps_ai_disabled_without_provider_call(self):
        provider = Mock()
        with patch.object(audit_pr_service, 'get_db', fake_db), \
             patch.object(audit_pr_service, 'get_pr_with_items', return_value={'budgetId': None}), \
             patch.object(audit_pr_service, 'PROMPT_TEMPLATE', '{pr_data} {budget_data}'), \
             patch.object(audit_pr_service, 'GEMINI_CLIENT', provider), \
             patch.object(audit_pr_service, 'GEMINI_MODEL', ''):
            with self.assertRaises(HTTPException) as caught:
                audit_pr_service.audit_pr('test-pr')
        self.assertEqual(caught.exception.status_code, 503)
        provider.models.generate_content.assert_not_called()

    def test_unexpected_provider_error_is_not_exposed(self):
        provider = Mock()
        provider.models.generate_content.side_effect = RuntimeError('private-provider-token-123')
        with patch.object(audit_pr_service, 'get_db', fake_db), \
             patch.object(audit_pr_service, 'get_pr_with_items', return_value={'budgetId': None}), \
             patch.object(audit_pr_service, 'PROMPT_TEMPLATE', '{pr_data} {budget_data}'), \
             patch.object(audit_pr_service, 'GEMINI_CLIENT', provider), \
             patch.object(audit_pr_service, 'GEMINI_MODEL', 'test-model'), \
             patch.object(audit_pr_service.logging, 'exception') as logged:
            with self.assertRaises(HTTPException) as caught:
                audit_pr_service.audit_pr('test-pr')
        self.assertEqual(caught.exception.status_code, 503)
        self.assertNotIn('private-provider-token-123', caught.exception.detail)
        logged.assert_called_once()

    def test_quota_error_keeps_429_without_provider_details(self):
        provider = Mock()
        provider.models.generate_content.side_effect = RuntimeError('429 private-provider-token-123 quota')
        with patch.object(audit_pr_service, 'get_db', fake_db), \
             patch.object(audit_pr_service, 'get_pr_with_items', return_value={'budgetId': None}), \
             patch.object(audit_pr_service, 'PROMPT_TEMPLATE', '{pr_data} {budget_data}'), \
             patch.object(audit_pr_service, 'GEMINI_CLIENT', provider), \
             patch.object(audit_pr_service, 'GEMINI_MODEL', 'test-model'), \
             patch.object(audit_pr_service.logging, 'exception'):
            with self.assertRaises(HTTPException) as caught:
                audit_pr_service.audit_pr('test-pr')
        self.assertEqual(caught.exception.status_code, 429)
        self.assertNotIn('private-provider-token-123', caught.exception.detail)


if __name__ == '__main__':
    unittest.main()
