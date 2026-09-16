let currentTexWidth = 0;
let currentTexHeight = 0;

let interactionMode = null; // 'draw', 'move', 'resize'
let currentHandle = null;
let startX, startY;
let initialRect = null;

let allFiles = [];
let lastSelectedNode = null;

async function init() {
    try {
        const response = await fetch('manifest.json');
        const data = await response.json();
        
        // Flatten files for search
        flattenFiles(data);

        const treeContainer = document.getElementById('tree');
        const rootUl = document.createElement('ul');
        treeContainer.appendChild(rootUl);

        if (data.children) {
            data.children.forEach(child => {
                if (child.type === 'directory') {
                    renderTree(child, rootUl);
                }
            });
        }
        
        // Modal logic
        const modal = document.getElementById('modal');
        const closeModal = document.getElementById('close-modal');
        const modalInfo = document.getElementById('modal-info');

        closeModal.onclick = () => modal.classList.add('hidden');
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
        
        // Close on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        modalInfo.onclick = (e) => e.stopPropagation();

        // Selection interaction setup
        setupSelectionInteractions();

        // TexCoord Helper Logic
        const coordInputs = ['coord-x1', 'coord-y1', 'coord-x2', 'coord-y2'];
        coordInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                updateTexCoordsManually();
            });
        });

        document.getElementById('coord-result').onclick = function() {
            const text = this.textContent;
            if (text && text.includes('SetTexCoord')) {
                navigator.clipboard.writeText(text);
                const original = this.innerHTML;
                this.textContent = 'Copied!';
                setTimeout(() => this.innerHTML = original, 1000);
            }
        };

        // Search logic
        const searchInput = document.getElementById('search-input');
        const handleSearch = (e) => {
            const term = searchInput.value.toLowerCase();
            if (term.length >= 2) {
                renderSearchResults(term);
            } else if (term.length === 0) {
                if (lastSelectedNode) {
                    renderGallery(lastSelectedNode);
                } else {
                    showPlaceholder();
                }
            }
        };

        searchInput.oninput = handleSearch;
        searchInput.onsearch = handleSearch; // Handles the 'x' button in type="search"

        if (allFiles.length > 0) {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '';
            allFiles.slice(0, 30).forEach(file => {
                gallery.appendChild(createCard(file));
            });
        } else {
            showPlaceholder();
        }

    } catch (err) {
        console.error('Failed to load manifest:', err);
        document.getElementById('tree').textContent = 'Error loading manifest.';
    }
}

function flattenFiles(node) {
    if (node.type === 'file') {
        allFiles.push(node);
    } else if (node.children) {
        node.children.forEach(child => flattenFiles(child));
    }
}

