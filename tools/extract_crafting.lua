local helper = require("tools.atlas_helper")
local json = require("tools.json")

helper.setup()

local root = "reference/AtlasLoot/AtlasLoot/"
-- Load crafting data and spells
loadfile(root .. "Crafting/crafting.en.lua")()

-- Mock enough for Spells.lua
loadfile(root .. "Core/Spells.lua")()

local spells = _G.GetSpellInfoVanillaDB or {}

-- Map of all class markers
local class_mappings = {
    ["#c1#"] = "Druid", ["#c2#"] = "Hunter", ["#c3#"] = "Mage", ["#c4#"] = "Paladin",
    ["#c5#"] = "Priest", ["#c6#"] = "Rogue", ["#c7#"] = "Shaman", ["#c8#"] = "Warlock", ["#c9#"] = "Warrior"
}
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

local function extract_skill_levels(text)
    local levels = {}
    if not text then return levels end
    for i = 1, 4 do
        local val = text:match("=so" .. i .. "=(%d+)")
        if val then levels[tostring(i)] = tonumber(val) end
    end
    return levels
end

local function clean_description(desc, skill_levels)
    local d = helper.clean_text(desc)
    for _, lvl in pairs(skill_levels) do
        d = d:gsub("%f[%d]" .. lvl .. "%f[%D]", "")
    end
    return d:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
end

local categories = {
    ["Alchemy"] = {"AlchemyApprentice", "AlchemyJourneyman", "AlchemyExpert", "AlchemyArtisan"},
    ["Blacksmithing"] = {"SmithingApprentice", "SmithingJourneyman", "SmithingExpert", "SmithingArtisan", "Armorsmith", "Weaponsmith", "Axesmith", "Hammersmith", "Swordsmith"},
    ["Enchanting"] = {"EnchantingApprentice", "EnchantingJourneyman", "EnchantingExpert", "EnchantingArtisan"},
    ["Engineering"] = {"EngineeringApprentice", "EngineeringJourneyman", "EngineeringExpert", "EngineeringArtisan", "Gnomish", "Goblin"},
    ["Leatherworking"] = {"LeatherApprentice", "LeatherJourneyman", "LeatherExpert", "LeatherArtisan", "Dragonscale", "Elemental", "Tribal"},
    ["Tailoring"] = {"TailoringApprentice", "TailoringJourneyman", "TailoringExpert", "TailoringArtisan"},
    ["Cooking"] = {"CookingApprentice", "CookingJourneyman", "CookingExpert", "CookingArtisan"},
    ["First Aid"] = {"FirstAid"},
    ["Poisons"] = {"Poisons"},
    ["Crafted Sets"] = {"ImperialPlate", "TheDarksoul", "BloodsoulEmbrace", "BloodvineG", "VolcanicArmor", "IronfeatherArmor", "StormshroudArmor", "DevilsaurArmor", "BloodTigerH", "PrimalBatskin", "GreenDragonM", "BlueDragonM", "BlackDragonM"},
    ["Crafted Epic Weapons"] = {"CraftedWeapons"}
}

local final_data = {}

for prof, table_prefixes in pairs(categories) do
    local prof_data = {}
    for _, prefix in ipairs(table_prefixes) do
        local source_tables = _G.AtlasLoot_Data["AtlasLootCrafting"] or {}
        for t_name, loot_table in pairs(source_tables) do
            if type(loot_table) == "table" and t_name:find("^" .. prefix) then
                local items = {}
                for _, entry in ipairs(loot_table) do
                    local raw_id = tostring(entry[1])
                    if raw_id ~= "0" and raw_id ~= "nil" then
                        local res_id, res_type
                        if raw_id:find("^s") or raw_id:find("^e") then
                            local sid = tonumber(raw_id:sub(2))
                            local s_data = (spells["craftspells"] and spells["craftspells"][sid]) or (spells["enchants"] and spells["enchants"][sid])
                            local item_id = s_data and (s_data.item or s_data.craftItem)
                            if item_id then
                                res_id = item_id
                                res_type = "item"
                            else
                                res_id = sid
                                res_type = "spell"
                            end
                        else
                            res_id = tonumber(raw_id)
                            res_type = "item"
                        end
                        
                        if res_id then
                            local name_raw = entry[3]
                            local desc_raw = entry[4]
                            local classes, types, professions = extract_tags(desc_raw)
                            local skill_levels = extract_skill_levels(desc_raw)
                            
                            table.insert(items, {
                                id = res_id,
                                type = res_type,
                                name = helper.clean_text(name_raw),
                                icon = helper.get_icon(entry[2]),
                                quality = helper.get_quality(name_raw),
                                description = clean_description(desc_raw, skill_levels),
                                classes = classes,
                                types = types,
                                professions = professions,
                                skill_levels = skill_levels
                            })
                        end
                    end
                end
                
                if #items > 0 then
                    local display_name = t_name:gsub(prof:gsub("%s+", ""), ""):gsub("1$", ""):gsub("2$", ""):gsub("3$", "")
                    if display_name == "" then display_name = prof else display_name = helper.format_title(display_name) end
                    
                    prof_data[display_name] = prof_data[display_name] or {}
                    for _, it in ipairs(items) do table.insert(prof_data[display_name], it) end
                end
            end
        end
    end
    if next(prof_data) then
        final_data[prof] = prof_data
    end
end

io.stdout:write(json.encode(final_data))
