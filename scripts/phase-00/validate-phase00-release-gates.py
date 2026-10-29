#!/usr/bin/env python3
"""Phase00 release-gate integrity check: implementer CANNOT self-authorize Phase01."""
import argparse,hashlib,json,pathlib,subprocess,sys
REVIEW_BLOB="085c8bedb16513df38575fcff2a432ab72de2ad8"
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
def load(root,path):return json.loads((root/path).read_text("utf8"))
def validate(root,out):
    p="docs/implementation/phase-00/"
    census=load(root,p+"JAVA-SOURCE-WIDE-CENSUS.json")
    condition=load(root,p+"SOURCE-CONDITION-RESOLUTION.json")
    auth=load(root,p+"SOURCE-AUTH-OWNERSHIP-LEDGER.json")
    source43=load(root,p+"AUTH-43-SOURCE-VERIFICATION.json")
    source403=load(root,p+"SOURCE-403-SECURITY-CHAIN-CANDIDATES.json")
    fixture=load(root,p+"FIXTURE-STATIC-VALIDATION.json")
    inheritance=load(root,p+"JAVA-INHERITANCE-TYPE-TRIAGE.json")
    repo=load(root,p+"REPOSITORY-REST-SOURCE-EXPOSURE.json")
    reviewer=p+"FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md"
    reviewer_bytes=(root/reviewer).read_bytes()
    reviewed=hashlib.sha1(("blob "+str(len(reviewer_bytes))+"\0").encode()+reviewer_bytes).hexdigest()
    if reviewed!=REVIEW_BLOB:raise ValueError("historical reviewer report was modified")
    if "CHANGES_REQUIRED" not in reviewer_bytes.decode("utf8"):raise ValueError("historical verdict not found")
    if not (census["filesEnumerated"]==923==census["astParsedFiles"]==census["contentReadAndBlobShaVerified"]
      and len(census["astErrors"])==0):raise ValueError("source census incomplete")
    if condition["symbolicConditions"]!=15 or condition["unresolvedThirdPartyOrDynamic"]!=0:raise ValueError("source constants unresolved")
    if auth["handlers"]!=348 or auth["mutationWithoutLocalMethodOrClassAnnotation"]!=43:raise ValueError("source handler census shifted")
    if len(auth["allRouteRecords"])!=348 or any(r["allowedToProxyNow"] for r in auth["allRouteRecords"]):
        raise ValueError("gateway source ledger contains unapproved ALLOW")
    if source43["totalReviewed"]!=43 or source43["missingSourceWitnesses"]!=0 or source43["securityAuthorizationApproved"] is not False:
        raise ValueError("source43 proof incomplete or overclaimed")
    if source403["sourceRouteVariants"]!=403 or source403["sourceMethodHandlers"]!=348 or len(source403["routes"])!=403:
        raise ValueError("source403 proof incomplete")
    if not source403["allRouteForwardingDenied"] or any(r["gatewayForwardDecision"]!="DENY" for r in source403["routes"]):
        raise ValueError("source route allow bypass")
    if source403["methodNameCollisionCount"]!=2 or source403["distinctJavaMethodNames"]!=346:
        raise ValueError("duplicate method source-key regression")
    if inheritance["lexicalClassFlaggedFiles"]!=160 or repo["reposWithLexicalInterfaceOrExtendsFlag"]!=65:
        raise ValueError("inheritance source review coverage shifted")
    if fixture["totalDefinitions"]!=109 or fixture["uniqueFixtureIds"]!=109 or fixture["failures"]:
        raise ValueError("fixture static validation not complete")
    candidates=load(root,p+"SOURCE-ROUTE-CANDIDATES.json")
    program=[r for r in candidates["candidates"] if r["handlerMechanism"] in ("PROGRAMMATIC_SOURCE_SIGNAL","FRAMEWORK_TYPE_SIGNAL")]
    kinds=set(r["handlerMechanism"] for r in candidates["candidates"])
    if (len(candidates["candidates"]),len(program))!=(715,17) or "OTHER_ENDPOINT_ANNOTATION" in kinds:
        raise ValueError("NEW-P0-01 alternate source signal census changed")
    if set(r["sourcePath"] for r in program)!={"backend/src/main/java/org/booklore/config/WebMvcConfig.java",
        "backend/src/main/java/org/booklore/config/WebSocketConfig.java",
        "backend/src/main/java/org/booklore/config/security/SecurityConfig.java"}:
        raise ValueError("NEW-P0-01 unexpected programmatic route owner")
    if census["customAnnotationDefinitionNames"]!=["CheckBookAccess","CheckLibraryAccess"] or census["mappingAnnotationOccurrences"]!=411:
        raise ValueError("NEW-P0-01 custom/composed annotation definitions changed")
    if repo["pinnedGradleLockSpringDataRestDependencies"] or repo["pinnedGradleBuildSpringDataRestDeclarations"] or repo["springDataRestSourceSymbols"]:
        raise ValueError("NEW-P0-01 repository REST registration evidence changed")
    current=load(root,"docs/implementation/ACTIVE-SESSION.json")
    if current.get("phase01Authorized") is not False or current.get("contractLocked") is not False:
        raise ValueError("active status improperly approved")
    gates=[
      ("P00_PINNED_SOURCE_CENSUS","SOURCE_VERIFIED", "Phase00","923/923 SHA and AST"),
      ("NEW_P0_01_SOURCE_MECHANISM_INVENTORY","PINNED_SOURCE_RECONCILED_NOT_RUNTIME","Phase00","923 Java; 715 signals; 17 programmatic; 160 inheritance; 65 repositories; all route forwarding DENY"),
      ("P00_SYMBOLIC_MAPPING_CONDITIONS","SOURCE_VERIFIED","Phase00","15/15 exact source constants"),
      ("P00_SECURITY_CHAIN_CLASSIFICATION","SOURCE_CANDIDATES_CLASSIFIED_NOT_RUNTIME","Phase00/02","403/403; root wildcard semantics outstanding"),
      ("P00_AUTH_OWNER_INVENTORY","DENY_BY_DEFAULT_DOCUMENTED","Phase00/02","348/348 mapping records; no allow decisions"),
      ("P00_MUTATING_HANDLER_SOURCE_REVIEW","SOURCE_REVIEWED_NOT_AUTHORIZED","Phase00","43/43 Git-blob verified; 0 allowed"),
      ("P00_INHERITED_TYPE_REVIEW","LEXICAL_TRIAGE_NOT_TYPE_BOUND","Phase00/02","160 files, Spring runtime registration unresolved"),
      ("P00_RUNTIME_SPRING_CHAIN_MATCH","NOT_RUN","Phase02","Actual matcher/order/dispatcher behavior unverified"),
      ("P00_GATEWAY_DENY_BEFORE_FORWARD","NOT_IMPLEMENTED_VERIFIED","Phase02","No production gateway handler or isolated real HTTP proof"),
      ("P00_USER_LIBRARY_BOOK_FILE_ENTITLEMENT","NOT_PROVEN","Phase02/05/07","Per-book current content and child-file relationships unresolved"),
      ("P00_KO_CREDENTIAL_LOGGING","SOURCE_RISK_UNMITIGATED","Phase02/05","Controller and generic logger can receive secrets"),
      ("P00_RUNTIME_NEGATIVE_FIXTURES","STATIC_ONLY_NOT_EXECUTED","Phase02/07","109/109 definitions pass, actual HTTP tests NOT_RUN"),
      ("P00_FRESH_INDEPENDENT_REVIEW","NOT_RUN_PREVIOUS_CHANGES_REQUIRED","Independent","Prior immutable report CHANGES_REQUIRED"),
    ]
    obj={"schemaVersion":1,"basis":"PINNED_EVIDENCE_WITH_FAIL_CLOSED_RELEASE_POLICY",
      "sourcePin":PIN,"independentReviewReportGitBlob":REVIEW_BLOB,
      "phase00SourceCensusVerified":True,"phase00SourceAuthorizationReviewComplete":False,
      "phase00Priority43SourceReviewComplete":True,
      "newP001PinnedSourceMechanismReconciled":True,
      "newP001RuntimeAuthorizationVerified":False,
      "newP001SourceEvidenceArtifact":"new-p0-01-source-mechanism-receipt",
      "sourceAuthorizationCoverage":"43_PRIORITY_REVIEWED_348_SOURCE_RECORDS_DENY_UNTIL_PHASE02",
      "securityContractReadyForIndependentAcceptance":False,
      "sourceAnnotationComplete":False,"runtimeSpringRouteComplete":"NOT_RUN",
      "authorizationRuntimeProof":"NOT_RUN","gatewayRuntimeEnforcement":"NOT_RUN",
      "historicalIndependentVerdict":"CHANGES_REQUIRED","freshIndependentVerdict":"NOT_RUN",
      "phase00ContractLocked":False,"phase01Authorized":False,
      "nextGateOwner":"FRESH_INDEPENDENT_SECURITY_REVIEW_AFTER_SOURCE_AND_RUNTIME_GAPS_CORRECTED",
      "sourceRouteCountNotRuntime":403,"methodMappingRecords":348,
      "methodNamesNotUnique":346,"prioritySourceReviewRecords":43,
      "fixtureDefinitionsStaticValidated":109,
      "gateRows":[{"id":k,"status":v,"owner":who,"reason":reason} for k,v,who,reason in gates]}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"phase00SourceCensusVerified":True,"sourceHandlerAndRouteVerified":"348 / 403",
      "sourceReview43":True,"runtimeTests":"NOT_RUN","phase01Authorized":False,
      "gateRows":len(gates)},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=pathlib.Path,required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    a=p.parse_args()
    try:validate(a.repo,a.output)
    except Exception as e:print("PHASE00_RELEASE_GATE_INTEGRITY_FAILED "+str(e),file=sys.stderr);sys.exit(2)
