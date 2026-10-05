let questData = null;

async function init() {
    try {
        const response = await fetch('dungeon_quests.json');
        questData = await response.json();
        
        renderSidebar();
        
        // Show first dungeon from first tab by default
        if (questData.tabs && questData.tabs.length > 0) {
            const firstComplex = questData.tabs[0].complexes[0];
            selectComplex(firstComplex);
        }

        const searchInput = document.getElementById('search-input');
        searchInput.oninput = () => {
            const term = searchInput.value.trim().toLowerCase();
            if (term.length > 0) {
                searchQuests(term);
            } else if (questData.tabs && questData.tabs.length > 0) {
                // Restore selection if search is cleared
                const active = document.querySelector('.dungeon-item.active');
                if (active) {
                    selectComplex(active.dataset.complex);
                }
            }
        };

        const factionFilter = document.getElementById('filter-faction');
        factionFilter.onchange = () => {
            const active = document.querySelector('.dungeon-item.active');
            if (active) {
                selectComplex(active.dataset.complex);
            } else {
                const term = searchInput.value.trim().toLowerCase();
                if (term.length > 0) {
                    searchQuests(term);
                }
            }
        };

    } catch (err) {
        console.error('Failed to load quest data:', err);
        document.getElementById('quest-container').innerHTML = '<div class="no-results">Error loading quest data.</div>';
    }
}

function renderSidebar() {
    const tree = document.getElementById('dungeon-tree');
    tree.innerHTML = '';
    
    questData.tabs.forEach(tab => {
        const group = document.createElement('div');
        group.className = 'expansion-group';
        
        const list = document.createElement('ul');
        list.className = 'dungeon-list';
        
        tab.complexes.forEach(complexName => {
            const li = document.createElement('li');
            li.className = 'dungeon-item';
            li.textContent = complexName;
            li.dataset.complex = complexName;
            li.onclick = () => selectComplex(complexName);
            list.appendChild(li);
        });
        
        group.appendChild(list);
        tree.appendChild(group);
    });
}

function selectComplex(complexName) {
    // UI Update
    document.querySelectorAll('.dungeon-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.complex === complexName) el.classList.add('active');
    });

    const container = document.getElementById('quest-container');
    container.innerHTML = '';

    const complex = questData.dungeons.find(d => d.complex === complexName);
    if (complex) {
        renderComplex(container, complex, true); // Use tree view
    } else {
        container.innerHTML = '<div class="no-results">Dungeon complex not found.</div>';
    }
    
    // Refresh tooltips
    if (window.$WowheadPower && typeof window.$WowheadPower.refreshLinks === 'function') {
        window.$WowheadPower.refreshLinks();
    }
}

function matchesFaction(questFaction, filterFaction) {
    if (!filterFaction) return true;
    if (filterFaction === "Both") return questFaction === "Both";
    return questFaction === filterFaction || questFaction === "Both";
}

function renderComplex(container, complex, useTree = false) {
    const complexTemplate = document.getElementById('complex-template');
    const factionFilter = document.getElementById('filter-faction').value;
    
    const sectionClone = complexTemplate.content.cloneNode(true);
    sectionClone.querySelector('.complex-name').textContent = complex.complex;
    const questList = sectionClone.querySelector('.quest-list');

    let totalVisibleQuests = 0;

    complex.dungeons.forEach(dungeon => {
        const filteredQuests = dungeon.quests.filter(q => matchesFaction(q.faction, factionFilter));
        if (filteredQuests.length === 0) return;

        totalVisibleQuests += filteredQuests.length;

        if (complex.dungeons.length > 1) {
            const dungeonHeader = document.createElement('h4');
            dungeonHeader.className = 'dungeon-wing-title';
            dungeonHeader.textContent = `${dungeon.name} (${dungeon.levelRange})`;
            questList.appendChild(dungeonHeader);
        }

        if (useTree) {
            renderQuestTree(questList, filteredQuests, complex.complex);
        } else {
            filteredQuests.forEach(quest => {
                renderQuest(questList, quest, null, complex.complex);
            });
        }
    });

    if (totalVisibleQuests > 0) {
        container.appendChild(sectionClone);
    } else {
        container.innerHTML = '<div class="no-results">No quests match your filters for this dungeon.</div>';
    }
}

function renderQuestTree(container, quests, context) {
    const questMap = new Map();
    quests.forEach(q => {
        questMap.set(q.questId, { ...q, children: [] });
    });

    const roots = [];
    questMap.forEach(q => {
        let parentFound = false;
        if (q.prerequisites && q.prerequisites.length > 0) {
            for (const pre of q.prerequisites) {
                if (questMap.has(pre.questId)) {
                    questMap.get(pre.questId).children.push(q);
                    parentFound = true;
                    break;
                }
            }
        }
        if (!parentFound) {
            roots.push(q);
        }
    });

    roots.forEach(root => {
        renderRecursive(container, root, questMap, context);
    });
}

