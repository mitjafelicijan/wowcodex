local atlas_helper = {}

-- Mock AceLibrary
local libraries = {}
local babble_data = {
    ["Babble-Class-2.2"] = {
        ["Druid"] = "Druid", ["Hunter"] = "Hunter", ["Mage"] = "Mage", 
        ["Paladin"] = "Paladin", ["Priest"] = "Priest", ["Rogue"] = "Rogue",
        ["Shaman"] = "Shaman", ["Warlock"] = "Warlock", ["Warrior"] = "Warrior"
    },
    ["Babble-Zone-2.2"] = {},
    ["Babble-Boss-2.2"] = {},
    ["Babble-Spell-2.2"] = {},
    ["Babble-Faction-2.2"] = {},
    ["Babble-ItemSet-2.2"] = {},
}

-- Simple mock for AceLocale
local locales = {
    ["AtlasLoot"] = {}
}
setmetatable(locales["AtlasLoot"], {
    __index = function(t, k)
        return k
    end
})

function _G.AceLibrary(libName)
    if not libraries[libName] then
        libraries[libName] = {
            new = function(self, name) return locales[name] or {} end
        }
        -- Allow lib["Key"] access
        setmetatable(libraries[libName], {
            __index = function(t, k)
                if babble_data[libName] and babble_data[libName][k] then
                    return babble_data[libName][k]
                end
                return k -- Fallback to key name
            end
        })
    end
    return libraries[libName]
end

-- Mock globals
_G.gsub = string.gsub
_G.getglobal = function(name) return _G[name] end
_G.strfind = string.find
_G.strsub = string.sub
_G.strlen = string.len

_G.AtlasLoot_Data = {}
_G.AtlasLootBossButtons = {}
_G.AtlasLoot_TableNames = {}

-- Helper to load Babble translations from Lua files
function atlas_helper.load_babble(libName, path)
    local f = io.open(path, "r")
    if not f then return end
    local content = f:read("*all")
    f:close()
    -- Look for enUS translations
    local section = content:match('RegisterTranslations%("enUS",%s*function%(%)%s*return%s*{(.-)}%s*end%)')
    if not section then
        section = content:match('RegisterTranslations%("enUS",.-return%s*{(.-)}%s*end%)')
    end
    
    if section then
        for key, val in section:gmatch('%["(.-)"%]%s*=%s*(.-)[,;]') do
            if val:find("^true") then
                babble_data[libName][key] = key
            else
                babble_data[libName][key] = val:match('^"(.*)"$') or key
            end
        end
    end
end

-- Helper to load Locale translations
function atlas_helper.load_locale(path)
    local f = io.open(path, "r")
    if not f then return end
    local content = f:read("*all")
    f:close()
    local section = content:match('RegisterTranslations%("enUS",%s*function%(%)%s*return%s*{(.-)}%s*end%)')
    if not section then
        section = content:match('RegisterTranslations%("enUS",.-return%s*{(.-)}%s*end%)')
    end
    if section then
        for key, val in section:gmatch('%["(.-)"%]%s*=%s*(.-)[,;]') do
            if val:find("^true") then
                locales["AtlasLoot"][key] = key
            else
                locales["AtlasLoot"][key] = val:match('^"(.*)"$') or key
            end
        end
    end
end

atlas_helper.texture_map = {}

function atlas_helper.load_texture_map()
    local p = io.popen("ls data/Interface/Icons 2>/dev/null")
    if not p then return end
    local count = 0
    for filename in p:lines() do
        if filename:match("%.png$") then
            local name_no_ext = filename:sub(1, -5)
            atlas_helper.texture_map[name_no_ext:lower()] = name_no_ext
            count = count + 1
        end
    end
    p:close()
end

function atlas_helper.get_icon(icon_name)
    if not icon_name then return "INV_Misc_QuestionMark" end
    icon_name = icon_name:gsub("\\", "/"):match("([^/]+)$") or icon_name
    local lower = icon_name:lower()
    return atlas_helper.texture_map[lower] or icon_name
