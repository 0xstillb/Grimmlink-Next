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

    def test_phase01_safety_handoff_fails_closed(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["safety"].update(officialGatewayForwarding="ALLOW"))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_phase01_every_safety_field_fails_closed(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        # Every independently declared safety boundary must be enforced, even
        # when its securityCapability counterpart remains BLOCKED_OFF.
        cases=(
            ("officialGatewayForwarding","ALLOW"),
            ("nativeKosyncProgress","ON"),
            ("metadataApply","ON"),
            ("personalBridge","ON"),
            ("sessionBridge","ON"),
            ("resetProgress","ON"),
            ("managedProjection","ON"),
            ("productionDeployment","AUTHORIZED"),
            ("fullE2ePhase","01"),
            ("metadataApply","ON_BUT_OFF_IN_NAME"),
            ("productionDeployment",None),
            ("personalBridge",False),
        )
        for key,value in cases:
            with self.subTest(key=key,value=value):
                (self.root/path).write_text(pristine)
                self.mutate(path,lambda j:j["safety"].update({key:value}))
                with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
                    gate.validate(self.root,self.out)

    def test_phase01_safety_rejects_missing_extra_and_wrong_type(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        changes=(
            lambda j:j["safety"].pop("resetProgress"),
            lambda j:j["safety"].update(unreviewedFeature="OFF"),
            lambda j:j.update(safety=None),
            lambda j:j.update(safety="DENY_ALL"),
            lambda j:j.update(safety=[]),
        )
        for i,change in enumerate(changes):
            with self.subTest(case=i):
                (self.root/path).write_text(pristine)
                self.mutate(path,change)
                with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
                    gate.validate(self.root,self.out)

    def test_forged_phase00_handoff_cannot_bypass_safety_contract(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:j.update(phase="00",phaseStatus="CONTRACT_LOCKED_DESIGN_ONLY"))
        # This otherwise accepted legacy-phase shape must not authorize an
        # unsafe safety status simply by bypassing the Phase01-only branch.
        self.mutate(path,lambda j:j["safety"].update(productionDeployment="AUTHORIZED"))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_phase00_design_handoff_still_works_when_safety_is_closed(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:j.update(phase="00",phaseStatus="CONTRACT_LOCKED_DESIGN_ONLY"))
        gate.validate(self.root,self.out)
        output=json.loads(self.out.read_text())
        self.assertTrue(output["phase01Authorized"])
        self.assertEqual(output["gatewayRuntimeEnforcement"],"NOT_RUN")

    def test_phase01_sensitive_feature_enable_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["securityCapability"].update(metadataApply="ON"))
        with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
            gate.validate(self.root,self.out)

    def test_phase01_forged_off_suffix_rejected(self):
        for invalid in ("ON_BUT_OFF_IN_NAME", "BLOCKED_OFF_WITH_UNREVIEWED_EXTENSION", None, False):
            with self.subTest(invalid=invalid):
                self.mutate("docs/implementation/ACTIVE-SESSION.json",
                            lambda j:j["securityCapability"].update(metadataApply=invalid))
                with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
                    gate.validate(self.root,self.out)

    def test_phase01_unapproved_capability_key_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["securityCapability"].update(unreviewedFeature="BLOCKED_OFF"))
        with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
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
        p.write_text(p.read_text()+"\nTAMPERED\n")
        with self.assertRaisesRegex(ValueError,"independent design review attestation tampered"):
            gate.validate(self.root,self.out)

    def test_immutable_reviewer_report(self):
        p=self.root/"docs/implementation/phase-00/FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md"
        p.write_text(p.read_text()+"\nTAMPERED\n")
        with self.assertRaisesRegex(ValueError,"historical reviewer report was modified"):
            gate.validate(self.root,self.out)

if __name__=="__main__":
    unittest.main()
