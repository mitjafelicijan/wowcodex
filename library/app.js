let libraryData = [];

async function init() {
    try {
        const response = await fetch('data.json');
        libraryData = await response.json();
        
        libraryData = libraryData.filter(b => b.name && b.name.trim() !== "");

        const searchInput = document.getElementById('search-input');
        const backButton = document.getElementById('back-button');

        searchInput.oninput = () => {
            showListView();
            const term = searchInput.value.toLowerCase();
            const filtered = libraryData.filter(book => 
                book.name.toLowerCase().includes(term) || 
                book.content.toLowerCase().includes(term) ||
                book.entry.toString().includes(term)
            );
            renderBookList(filtered);
        };

        backButton.onclick = () => {
            history.pushState("", document.title, window.location.pathname + window.location.search);
            showListView();
        };

        // Handle initial load
        if (window.location.hash) {
            const entryId = parseInt(window.location.hash.replace('#', ''));
            const book = libraryData.find(b => b.entry === entryId);
            if (book) {
                selectBook(book);
            } else {
                renderBookList(libraryData);
            }
        } else {
            renderBookList(libraryData);
        }

        // Handle browser back/forward
        window.onhashchange = () => {
            if (!window.location.hash) {
                showListView();
            } else {
                const entryId = parseInt(window.location.hash.replace('#', ''));
                const book = libraryData.find(b => b.entry === entryId);
                if (book) selectBook(book);
            }
        };

    } catch (err) {
        console.error('Failed to load library data:', err);
        document.getElementById('book-list').innerHTML = '<div class="loading">Error loading library data.</div>';
    }
}

function showListView() {
    document.getElementById('results-view').classList.remove('hidden');
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('search-container').classList.remove('hidden');
}

function showReaderView() {
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('reader-view').classList.remove('hidden');
    document.getElementById('search-container').classList.add('hidden');
}

function renderBookList(data) {
    const list = document.getElementById('book-list');
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<div class="loading">No matches found.</div>';
        return;
    }

    const template = document.getElementById('book-item-template');
    const limit = 200;
    const itemsToShow = data.slice(0, limit);

    itemsToShow.forEach((book) => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.book-item');
        
        item.querySelector('.book-title').textContent = book.name;
        item.querySelector('.book-meta').textContent = `${book.source.toUpperCase()} ${book.entry}`;
        
        item.onclick = () => {
            selectBook(book);
        };

        list.appendChild(clone);
    });

    if (data.length > limit) {
        const more = document.createElement('div');
        more.className = 'more-results';
        more.textContent = `Showing ${limit} of ${data.length} matches. Narrow your search for more.`;
        list.appendChild(more);
    }
}

function selectBook(book) {
    window.location.hash = book.entry;
    showReaderView();
    
    const contentDiv = document.getElementById('book-content');
    const wowheadUrl = book.source === 'item' 
        ? `https://www.wowhead.com/classic/item=${book.entry}` 
        : `https://www.wowhead.com/classic/object=${book.entry}`;

    contentDiv.innerHTML = `
        <div class="reader-header">
            <div class="reader-title-container">
                <h1 class="reader-title">${book.name}</h1>
                <div class="reader-meta">
                    Source: ${book.source} (ID: ${book.entry})
                </div>
            </div>
            <a href="${wowheadUrl}" target="_blank" rel="noopener" class="wowhead-link" title="View on WoWhead">
                <img src="/general/wowhead.png" alt="WoWhead" class="wowhead-icon">
            </a>
        </div>
        <div class="reader-content">${book.content}</div>
    `;
    
    window.scrollTo(0, 0);
}

init();
