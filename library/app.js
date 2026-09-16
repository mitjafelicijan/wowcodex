let libraryData = [];

async function init() {
    try {
        const response = await fetch('data.json');
        libraryData = await response.json();
        
        libraryData = libraryData.filter(b => b.name && b.name.trim() !== "");

        const searchInput = document.getElementById('search-input');
        const closeModalButton = document.getElementById('close-button');
        const modalOverlay = document.getElementById('modal-overlay');

        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = libraryData.filter(book => 
                book.name.toLowerCase().includes(term) || 
                book.content.toLowerCase().includes(term) ||
                book.entry.toString().includes(term)
            );
            renderBookList(filtered);
        };

        closeModalButton.onclick = () => {
            closeModal();
        };

        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeModal();
        };

        // Handle initial load
        if (window.location.hash) {
            const entryId = parseInt(window.location.hash.replace('#', ''));
            const book = libraryData.find(b => b.entry === entryId);
            if (book) {
                selectBook(book);
            }
        }
        renderBookList(libraryData);

        // Handle browser back/forward
        window.onhashchange = () => {
            if (!window.location.hash) {
                closeModal();
            } else {
                const entryId = parseInt(window.location.hash.replace('#', ''));
                const book = libraryData.find(b => b.entry === entryId);
                if (book) selectBook(book);
            }
        };

    } catch (err) {
        console.error('Failed to load library data:', err);
        const shelf = document.getElementById('book-shelf');
        const statusMessage = document.getElementById('status-message');
        if (shelf) shelf.classList.add('hidden');
        if (statusMessage) {
            statusMessage.classList.remove('hidden');
            statusMessage.textContent = 'Error loading library data.';
        }
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    
    // Stop audio when closing modal
    const audio = document.querySelector('.reader-audio');
    if (audio) {
        audio.pause();
        audio.src = '';
    }
    
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

function showModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function renderBookList(data) {
    const shelf = document.getElementById('book-shelf');
    const statusMessage = document.getElementById('status-message');
    shelf.innerHTML = '';

    if (data.length === 0) {
        shelf.classList.add('hidden');
        statusMessage.classList.remove('hidden');
        statusMessage.textContent = 'No matches found.';
        return;
    }

    shelf.classList.remove('hidden');
    statusMessage.classList.add('hidden');

    const template = document.getElementById('book-spine-template');
    const limit = 500;
    const itemsToShow = data.slice(0, limit);

    itemsToShow.forEach((book) => {
        const clone = template.content.cloneNode(true);
        const spine = clone.querySelector('.book-spine');
        
        spine.querySelector('.spine-title').textContent = book.name;
        spine.title = `${book.name} (${book.source} ${book.entry})`;
        
        spine.onclick = () => {
            selectBook(book);
        };

        shelf.appendChild(clone);
    });

    if (data.length > limit) {
        const more = document.createElement('div');
        more.className = 'more-results';
        more.textContent = `Showing ${limit} of ${data.length} matches. Narrow your search for more.`;
        shelf.appendChild(more);
    }
}

function selectBook(book) {
    window.location.hash = book.entry;
    showModal();
    
    const contentDiv = document.getElementById('book-content');
    contentDiv.innerHTML = '';

    const template = document.getElementById('book-reader-template');
    const clone = template.content.cloneNode(true);

    clone.querySelector('.reader-title').textContent = book.name;
    clone.querySelector('.reader-meta').textContent = `Source: ${book.source} (ID: ${book.entry})`;
    
    const audio = clone.querySelector('.reader-audio');
    audio.src = `/data/Library/${book.entry}.ogg`;
    
    clone.querySelector('.reader-content').textContent = book.content;

    contentDiv.appendChild(clone);
    
    document.getElementById('reader-modal').scrollTop = 0;
}

init();
