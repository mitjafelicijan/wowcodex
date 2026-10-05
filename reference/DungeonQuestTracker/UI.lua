local addonName, addon = ...
local DungeonQuestTracker = addon

local AceGUI = LibStub("AceGUI-3.0")

local mainFrame = nil
local currentTab = "classic"
local searchText = ""
local searchBox = nil

-- Status icons using WoW raid readycheck textures
local STATUS_ICONS = {
    completed   = "|TInterface\\RAIDFRAME\\ReadyCheck-Ready:0|t",
    in_progress = "|TInterface\\RAIDFRAME\\ReadyCheck-Waiting:0|t",
    not_started = "|TInterface\\RAIDFRAME\\ReadyCheck-NotReady:0|t",
}

function DungeonQuestTracker:ToggleUI()
    if mainFrame and mainFrame:IsShown() then
        mainFrame:Hide()
    else
        self:ShowUI()
    end
end

function DungeonQuestTracker:AutoSwitchTab()
    if not self.tabGroup then return false end
    local instanceName = self:GetCurrentInstanceName()
    if not instanceName then return false end
    local targetTab = self:FindTabForInstance(instanceName)
    if targetTab and targetTab ~= currentTab then
        currentTab = targetTab
        self.db.profile.lastTab = targetTab
        self.tabGroup:SelectTab(targetTab)
        return true
    end
    return false
end

function DungeonQuestTracker:OnZoneChangedUI()
    if not mainFrame or not mainFrame:IsShown() then return end
    if not self:AutoSwitchTab() then
        self:RefreshUI()
    end
end

function DungeonQuestTracker:ShowUI()
    if mainFrame then
        self:InvalidateCache()
        self:UpdateStatusBar()
        if not self:AutoSwitchTab() then
            self:RefreshUI()
        end
        mainFrame:Show()
        return
    end

    mainFrame = AceGUI:Create("Frame")
    mainFrame:SetTitle("Dungeon Quest Tracker")
    mainFrame:SetStatusText("")
    mainFrame:SetLayout("Fill")
    mainFrame:SetWidth(650)
    mainFrame:SetHeight(550)
    mainFrame:SetCallback("OnClose", function(widget)
        widget:Hide()
    end)

    -- Register for ESC-to-close
    _G["DQTMainFrame"] = mainFrame.frame
    tinsert(UISpecialFrames, "DQTMainFrame")

    -- Build tab list from TAB_DEFINITIONS
    local tabs = {}
    for _, tabDef in ipairs(self.TAB_DEFINITIONS) do
        table.insert(tabs, { text = tabDef.text, value = tabDef.value })
    end

    local tabGroup = AceGUI:Create("TabGroup")
    tabGroup:SetLayout("Fill")
    tabGroup:SetTabs(tabs)
    tabGroup:SetCallback("OnGroupSelected", function(container, _, group)
        currentTab = group
        self.db.profile.lastTab = group
        self:RefreshTabContent(container, group)
    end)

    mainFrame:AddChild(tabGroup)

    -- Restore last tab or default to classic
    local lastTab = self.db.profile.lastTab or "classic"
    -- Migrate old "summary" or "dungeons" tab values
    if lastTab == "summary" or lastTab == "dungeons" then
        lastTab = "classic"
    end
    -- Auto-switch to tab containing current instance
    local instanceName = self:GetCurrentInstanceName()
    if instanceName then
        local targetTab = self:FindTabForInstance(instanceName)
        if targetTab then
            lastTab = targetTab
        end
    end
    currentTab = lastTab
    tabGroup:SelectTab(lastTab)

    self.tabGroup = tabGroup
    self:UpdateStatusBar()
end

function DungeonQuestTracker:UpdateStatusBar()
    if not mainFrame then return end
    local totalQuests, totalCompleted, totalInProgress = self:GetOverallStats()
    local pct = totalQuests > 0 and math.floor((totalCompleted / totalQuests) * 100) or 0

    local pctColor = pct == 100 and "|cff00cc00" or (pct >= 50 and "|cffffcc00" or "|cffff6644")
    local progressStr = pctColor .. totalCompleted .. "/" .. totalQuests .. " (" .. pct .. "%)|r"

    local statusParts = { "Overall: " .. progressStr }
    if totalInProgress > 0 then
        table.insert(statusParts, "|cffffff00" .. totalInProgress .. "|r in progress")
    end

    mainFrame:SetStatusText(table.concat(statusParts, "  |cff666666-|r  "))
end

function DungeonQuestTracker:RefreshUI()
    if self.tabGroup then
        self:RefreshTabContent(self.tabGroup, currentTab)
    end
end

