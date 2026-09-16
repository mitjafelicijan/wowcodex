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

    data.slice(0, 500).forEach(entry => { // Limit to 500 for initial render performance
        const div = document.createElement('div');
        div.className = 'api-entry';

        const signature = `function ${entry.name}(${entry.params.map(p => p.name).join(', ')})`;
        
        let paramsHtml = '';
        if (entry.params.length > 0) {
            paramsHtml = '<div class="api-params"><strong>Arguments:</strong><ul>' + 
                entry.params.map(p => `<li>${p.name ? `<code>${p.name}</code> ` : ''}<small>(${p.type})</small> ${p.description}</li>`).join('') + 
                '</ul></div>';
        }

        let returnsHtml = '';
        if (entry.returns.length > 0) {
            returnsHtml = '<div class="api-returns"><strong>Returns:</strong><ul>' + 
                entry.returns.map(r => `<li>${r.name ? `<code>${r.name}</code> ` : ''}<small>(${r.type})</small> ${r.description}</li>`).join('') + 
                '</ul></div>';
        }

        div.innerHTML = `
            <div class="api-meta">${entry.category} / ${entry.file.replace('.d.lua', '')}</div>
            <div class="api-name">${entry.name}</div>
            <div class="api-description">${entry.description || ''}</div>
            <div class="api-signature">${signature}</div>
            ${paramsHtml}
            ${returnsHtml}
        `;
        container.appendChild(div);
    });
    
    if (data.length > 500) {
        const more = document.createElement('div');
        more.style.padding = '10px';
        more.style.color = '#999';
        more.style.fontSize = '12px';
        more.textContent = `Showing first 500 of ${data.length} results. Use search to narrow down.`;
        container.appendChild(more);
    }
}

init();
