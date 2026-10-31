local InfoMessage = require("ui/widget/infomessage")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local _ = require("gettext")
local OfflineCore = require("offline_core")

local GrimmLinkNext = WidgetContainer:extend{
    name = "grimmlink_next",
    is_doc_only = false,
}

local function showInfo(text)
    UIManager:show(InfoMessage:new{ text = text })
end

function GrimmLinkNext:init()
    if self.ui and self.ui.menu then
        self.ui.menu:registerToMainMenu(self)
    end
end

function GrimmLinkNext:addToMainMenu(menu_items)
    menu_items.grimmlink_next = {
        text = _("GrimmLink Next"),
        sorting_hint = "tools",
        sub_item_table = {
            {
                text = _("Status"),
                callback = function()
                    showInfo(_("Offline preview only\nServer: not configured\nReader sync: off"))
                end,
            },
            {
                text = _("Connection"),
                sub_item_table = {
                    {
                        text = _("Setup connection"),
                        callback = function()
                            showInfo(_("Connection setup is unavailable in this offline preview."))
                        end,
                    },
                    {
                        text = _("Test connection"),
                        callback = function()
                            showInfo(_("No connection was attempted. The reader bridge is disabled."))
                        end,
                    },
                },
            },
            {
                text = _("Reading progress"),
                callback = function()
                    showInfo(_("Progress sync is disabled. No reader or server data was changed."))
                end,
            },
            {
                text = _("Reading sessions"),
                callback = function()
                    showInfo(_("Session upload is disabled in this offline preview."))
                end,
            },
            {
                text = _("Shelves"),
                callback = function()
                    showInfo(_("Shelf sync and downloads are not connected in this preview."))
                end,
            },
            {
                text = _("Ratings and annotations"),
                callback = function()
                    showInfo(_("Personal data sync is disabled in this offline preview."))
                end,
            },
            {
                text = _("Diagnostics"),
                callback = function()
                    showInfo(_("Mode: ") .. OfflineCore.mode .. _("\nAutomatic sync: off\nNetwork access: none"))
                end,
            },
            {
                text = _("About GrimmLink Next"),
                callback = function()
                    showInfo(_("GrimmLink Next 0.1.0\nInstallable offline preview. Sync features require later releases."))
                end,
            },
        },
    }
end

return GrimmLinkNext
