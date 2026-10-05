-- tools/extract_dungeon_quests.lua
-- Extract dungeon quests from reference/DungeonQuestTracker/Data.lua to JSON

-- Load json library
-- Assuming script is run from project root
local json = dofile("tools/json.lua")

-- Mock the WoW addon environment
local addonName = "DungeonQuestTracker"
local addon = {}
local data_path = "reference/DungeonQuestTracker/Data.lua"

-- Use loadfile instead of dofile to pass arguments
local loader, err = loadfile(data_path)
if not loader then
    io.stderr:write("Error loading data file: " .. tostring(err) .. "\n")
    os.exit(1)
end

-- Run the data file with the expected arguments
loader(addonName, addon)

-- Verify data extraction
if not addon.DUNGEON_DATA then
    io.stderr:write("Error: DUNGEON_DATA not found in addon table\n")
    os.exit(1)
end

-- Only include Classic tab
local classicTab = nil
for _, tab in ipairs(addon.TAB_DEFINITIONS) do
    if tab.value == "classic" then
        classicTab = tab
        break
    end
end

if not classicTab then
    io.stderr:write("Error: Classic tab definition not found\n")
    os.exit(1)
end

-- Filter dungeons to only include those in the classic complexes list
local classicDungeons = {}
local complexMap = {}
for _, name in ipairs(classicTab.complexes) do
    complexMap[name] = true
end

for _, complex in ipairs(addon.DUNGEON_DATA) do
    if complexMap[complex.complex] then
        table.insert(classicDungeons, complex)
    end
end

local result = {
    dungeons = classicDungeons,
    tabs = { classicTab }
}

-- Encode to JSON
local output = json.encode(result)

-- Print to stdout
io.stdout:write(output)