function setupSelectionInteractions() {
    const modalImg = document.getElementById('modal-img');
    const selectionBox = document.getElementById('selection-box');
    
    // Right click to clear
    const clearSelection = (e) => {
        if (e) e.preventDefault();
        selectionBox.classList.add('hidden');
        document.getElementById('coord-x1').value = '';
        document.getElementById('coord-y1').value = '';
        document.getElementById('coord-x2').value = '';
        document.getElementById('coord-y2').value = '';
        document.getElementById('coord-result').textContent = 'Enter values or draw on image';
    };

    modalImg.oncontextmenu = clearSelection;
    selectionBox.oncontextmenu = clearSelection;

    // Start Draw
    modalImg.onmousedown = function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        interactionMode = 'draw';
        const rect = this.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        selectionBox.classList.remove('hidden');
        updateSelection(startX, startY, startX, startY);
    };

    // Start Move
    selectionBox.onmousedown = function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        
        if (e.target.classList.contains('handle')) {
            // Start Resize
            interactionMode = 'resize';
            currentHandle = e.target.classList[1]; // nw, ne, sw, se
        } else {
            interactionMode = 'move';
        }
        
        startX = e.clientX;
        startY = e.clientY;
        initialRect = {
            left: parseFloat(selectionBox.style.left),
            top: parseFloat(selectionBox.style.top),
            width: parseFloat(selectionBox.style.width),
            height: parseFloat(selectionBox.style.height)
        };
    };

    window.onmousemove = function(e) {
        if (!interactionMode) return;
        
        const rect = modalImg.getBoundingClientRect();

        if (interactionMode === 'draw') {
            let currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            let currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            updateSelection(startX, startY, currentX, currentY);
        } else if (interactionMode === 'move') {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = initialRect.left + dx;
            let newTop = initialRect.top + dy;
            
            // Constrain
            newLeft = Math.max(0, Math.min(newLeft, rect.width - initialRect.width));
            newTop = Math.max(0, Math.min(newTop, rect.height - initialRect.height));
            
            selectionBox.style.left = newLeft + 'px';
            selectionBox.style.top = newTop + 'px';
        } else if (interactionMode === 'resize') {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let l = initialRect.left;
            let t = initialRect.top;
            let w = initialRect.width;
            let h = initialRect.height;
            
            if (currentHandle.includes('w')) {
                const newL = Math.max(0, Math.min(l + dx, l + w - 1));
                w = w + (l - newL);
                l = newL;
            }
            if (currentHandle.includes('e')) {
                w = Math.max(1, Math.min(w + dx, rect.width - l));
            }
            if (currentHandle.includes('n')) {
                const newT = Math.max(0, Math.min(t + dy, t + h - 1));
                h = h + (t - newT);
                t = newT;
            }
            if (currentHandle.includes('s')) {
                h = Math.max(1, Math.min(h + dy, rect.height - t));
            }
            
            selectionBox.style.left = l + 'px';
            selectionBox.style.top = t + 'px';
            selectionBox.style.width = w + 'px';
            selectionBox.style.height = h + 'px';
        }
        
        syncInputsFromBox();
    };

    window.onmouseup = function(e) {
        if (!interactionMode) return;
        interactionMode = null;
        currentHandle = null;
        syncInputsFromBox();
    };
}

function syncInputsFromBox() {
    const selectionBox = document.getElementById('selection-box');
    const modalImg = document.getElementById('modal-img');
    const rect = modalImg.getBoundingClientRect();
    if (rect.width === 0) return;
    
    const scaleX = currentTexWidth / rect.width;
    const scaleY = currentTexHeight / rect.height;
    
    const l = parseFloat(selectionBox.style.left);
    const t = parseFloat(selectionBox.style.top);
    const w = parseFloat(selectionBox.style.width);
    const h = parseFloat(selectionBox.style.height);
    
    const realX1 = Math.round(l * scaleX);
    const realY1 = Math.round(t * scaleY);
    const realX2 = Math.round((l + w) * scaleX);
    const realY2 = Math.round((t + h) * scaleY);
    
    document.getElementById('coord-x1').value = realX1;
    document.getElementById('coord-y1').value = realY1;
    document.getElementById('coord-x2').value = realX2;
    document.getElementById('coord-y2').value = realY2;
    
    updateTexCoords(realX1, realY1, realX2, realY2);
}

function updateSelection(x1, y1, x2, y2) {
    const box = document.getElementById('selection-box');
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);
    
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.width = width + 'px';
    box.style.height = height + 'px';
}

function updateTexCoordsManually() {
    const x1 = parseFloat(document.getElementById('coord-x1').value) || 0;
    const y1 = parseFloat(document.getElementById('coord-y1').value) || 0;
    const x2 = parseFloat(document.getElementById('coord-x2').value) || currentTexWidth;
    const y2 = parseFloat(document.getElementById('coord-y2').value) || currentTexHeight;
    
    const modalImg = document.getElementById('modal-img');
    const rect = modalImg.getBoundingClientRect();
    if (rect.width > 0) {
        const scaleX = rect.width / currentTexWidth;
        const scaleY = rect.height / currentTexHeight;
        updateSelection(x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY);
        document.getElementById('selection-box').classList.remove('hidden');
    }
    
    updateTexCoords(x1, y1, x2, y2);
}

function updateTexCoords(x1, y1, x2, y2) {
    if (currentTexWidth > 0 && currentTexHeight > 0) {
        const left = (x1 / currentTexWidth).toFixed(4);
        const top = (y1 / currentTexHeight).toFixed(4);
        const right = (x2 / currentTexWidth).toFixed(4);
        const bottom = (y2 / currentTexHeight).toFixed(4);
        
        document.getElementById('coord-result').textContent = `obj:SetTexCoord(${left}, ${right}, ${top}, ${bottom})`;
    }
}

