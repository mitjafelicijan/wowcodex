local helper = require("tools.atlas_helper")
local json = require("tools.json")

helper.setup()

local root = "reference/AtlasLoot/AtlasLoot/"
-- Load instances and loot tables
loadfile(root .. "Instances/instances.en.lua")()
loadfile(root .. "TableRegister/loottables.en.lua")()

-- Map of all class markers
local class_mappings = {
    ["#c1#"] = "Druid", ["#c2#"] = "Hunter", ["#c3#"] = "Mage", ["#c4#"] = "Paladin",
    ["#c5#"] = "Priest", ["#c6#"] = "Rogue", ["#c7#"] = "Shaman", ["#c8#"] = "Warlock", ["#c9#"] = "Warrior"
}
-- Map of all type/profession markers
local type_mappings = {
    ["#a1#"] = "Cloth", ["#a2#"] = "Leather", ["#a3#"] = "Mail", ["#a4#"] = "Plate",
    ["#w1#"] = "Axe", ["#w2#"] = "Bow", ["#w3#"] = "Crossbow", ["#w4#"] = "Dagger",
    ["#w5#"] = "Gun", ["#w6#"] = "Mace", ["#w7#"] = "Polearm", ["#w8#"] = "Shield",
    ["#w9#"] = "Staff", ["#w10#"] = "Sword", ["#w11#"] = "Thrown", ["#w12#"] = "Wand",
    ["#w13#"] = "Fist Weapon", ["#w14#"] = "Fishing Pole",
    ["#s15#"] = "Held In Off-hand", ["#s16#"] = "Relic",
    ["#s13#"] = "Ring", ["#s14#"] = "Trinket", ["#s2#"] = "Neck", ["#e20#"] = "Book"
}
local profession_mappings = {
    ["#p1#"] = "Alchemy", ["#p2#"] = "Blacksmithing", ["#p3#"] = "Cooking", ["#p4#"] = "Enchanting",
    ["#p5#"] = "Engineering", ["#p6#"] = "First Aid", ["#p7#"] = "Leatherworking", ["#p8#"] = "Tailoring"
}

local function extract_tags(text)
    local classes, types, professions = {}, {}, {}
    if not text then return classes, types, professions end
    for k, v in pairs(class_mappings) do if text:find(k, 1, true) then table.insert(classes, v) end end
    for k, v in pairs(type_mappings) do if text:find(k, 1, true) then table.insert(types, v) end end
    for k, v in pairs(profession_mappings) do if text:find(k, 1, true) then table.insert(professions, v) end end
    return classes, types, professions
end

local function get_display_name(key)
    if _G.AtlasLoot_TableNames and _G.AtlasLoot_TableNames[key] then
        local entry = _G.AtlasLoot_TableNames[key]
        return helper.clean_text(entry[1])
    end
    return helper.format_title(key)
end

local final_data = {}

-- Sort keys to maintain consistency
local instance_keys = {}
for k in pairs(_G.AtlasLootBossButtons) do 
    table.insert(instance_keys, k) 
end
table.sort(instance_keys)

for _, inst_key in ipairs(instance_keys) do
    local boss_keys = _G.AtlasLootBossButtons[inst_key]
    local inst_name = helper.get_instance_name(inst_key)
    
    local boss_data = {}
    for _, b_key in ipairs(boss_keys) do
        local loot_table = _G[b_key]
        if not loot_table and _G.AtlasLoot_Data["AtlasLootItems"] then
            loot_table = _G.AtlasLoot_Data["AtlasLootItems"][b_key]
        end

        if b_key ~= "" and loot_table then
            local items = {}
            for _, entry in ipairs(loot_table) do
                local item_id = entry[1]
                if item_id and item_id > 0 then
                    local name_raw = entry[3]
                    local desc_raw = entry[4]
                    local drop_rate = entry[5] or ""
                    
                    local classes, types, professions = extract_tags(desc_raw)
                    
                    table.insert(items, {
                        id = item_id,
                        name = helper.clean_text(name_raw),
                        icon = helper.get_icon(entry[2]),
                        quality = helper.get_quality(name_raw),
                        description = helper.clean_text(desc_raw),
                        drop_rate = drop_rate,
                        classes = classes,
                        types = types,
                        professions = professions
                    })
                end
            end
            
            if #items > 0 then
                local b_name = get_display_name(b_key)
                boss_data[b_name] = items
            end
        end
    end
    
    if next(boss_data) then
        final_data[inst_name] = boss_data
    end
end

io.stdout:write(json.encode(final_data))
