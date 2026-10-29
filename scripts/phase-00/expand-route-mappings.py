#!/usr/bin/env python3
"""Pinned source AST annotation route expander. Syntax-level candidates, not Spring runtime routes."""
import argparse, collections, json, pathlib, re, sys

PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
VERBS={"GetMapping":["GET"],"PostMapping":["POST"],"PutMapping":["PUT"],
       "PatchMapping":["PATCH"],"DeleteMapping":["DELETE"],"RequestMapping":["ANY"]}
ROUTE_FIELDS=("params","headers","consumes","produces","name")

def split_outer(raw):
    """Split expression on commas only at depth zero, respecting Java string literals."""
    out=[];start=0;depth=0;in_string=False;in_char=False;escaped=False
    for i,ch in enumerate(raw):
        if escaped:escaped=False;continue
        if (in_string or in_char) and ch=="\\":escaped=True;continue
        if ch=='"' and not in_char:in_string=not in_string;continue
        if ch=="'" and not in_string:in_char=not in_char;continue
        if in_string or in_char:continue
        if ch in "{([":depth+=1
        elif ch in "})]":depth-=1
        elif ch=="," and depth==0:out.append(raw[start:i].strip());start=i+1
    if in_string or in_char or depth!=0:raise ValueError("unbalanced Java annotation")
    out.append(raw[start:].strip())
    return [p for p in out if p]

def get_attrs(annotation):
    expr=annotation.split("||",1)[-1]
    first=expr.find("(")
    if first<0:return {}
    if not expr.endswith(")"):return {"_unsupported":[expr]}
    body=expr[first+1:-1].strip()
    if not body:return {}
    attrs={}
    for item in split_outer(body):
        # annotation args may include nested equals: only split at first top-level equals.
        pieces=re.split(r"\s*=\s*",item,maxsplit=1)
        if len(pieces)==2 and re.fullmatch(r"[A-Za-z_]\w*",pieces[0]):key,val=pieces
        else:key,val="value",item
        if key in attrs:attrs["_duplicate"]=key
        attrs[key]=val.strip()
    return attrs

def strings(expr):
    """Only accept pure string literals or literal arrays; do not guess symbolic values."""
    expr=expr.strip()
    if expr.startswith("{") and expr.endswith("}"):
        toks=split_outer(expr[1:-1])
    else:toks=[expr]
    res=[]
    for tok in toks:
        if not re.fullmatch(r'"(?:[^"\\]|\\.)*"',tok.strip()):
            return None
        try:res.append(json.loads(tok.strip()))
        except ValueError:return None
    return res

def parse_mapping(ev):
    typ=ev["annotationType"]
    attrs=get_attrs(ev["sourceExpression"])
    unresolved=[]
    if "_unsupported" in attrs or "_duplicate" in attrs:unresolved.append("ANNOTATION_ARGUMENT_PARSE")
    if "value" in attrs and "path" in attrs:unresolved.append("BOTH_VALUE_AND_PATH")
    raw=attrs.get("path",attrs.get("value",'""'))
    paths=strings(raw)
    if paths is None:
        unresolved.append("NON_LITERAL_PATH")
        paths=[]
    verbs=VERBS[typ][:]
    if "method" in attrs:
        rawmethods=attrs["method"].strip()
        tokens=split_outer(rawmethods[1:-1]) if rawmethods.startswith("{") and rawmethods.endswith("}") else [rawmethods]
        verbs=[]
        for token in tokens:
            match=re.fullmatch(r"(?:RequestMethod\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)",token.strip())
            if match:verbs.append(match.group(1))
            else:unresolved.append("NON_LITERAL_HTTP_METHOD:"+token[:80])
        if not verbs:unresolved.append("NO_DECLARED_HTTP_METHOD")
    constraints={}
    for key in ROUTE_FIELDS:
        if key not in attrs:continue
        vals=strings(attrs[key])
        if vals is None:
            unresolved.append("SYMBOLIC_"+key.upper())
            constraints[key]={"raw":attrs[key],"literalValues":None}
        else:constraints[key]={"raw":attrs[key],"literalValues":vals}
    extra=set(attrs)-set(ROUTE_FIELDS)-{"path","value","method"}
    if extra:unresolved.append("UNKNOWN_MAPPING_KEYS:"+",".join(sorted(extra)))
    return {"paths":paths,"methods":verbs,"conditions":constraints,"unresolved":unresolved,
            "rawAnnotation":ev["sourceExpression"]}

def join_paths(parent,child):
    if not parent or parent=="/":parent=""
    if not child or child=="/":child=""
    return "/"+"/".join(x for x in (parent.strip("/"),child.strip("/")) if x) if parent or child else "/"