end

-- Setup default environment
function atlas_helper.setup()
    local root = "reference/AtlasLoot/AtlasLoot/"
    atlas_helper.load_babble("Babble-Boss-2.2", root .. "Libs/Babble-Boss-2.2/Babble-Boss-2.2.lua")
    atlas_helper.load_babble("Babble-Zone-2.2", root .. "Libs/Babble-Zone-2.2/Babble-Zone-2.2.lua")
    atlas_helper.load_locale(root .. "Locale/locale.en.lua")
    atlas_helper.load_texture_map()
    
    -- Merge AtlasLoot locale into Babble-Zone for resolution
    local bz = babble_data["Babble-Zone-2.2"]
    for k, v in pairs(locales["AtlasLoot"]) do
        if not bz[k] then bz[k] = v end
    end
    
    -- Manual Zone Overrides
    bz["SMArmory"] = "SM Armory"
    bz["SMCathedral"] = "SM Cathedral"
    bz["SMGraveyard"] = "SM Graveyard"
    bz["SMLibrary"] = "SM Library"
    bz["TheRuinsofAhnQiraj"] = "Ruins of Ahn'Qiraj"
    bz["TheTempleofAhnQiraj"] = "Temple of Ahn'Qiraj"
    
    -- Normalization map
    local norm_bz = {}
    for k, v in pairs(bz) do
        local norm = k:gsub("%s+", ""):gsub("%(", ""):gsub("%)", ""):gsub("'", "")
        norm_bz[norm] = v
    end
    atlas_helper.normalized_zones = norm_bz

    -- Load TextParsing logic
    loadfile(root .. "Core/TextParsing.lua")()
end

function atlas_helper.format_title(s)
    if not s then return "" end
    return s:gsub("(%l)(%u)", "%1 %2"):gsub("(%d)(%u)", "%1 %2")
end

function atlas_helper.get_instance_name(key)
    local bz = babble_data["Babble-Zone-2.2"]
    if bz[key] then return bz[key] end
    
    if atlas_helper.normalized_zones[key] then
        return atlas_helper.normalized_zones[key]
    end

    -- Handle suffixes
    local base_key = key:gsub("Ent$", ""):gsub("Upper$", ""):gsub("Lower$", "")
    local name = bz[base_key] or atlas_helper.normalized_zones[base_key] or base_key
    
    if key:find("Ent$") then name = name .. " (Entrance)"
    elseif key:find("Upper$") then name = name .. " (Upper)"
    elseif key:find("Lower$") then name = name .. " (Lower)"
    end
    
    -- Final fallback to title casing if it was CamelCase and not found
    if name == base_key then
        name = atlas_helper.format_title(name)
    end

    return name
end

-- Clean text using AtlasLoot_FixText if available
function atlas_helper.clean_text(text)
    if not text then return "" end
    if _G.AtlasLoot_FixText then
        text = _G.AtlasLoot_FixText(text)
    end
    -- Remove quality codes, color codes, etc
    text = text:gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", "")
    text = text:gsub("=q%d+=", ""):gsub("=ds=", ""):gsub("=so%d+=", ""):gsub("=lr=", ""):gsub("=sk%d+=", "")
    text = text:gsub("#%w+#", "") -- Remove any leftover markers
    return text:gsub("^%s+", ""):gsub("%s+$", ""):gsub("%s+", " "):gsub(",$", "")
end

function atlas_helper.get_quality(text)
    if not text then return "Unknown" end
    local q = text:match("=q(%d)=")
    local qualities = {
        ["0"] = "Poor", ["1"] = "Common", ["2"] = "Uncommon", ["3"] = "Rare",
        ["4"] = "Epic", ["5"] = "Legendary", ["6"] = "Artifact"
    }
    return qualities[q] or "Unknown"
end

return atlas_helper
