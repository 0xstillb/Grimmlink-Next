-- KOReader client for the private Staging Adapter plus one fixed read-only OPDS probe.
local M = {}

local PREFIX = "/api/grimmlink/v2/local/reader"
local OPDS_URL = "http://192.168.1.116:6060/api/v1/opds"
local MAX_BODY = 8192
local MAX_OPDS_BODY = 262144
local MAX_OPDS_ENTRIES = 1000
local TIMEOUT_SECONDS = 6

local function valid_id(value)
    return type(value) == "string" and #value >= 1 and #value <= 128 and value:match("^[%w_-]+$") ~= nil
end

local function valid_token(value)
    return type(value) == "string" and value:match("^[%w_-]+$") ~= nil and #value == 43
end

local function private_ipv4(host)
    local a, b, c, d = host:match("^(%d+)%.(%d+)%.(%d+)%.(%d+)$")
    if not a then return false end
    a, b, c, d = tonumber(a), tonumber(b), tonumber(c), tonumber(d)
    if a > 255 or b > 255 or c > 255 or d > 255 then return false end
    return a == 10 or (a == 192 and b == 168) or (a == 172 and b >= 16 and b <= 31) or
        (a == 127 and b == 0 and c == 0 and d == 1)
end

local function valid_base_url(value)
    if type(value) ~= "string" or #value > 256 then return false end
    local scheme, host, port = value:match("^(https?)://([%d%.]+):?(%d*)$")
    if scheme ~= "http" or not private_ipv4(host or "") then return false end
    if port ~= "" and (tonumber(port) == nil or tonumber(port) < 1 or tonumber(port) > 65535) then return false end
    return true
end

