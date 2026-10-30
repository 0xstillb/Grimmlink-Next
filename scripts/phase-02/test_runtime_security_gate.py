import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

PATH = Path(__file__).with_name("runtime_security_gate.py")
SPEC = importlib.util.spec_from_file_location("gate", PATH)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


class RuntimeGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for source in [MOD.SOURCE, MOD.SESSION, MOD.EVIDENCE]:
            relative = source.relative_to(MOD.ROOT)
            destination = self.root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(source.read_bytes())

    def tearDown(self):
        self.temp.cleanup()

    def mutate(self, relative, key, value):
        path = self.root / relative
        data = json.loads(path.read_text())
        data[key] = value
        path.write_text(json.dumps(data))

    def test_verified_hold_is_not_runtime_pass(self):
        result = MOD.verify_hold(self.root)
        self.assertFalse(result["runtimeAuthorized"])
        self.assertEqual(result["effectiveSpringRoutes"], "METADATA_CAPTURED_AUTHZ_NOT_PROVEN")

    def test_single_owner_development_can_continue_without_independent_review(self):
        development = MOD.verify_development(self.root)
        self.assertEqual(development["developmentStatus"], "DEV_CHECKS_PASS_WITH_DEFERRED_RISKS")
        self.assertEqual(development["independentReview"], "DEFERRED_TO_PHASE_09")
        self.assertEqual(development["operationalEnablement"], "BLOCKED")
        self.assertEqual(development["officialGatewayForwarding"], "DENY_ALL")

    def test_single_owner_policy_forgery_is_denied(self):
        relative = "docs/implementation/ACTIVE-SESSION.json"
        path = self.root / relative
        doc = json.loads(path.read_text())
        doc["deliveryPolicy"]["ownerCount"] = 2
        path.write_text(json.dumps(doc))
        with self.assertRaises(ValueError):
            MOD.verify_development(self.root)

    def test_runtime_provenance_tamper_fails(self):
        relative = "docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json"
        path = self.root / relative
        evidence = json.loads(path.read_text())
        evidence["runtimeCapture"]["actualSpringHandlerCount"] = 403
        path.write_text(json.dumps(evidence))
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)

    def test_forged_runtime_pass_fails(self):
        self.mutate("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json",
                    "liveSpringHandlerMappings", "VERIFIED")
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)

    def test_forged_signoff_fails(self):
        self.mutate("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json",
                    "independentOwnerSignoff", True)
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)

    def test_upstream_drift_fails(self):
        self.mutate("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json",
                    "pinnedUpstreamCommit", "changed")
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)

    def test_fake_extra_fields_fail(self):
        self.mutate("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json",
                    "signedApproval", "PASS")
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)

    def test_unsafe_forwarding_fails(self):
        self.mutate("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json",
                    "officialGatewayForwarding", "ALLOW")
        with self.assertRaises(ValueError):
            MOD.verify_hold(self.root)


if __name__ == "__main__":
    unittest.main()
