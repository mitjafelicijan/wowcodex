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

    const eventTemplate = document.getElementById('event-template');
    const paramTemplate = document.getElementById('param-template');

    data.slice(0, 500).forEach(entry => {
        const clone = eventTemplate.content.cloneNode(true);
        
        clone.querySelector('.entry-meta').textContent = entry.category;
        clone.querySelector('.entry-name').textContent = entry.name;
        clone.querySelector('.entry-description').textContent = entry.description || '';

        if (entry.params && entry.params.length > 0) {
            const wrapper = clone.querySelector('.entry-params');
            const list = wrapper.querySelector('ul');
            entry.params.forEach(p => {
                const li = paramTemplate.content.cloneNode(true);
                li.querySelector('.param-name').textContent = `arg${p.index}`;
                li.querySelector('.param-type').textContent = `(${p.type || 'any'})`;
                li.querySelector('.param-description').textContent = p.description || '';
                list.appendChild(li);
            });
            wrapper.hidden = false;
        }

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
