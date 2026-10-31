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

package.preload["gettext"] = function() return function(value) return value end end
package.preload["ui/widget/infomessage"] = function()
    return { new = function(_, value) return value end }
end
package.preload["ui/uimanager"] = function()
    return { show = function(_, value) _G.last_message = value end }
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
        for _, nested in ipairs(item.sub_item_table) do
            visit(nested)
        end
    else
        assert(type(item.callback) == "function")
        item.callback()
        assert(type(last_message.text) == "string" and #last_message.text > 0)
    end
end
for _, item in ipairs(menu.sub_item_table) do visit(item) end
assert(seen["Status"] and seen["Enable GrimmLink"] and seen["Connection"])
assert(seen["First Run Setup Wizard"] and seen["Sync Pending Now"])
assert(seen["Force Metadata Re-upload"] and seen["Sync Shelf Now"])
assert(seen["Reading progress"] and seen["Reading sessions"] and seen["Shelves"])
assert(seen["Ratings and annotations"] and seen["Advanced Settings"])
assert(seen["Setup & Backup"] and seen["Shelf Sync Settings"])
assert(seen["Export Settings Backup"] and seen["Restore Settings Backup"])
assert(seen["Diagnostics"] and seen["About GrimmLink Next"])
print("PHASE07_LUA_MOCK_PASS")