function DungeonQuestTracker:RefreshTabContent(container, tab)
    container:ReleaseChildren()

    -- Scroll frame as the single Fill child
    local scroll = AceGUI:Create("ScrollFrame")
    scroll:SetLayout("List")
    scroll:SetFullWidth(true)
    scroll:SetFullHeight(true)
    container:AddChild(scroll)

    -- Search box as first item inside scroll
    local searchWidget = AceGUI:Create("EditBox")
    searchWidget:SetLabel("Search")
    searchWidget:SetText(searchText)
    searchWidget:SetFullWidth(true)
    searchWidget:DisableButton(true)
    searchWidget:SetCallback("OnTextChanged", function(_, _, text)
        searchText = text or ""
        if self._searchTimer then
            self._searchTimer:Cancel()
        end
        self._searchTimer = C_Timer.NewTimer(0.2, function()
            self._searchRefresh = true
            self:RefreshUI()
        end)
    end)
    searchWidget:SetCallback("OnEnterPressed", function(_, _, text)
        searchText = text or ""
        self._searchRefresh = true
        self:RefreshUI()
    end)
    -- ESC in search box should close the whole frame
    searchWidget.editbox:HookScript("OnEscapePressed", function()
        mainFrame:Hide()
    end)
    scroll:AddChild(searchWidget)

    searchBox = searchWidget

    -- Find the tab definition
    local tabDef = nil
    for _, def in ipairs(self.TAB_DEFINITIONS) do
        if def.value == tab then
            tabDef = def
            break
        end
    end

    if not tabDef then return end

    -- Detect current instance for highlighting and sorting
    local currentInstanceName = self:GetCurrentInstanceName()

    -- Collect complexes for this tab, sorting current instance to top
    local orderedComplexes = {}
    local currentInstanceComplex = nil
    for _, complexName in ipairs(tabDef.complexes) do
        for _, complex in ipairs(self.DUNGEON_DATA) do
            if complex.complex == complexName then
                local isCurrentComplex = false
                if currentInstanceName then
                    for _, dungeon in ipairs(complex.dungeons) do
                        if self:MatchesDungeon(dungeon.name, currentInstanceName) then
                            isCurrentComplex = true
                        end
                    end
                end
                if isCurrentComplex then
                    currentInstanceComplex = complex
                else
                    table.insert(orderedComplexes, complex)
                end
            end
        end
    end
    if currentInstanceComplex then
        table.insert(orderedComplexes, 1, currentInstanceComplex)
    end

    -- Draw dungeons
    local hasResults = false
    for _, complex in ipairs(orderedComplexes) do
        local drew = self:DrawComplex(scroll, complex, currentInstanceName)
        if drew then hasResults = true end
    end

    -- No results message when searching
    if not hasResults and searchText ~= "" then
        local noResults = AceGUI:Create("Label")
        noResults:SetText("\n  |cff999999No quests or dungeons matching \"|r" .. searchText .. "|cff999999\" found.|r")
        noResults:SetFullWidth(true)
        scroll:AddChild(noResults)
    end

    -- Deferred layout recalculation to fix scroll content height
    C_Timer.After(0, function()
        if scroll and scroll.frame then
            scroll:DoLayout()
        end
        -- Refocus search box after search-triggered rebuild
        if self._searchRefresh and searchBox and searchBox.editbox then
            self._searchRefresh = false
            searchBox.editbox:SetFocus()
            searchBox.editbox:SetCursorPosition(#searchText)
        end
    end)
end

function DungeonQuestTracker:DrawComplex(container, complex, currentInstanceName)
    -- Sort current instance dungeon to top within the complex
    local orderedDungeons = {}
    local currentDungeon = nil
    for _, dungeon in ipairs(complex.dungeons) do
        if currentInstanceName and self:MatchesDungeon(dungeon.name, currentInstanceName) then
            currentDungeon = dungeon
        else
            table.insert(orderedDungeons, dungeon)
        end
    end
    if currentDungeon then
        table.insert(orderedDungeons, 1, currentDungeon)
    end

    local drewAny = false
    for _, dungeon in ipairs(orderedDungeons) do
        local total, completed, inProgress = self:GetDungeonStats(dungeon)

        if total > 0 and not (completed == total and not self.db.profile.showCompletedDungeons) then
            if self:FuzzyMatchDungeon(dungeon, searchText) then
                local isCurrentInstance = currentInstanceName and
                    self:MatchesDungeon(dungeon.name, currentInstanceName)
                self:DrawDungeon(container, dungeon, total, completed, inProgress, isCurrentInstance)
                drewAny = true
            end
        end
    end
    return drewAny
end

function DungeonQuestTracker:DrawDungeon(container, dungeon, total, completed, inProgress, isCurrentInstance)
    -- Collect prerequisite quest IDs to avoid drawing them as top-level
    local prereqIds = {}
    if self.db.profile.showPrerequisites then
        for _, quest in ipairs(dungeon.quests) do
            if self:ShouldShowQuest(quest) and quest.prerequisites then
                for _, prereq in ipairs(quest.prerequisites) do
                    prereqIds[prereq.questId] = true
                end
            end
        end
    end

    -- Check if dungeon name itself matched (show all quests) vs quest-level match
    local dungeonNameMatches = searchText == "" or
        (dungeon.name and dungeon.name:lower():find(searchText:lower(), 1, true) ~= nil)

    -- Collect visible quests first to avoid empty groups
    local visibleQuests = {}
    for _, quest in ipairs(dungeon.quests) do
        if self:ShouldShowQuest(quest) and not prereqIds[quest.questId] then
            if dungeonNameMatches or self:FuzzyMatchQuest(quest, searchText) then
                -- Hide completed quests when Show Completed is off
                if self.db.profile.showCompletedDungeons or self:GetQuestStatus(quest.questId) ~= "completed" then
                    table.insert(visibleQuests, quest)
                end
            end
        end
    end

    if #visibleQuests == 0 then return end

    -- Header icon based on completion
    local headerIcon
    if completed == total then
        headerIcon = STATUS_ICONS.completed .. " "
    elseif completed > 0 or inProgress > 0 then
        headerIcon = STATUS_ICONS.in_progress .. " "
    else
        headerIcon = ""
    end

    -- Color the completion count
    local countColor
    if completed == total then
        countColor = "00cc00"
    elseif completed > 0 or inProgress > 0 then
        countColor = "ffcc00"
    else
        countColor = "ff4444"
    end

    -- Level range display
    local levelStr = ""
    if dungeon.levelRange and dungeon.levelRange ~= "" then
        levelStr = string.format(" |cff888888(%s)|r", dungeon.levelRange)
    end

    local title = string.format("%s%s%s  |cff%s%d/%d|r",
        headerIcon, dungeon.name, levelStr, countColor, completed, total)

    local group = AceGUI:Create("InlineGroup")
    group:SetTitle(title)
    group:SetFullWidth(true)
    group:SetLayout("List")
    container:AddChild(group)

    -- Highlight current instance dungeon
    if isCurrentInstance and group.content then
        local bg = group.content:CreateTexture(nil, "BACKGROUND")
        bg:SetAllPoints()
        bg:SetColorTexture(0.2, 0.6, 1.0, 0.08)
    end

    for _, quest in ipairs(visibleQuests) do
        local hasPrereqs = self.db.profile.showPrerequisites and quest.prerequisites and #quest.prerequisites > 0
        if hasPrereqs then
            local drawnPrereqs = 0
            for _, prereq in ipairs(quest.prerequisites) do
                if self.db.profile.showCompletedDungeons or self:GetQuestStatus(prereq.questId) ~= "completed" then
                    self:DrawPrereqRow(group, prereq, drawnPrereqs)
                    drawnPrereqs = drawnPrereqs + 1
                end
            end
            self:DrawQuestRow(group, quest, drawnPrereqs)
        else
            self:DrawQuestRow(group, quest, 0)
        end
    end
end

function DungeonQuestTracker:DrawQuestRow(container, quest, indentLevel)
    local status = self:GetQuestStatus(quest.questId)
    local icon = STATUS_ICONS[status] or STATUS_ICONS.not_started

    local heroicTag = ""
    if quest.heroic then
        heroicTag = " |cffff8800[Heroic]|r"
    end

    local factionTag = ""
    if not self.db.profile.showOnlyCurrentFaction and quest.faction ~= "Both" then
        if quest.faction == "Alliance" then
            factionTag = " |cff4488ff[A]|r"
        else
            factionTag = " |cffff2020[H]|r"
        end
    end

    -- Quest name color based on status
    local nameColor
    if status == "completed" then
        nameColor = "6a6a6a"
    elseif status == "in_progress" then
        nameColor = "ffff66"
    else
        nameColor = "eeeeee"
    end

    -- Level tag: show in red/green if quest has a level and is not completed
    local levelTag = ""
    if quest.level and status ~= "completed" then
        local playerLevel = UnitLevel("player")
        local levelColor = playerLevel >= quest.level and "00cc00" or "ff4444"
        levelTag = string.format(" |cff%s(%d)|r", levelColor, quest.level)
    end

    local indent = "  " .. string.rep("    ", indentLevel or 0)
    local text = string.format("%s%s  |cff%s%s|r%s%s%s",
        indent, icon, nameColor, quest.name, levelTag, heroicTag, factionTag)

    local row = AceGUI:Create("InteractiveLabel")
    row:SetText(text)
    row:SetFullWidth(true)
    row:SetCallback("OnClick", function()
        self:ShowWowheadLink(quest.questId, quest.name)
    end)
    row:SetCallback("OnEnter", function(widget)
        GameTooltip:SetOwner(widget.frame, "ANCHOR_TOPRIGHT")
        GameTooltip:AddLine(quest.name, 1, 1, 1)
        if quest.description and quest.description ~= "" then
            GameTooltip:AddLine(quest.description, 0.8, 0.8, 0.8, true)
        end
        GameTooltip:AddLine(" ")
        if status == "completed" then
            GameTooltip:AddLine("Completed", 0, 0.8, 0)
        elseif status == "in_progress" then
            GameTooltip:AddLine("In Progress", 1, 1, 0)
        else
            GameTooltip:AddLine("Not Started", 0.6, 0.6, 0.6)
        end
        if quest.heroic then
            GameTooltip:AddLine("Requires Heroic difficulty", 1, 0.5, 0)
        end
        if quest.faction ~= "Both" then
            GameTooltip:AddLine(string.format("Faction: %s", quest.faction), 0.5, 0.5, 0.5)
        end
        GameTooltip:AddLine(" ")
        GameTooltip:AddLine("Click to copy Wowhead link", 0, 0.8, 0)
        GameTooltip:Show()
    end)
    row:SetCallback("OnLeave", function()
        GameTooltip:Hide()
    end)

    container:AddChild(row)
end

function DungeonQuestTracker:DrawPrereqRow(container, prereq, depth)
    local status = self:GetQuestStatus(prereq.questId)
    local icon = STATUS_ICONS[status] or STATUS_ICONS.not_started

    local nameColor = status == "completed" and "6a6a6a" or "aa9977"

    local indent = "  " .. string.rep("    ", depth or 0)
    local text = string.format("%s%s  |cff%s%s|r |cff666666[Pre]|r", indent, icon, nameColor, prereq.name)

    local row = AceGUI:Create("InteractiveLabel")
    row:SetText(text)
    row:SetFullWidth(true)
    row:SetCallback("OnClick", function()
        self:ShowWowheadLink(prereq.questId, prereq.name)
    end)
    row:SetCallback("OnEnter", function(widget)
        GameTooltip:SetOwner(widget.frame, "ANCHOR_TOPRIGHT")
        GameTooltip:AddLine(prereq.name, 1, 1, 1)
        GameTooltip:AddLine("Prerequisite quest", 1, 0.82, 0)
        GameTooltip:AddLine(string.format("Quest ID: %d", prereq.questId), 0.5, 0.5, 0.5)
        GameTooltip:AddLine(" ")
        GameTooltip:AddLine("Click to copy Wowhead link", 0, 0.8, 0)
        GameTooltip:Show()
    end)
    row:SetCallback("OnLeave", function()
        GameTooltip:Hide()
    end)

    container:AddChild(row)
end

function DungeonQuestTracker:ShowWowheadLink(questId, questName)
    local url = string.format("https://www.wowhead.com/tbc/quest=%d", questId)

    if not self.linkFrame then
        local frame = CreateFrame("Frame", "DQTLinkFrame", UIParent, "BasicFrameTemplateWithInset")
        frame:SetSize(450, 100)
        frame:SetPoint("TOP", UIParent, "TOP", 0, -100)
        frame:SetMovable(true)
        frame:EnableMouse(true)
        frame:RegisterForDrag("LeftButton")
        frame:SetScript("OnDragStart", frame.StartMoving)
        frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
        frame:SetFrameStrata("TOOLTIP")
        frame:SetFrameLevel(100)

        frame.title = frame:CreateFontString(nil, "OVERLAY")
        frame.title:SetFontObject("GameFontHighlight")
        frame.title:SetPoint("LEFT", frame.TitleBg, "LEFT", 5, 0)

        local editBox = CreateFrame("EditBox", nil, frame)
        editBox:SetPoint("TOPLEFT", 15, -35)
        editBox:SetPoint("BOTTOMRIGHT", -15, 15)
        editBox:SetFontObject("ChatFontNormal")
        editBox:SetAutoFocus(true)
        editBox:SetScript("OnEscapePressed", function() frame:Hide() end)
        editBox:SetScript("OnEnterPressed", function() frame:Hide() end)
        -- Close after Ctrl+C: detect when text gets deselected (copy happened)
        editBox:SetScript("OnKeyUp", function(_, key)
            if key == "C" and IsControlKeyDown() then
                C_Timer.After(0.2, function() frame:Hide() end)
            end
        end)

        frame.editBox = editBox
        self.linkFrame = frame
    end

    self.linkFrame.title:SetText(questName .. " - Ctrl+C to copy")
    self.linkFrame.editBox:SetText(url)
    self.linkFrame.editBox:HighlightText()
    self.linkFrame:Show()
    self.linkFrame.editBox:SetFocus()
end
