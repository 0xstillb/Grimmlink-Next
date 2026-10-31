import { createHash } from "node:crypto";

/** Audited source references only. Null installed values are deliberate and fail closed. */
export const COMPATIBILITY_MANIFEST = Object.freeze({
  schema: "grimmlink.compatibility-manifest.v1",
  revision: "2026-10-31-source-baselines",
  status: "SOURCE_BASELINES_ONLY_DEPLOYED_VERSIONS_UNKNOWN",
  sourceManifest: "docs/implementation/UPSTREAM-MANIFEST.json",
  components: Object.freeze([
    Object.freeze({
      id: "grimmory",
      auditedSourceVersion: "v3.5.0",
      auditedSourceCommit: "402e89b4452f8e2b17ab95f16c1621c003516cd2",
      deployedVersion: null,
      deployedImageDigest: null,
      evidence: "SOURCE_PATH_DTO_VERIFIED_NOT_RUNTIME",
    }),
    Object.freeze({
      id: "readest",
      auditedSourceVersion: "v0.12.16",
      auditedSourceCommit: "3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3",
      deployedVersion: null,
      binaryDigest: null,
      evidence: "CLIENT_SOURCE_VERIFIED_NOT_BINARY",
    }),
    Object.freeze({
      id: "koreader",
      observedRelease: "v2026.07.1",
      auditedSourceCommit: null,
      deployedVersion: null,
      evidence: "RELEASE_SEEN_ONLY",
    }),
    Object.freeze({
      id: "prose-koreader",
      auditedSourceVersion: "30.2.0",
      auditedSourceCommit: "1e2a38f0e48936792b222f27f79fe7dd511c8336",
      publishedVersion: null,
      lockfileSha256: null,
      deployedVersion: null,
      evidence: "SOURCE_SIGNATURE_VERIFIED_NOT_PINNED_DEPENDENCY",
    }),
    Object.freeze({
      id: "grimmlink-adapter",
      declaredSourceVersion: "0.1.0",
      deployedVersion: null,
      imageDigest: null,
      evidence: "LOCAL_PACKAGE_VERSION_ONLY",
    }),
  ]),
  constraints: Object.freeze([
    "Audited source versions do not attest deployed binaries or runtime versions.",
    "Public release and advisory payloads are unverified and are not package signatures.",
    "Compatibility and impact require an owner review against this exact manifest hash.",
    "Owner review never authorizes download, installation, rollback, or production release.",
  ]),
  installationAllowed: false,
  releaseAuthorization: "NOT_AUTHORIZED",
} as const);

export const COMPATIBILITY_MANIFEST_SHA256 = createHash("sha256")
  .update(JSON.stringify(COMPATIBILITY_MANIFEST), "utf8")
  .digest("hex");
