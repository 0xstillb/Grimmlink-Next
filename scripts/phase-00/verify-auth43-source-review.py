#!/usr/bin/env python3
"""Source-only 43-handler authorization review witness verifier; never runtime approval."""
import argparse, collections, hashlib, json, pathlib, re, subprocess, sys
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
def git(root,*args):
    return subprocess.check_output(["git","-C",str(root),*args],text=True).strip()
def sha(raw):
    return hashlib.sha1(("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()
def verify(root,ledger_path,review_path,outdir):
    if git(root,"rev-parse","HEAD")!=PIN:raise ValueError("upstream pin changed")
    ledger=json.loads(ledger_path.read_text("utf8"))
    review=json.loads(review_path.read_text("utf8"))
    if ledger["sourcePin"]!=PIN or review["sourcePin"]!=PIN:raise ValueError("source mismatch")
    expected={x["handlerIdentity"]:x for x in ledger["prioritizedMutationReview"]}
    rows=review["rows"]
    if len(expected)!=43 or len(rows)!=43 or {x["handlerIdentity"] for x in rows}!=set(expected):
        raise ValueError("43-handler identity coverage mismatch")
    if review["coverage"]["authorizationApproved"]!=0 or review["coverage"]["gatewayAllowed"]!=0:
        raise ValueError("false claim of gateway approval")
    seen=set();verified=[];risk=collections.Counter();classifications=collections.Counter()
    for row in rows:
        h=row["handlerIdentity"]
        if h in seen:raise ValueError("duplicate "+h)
        seen.add(h)
        source=expected[h]
        for name in ("sourcePath","sourceLine","fileBlobSha","declaredMethods","pathVariants"):
            if row[name]!=source[name]:raise ValueError("source discrepancy "+h+" "+name)
        if (row["proxyAllowed"] is not False or row["currentBookContentEntitlementApproved"] is not False
            or row["globalChainRuntimeMatched"] is not False
            or row["requiresIndependentReview"] is not True):
            raise ValueError("dangerous auto-approval "+h)
        if row["staticReviewDisposition"]!="REVIEWED_WITH_EVIDENCE__GATEWAY_DENIED":
            raise ValueError("incorrect review disposition "+h)
        controller=(root/row["sourcePath"]).read_bytes()
        if sha(controller)!=row["fileBlobSha"] or git(root,"rev-parse","HEAD:"+row["sourcePath"])!=row["fileBlobSha"]:
            raise ValueError("controller Git blob changed "+h)
        method=h.split("#",1)[1]
        lines=controller.decode("utf8").splitlines()
        adjacent=lines[row["sourceLine"]-1:row["sourceLine"]+78]
        found=[row["sourceLine"]+i for i,line in enumerate(adjacent)
               if re.search(r"\bpublic\s+.*\b"+re.escape(method)+r"\s*\(",line)]
        if len(found)!=1:raise ValueError("expected exact method adjacent to annotation "+h+" "+str(found))
        w=row["sourceWitness"]
        p=w["sourcePath"]
        if not p.startswith("backend/src/main/java/org/booklore/") or not p.endswith(".java"):
            raise ValueError("invalid witness scope "+h)
        raw=(root/p).read_bytes()
        digest=sha(raw)
        if git(root,"rev-parse","HEAD:"+p)!=digest:raise ValueError("witness Git blob mismatch "+h)
        matched=[i for i,line in enumerate(raw.decode("utf8").splitlines(),1) if w["needle"] in line]
        if not matched:raise ValueError("no pinned source witness "+h+" "+p)
        risk[row["sourceFindingRisk"]]+=1;classifications[row["sourceFindingKind"]]+=1
        verified.append({"handlerIdentity":h,"controllerPath":row["sourcePath"],
            "mappingLine":row["sourceLine"],"methodDeclarationLine":found[0],
            "controllerGitBlobSha":row["fileBlobSha"],
            "witnessPath":p,"witnessLines":matched,"witnessGitBlobSha":digest,
            "findingKind":row["sourceFindingKind"],
            "reviewState":"STATIC_SOURCE_TRIAGED__RUNTIME_AUTH_NOT_RUN",
            "gatewayAllowed":False,"authorizationApproved":False})
    if dict(risk)!={"HIGH":29,"CRITICAL":6,"LOW":4,"MEDIUM":4}:raise ValueError("risk count changed "+str(risk))
    outdir.mkdir(parents=True,exist_ok=True)
    receipt={"schemaVersion":1,"upstreamCommit":PIN,"sourceReviewCoverage":"43_OF_43",
        "totalReviewed":43,"missingSourceWitnesses":0,"riskCounts":dict(sorted(risk.items())),
        "findingKindCounts":dict(sorted(classifications.items())),
        "sourceReviewClosed":True,"securityAuthorizationApproved":False,
        "gatewayAllowed":False,"runtimeChainProof":"NOT_RUN","runtimeOwnershipTests":"NOT_RUN",
        "independentVerdict":"CHANGES_REQUIRED_HISTORICAL",
        "PHASE01_AUTHORIZED":False,"rows":verified}
    (outdir/"AUTH-43-SOURCE-VERIFICATION.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf8")
    md="# Phase00 — Authorization source review dispositions for all 43 high-priority handler candidates\n\n"
    md+="43/43 pinned controller-to-service witnesses validated; ZERO authorized for the gateway. Source review closure is not a runtime security PASS.\n\n"
    md+="| Handler | Risk | Finding | Source route(s) | Pinned witness |\n|---|---|---|---|---|\n"
    for row,item in zip(rows,verified):
        link="https://github.com/grimmory-tools/grimmory/blob/"+PIN+"/"+item["witnessPath"]+"#L"+str(item["witnessLines"][0])
        method=",".join(row["declaredMethods"]);path=", ".join(row["pathVariants"])
        md+="| "+row["handlerIdentity"]+" | "+row["sourceFindingRisk"]+" | "+row["sourceFindingKind"]+" | "+method+" "+path+" | [source]("+link+") |\n"
    md+="\n## Critical source findings requiring separate proof\n\n"
    md+="- Kobo Controller stores a path token in a mutable instance field set by @ModelAttribute: concurrent request/token isolation is unproven. Block Kobo proxy.\n"
    md+="- ReadingProgressService updates nested bookFileId without an explicit check that it belongs to the same request bookId in the method inspected.\n"
    md+="- KOReader globally resolves bookHash after sync-user auth without current per-book assigned-library entitlement proof.\n"
    md+="- MagicShelfService accepts isPublic from DTO for new shelf in the inspected create branch without explicit admin-only check.\n"
    md+="- Kobo reading-state path bookId and body entitlementId/current content scope are not bound by the reviewed source chain.\n"
    md+="- Initial admin setup exists-check and provision need isolated atomic/concurrency proof.\n"
    md+="- KO registration replies 403 but body may reach controller WARN and separate payload/KO header request logging filters.\n"
    md+="- Komga static 501 and 404 handlers are not persistence operations even with POST/PUT/DELETE mappings; no wildcard proxy.\n"
    md+="\n## Remaining gate\n\nAll rows explicitly deny proxying. Global filter chain selection, user and current book/library/content entitlement, resource ownership, aliases and direct-backend ingress must be independently proven. Runtime HTTP/mocked security tests NOT_RUN; prior independent CHANGES_REQUIRED remains. No Phase01/merge/deploy.\n"
    (outdir/"AUTH-43-REVIEW-DISPOSITION.md").write_text(md,encoding="utf8")
    print(json.dumps({k:v for k,v in receipt.items() if k!="rows"},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    for name in ("--upstream","--ledger","--manual","--output"):
        p.add_argument(name,type=pathlib.Path,required=True)
    a=p.parse_args()
    try:verify(a.upstream,a.ledger,a.manual,a.output)
    except Exception as e:print("AUTH43_SOURCE_VALIDATION_FAILED "+str(e),file=sys.stderr);sys.exit(2)
