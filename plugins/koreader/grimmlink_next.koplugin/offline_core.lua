-- Phase07 offline KOReader plugin prototype. No network or file writes.
-- Feed synthetic reader events into a trusted host in Phase09 only.
local M = {}
M.mode = "OFFLINE_MOCK_ONLY"
M.auto_sync = false

local kinds = { RATING = true, BOOKMARK = true, ANNOTATION = true, SESSION = true }
local function valid_id(v)
  return type(v) == "string" and #v >= 1 and #v <= 128 and v:match("^[%w_-]+$") ~= nil
end

function M.make_envelope(owner, device, file, edition_sha, event_id, kind, data)
  assert(valid_id(owner) and valid_id(device) and valid_id(file) and valid_id(event_id), "PHASE07_ID_INVALID")
  assert(type(edition_sha) == "string" and #edition_sha == 64 and
    edition_sha:match("^[0-9a-f]+$"), "PHASE07_EDITION_INVALID")
  assert(kinds[kind] == true, "PHASE07_KIND_INVALID")
  assert(type(data) == "table", "PHASE07_DATA_INVALID")
  return {
    mode = M.mode,
    ownerId = owner,
    deviceId = device,
    bookFileId = file,
    editionSha256 = edition_sha,
    eventId = event_id,
    kind = kind,
    data = data
  }
end

-- This does not compare or mutate real KOReader/Grimmory shelves.
function M.manual_shelf_preview(before, after, manual)
  assert(manual == true, "PHASE07_MANUAL_TRIGGER_REQUIRED")
  assert(type(before) == "table" and type(after) == "table", "PHASE07_SHELF_INVALID")
  local old, new, add, remove = {}, {}, {}, {}
  for _, id in ipairs(before) do
    assert(valid_id(id) and not old[id], "PHASE07_SHELF_INVALID")
    old[id] = true
  end
  for _, id in ipairs(after) do
    assert(valid_id(id) and not new[id], "PHASE07_SHELF_INVALID")
    new[id] = true
    if not old[id] then add[#add + 1] = id end
  end
  for id in pairs(old) do
    if not new[id] then remove[#remove + 1] = id end
  end
  table.sort(add)
  table.sort(remove)
  return { mode = "MANUAL_PREVIEW_ONLY", add = add, remove = remove }
end

return M
