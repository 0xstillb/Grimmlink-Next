#!/usr/bin/env python3
"""Validate nine manual source-call-chain witnesses against exact pinned upstream; not an auth pass."""
import argparse, hashlib, json, pathlib, subprocess, sys
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
def run(root,trace_path,ledger_path,output):
    trace=json.loads(trace_path.read_text("utf8"))
    ledger=json.loads(ledger_path.read_text("utf8"))
    head=subprocess.check_output(["git","-C",str(root),"rev-parse","HEAD"],text=True).strip()
    if head!=PIN or trace["upstreamPin"]!=PIN or ledger["sourcePin"]!=PIN:
        raise ValueError("Pinned SHA mismatch")
    identities={x["handlerIdentity"] for x in ledger["allRouteRecords"]}
    rows=trace["traces"]
    if len(rows)!=9 or len({x["handlerIdentity"] for x in rows})!=9:
        raise ValueError("Manual trace baseline changed")
    proofs=[]
    for item in rows:
        identity=item["handlerIdentity"]
        if identity not in identities:raise ValueError("Unrecognized handler identity "+identity)
        if item["gatewayAllowed"] is not False or item["fullBookAndRecordEntitlementProven"] is not False:
            raise ValueError("Dangerous manual evidence gate claim "+identity)
        if item["executionState"]!="NOT_RUN":raise ValueError("Runtime claim "+identity)
        if not item["witnesses"]:raise ValueError("Missing witnesses "+identity)
        checked=[]
        for witness in item["witnesses"]:
            p=witness["sourcePath"]
            if not p.startswith("backend/src/main/java/org/booklore/") or not p.endswith(".java"):
                raise ValueError("Invalid source witness path "+p)
            data=(root/p).read_bytes()
            sha=hashlib.sha1(("blob "+str(len(data))+"\0").encode()+data).hexdigest()
            expected=subprocess.check_output(["git","-C",str(root),"rev-parse","HEAD:"+p],text=True).strip()
            if sha!=expected:raise ValueError("Witness content mismatch "+p)
            lines=data.decode("utf8").splitlines()
            found=[i+1 for i,line in enumerate(lines) if witness["needle"] in line]
            if not found:raise ValueError("Witness missing "+identity+" in "+p+": "+witness["needle"])
            checked.append({"sourcePath":p,"gitBlobSha":sha,"matchingLines":found,
                            "needle":witness["needle"],"status":"PINNED_SOURCE_TEXT_ONLY"})
        proofs.append({"handlerIdentity":identity,"provenNarrowProperty":item["confirmedNarrowSourceProperty"],
                       "witnesses":checked,"authorizationApproved":False,
                       "currentContentEntitlementProven":False,"gatewayAllowed":False})
    out={"schemaVersion":1,"upstreamPin":PIN,"sourceOnly":True,"manualTraces":len(proofs),
         "totalWitnesses":sum(len(x["witnesses"]) for x in proofs),
         "missingSourceWitnesses":0,"authorizationApproved":False,
         "runtimeAuthorizationTests":"NOT_RUN","rows":proofs}
    output.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in out.items() if k!="rows"},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--upstream",type=pathlib.Path,required=True)
    p.add_argument("--manual",type=pathlib.Path,required=True)
    p.add_argument("--ledger",type=pathlib.Path,required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    a=p.parse_args()
    try:run(a.upstream,a.manual,a.ledger,a.output)
    except Exception as e:print("SOURCE_TRACE_VALIDATION_FAILED",str(e),file=sys.stderr);sys.exit(2)
