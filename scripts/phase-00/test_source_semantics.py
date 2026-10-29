"""Source-only ownership classifier unit tests. NO runtime auth tests."""
import importlib.util,pathlib,tempfile,unittest
p=pathlib.Path(__file__).with_name("audit-source-semantics.py")
spec=importlib.util.spec_from_file_location("semantic_audit",p)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class SemanticAuditTests(unittest.TestCase):
    def test_local_literal_and_proof(self):
        with tempfile.TemporaryDirectory() as d:
            f=pathlib.Path(d)/"OpdsController.java"
            f.write_text('private static final String OPDS_CATALOG_MEDIA_TYPE = "application/atom+xml;profile=opds-catalog;kind=navigation;charset=utf-8";\n')
            rows=mod.local_literals(f)
            self.assertEqual(rows["OPDS_CATALOG_MEDIA_TYPE"]["line"],1)
            self.assertEqual(rows["OPDS_CATALOG_MEDIA_TYPE"]["value"],"application/atom+xml;profile=opds-catalog;kind=navigation;charset=utf-8")
    def test_unknown_symbol_not_guessed(self):
        with tempfile.TemporaryDirectory() as d:
            f=pathlib.Path(d)/"OpdsController.java"
            f.write_text('private static final String UNRESOLVED = computeMediaType();\n')
            self.assertNotIn("UNRESOLVED",mod.local_literals(f))
    def test_chain_is_candidate_not_verdict(self):
        self.assertEqual(mod.chain_for("/api/koreader/syncs/progress"),"KOREADER_AUTH_FILTER_CHAIN_CANDIDATE")
        self.assertEqual(mod.chain_for("/api/v1/app/books/2/rating"),"GENERIC_API_JWT_OR_SPECIAL_CHAIN_CANDIDATE")
        self.assertEqual(mod.owner_for("/api/v1/app/books/2/rating"),"APP_PERSONAL")
    def test_websocket_separate_mechanism(self):
        x={"handlerMechanism":"PROGRAMMATIC_SOURCE_SIGNAL","sourceExpression":'registry.addEndpoint("/ws")'}
        self.assertEqual(mod.programmatic_kind(x),"WEBSOCKET_HANDSHAKE_SOURCE")
        x["sourceExpression"]='registry.setAllowedOriginPatterns("*")'
        self.assertEqual(mod.programmatic_kind(x),"CORS_POLICY_NOT_ROUTE")
    def test_unknown_default(self):
        self.assertEqual(mod.chain_for(None),"UNRESOLVED_PATH_DENY")
        self.assertEqual(mod.owner_for("/not-a-sensitive-allowed-route"),"OFFICIAL_OTHER_REVIEW")
if __name__=="__main__":unittest.main()
