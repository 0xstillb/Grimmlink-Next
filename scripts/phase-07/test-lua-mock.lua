local plugin_dir = "plugins/koreader/grimmlink_next.koplugin/"
package.path = plugin_dir .. "?.lua;" .. package.path

local offline = require("offline_core")
assert(offline.mode == "OFFLINE_MOCK_ONLY" and offline.auto_sync == false)
local event = offline.make_envelope("owner", "reader", "book_file", string.rep("a", 64),
  "ev1", "BOOKMARK", { nativePosition = "epubcfi(/6/2)" })
assert(event.eventId == "ev1" and event.mode == "OFFLINE_MOCK_ONLY")
local plan = offline.manual_shelf_preview({"file_a", "file_b"}, {"file_b", "file_c"}, true)
assert(plan.add[1] == "file_c" and plan.remove[1] == "file_a")
assert(not pcall(function() offline.manual_shelf_preview({}, {}, false) end))
assert(not pcall(function() offline.make_envelope("../owner", "reader", "file", string.rep("a", 64), "e", "SESSION", {}) end))
assert(not pcall(function() offline.make_envelope("owner", "reader", "file", string.rep("a", 64), "e", "RESET", {}) end))

local opds_calls = {}
local settings = {}
G_reader_settings = {
  readSetting = function(_, key) return settings[key] end,
  saveSetting = function(_, key, value) settings[key] = value end,
}
local fake_client = {
  is_valid_base_url = function(value) return value == "http://192.168.1.116:6062" end,
  create_default = function()
    return {
      status = function() return { mode = "STAGING_LOCAL_ONLY" } end,
      files = function() return { files = { { bookFileId = "file_a", editionSha256 = string.rep("a", 64) } } } end,
      session_event = function(_, _, event_value)
        return { status = "LOCAL_RECORDED", revision = event_value.action == "START" and 1 or 2 }
      end,
      read_opds_catalog = function(username, password)
        opds_calls[#opds_calls + 1] = { username = username, password = password }
        return { entryCount = 2, hasNextPage = false }
      end,
    }
  end,
}
package.preload["reader_client"] = function() return fake_client end
package.preload["gettext"] = function() return function(value) return value end end
package.preload["ui/widget/infomessage"] = function()
  return { new = function(_, value) return value end }
end
package.preload["ui/widget/inputdialog"] = function()
  return { new = function(_, args)
    return { args = args, getInputText = function(self)
      if self.args.text_type == "password" then return "opds-test-secret" end
      if self.args.title:find("username", 1, true) then return "catalog-reader" end
      if self.args.title:find("Adapter URL", 1, true) then return "http://192.168.1.116:6062" end
      if self.args.title:find("device ID", 1, true) then return "reader_1" end
      if self.args.title:find("pairing token", 1, true) then return string.rep("a", 43) end
      return self.args.input or ""
    end, onShowKeyboard = function() end }
  end }
end
package.preload["ui/uimanager"] = function()
  return { show = function(_, value)
    if value.args then
      for _, row in ipairs(value.args.buttons) do
        for _, button in ipairs(row) do
          if button.text == "Continue" then button.callback(); return end
        end
      end
    end
    _G.last_message = value
  end, close = function() end }
end
package.preload["ui/widget/container/widgetcontainer"] = function()
  local base = {}
  function base:extend(definition)
    definition.__index = definition
    setmetatable(definition, { __index = self })
    function definition:new(values) return setmetatable(values or {}, self) end
    return definition
  end
  return base
end

local Plugin = require("main")
local registered
local instance = Plugin:new({ ui = { menu = { registerToMainMenu = function(_, value) registered = value end } } })
instance:init()
assert(registered == instance)
local menu_items = {}
instance:addToMainMenu(menu_items)
local menu = menu_items.grimmlink_next
assert(menu and menu.text == "GrimmLink Next" and menu.sorting_hint == "tools")
local seen = {}
local function visit(item)
  seen[item.text] = true
  if item.sub_item_table then
    for _, nested in ipairs(item.sub_item_table) do visit(nested) end
  else
    assert(type(item.callback) == "function")
    item.callback()
    assert(type(last_message.text) == "string" and #last_message.text > 0)
  end
end
for _, item in ipairs(menu.sub_item_table) do visit(item) end
assert(seen["Setup Staging connection"] and seen["Test connection"] and seen["List local test files"])
assert(seen["Record session START/STOP smoke test"] and seen["Read Grimmory OPDS catalog (read-only)"])
assert(seen["Official Grimmory sync"] and seen["Status"] and seen["About GrimmLink Next"])
assert(#opds_calls == 1 and opds_calls[1].username == "catalog-reader" and opds_calls[1].password == "opds-test-secret")
assert(settings.grimmlink_next_staging_server == "http://192.168.1.116:6062")
assert(settings.grimmlink_next_staging_device == "reader_1")
for key in pairs(settings) do assert(not key:find("password") and not key:find("token")) end

package.loaded.reader_client = nil
package.preload["reader_client"] = nil
local ReaderClient = require("reader_client")
local fixture = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Secret Test Library</title>' ..
  '<entry><title>Secret Book A</title></entry><entry><title>Secret Book B</title></entry>' ..
  '<link rel="next" href="/api/v1/opds/catalog?page=2"/></feed>'
local last_request
local client = ReaderClient.new({
  request = function(options)
    last_request = options
    return { status = 200, body = fixture, headers = { ["content-type"] = "application/atom+xml; charset=utf-8" } }
  end,
  encode = function() return "{}" end,
  decode = function() return {} end,
  base64 = function(value) return "BASE64(" .. value .. ")" end,
})
local catalog, err = client.read_opds_catalog("catalog-reader", "test-secret")
assert(catalog and not err and catalog.entryCount == 2 and catalog.hasNextPage)
assert(last_request.url == ReaderClient.OPDS_URL and last_request.method == "GET")
assert(last_request.followRedirects == false and last_request.maxBody == ReaderClient.MAX_OPDS_BODY)
assert(last_request.headers.authorization == "Basic BASE64(catalog-reader:test-secret)")
assert(last_request.headers.accept:find("application/atom%+xml"))
assert(catalog.title == nil and catalog.books == nil and not tostring(catalog):find("Secret Book"))

local function response_case(response)
  local calls = 0
  local case_client = ReaderClient.new({
    request = function(options) calls = calls + 1; last_request = options; return response end,
    encode = function() return "{}" end, decode = function() return {} end,
    base64 = function(value) return "B64" end,
  })
  local result, failure = case_client.read_opds_catalog("reader", "secret")
  return result, failure, calls
end
local denied, denied_error, denied_calls = response_case({status = 401, body = "credential must not be exposed", headers = {}})
assert(not denied and denied_error == "OPDS_HTTP_401" and denied_calls == 1 and
  not denied_error:find("credential") and not denied_error:find("secret"))
local redirect, redirect_error, redirect_calls = response_case({status = 302, body = "", headers = {location = "http://attacker.invalid/"}})
assert(not redirect and redirect_error == "OPDS_REDIRECT_DENIED" and redirect_calls == 1)
local invalid_type, invalid_type_error = response_case({status = 200, body = fixture, headers = { ["content-type"] = "text/html" }})
assert(not invalid_type and invalid_type_error == "OPDS_CONTENT_TYPE_INVALID")
local oversized, oversized_error = response_case({status = 200, body = string.rep("x", ReaderClient.MAX_OPDS_BODY + 1), headers = { ["content-type"] = "application/atom+xml" }})
assert(not oversized and oversized_error == "OPDS_TRANSPORT_FAILED")
local too_many_entries = '<feed>' .. string.rep("<entry></entry>", 1001) .. '</feed>'
local limited, limit_error = response_case({status = 200, body = too_many_entries, headers = { ["content-type"] = "application/atom+xml" }})
assert(not limited and limit_error == "OPDS_ENTRY_COUNT_LIMIT")
local bad_creds, bad_creds_error = client.read_opds_catalog("bad:user", "secret")
assert(not bad_creds and bad_creds_error == "OPDS_CREDENTIALS_INVALID")

local request_count = 0
local url_client = ReaderClient.new({
  request = function() request_count = request_count + 1; return { status = 200, body = "{}", headers = {} } end,
  encode = function() return "{}" end, decode = function() return {} end,
  base64 = function(value) return value end,
})
assert(ReaderClient.is_valid_base_url("http://192.168.1.116:6062"))
assert(not ReaderClient.is_valid_base_url("https://example.com"))
assert(not ReaderClient.is_valid_base_url("http://8.8.8.8"))
assert(not ReaderClient.is_valid_base_url("http://192.168..116:6062"))
local invalid, invalid_error = url_client.status({serverUrl = "http://8.8.8.8", deviceId = "reader", token = string.rep("a", 43)})
assert(not invalid and invalid_error == "READER_CLIENT_CONFIG_INVALID" and request_count == 0)
print("PHASE07_LUA_READONLY_OPDS_MOCK_PASS")
