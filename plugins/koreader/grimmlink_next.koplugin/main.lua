local InfoMessage = require("ui/widget/infomessage")
local InputDialog = require("ui/widget/inputdialog")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local _ = require("gettext")
local ReaderClient = require("reader_client")

local SERVER_SETTING = "grimmlink_next_staging_server"
local DEVICE_SETTING = "grimmlink_next_staging_device"
local session_token

local GrimmLinkNext = WidgetContainer:extend{
    name = "grimmlink_next",
    is_doc_only = false,
}

local function showInfo(text)
    UIManager:show(InfoMessage:new{ text = text })
end

local function setting(key)
    if G_reader_settings then return G_reader_settings:readSetting(key) end
    return nil
end

local function saveSetting(key, value)
    if G_reader_settings then G_reader_settings:saveSetting(key, value) end
end

local function config()
    return {
        serverUrl = setting(SERVER_SETTING),
        deviceId = setting(DEVICE_SETTING),
        token = session_token,
    }
end

local function prompt(title, initial, callback, text_type)
    local dialog
    dialog = InputDialog:new{
        title = title,
        input = initial or "",
        text_type = text_type,
        buttons = {{
            { text = _("Cancel"), id = "close", callback = function() UIManager:close(dialog) end },
            { text = _("Continue"), callback = function()
                local value = dialog:getInputText()
                UIManager:close(dialog)
                callback(value)
            end },
        }},
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

local function readGrimmoryCatalog()
    prompt(_("Read-only Grimmory OPDS username (single-owner account)"), "", function(username)
        if type(username) ~= "string" or username == "" or #username > 256 or username:find("[:%c]") then
            showInfo(_("Invalid OPDS username"))
            return
        end
        prompt(_("OPDS password (sent to private HTTP server; not saved)"), "", function(password)
            local result, err = ReaderClient.create_default().read_opds_catalog(username, password)
            password, username = nil, nil
            if not result then
                showInfo(_("Grimmory read-only catalog request failed: ") .. tostring(err))
                return
            end
            showInfo(_("Grimmory catalog GET passed. Entries on this feed: ") .. tostring(result.entryCount) ..
                _("\nNext page available: ") .. tostring(result.hasNextPage) ..
                _("\nNo book files were opened or downloaded."))
        end, "password")
    end)
end

local function setupConnection()
    prompt(_("Staging Adapter URL (private IP only)"), setting(SERVER_SETTING), function(serverUrl)
        if not ReaderClient.is_valid_base_url(serverUrl) then
            showInfo(_("Invalid URL. Use the private Staging IP, for example http://192.168.1.116:6062"))
            return
        end
        prompt(_("Paired KOReader device ID"), setting(DEVICE_SETTING), function(deviceId)
            if type(deviceId) ~= "string" or not deviceId:match("^[%w_-]+$") or #deviceId > 128 then
                showInfo(_("Invalid device ID"))
                return
            end
            prompt(_("One-time pairing token (kept only in memory)"), "", function(token)
                if type(token) ~= "string" or #token ~= 43 or not token:match("^[%w_-]+$") then
                    showInfo(_("Invalid pairing token"))
                    return
                end
                session_token = token
                saveSetting(SERVER_SETTING, serverUrl)
                saveSetting(DEVICE_SETTING, deviceId)
                local result, err = ReaderClient.create_default().status(config())
                if not result then
                    session_token = nil
                    showInfo(_("Staging connection failed: ") .. tostring(err))
                    return
                end
                showInfo(_("Connected to local Staging Adapter. Official forwarding: DENY_ALL."))
            end)
        end)
    end)
end

local function testConnection()
    if not session_token then
        showInfo(_("Set up this session with the one-time pairing token first."))
        return
    end
    local result, err = ReaderClient.create_default().status(config())
    if not result then
        showInfo(_("Staging connection failed: ") .. tostring(err))
        return
    end
    showInfo(_("Staging local-only connection passed\nOfficial forwarding: DENY_ALL\nShelf mutation: OFF"))
end

local function listFiles()
    if not session_token then
        showInfo(_("Set up this session with the one-time pairing token first."))
        return
    end
    local result, err = ReaderClient.create_default().files(config())
    if not result then
        showInfo(_("Local file list failed: ") .. tostring(err))
        return
    end
    showInfo(_("Registered local test files: ") .. tostring(#(result.files or {})))
end

local function testSessionEvent()
    if not session_token then
        showInfo(_("Set up this session with the one-time pairing token first."))
        return
    end
    local client = ReaderClient.create_default()
    local files, filesError = client.files(config())
    if not files then
        showInfo(_("Local file list failed: ") .. tostring(filesError))
        return
    end
    local file = files.files and files.files[1]
    if not file then
        showInfo(_("Register one disposable local test file in the Adapter first."))
        return
    end
    local suffix = tostring(os.time()) .. "_" .. tostring(math.floor(os.clock() * 1000000))
    local sessionId = "smoke_" .. suffix
    local start = client.session_event(config(), sessionId, {
        bookFileId = file.bookFileId,
        editionSha256 = file.editionSha256,
        eventId = "start_" .. suffix,
        expectedRevision = 0,
        action = "START",
    })
    if not start or start.status ~= "LOCAL_RECORDED" then
        showInfo(_("Local session START failed or conflicted."))
        return
    end
    local stop = client.session_event(config(), sessionId, {
        bookFileId = file.bookFileId,
        editionSha256 = file.editionSha256,
        eventId = "stop_" .. suffix,
        expectedRevision = start.revision,
        action = "STOP",
    })
    if not stop or stop.status ~= "LOCAL_RECORDED" then
        showInfo(_("Local session START was recorded; STOP failed. Check the Staging session record."))
        return
    end
    showInfo(_("Staging session START/STOP recorded locally. No Official sync was performed."))
end

function GrimmLinkNext:init()
    if self.ui and self.ui.menu then self.ui.menu:registerToMainMenu(self) end
end

function GrimmLinkNext:addToMainMenu(menu_items)
    menu_items.grimmlink_next = {
        text = _("GrimmLink Next"),
        sorting_hint = "tools",
        sub_item_table = {
            { text = _("Setup Staging connection"), callback = setupConnection },
            { text = _("Test connection"), callback = testConnection },
            { text = _("List local test files"), callback = listFiles },
            { text = _("Record session START/STOP smoke test"), callback = testSessionEvent },
            { text = _("Read Grimmory OPDS catalog (read-only)"), callback = readGrimmoryCatalog },
            { text = _("Official Grimmory sync"), callback = function()
                showInfo(_("Disabled in this Staging build. Official forwarding: DENY_ALL."))
            end },
            { text = _("Status"), callback = function()
                showInfo(_("Mode: STAGING_LOCAL_ONLY\nServer: ") .. (setting(SERVER_SETTING) or _("not configured")) ..
                    _("\nPairing token: ") .. (session_token and _("memory only for this KOReader session") or _("not entered")) ..
                    _("\nAutomatic sync: off\nOfficial forwarding: DENY_ALL"))
            end },
            { text = _("About GrimmLink Next"), callback = function()
                showInfo(_("GrimmLink Next 0.2.0\nPrivate Staging client with a bounded read-only Grimmory OPDS catalog probe."))
            end },
        },
    }
end

return GrimmLinkNext