def main(src,out):
    meta=json.loads(src.read_text("utf8"))
    if meta["upstreamCommit"]!=PIN:raise ValueError("incorrect pinned commit")
    candidates=meta["candidates"]
    mappings=[x for x in candidates if x["handlerMechanism"]=="ANNOTATION_MAPPING"]
    classes=collections.defaultdict(list)
    methods=[]
    for ev in mappings:
        k=(ev["sourcePath"],ev["className"])
        if ev["handlerIdentity"].endswith("#"):classes[k].append(ev)
        else:methods.append(ev)
    # A class may have 0/1/multiple mappings; multiple are not silently resolved.
    rows=[];unresolved=[];expansions=[]
    for ev in methods:
        classKey=(ev["sourcePath"],ev["className"])
        classMappings=classes.get(classKey,[])
        parsed=parse_mapping(ev)
        reason=list(parsed["unresolved"])
        if len(classMappings)>1:reason.append("MULTIPLE_CLASS_MAPPING_ANNOTATIONS")
        parents=[parse_mapping(x) for x in classMappings] if classMappings else [dict(paths=[""],methods=["ANY"],conditions={},unresolved=[])]
        for p in parents:
            reason.extend("CLASS_"+x for x in p["unresolved"])
        pathVars=[];conditions=[]
        for parent in parents:
            for a in (parent["paths"] or [None]):
                for b in (parsed["paths"] or [None]):
                    pathVars.append(join_paths(a,b) if a is not None and b is not None else None)
            conditions.append({"class":parent["conditions"],"method":parsed["conditions"]})
        methodVerbs=parsed["methods"]
        if classMappings and any(p["methods"]!=["ANY"] for p in parents):
            reason.append("CLASS_LEVEL_HTTP_METHOD_CONSTRAINT_REQUIRES_REVIEW")
        identity=ev["handlerIdentity"]
        base={"upstreamCommit":PIN,"sourcePath":ev["sourcePath"],
              "sourceLine":ev["sourceLine"],"fileBlobSha":ev["fileBlobSha"],
              "className":ev["className"],"handlerIdentity":identity,
              "annotationType":ev["annotationType"],"classMappingLines":[x["sourceLine"] for x in classMappings],
              "declaredMethods":methodVerbs,"pathVariants":pathVars,
              "mappingConditions":conditions,"gatewayOwner":"UNASSIGNED_DENY_BY_DEFAULT",
              "authChain":"UNVERIFIED","authorizationDimensions":["UNVERIFIED"],
              "evidenceGrade":"SOURCE_AST_LITERAL_EXPANSION_NOT_RUNTIME",
              "openQuestions":sorted(set(reason))}
        rows.append(base)
        if reason:unresolved.append({"sourcePath":ev["sourcePath"],"sourceLine":ev["sourceLine"],
                                     "handlerIdentity":identity,"reasons":sorted(set(reason))})
        for path in pathVars:
            for verb in methodVerbs:
                expansions.append({"path":path,"method":verb,
                                   "handlerIdentity":identity,"sourcePath":ev["sourcePath"],
                                   "sourceLine":ev["sourceLine"],
                                   "mappingConditions":conditions,
                                   "openQuestions":sorted(set(reason))})
    unowned=[x for x in candidates if x["handlerMechanism"] not in ("ANNOTATION_MAPPING","CONTROLLER_MARKER")]
    counts=collections.Counter(x["annotationType"] for x in methods)
    report={"schemaVersion":1,"upstreamCommit":PIN,"scope":"SOURCE_DECLARED_HTTP_HANDLER_CANDIDATES",
      "sourceNotRuntime":True,"methodMappingAnnotations":len(methods),
      "classMappingAnnotations":sum(len(v) for v in classes.values()),
      "routeHandlerRecords":len(rows),"methodPathVariants":len(expansions),
      "unresolvedHandlerCount":len(unresolved),"classMappingsWithoutMethods":[
        {"sourcePath":x["sourcePath"],"sourceLine":x["sourceLine"],"className":x["className"]}
        for group in classes.values() for x in group
        if not any(y["sourcePath"]==x["sourcePath"] and y["className"]==x["className"] for y in methods)],
      "annotationsByMethodType":dict(counts),
      "programmaticAndAlternateSignals":unowned,
      "mappingCandidates":rows,"expandedDeclarations":expansions,
      "unresolved":unresolved,
      "SOURCE_ANNOTATION_COMPLETE":False,"RUNTIME_ROUTE_COMPLETE":"NOT_RUN",
      "classification":"STATIC_LITERAL_EXPANSION_REQUIRES_SEMANTIC_AND_AUTH_REVIEW"}
    assert len(methods)==348,(len(methods),"unexpected upstream signature count")
    assert sum(len(x) for x in classes.values())==63
    assert len(rows)==348
    report["unresolvedPathVariants"]=sum(x["path"] is None for x in expansions)
    out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in report.items() if k not in (
        "mappingCandidates","expandedDeclarations","programmaticAndAlternateSignals",
        "unresolved","classMappingsWithoutMethods")},indent=2))
    return 0

if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("source",type=pathlib.Path)
    a.add_argument("output",type=pathlib.Path)
    o=a.parse_args()
    try:sys.exit(main(o.source,o.output))
    except Exception as e:print("ROUTE_EXPANSION_ERROR:",str(e),file=sys.stderr);sys.exit(2)