local function safe_path(path)
    if type(path) ~= "string" or path:sub(1, #PREFIX) ~= PREFIX or path:find("%", 1, true) or
        path:find("?", 1, true) or path:find("#", 1, true) or path:find("..", 1, true) or path:find("//", 1, true) then
        return false
    end
    return true
end

local function valid_opds_credentials(username, password)
    return type(username) == "string" and #username >= 1 and #username <= 256 and
        not username:find("[:%c]") and type(password) == "string" and #password >= 1 and #password <= 1024 and
        not password:find("[%c]")
end

local function content_type_is_atom(headers)
    if type(headers) ~= "table" then return false end
    local content_type = headers["content-type"] or headers["Content-Type"]
    if type(content_type) ~= "string" then return false end
    content_type = content_type:lower():match("^%s*([^;]+)")
    return content_type == "application/atom+xml" or content_type == "application/xml" or content_type == "text/xml"
end

local function parse_opds_summary(body, headers)
    if type(body) ~= "string" or #body > MAX_OPDS_BODY then return nil, "OPDS_RESPONSE_TOO_LARGE" end
    if not content_type_is_atom(headers) then return nil, "OPDS_CONTENT_TYPE_INVALID" end
    if not body:match("<%?xml[%s>]") and not body:match("<feed[%s>]") and not body:match("<feed[%s>][^>]*>") then
        return nil, "OPDS_ATOM_DOCUMENT_INVALID"
    end
    local count = 0
    for _ in body:gmatch("<entry[%s>]") do
        count = count + 1
        if count > MAX_OPDS_ENTRIES then return nil, "OPDS_ENTRY_COUNT_LIMIT" end
    end
    return { entryCount = count, hasNextPage = body:find('rel="next"', 1, true) ~= nil or
        body:find("rel='next'", 1, true) ~= nil }
end

function M.new(dependencies)
    assert(type(dependencies) == "table" and type(dependencies.request) == "function" and
        type(dependencies.encode) == "function" and type(dependencies.decode) == "function", "READER_CLIENT_DEPENDENCIES_INVALID")

    local function call(config, method, path, body)
        if type(config) ~= "table" or not valid_base_url(config.serverUrl) or not valid_id(config.deviceId) or
            not valid_token(config.token) or not safe_path(path) then
            return nil, "READER_CLIENT_CONFIG_INVALID"
        end
        if method ~= "GET" and method ~= "POST" and method ~= "PUT" then return nil, "READER_CLIENT_METHOD_INVALID" end
        local encoded
        if body ~= nil then
            local ok, result = pcall(dependencies.encode, body)
            if not ok or type(result) ~= "string" or #result > MAX_BODY then return nil, "READER_CLIENT_BODY_INVALID" end
            encoded = result
        end
        local ok, response = pcall(dependencies.request, {
            url = config.serverUrl .. path,
            method = method,
            body = encoded,
            timeout = TIMEOUT_SECONDS,
            maxBody = MAX_BODY,
            followRedirects = false,
            headers = {
                ["accept"] = "application/json",
                ["authorization"] = "Bearer " .. config.token,
                ["x-reader-device-id"] = config.deviceId,
                ["x-content-type-options"] = "nosniff",
            },
        })
        if not ok or type(response) ~= "table" or type(response.status) ~= "number" or
            type(response.body) ~= "string" or #response.body > MAX_BODY then
            return nil, "READER_CLIENT_TRANSPORT_FAILED"
        end
        if response.status >= 300 and response.status < 400 then return nil, "READER_CLIENT_REDIRECT_DENIED" end
        local decodedOk, decoded = pcall(dependencies.decode, response.body)
        if not decodedOk or type(decoded) ~= "table" then return nil, "READER_CLIENT_RESPONSE_INVALID" end
        if response.status < 200 or response.status >= 300 then
            return nil, "READER_CLIENT_HTTP_" .. tostring(response.status), decoded
        end
        return decoded
    end

    local client = {
        status = function(config) return call(config, "GET", PREFIX .. "/status") end,
        files = function(config) return call(config, "GET", PREFIX .. "/files") end,
        session_event = function(config, session_id, event)
            if not valid_id(session_id) then return nil, "READER_CLIENT_SESSION_INVALID" end
            return call(config, "POST", PREFIX .. "/sessions/" .. session_id, event)
        end,
        valid_base_url = valid_base_url,
        read_opds_catalog = function(username, password)
            if not valid_opds_credentials(username, password) then return nil, "OPDS_CREDENTIALS_INVALID" end
            if type(dependencies.base64) ~= "function" then return nil, "OPDS_AUTH_UNAVAILABLE" end
            local ok, encoded = pcall(dependencies.base64, username .. ":" .. password)
            if not ok or type(encoded) ~= "string" or #encoded > 2048 then return nil, "OPDS_AUTH_UNAVAILABLE" end
            local requestOk, response = pcall(dependencies.request, {
                url = OPDS_URL,
                method = "GET",
                timeout = TIMEOUT_SECONDS,
                maxBody = MAX_OPDS_BODY,
                followRedirects = false,
                headers = {
                    ["accept"] = "application/atom+xml, application/xml;q=0.9",
                    ["authorization"] = "Basic " .. encoded,
                    ["connection"] = "close",
                },
            })
            encoded = nil
            if not requestOk or type(response) ~= "table" or type(response.status) ~= "number" or
                type(response.body) ~= "string" or #response.body > MAX_OPDS_BODY then
                return nil, "OPDS_TRANSPORT_FAILED"
            end
            if response.status >= 300 and response.status < 400 then return nil, "OPDS_REDIRECT_DENIED" end
            if response.status < 200 or response.status >= 300 then return nil, "OPDS_HTTP_" .. tostring(response.status) end
            return parse_opds_summary(response.body, response.headers)
        end,
    }
    return client
end

function M.create_default()
    local http = require("socket.http")
    local ltn12 = require("ltn12")
    local json = require("rapidjson")
    local mime = require("mime")

    local function request(options)
        if options.url ~= OPDS_URL and options.url:sub(1, 7) ~= "http://" and options.url:sub(1, 8) ~= "https://" then return nil end
        local chunks, size = {}, 0
        local function sink(chunk)
            if chunk == nil then return 1 end
            size = size + #chunk
            if size > options.maxBody then return nil, "RESPONSE_TOO_LARGE" end
            chunks[#chunks + 1] = chunk
            return 1
        end
        local headers = {}
        for key, value in pairs(options.headers or {}) do headers[key] = value end
        local requestOptions = {
            url = options.url,
            method = options.method,
            headers = headers,
            sink = sink,
            redirect = false,
        }
        if options.body then
            requestOptions.source = ltn12.source.string(options.body)
            headers["content-type"] = "application/json"
            headers["content-length"] = tostring(#options.body)
        end
        local oldTimeout, oldProxy = http.TIMEOUT, http.PROXY
        http.TIMEOUT = options.timeout
        -- The catalog URL is a private fixed IP. Bypass any KOReader HTTP
        -- proxy so the Basic credential cannot be sent to a proxy host.
        http.PROXY = nil
        local callOk, ok, code, responseHeaders = pcall(http.request, requestOptions)
        http.TIMEOUT, http.PROXY = oldTimeout, oldProxy
        if not callOk or not ok then return nil end
        local normalizedHeaders = {}
        for key, value in pairs(responseHeaders or {}) do normalizedHeaders[key:lower()] = value end
        return { status = tonumber(code), body = table.concat(chunks), headers = normalizedHeaders }
    end

    return M.new({ request = request, encode = json.encode, decode = json.decode, base64 = mime.b64 })
end

M.OPDS_URL = OPDS_URL
M.MAX_OPDS_BODY = MAX_OPDS_BODY
M.parse_opds_summary = parse_opds_summary
M.is_valid_base_url = valid_base_url

return M
