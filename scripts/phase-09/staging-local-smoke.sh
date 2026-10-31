#!/usr/bin/env bash
set -euo pipefail
umask 077

BASE_URL="http://192.168.1.116:6062"
ORIGIN="$BASE_URL"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
RESPONSE="$TMP_DIR/response.json"
LOGIN_REQUEST="$TMP_DIR/login.json"
cleanup() {
  unset OWNER_PASSWORD PAIRED_TOKEN
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  echo "STAGING_LOCAL_SMOKE_FAIL: $1" >&2
  exit 1
}

request_status() {
  local expected="$1"
  shift
  local actual
  actual="$(curl --silent --show-error --max-time 8 -o "$RESPONSE" -w '%{http_code}' "$@")" ||
    fail "request transport failed (expected HTTP $expected)"
  [[ "$actual" == "$expected" ]] || fail "expected HTTP $expected; got $actual"
}

read -r -s -p "Staging owner password: " OWNER_PASSWORD
printf '\n'
printf '%s' "$OWNER_PASSWORD" | python3 -c 'import json,sys; print(json.dumps({"password":sys.stdin.read()}))' > "$LOGIN_REQUEST"
unset OWNER_PASSWORD
request_status 200 "$BASE_URL/api/grimmlink/v2/local/auth/login" \
  --request POST --header "Origin: $ORIGIN" --header "Content-Type: application/json" \
  --cookie-jar "$COOKIE_JAR" --data-binary "@$LOGIN_REQUEST"
rm -f -- "$LOGIN_REQUEST"
CSRF_TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["csrfToken"])' < "$RESPONSE")"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)_$$"
DEVICE_ID="stage_reader_${STAMP}"
FILE_ID="stage_file_${STAMP}"
BOOK_ID="stage_book_${STAMP}"
SESSION_ID="stage_session_${STAMP}"

request_status 201 "$BASE_URL/api/grimmlink/v2/local/devices" \
  --request POST --header "Origin: $ORIGIN" --header "Content-Type: application/json" \
  --header "X-CSRF-Token: $CSRF_TOKEN" --cookie "$COOKIE_JAR" \
  --data-binary "{\"deviceId\":\"$DEVICE_ID\",\"expiresInDays\":1}"
PAIRED_TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])' < "$RESPONSE")"

request_status 201 "$BASE_URL/api/grimmlink/v2/local/reader/files" \
  --request POST --header "Origin: $ORIGIN" --header "Content-Type: application/json" \
  --header "X-CSRF-Token: $CSRF_TOKEN" --cookie "$COOKIE_JAR" \
  --data-binary "{\"bookId\":\"$BOOK_ID\",\"bookFileId\":\"$FILE_ID\",\"editionSha256\":\"$(printf '0%.0s' {1..64})\"}"

request_status 200 "$BASE_URL/api/grimmlink/v2/local/reader/status" \
  --header "Authorization: Bearer $PAIRED_TOKEN" --header "X-Reader-Device-Id: $DEVICE_ID"
python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["mode"]=="STAGING_LOCAL_ONLY" and d["officialForwarding"]=="DENY_ALL"' < "$RESPONSE" ||
  fail "paired-reader status contract did not match"

request_status 200 "$BASE_URL/api/grimmlink/v2/local/reader/sessions/$SESSION_ID" \
  --request POST --header "Authorization: Bearer $PAIRED_TOKEN" \
  --header "X-Reader-Device-Id: $DEVICE_ID" --header "Content-Type: application/json" \
  --data-binary "{\"bookFileId\":\"$FILE_ID\",\"editionSha256\":\"$(printf '0%.0s' {1..64})\",\"eventId\":\"start_${STAMP}\",\"expectedRevision\":0,\"action\":\"START\"}"
python3 -c 'import json,sys; d=json.load(sys.stdin); assert d=={"status":"LOCAL_RECORDED","revision":1}' < "$RESPONSE" ||
  fail "session START receipt did not match"

request_status 200 "$BASE_URL/api/grimmlink/v2/local/reader/sessions/$SESSION_ID" \
  --request POST --header "Authorization: Bearer $PAIRED_TOKEN" \
  --header "X-Reader-Device-Id: $DEVICE_ID" --header "Content-Type: application/json" \
  --data-binary "{\"bookFileId\":\"$FILE_ID\",\"editionSha256\":\"$(printf '0%.0s' {1..64})\",\"eventId\":\"stop_${STAMP}\",\"expectedRevision\":1,\"action\":\"STOP\"}"
python3 -c 'import json,sys; d=json.load(sys.stdin); assert d=={"status":"LOCAL_RECORDED","revision":2}' < "$RESPONSE" ||
  fail "session STOP receipt did not match"

request_status 204 "$BASE_URL/api/grimmlink/v2/local/devices/$DEVICE_ID/revoke" \
  --request POST --header "Origin: $ORIGIN" --header "Content-Type: application/json" \
  --header "X-CSRF-Token: $CSRF_TOKEN" --cookie "$COOKIE_JAR" --data-binary '{}'
request_status 401 "$BASE_URL/api/grimmlink/v2/local/reader/status" \
  --header "Authorization: Bearer $PAIRED_TOKEN" --header "X-Reader-Device-Id: $DEVICE_ID"

echo "STAGING_LOCAL_SMOKE_PASS: owner login, local pairing, file registration, session START/STOP, and revocation. No Grimmory or NAS data was accessed. Test IDs: $DEVICE_ID / $FILE_ID / $SESSION_ID"
