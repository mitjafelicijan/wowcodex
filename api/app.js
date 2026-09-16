let apiData = [];

async function init() {
    try {
        const response = await fetch('data.json');
        apiData = await response.json();
        
        renderCategories();
        renderAPIList(apiData);

        const searchInput = document.getElementById('search-input');
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = apiData.filter(entry => 
                entry.name.toLowerCase().includes(term) || 
                (entry.description && entry.description.toLowerCase().includes(term))
            );
            renderAPIList(filtered);
        };

    } catch (err) {
        console.error('Failed to load API data:', err);
        document.getElementById('api-list').innerHTML = '<div class="no-results">Error loading API data.</div>';
    }
}

function renderCategories() {
    const list = document.getElementById('category-list');
    
    const groups = {
        'Global': 'Global Functions',
        'UI': 'UI Reference',
        'Widget': 'Widget API'
    };

    Object.entries(groups).forEach(([key, label]) => {
        const groupData = apiData.filter(e => e.category === key);
        if (groupData.length === 0) return;

        const groupHeader = document.createElement('div');
        groupHeader.className = 'category-group-header';
        groupHeader.textContent = label;
        list.appendChild(groupHeader);

        const subCats = [...new Set(groupData.map(e => e.file.replace('.d.lua', '')))].sort();
        subCats.forEach(sub => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.textContent = sub;
            li.onclick = () => {
                document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                const filtered = apiData.filter(entry => 
                    entry.category === key && entry.file.replace('.d.lua', '') === sub
                );
                renderAPIList(filtered);
                document.getElementById('search-input').value = '';
            };
            list.appendChild(li);
        });
    });
}

function renderAPIList(data) {
    const container = document.getElementById('api-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div class="no-results">No matches found.</div>';
        return;
    }

    const entryTemplate = document.getElementById('entry-template');
    const paramTemplate = document.getElementById('param-template');

    data.slice(0, 500).forEach(entry => {
        const clone = entryTemplate.content.cloneNode(true);
        
        clone.querySelector('.entry-meta').textContent = `${entry.category} / ${entry.file.replace('.d.lua', '')}`;
        clone.querySelector('.entry-name').textContent = entry.name;
        clone.querySelector('.entry-description').textContent = entry.description || '';
        clone.querySelector('.entry-signature').textContent = `function ${entry.name}(${entry.params.map(p => p.name).join(', ')})`;

        const renderItems = (items, wrapperSelector) => {
            if (items && items.length > 0) {
                const wrapper = clone.querySelector(wrapperSelector);
                const list = wrapper.querySelector('ul');
                items.forEach(item => {
                    const li = paramTemplate.content.cloneNode(true);
                    const nameEl = li.querySelector('.param-name');
                    if (item.name) {
                        nameEl.textContent = item.name;
                    } else {
                        nameEl.remove();
                    }
                    li.querySelector('.param-type').textContent = `(${item.type})`;
                    li.querySelector('.param-description').textContent = item.description;
                    list.appendChild(li);
                });
                wrapper.hidden = false;
            }
        };

        renderItems(entry.params, '.entry-params');
        renderItems(entry.returns, '.entry-returns');

        container.appendChild(clone);
    });
    
    if (data.length > 500) {
        const more = document.createElement('div');
        more.className = 'more-results';
        more.textContent = `Showing first 500 of ${data.length} results. Use search to narrow down.`;
        container.appendChild(more);
    }
}

init();
