let eventData = [];

async function init() {
    try {
        const response = await fetch('data.json');
        eventData = await response.json();
        
        renderCategories();
        renderEventList(eventData);

        const searchInput = document.getElementById('search-input');
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = eventData.filter(entry => 
                entry.name.toLowerCase().includes(term) || 
                (entry.description && entry.description.toLowerCase().includes(term))
            );
            renderEventList(filtered);
        };

    } catch (err) {
        console.error('Failed to load events data:', err);
        document.getElementById('event-list').innerHTML = '<div class="no-results">Error loading Events data.</div>';
    }
}

function renderCategories() {
    const list = document.getElementById('category-list');
    const categories = [...new Set(eventData.map(e => e.category))].sort();
    
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = 'category-item';
        li.textContent = cat;
        li.onclick = () => {
            document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            const filtered = eventData.filter(entry => entry.category === cat);
            renderEventList(filtered);
            document.getElementById('search-input').value = '';
        };
        list.appendChild(li);
    });
}

function renderEventList(data) {
    const container = document.getElementById('event-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div class="no-results">No matches found.</div>';
        return;
    }

    data.slice(0, 500).forEach(entry => {
        const div = document.createElement('div');
        div.className = 'api-entry';

        let paramsHtml = '';
        if (entry.params && entry.params.length > 0) {
            paramsHtml = '<div class="api-params"><strong>Payload:</strong><ul>' + 
                entry.params.map(p => `<li><code>arg${p.index}</code> <small>(${p.type || 'any'})</small> ${p.description || ''}</li>`).join('') + 
                '</ul></div>';
        }

        div.innerHTML = `
            <div class="api-meta">${entry.category}</div>
            <div class="api-name">${entry.name}</div>
            <div class="api-description">${entry.description || ''}</div>
            ${paramsHtml}
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
