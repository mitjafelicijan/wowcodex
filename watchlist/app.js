function init() {
    renderAll();
}

function renderAll() {
    const data = Watchlist.get();
    
    renderQuests(data.quests);
    renderGear(data.gear);
    renderCrafting(data.crafting);

    if (window.$WowheadPower && typeof window.$WowheadPower.refreshLinks === 'function') {
        window.$WowheadPower.refreshLinks();
    }
}

function renderQuests(quests) {
    const container = document.getElementById('quests-watchlist');
    container.innerHTML = '';
    if (quests.length === 0) {
        container.innerHTML = '<div class="no-results">No watched quests.</div>';
        return;
    }

    const template = document.getElementById('quest-template');
    quests.forEach(item => {
        const quest = item.data;
        const clone = template.content.cloneNode(true);
        const element = clone.querySelector('.quest-entry');

        const link = element.querySelector('.quest-link');
        link.href = `https://classicdb.ch/?quest=${quest.questId}`;
        link.rel = `quest=${quest.questId}`;
        link.textContent = quest.name;

        element.querySelector('.quest-level').textContent = quest.level || '??';
        const factionEl = element.querySelector('.quest-faction');
        factionEl.textContent = quest.faction;
        factionEl.classList.add(`faction-${quest.faction}`);

        if (quest.heroic) element.querySelector('.quest-heroic').classList.remove('hidden');
        element.querySelector('.quest-description').textContent = quest.description || '';
        element.querySelector('.quest-source').textContent = item.source;

        element.querySelector('.quest-watchlist-toggle').onclick = () => {
            Watchlist.toggle('quests', item.id, quest, item.source);
            renderAll();
        };

        container.appendChild(clone);
    });
}

function renderGear(items) {
    const container = document.getElementById('gear-watchlist');
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div class="no-results">No watched gear.</div>';
        return;
    }

    const template = document.getElementById('item-template');
    items.forEach(watchItem => {
        const item = watchItem.data;
        const clone = template.content.cloneNode(true);
        const element = clone.querySelector('.item-container');

        element.querySelector('.item-source').textContent = watchItem.source;
        
        const rootLink = element.querySelector('.item-link');
        rootLink.href = `https://classicdb.ch/?item=${item.id}`;
        rootLink.rel = `item=${item.id}`;

        element.querySelector('.item-name').textContent = item.name;
        const qualityEl = element.querySelector('.item-quality');
        qualityEl.textContent = item.quality;
        qualityEl.classList.add(`q-${item.quality}`);

        const iconEl = element.querySelector('.item-icon');
        iconEl.src = `/data/Interface/Icons/${item.icon}.png`;
        iconEl.onerror = function() { this.src = '/data/Interface/Icons/INV_Misc_QuestionMark.png'; };

        element.querySelector('.item-description').textContent = item.description;
        element.querySelector('.item-id').textContent = item.id;
        element.querySelector('.item-drop-rate').textContent = item.drop_rate || '';

        element.querySelector('.item-watchlist-toggle').onclick = (e) => {
            e.preventDefault();
            Watchlist.toggle('gear', item.id, item, watchItem.source);
            renderAll();
        };

        container.appendChild(clone);
    });
}

function renderCrafting(items) {
    const container = document.getElementById('crafting-watchlist');
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div class="no-results">No watched recipes.</div>';
        return;
    }

    const template = document.getElementById('item-template');
    items.forEach(watchItem => {
        const item = watchItem.data;
        const clone = template.content.cloneNode(true);
        const element = clone.querySelector('.item-container');

        element.querySelector('.item-source').textContent = watchItem.source;

        const rootLink = element.querySelector('.item-link');
        const prefix = item.type === 'spell' ? 'spell' : 'item';
        rootLink.href = `https://classicdb.ch/?${prefix}=${item.id}`;
        rootLink.rel = `${prefix}=${item.id}`;

        element.querySelector('.item-name').textContent = item.name;
        const qualityEl = element.querySelector('.item-quality');
        qualityEl.textContent = item.quality;
        qualityEl.classList.add(`q-${item.quality}`);

        const iconEl = element.querySelector('.item-icon');
        iconEl.src = `/data/Interface/Icons/${item.icon}.png`;
        iconEl.onerror = function() { this.src = '/data/Interface/Icons/INV_Misc_QuestionMark.png'; };

        element.querySelector('.item-description').textContent = item.description;
        element.querySelector('.item-id').textContent = item.id;

        element.querySelector('.item-watchlist-toggle').onclick = (e) => {
            e.preventDefault();
            Watchlist.toggle('crafting', item.id, item, watchItem.source);
            renderAll();
        };

        container.appendChild(clone);
    });
}

init();
