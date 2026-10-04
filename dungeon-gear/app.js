let gearData = {};
let currentDungeon = '';

async function init() {
    try {
        const response = await fetch('dungeon_gear.json');
        gearData = await response.json();
        
        renderDungeons();
        
        // Show first dungeon by default if available
        const dungeons = Object.keys(gearData).sort();
        if (dungeons.length > 0) {
            selectDungeon(dungeons[0]);
        }

        const searchInput = document.getElementById('search-input');
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            if (!term) {
                applyLocalFilters();
                return;
            }
            searchGear(term);
        };

        // Filter event listeners
        document.getElementById('filter-boss').onchange = applyLocalFilters;
        document.getElementById('filter-class').onchange = applyLocalFilters;
        document.getElementById('filter-type').onchange = applyLocalFilters;

    } catch (err) {
        console.error('Failed to load gear data:', err);
        document.getElementById('loot-container').innerHTML = '<div class="no-results">Error loading Gear data.</div>';
    }
}

function renderDungeons() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '';
    const dungeons = Object.keys(gearData).sort();
    
    dungeons.forEach(dungeon => {
        const li = document.createElement('li');
        li.className = 'dungeon-item';
        li.textContent = dungeon;
        li.onclick = () => selectDungeon(dungeon);
        list.appendChild(li);
    });
}

function selectDungeon(dungeonName) {
    currentDungeon = dungeonName;
    
    // UI Update
    document.querySelectorAll('.dungeon-item').forEach(el => {
        el.classList.remove('active');
        if (el.textContent === dungeonName) el.classList.add('active');
    });

    // Reset filters
    document.getElementById('search-input').value = '';
    document.getElementById('filter-class').value = '';
    document.getElementById('filter-type').value = '';
    
    // Populate Boss dropdown
    const bossSelect = document.getElementById('filter-boss');
    bossSelect.innerHTML = '<option value="">All Bosses</option>';
    const bosses = Object.keys(gearData[dungeonName]).sort();
    bosses.forEach(boss => {
        const opt = document.createElement('option');
        opt.value = boss;
        opt.textContent = boss;
        bossSelect.appendChild(opt);
    });
    bossSelect.value = '';

    renderLoot(dungeonName);
}

function applyLocalFilters() {
    if (!currentDungeon) return;
    
    const bossFilter = document.getElementById('filter-boss').value;
    const classFilter = document.getElementById('filter-class').value;
    const typeFilter = document.getElementById('filter-type').value;
    
    const container = document.getElementById('loot-container');
    container.innerHTML = '';

    const bosses = gearData[currentDungeon];
    let foundAny = false;

    // List of professions to check against typeFilter
    const professionsList = ["Alchemy", "Blacksmithing", "Cooking", "Enchanting", "Engineering", "First Aid", "Leatherworking", "Tailoring"];

    Object.keys(bosses).sort().forEach(bossName => {
        if (bossFilter && bossName !== bossFilter) return;

        const items = bosses[bossName];
        const filteredItems = items.filter(item => {
            const matchesClass = !classFilter || item.classes.includes(classFilter);
            
            let matchesType = !typeFilter;
            if (typeFilter) {
                if (professionsList.includes(typeFilter)) {
                    matchesType = item.professions.includes(typeFilter);
                } else {
                    matchesType = item.types.includes(typeFilter);
                }
            }
            
            return matchesClass && matchesType;
        });

        if (filteredItems.length > 0) {
            renderBossSection(container, bossName, filteredItems);
            foundAny = true;
        }
    });

    if (!foundAny) {
        container.innerHTML = '<div class="no-results">No items match your filters.</div>';
    }
}

function renderLoot(dungeonName) {
    applyLocalFilters();
}

function renderBossSection(container, bossName, items) {
    const bossTemplate = document.getElementById('boss-template');
    const itemTemplate = document.getElementById('item-template');
    
    const bossClone = bossTemplate.content.cloneNode(true);
    bossClone.querySelector('.boss-name').textContent = bossName;
    const itemList = bossClone.querySelector('.item-list');

    items.forEach(item => {
        const itemClone = itemTemplate.content.cloneNode(true);
        
        // Root link for tooltip
        const rootLink = itemClone.querySelector('.item-link');
        rootLink.href = `https://classicdb.ch/?item=${item.id}`;
        rootLink.rel = `item=${item.id}`;

        const nameEl = itemClone.querySelector('.item-name');
        nameEl.textContent = item.name;
        
        const qualityEl = itemClone.querySelector('.item-quality');
        qualityEl.textContent = item.quality;
        qualityEl.classList.add(`q-${item.quality}`);

        const iconEl = itemClone.querySelector('.item-icon');
        iconEl.src = `/data/Interface/Icons/${item.icon}.png`;
        iconEl.onerror = function() {
            this.src = '/data/Interface/Icons/INV_Misc_QuestionMark.png';
        };
        
        itemClone.querySelector('.item-description').textContent = item.description;
        itemClone.querySelector('.item-id').textContent = item.id;
        itemClone.querySelector('.item-drop-rate').textContent = item.drop_rate;

        itemList.appendChild(itemClone);
    });

    container.appendChild(bossClone);
}

function searchGear(term) {
    // Reset dropdowns when doing a global search
    document.getElementById('filter-boss').value = '';
    document.getElementById('filter-class').value = '';
    document.getElementById('filter-type').value = '';
    
    const container = document.getElementById('loot-container');
    container.innerHTML = '';
    
    let foundCount = 0;
    
    Object.keys(gearData).sort().forEach(dungeonName => {
        const bosses = gearData[dungeonName];
        Object.keys(bosses).sort().forEach(bossName => {
            const items = bosses[bossName];
            const filteredItems = items.filter(item => 
                item.name.toLowerCase().includes(term) ||
                bossName.toLowerCase().includes(term) ||
                dungeonName.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term))
            );
            
            if (filteredItems.length > 0) {
                renderBossSection(container, `${dungeonName} - ${bossName}`, filteredItems);
                foundCount += filteredItems.length;
            }
        });
    });

    if (foundCount === 0) {
        container.innerHTML = '<div class="no-results">No items matching "' + term + '" found.</div>';
    }
    
    // Clear active dungeon highlighting if doing global search
    document.querySelectorAll('.dungeon-item').forEach(el => el.classList.remove('active'));
    currentDungeon = '';
}

init();
