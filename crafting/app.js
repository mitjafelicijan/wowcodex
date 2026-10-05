let craftingData = {};
let currentProfession = '';

async function init() {
    try {
        const response = await fetch('data.json');
        craftingData = await response.json();
        
        renderProfessions();
        
        // Show first profession by default
        const profs = Object.keys(craftingData).sort();
        if (profs.length > 0) {
            selectProfession(profs[0]);
        }

        const searchInput = document.getElementById('search-input');
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            if (!term) {
                applyLocalFilters();
                return;
            }
            searchRecipes(term);
        };

        // Filter event listeners
        document.getElementById('filter-category').onchange = applyLocalFilters;
        document.getElementById('filter-quality').onchange = applyLocalFilters;

    } catch (err) {
        console.error('Failed to load crafting data:', err);
        document.getElementById('recipe-container').innerHTML = '<div class="no-results">Error loading Crafting data.</div>';
    }
}

function renderProfessions() {
    const list = document.getElementById('profession-list');
    list.innerHTML = '';
    const profs = Object.keys(craftingData).sort();
    
    profs.forEach(prof => {
        const li = document.createElement('li');
        li.className = 'profession-item';
        li.textContent = prof;
        li.onclick = () => selectProfession(prof);
        list.appendChild(li);
    });
}

function selectProfession(name) {
    currentProfession = name;
    
    document.querySelectorAll('.profession-item').forEach(el => {
        el.classList.remove('active');
        if (el.textContent === name) el.classList.add('active');
    });

    // Reset filters
    document.getElementById('search-input').value = '';
    document.getElementById('filter-quality').value = '';
    
    // Populate Category dropdown
    const catSelect = document.getElementById('filter-category');
    catSelect.innerHTML = '<option value="">All Categories</option>';
    const cats = Object.keys(craftingData[name]).sort();
    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
    catSelect.value = '';

    renderLoot();
}

function applyLocalFilters() {
    if (!currentProfession) return;
    
    const catFilter = document.getElementById('filter-category').value;
    const qualityFilter = document.getElementById('filter-quality').value;
    
    const container = document.getElementById('recipe-container');
    container.innerHTML = '';

    const categories = craftingData[currentProfession];
    let foundAny = false;

    Object.keys(categories).sort().forEach(catName => {
        if (catFilter && catName !== catFilter) return;

        const items = categories[catName];
        const filteredItems = items.filter(item => {
            const matchesQuality = !qualityFilter || item.quality === qualityFilter;
            return matchesQuality;
        });

        if (filteredItems.length > 0) {
            renderCategorySection(container, catName, filteredItems);
            foundAny = true;
        }
    });

    if (!foundAny) {
        container.innerHTML = '<div class="no-results">No recipes match your filters.</div>';
    }
}

function renderLoot() {
    applyLocalFilters();
}

function renderCategorySection(container, catName, items) {
    const catTemplate = document.getElementById('category-template');
    const itemTemplate = document.getElementById('item-template');
    
    const catClone = catTemplate.content.cloneNode(true);
    catClone.querySelector('.category-name').textContent = catName;
    const itemList = catClone.querySelector('.item-list');

    items.forEach(item => {
        const itemClone = itemTemplate.content.cloneNode(true);
        
        const rootLink = itemClone.querySelector('.item-link');
        const prefix = item.type === 'spell' ? 'spell' : 'item';
        rootLink.href = `https://classicdb.ch/?${prefix}=${item.id}`;
        rootLink.rel = `${prefix}=${item.id}`;

        // Watchlist toggle
        const toggle = itemClone.querySelector('.item-watchlist-toggle');
        if (toggle) {
            const isWatched = Watchlist.isWatched('crafting', item.id);
            toggle.textContent = isWatched ? '★' : '☆';
            if (isWatched) toggle.classList.add('watched');
            
            toggle.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const context = currentProfession ? `${currentProfession} - ${catName}` : catName;
                const added = Watchlist.toggle('crafting', item.id, item, context);
                toggle.textContent = added ? '★' : '☆';
                toggle.classList.toggle('watched', added);
            };
        }

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
        
        const descEl = itemClone.querySelector('.item-description');
        if (item.skill_levels && Object.keys(item.skill_levels).length > 0) {
            let desc = item.description;
            const skillPrefix = "Skill:";
            const skillIdx = desc.indexOf(skillPrefix);
            if (skillIdx !== -1) {
                const beforeSkill = desc.substring(0, skillIdx + skillPrefix.length);
                descEl.textContent = beforeSkill + " ";
                
                Object.keys(item.skill_levels).sort().forEach(lvlKey => {
                    const span = document.createElement('span');
                    span.className = 'skill-level';
                    
                    const dot = document.createElement('span');
                    dot.className = `skill-dot skill-${lvlKey}`;
                    
                    const text = document.createTextNode(item.skill_levels[lvlKey]);
                    
                    span.appendChild(dot);
                    span.appendChild(text);
                    descEl.appendChild(span);
                });
            } else {
                descEl.textContent = item.description;
            }
        } else {
            descEl.textContent = item.description;
        }
        
        itemClone.querySelector('.item-id').textContent = item.id;

        itemList.appendChild(itemClone);
    });

    container.appendChild(catClone);
}

function searchRecipes(term) {
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-quality').value = '';
    
    const container = document.getElementById('recipe-container');
    container.innerHTML = '';
    
    let foundCount = 0;
    
    Object.keys(craftingData).sort().forEach(profName => {
        const categories = craftingData[profName];
        Object.keys(categories).sort().forEach(catName => {
            const items = categories[catName];
            const filteredItems = items.filter(item => 
                item.name.toLowerCase().includes(term) ||
                profName.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term))
            );
            
            if (filteredItems.length > 0) {
                renderCategorySection(container, `${profName} - ${catName}`, filteredItems);
                foundCount += filteredItems.length;
            }
        });
    });

    if (foundCount === 0) {
        container.innerHTML = '<div class="no-results">No recipes matching "' + term + '" found.</div>';
    }
    
    document.querySelectorAll('.profession-item').forEach(el => el.classList.remove('active'));
    currentProfession = '';
}

init();
