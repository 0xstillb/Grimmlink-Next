"""Fail-closed regressions for the Phase00 machine gate."""
import importlib.util
import json
import pathlib
import shutil
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("phase00_gate",ROOT/"scripts/phase-00/validate-phase00-release-gates.py")
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
FILES=[
"docs/implementation/phase-00/JAVA-SOURCE-WIDE-CENSUS.json",
"docs/implementation/phase-00/SOURCE-CONDITION-RESOLUTION.json",
"docs/implementation/phase-00/SOURCE-AUTH-OWNERSHIP-LEDGER.json",
"docs/implementation/phase-00/SOURCE-ROUTE-CANDIDATES.json",
"docs/implementation/phase-00/AUTH-43-SOURCE-VERIFICATION.json",
"docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json",
"docs/implementation/phase-00/FIXTURE-STATIC-VALIDATION.json",
"docs/implementation/phase-00/JAVA-INHERITANCE-TYPE-TRIAGE.json",
"docs/implementation/phase-00/REPOSITORY-REST-SOURCE-EXPOSURE.json",
"docs/implementation/phase-00/FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md",
"docs/implementation/phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md",
"docs/implementation/ACTIVE-SESSION.json",
]

class GateTests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.root=pathlib.Path(t.name)
        self.out=self.root/"output.json"
        for p in FILES:
            dst=self.root/p
            dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(ROOT/p,dst)

    def mutate(self,path,callback):
        p=self.root/path
        data=json.loads(p.read_text())
        callback(data)
        p.write_text(json.dumps(data))

    def test_design_only_contract_lock_does_not_authorize_runtime(self):
        gate.validate(self.root,self.out)
        obj=json.loads(self.out.read_text())
        self.assertTrue(obj["phase00ContractLocked"])
        self.assertTrue(obj["phase01Authorized"])
        self.assertEqual(obj["runtimeSpringRouteComplete"],"NOT_RUN")
        self.assertEqual(obj["gatewayRuntimeEnforcement"],"NOT_RUN")
        self.assertFalse(obj["newP001RuntimeAuthorizationVerified"])

    def test_unreviewed_gate_status_change_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",lambda j:j.update(phase01Authorized=False))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_gateway_unreviewed_allow_rejected(self):
        self.mutate("docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json",lambda j:j["routes"][0].update(gatewayForwardDecision="ALLOW"))
        with self.assertRaisesRegex(ValueError,"route allow bypass"):
            gate.validate(self.root,self.out)

    def test_new_unowned_route_family_rejected(self):
        self.mutate("docs/implementation/phase-00/SOURCE-ROUTE-CANDIDATES.json",
                    lambda j:j["candidates"].append({"handlerMechanism":"OTHER_ENDPOINT_ANNOTATION","sourcePath":"unreviewed/Unknown.java"}))
        with self.assertRaisesRegex(ValueError,"NEW-P0-01 alternate"):
            gate.validate(self.root,self.out)

    def test_design_review_attestation_tamper_rejected(self):
        p=self.root/"docs/implementation/phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md"
        p.write_text(p.read_text()+"\\nTAMPERED\\n")
        with self.assertRaisesRegex(ValueError,"independent design review attestation tampered"):
            gate.validate(self.root,self.out)

    def test_immutable_reviewer_report(self):
        p=self.root/"docs/implementation/phase-00/FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md"
        p.write_text(p.read_text()+"\nTAMPERED\n")
        with self.assertRaisesRegex(ValueError,"historical reviewer report was modified"):
            gate.validate(self.root,self.out)

if __name__=="__main__":
    unittest.main()