function renderRecursive(container, quest, questMap, context) {
    const questElement = renderQuest(null, quest, questMap, context);
    if (!questElement) return;
    
    container.appendChild(questElement);

    if (quest.children && quest.children.length > 0) {
        const childrenContainer = questElement.querySelector('.quest-children');
        if (childrenContainer) {
            childrenContainer.classList.remove('hidden');
            quest.children.forEach(child => {
                renderRecursive(childrenContainer, child, questMap, context);
            });
        }
    }
}

function renderQuest(container, quest, questMap = null, context = null) {
    const questTemplate = document.getElementById('quest-template');
    if (!questTemplate) return null;

    const questClone = questTemplate.content.cloneNode(true);
    const questElement = questClone.querySelector('.quest-entry');
    if (!questElement) return null;
    
    const link = questElement.querySelector('.quest-link');
    if (link) {
        link.href = `https://classicdb.ch/?quest=${quest.questId}`;
        link.rel = `quest=${quest.questId}`;
        link.textContent = quest.name;
    }

    // Watchlist toggle
    const toggle = questElement.querySelector('.quest-watchlist-toggle');
    if (toggle) {
        const isWatched = Watchlist.isWatched('quests', quest.questId);
        toggle.textContent = isWatched ? '★' : '☆';
        if (isWatched) toggle.classList.add('watched');
        
        toggle.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const added = Watchlist.toggle('quests', quest.questId, quest, context);
            toggle.textContent = added ? '★' : '☆';
            toggle.classList.toggle('watched', added);
        };
    }
    
    const levelEl = questElement.querySelector('.quest-level');
    if (levelEl) {
        levelEl.textContent = quest.level || '??';
    }
    
    const factionEl = questElement.querySelector('.quest-faction');
    if (factionEl) {
        factionEl.textContent = quest.faction;
        factionEl.classList.add(`faction-${quest.faction}`);
    }
    
    const heroicEl = questElement.querySelector('.quest-heroic');
    if (heroicEl && quest.heroic) {
        heroicEl.classList.remove('hidden');
    }
    
    const descEl = questElement.querySelector('.quest-description');
    if (descEl) {
        descEl.textContent = quest.description || '';
    }
    
    if (quest.prerequisites && quest.prerequisites.length > 0) {
        const prereqSection = questElement.querySelector('.quest-prereqs');
        const list = prereqSection ? prereqSection.querySelector('.prereq-list') : null;
        
        if (prereqSection && list) {
            list.innerHTML = '';
            let visibleCount = 0;
            quest.prerequisites.forEach(pre => {
                if (questMap && questMap.has(pre.questId)) return;
                visibleCount++;
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `https://classicdb.ch/?quest=${pre.questId}`;
                a.rel = `quest=${pre.questId}`;
                a.textContent = pre.name;
                li.appendChild(a);
                list.appendChild(li);
            });

            if (visibleCount > 0) {
                prereqSection.classList.remove('hidden');
            }
        }
    }
    
    if (container) {
        container.appendChild(questClone);
    }
    return questElement;
}

function searchQuests(term) {
    const container = document.getElementById('quest-container');
    const factionFilter = document.getElementById('filter-faction').value;
    container.innerHTML = '';
    
    let foundAny = false;
    
    questData.dungeons.forEach(complex => {
        const matchedDungeons = [];
        
        complex.dungeons.forEach(dungeon => {
            const matchedQuests = dungeon.quests.filter(q => 
                matchesFaction(q.faction, factionFilter) &&
                (q.name.toLowerCase().includes(term) ||
                (q.description && q.description.toLowerCase().includes(term)))
            );
            
            if (matchedQuests.length > 0) {
                matchedDungeons.push({
                    ...dungeon,
                    quests: matchedQuests
                });
            }
        });
        
        if (matchedDungeons.length > 0) {
            renderComplex(container, {
                complex: complex.complex,
                dungeons: matchedDungeons
            }, false); // Use flat view for search
            foundAny = true;
        }
    });

    if (!foundAny) {
        container.innerHTML = '<div class="no-results">No quests found matching your criteria.</div>';
    }
    
    // Clear sidebar active state
    document.querySelectorAll('.dungeon-item').forEach(el => el.classList.remove('active'));
    
    if (window.$WowheadPower && typeof window.$WowheadPower.refreshLinks === 'function') {
        window.$WowheadPower.refreshLinks();
    }
}

init();
