#!/usr/bin/env python3
"""Pinned repository REST exposure signal census; deliberately not a runtime proof."""
import argparse, json, pathlib, re, subprocess, sys
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
REST_SYMBOL=re.compile(r"\b(?:RepositoryRestResource|RestResource)\b|org\.springframework\.data\.rest")
REST_DEP=re.compile(r"^(?:org\.springframework\.data:spring-data-rest(?:-[^:]*)?|org\.springframework\.boot:spring-boot-starter-data-rest)(?::|=)",re.MULTILINE)
def audit(root,source,inherited,out):
    head=subprocess.check_output(["git","-C",str(root),"rev-parse","HEAD"],text=True).strip()
    c=json.loads(source.read_text("utf8"))
    j=json.loads(inherited.read_text("utf8"))
    if head!=PIN or c["upstreamCommit"]!=PIN or j["upstreamCommit"]!=PIN:
        raise ValueError("Unexpected pinned source")
    assert len(j["items"])==160
    repositories=[x for x in j["items"] if x["category"]=="DATA_REPOSITORY_INTERFACE_EXPOSURE_REQUIRES_DEPENDENCY_REVIEW"]
    if len(repositories)!=65:raise ValueError("Repository type census changed")
    lock=(root/"backend/gradle.lockfile").read_text("utf8")
    build=(root/"backend/build.gradle.kts").read_text("utf8")
    deps=[line for line in lock.splitlines() if REST_DEP.search(line)]
    buildRefs=[{"line":i,"declaration":line.strip()} for i,line in enumerate(build.splitlines(),1)
               if re.search(r"spring-boot-starter-data-rest|spring-data-rest",line)]
    symbols=[]
    for row in c["files"]:
        path=row["sourcePath"]
        body=(root/path).read_text("utf8")
        for i,line in enumerate(body.splitlines(),1):
            if REST_SYMBOL.search(line):
                symbols.append({"sourcePath":path,"sourceLine":i,
                    "text":line.strip()[:200],"fileBlobSha":row["fileBlobSha"]})
    result={"schemaVersion":1,"upstreamCommit":PIN,
      "sourceOnly":True,"reposWithLexicalInterfaceOrExtendsFlag":len(repositories),
      "javaFilesChecked":len(c["files"]),
      "pinnedGradleLockSpringDataRestDependencies":deps,
      "pinnedGradleBuildSpringDataRestDeclarations":buildRefs,
      "springDataRestSourceSymbols":symbols,
      "sourceDirectRepositoryRestExposureEvidence":"NOT_FOUND" if not (deps or buildRefs or symbols) else "REVIEW_REQUIRED",
      "otherRouteMechanismsExcludedByThisProof":False,
      "typeBoundInheritance":"NOT_RUN","springRuntimeHandlerRegistration":"NOT_RUN",
      "classification":"NO_SOURCE_DATA_REST_REGISTRATION_INDICATOR_IS_NOT_PROOF_OF_NO_OTHER_ENDPOINTS",
      "SOURCE_ANNOTATION_COMPLETE":False,
      "repositoryFiles":[{"sourcePath":x["sourcePath"],"fileBlobSha":x["fileBlobSha"],
          "classDeclarations":x["classDeclarations"],"sourceClassification":x["category"]} for x in repositories]}
    if result["javaFilesChecked"]!=923:raise ValueError("Unexpected source file count")
    out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in result.items() if k!="repositoryFiles"},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    for flag in ("--upstream","--census","--inheritance","--output"):p.add_argument(flag,type=pathlib.Path,required=True)
    x=p.parse_args()
    try:audit(x.upstream,x.census,x.inheritance,x.output)
    except Exception as e:print("REPOSITORY_REST_AUDIT_FAILED: "+str(e),file=sys.stderr);sys.exit(2)