function renderTree(node, containerUl) {
    const li = document.createElement('li');
    li.className = 'tree-item';

    const row = document.createElement('div');
    row.className = 'tree-row';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    
    const name = document.createElement('span');
    name.className = 'tree-node';
    name.textContent = node.name;

    row.appendChild(toggle);
    row.appendChild(name);
    li.appendChild(row);
    
    const childUl = document.createElement('ul');
    let hasSubdirs = false;

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            if (child.type === 'directory') {
                renderTree(child, childUl);
                hasSubdirs = true;
            }
        });
    }
    
    if (hasSubdirs) {
        toggle.textContent = '+';
        li.appendChild(childUl);
        
        if (node.name === 'Interface') {
            childUl.classList.add('expanded');
            toggle.textContent = '-';
        }

        toggle.onclick = (e) => {
            e.stopPropagation();
            const isExpanded = childUl.classList.toggle('expanded');
            toggle.textContent = isExpanded ? '-' : '+';
        };
    } else {
        toggle.textContent = '\u00A0'; // Placeholder for alignment
    }

    name.onclick = (e) => {
        e.stopPropagation();
        renderGallery(node);
    };
    
    containerUl.appendChild(li);
}

function showGalleryMessage(message) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    const template = document.getElementById('gallery-message-template');
    const clone = template.content.cloneNode(true);
    clone.querySelector('.gallery-message').textContent = message;
    gallery.appendChild(clone);
}

function renderGallery(node) {
    lastSelectedNode = node;
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    
    // Find all files in this node (non-recursive for current view)
    const files = node.children.filter(c => c.type === 'file');
    
    files.forEach(file => {
        const card = createCard(file);
        gallery.appendChild(card);
    });

    if (files.length === 0) {
        showGalleryMessage('No textures in this directory level. Check subdirectories.');
    }
}

function renderSearchResults(term) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    
    const results = allFiles.filter(f => f.name.toLowerCase().includes(term));
    
    results.forEach(file => {
        const card = createCard(file);
        gallery.appendChild(card);
    });

    if (results.length === 0) {
        showGalleryMessage('No textures found.');
    }
}

function createCard(file) {
    const template = document.getElementById('card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.card');
    const img = clone.querySelector('img');
    const info = clone.querySelector('.card-info');

    const imgPath = '../' + file.path;
    const displayName = file.name.replace(/\.png$/i, '');
    
    img.src = imgPath;
    img.alt = file.name;
    info.textContent = displayName;
    
    card.onclick = () => showModal(file.name, imgPath);
    return clone;
}

function showModal(name, path) {
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');
    const modalInfo = document.getElementById('modal-info');
    const selectionBox = document.getElementById('selection-box');
    
    modalImg.src = path;
    selectionBox.classList.add('hidden');
    
    // Reset helper
    document.getElementById('coord-x1').value = '';
    document.getElementById('coord-y1').value = '';
    document.getElementById('coord-x2').value = '';
    document.getElementById('coord-y2').value = '';
    document.getElementById('coord-result').textContent = 'Enter values or draw on image';

    modalImg.onload = function() {
        currentTexWidth = this.naturalWidth;
        currentTexHeight = this.naturalHeight;
        
        // Format path to Interface\\... style
        let displayPath = path.replace('../data/', '').replace(/\.png$/i, '').replace(/\//g, '\\\\');
        modalInfo.textContent = `${displayPath} (${currentTexWidth}x${currentTexHeight})`;
        
        // Download links
        const downloadPng = document.getElementById('download-png');
        const downloadBlp = document.getElementById('download-blp');
        
        downloadPng.href = path;
        downloadPng.download = path.split('/').pop();
        
        const blpPath = path.replace('../data/', '../reference/').replace(/\.png$/i, '.blp');
        downloadBlp.href = blpPath;
        downloadBlp.download = blpPath.split('/').pop();

        // Default values
        document.getElementById('coord-x2').placeholder = currentTexWidth;
        document.getElementById('coord-y2').placeholder = currentTexHeight;
    };

    modal.classList.remove('hidden');
}

function showPlaceholder() {
    showGalleryMessage('Select a directory or search for textures.');
}

init();
