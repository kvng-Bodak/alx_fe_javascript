

let quotes = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadQuotes();
    populateCategories();
    restoreFilterPreference();
    setupEventListeners();
    showRandomQuote();
});

function setupEventListeners() {
    document.getElementById('newQuote').addEventListener('click', showRandomQuote);
    document.getElementById('addQuoteBtn').addEventListener('click', addQuote);
    document.getElementById('exportBtn').addEventListener('click', exportToJsonFile);
    document.getElementById('importFile').addEventListener('change', importFromJsonFile);
    document.getElementById('categoryFilter').addEventListener('change', filterQuotes);
}

function showRandomQuote() {
    if (quotes.length === 0) {
        document.getElementById('quoteText').textContent = 'No quotes available. Add some quotes first!';
        document.getElementById('quoteCategory').textContent = '';
        return;
    }

    let filteredQuotes = quotes;
    if (currentFilter !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === currentFilter);
    }

    if (filteredQuotes.length === 0) {
        document.getElementById('quoteText').textContent = 'No quotes available for this category.';
        document.getElementById('quoteCategory').textContent = '';
        return;
    }

    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];
    
    document.getElementById('quoteText').textContent = randomQuote.text;
    document.getElementById('quoteCategory').textContent = randomQuote.category;
}

function addQuote() {
    const textInput = document.getElementById('newQuoteText');
    const categoryInput = document.getElementById('newQuoteCategory');
    
    const text = textInput.value.trim();
    const category = categoryInput.value.trim() || 'General';
    
    if (!text) {
        alert('Please enter a quote text!');
        return;
    }
    
    const newQuote = {
        text: text,
        category: category
    };
    
    quotes.push(newQuote);
    saveQuotes();
    
    if (!quotes.some(q => q.category === category)) {
        populateCategories();
    }
    
    textInput.value = '';
    categoryInput.value = '';
    
    showRandomQuote();
}

function createAddQuoteForm() {
    const formSection = document.querySelector('.add-quote-section');
    const formHTML = `
        <h3>Add New Quote</h3>
        <div class="form-group">
            <input id="newQuoteText" type="text" placeholder="Enter a new quote" />
            <input id="newQuoteCategory" type="text" placeholder="Enter quote category" />
            <button id="addQuoteBtn" class="btn btn-secondary">Add Quote</button>
        </div>
    `;
    formSection.innerHTML = formHTML;
    
    document.getElementById('addQuoteBtn').addEventListener('click', addQuote);
}

function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
}

function loadQuotes() {
    const savedQuotes = localStorage.getItem('quotes');
    if (savedQuotes) {
        quotes = JSON.parse(savedQuotes);
    } else {
        quotes = [
            { text: 'The only way to do great work is to love what you do.', category: 'Inspiration' },
            { text: 'Innovation distinguishes between a leader and a follower.', category: 'Leadership' },
            { text: 'Stay hungry, stay foolish.', category: 'Motivation' },
            { text: 'The future belongs to those who believe in the beauty of their dreams.', category: 'Dreams' }
        ];
        saveQuotes();
    }
}

function exportToJsonFile() {
    if (quotes.length === 0) {
        alert('No quotes to export!');
        return;
    }
    
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'quotes.json';
    link.click();
    
    URL.revokeObjectURL(link.href);
}

function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedQuotes)) {
                throw new Error('Invalid JSON format');
            }
            
            quotes = importedQuotes;
            saveQuotes();
            populateCategories();
            showRandomQuote();
            
        } catch (error) {
            alert('Error importing quotes: ' + error.message);
        }
    };
    
    fileReader.readAsText(file);
}

function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    const currentValue = categoryFilter.value;
    
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    while (categoryFilter.children.length > 1) {
        categoryFilter.removeChild(categoryFilter.lastChild);
    }
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    if (currentValue && categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

function filterQuotes() {
    const selectedCategory = document.getElementById('categoryFilter').value;
    currentFilter = selectedCategory;
    localStorage.setItem('lastFilter', selectedCategory);
    showRandomQuote();
}

function restoreFilterPreference() {
    const lastFilter = localStorage.getItem('lastFilter');
    if (lastFilter) {
        document.getElementById('categoryFilter').value = lastFilter;
        currentFilter = lastFilter;
    }
}

createAddQuoteForm();

async function syncWithServer() {
    const syncStatus = document.getElementById('syncStatus');
    syncStatus.textContent = 'Syncing...';
    syncStatus.className = 'warning';
    
    try {
        const serverQuotes = await fetchFromServer();
        const mergedQuotes = mergeQuotes(quotes, serverQuotes);
        
        quotes = mergedQuotes;
        saveQuotes();
        populateCategories();
        
        syncStatus.textContent = `Synced successfully! ${quotes.length} quotes`;
        syncStatus.className = 'success';
        
        if (mergedQuotes.length !== quotes.length) {
            showNotification('Data updated from server');
        }
        
    } catch (error) {
        console.error('Sync failed:', error);
        syncStatus.textContent = 'Sync failed!';
        syncStatus.className = 'error';
    }
}

async function fetchFromServer() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const serverQuotes = JSON.parse(JSON.stringify(quotes));
    
    if (serverQuotes.length > 0) {
        serverQuotes[0].text = serverQuotes[0].text + ' (Updated on server)';
        
        if (Math.random() > 0.7) {
            serverQuotes.push({
                id: generateId(),
                text: 'This quote was added from the server sync.',
                category: 'Server',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return serverQuotes;
}

function mergeQuotes(localQuotes, serverQuotes) {
    const merged = [...localQuotes];
    const conflicts = [];
    
    serverQuotes.forEach(serverQuote => {
        const localIndex = merged.findIndex(localQuote => localQuote.id === serverQuote.id);
        
        if (localIndex === -1) {
            merged.push(serverQuote);
        } else {
            const localQuote = merged[localIndex];
            if (localQuote.text !== serverQuote.text || 
                localQuote.category !== serverQuote.category) {
                conflicts.push({
                    local: localQuote,
                    server: serverQuote
                });
                merged[localIndex] = serverQuote;
            }
        }
    });
    
    if (conflicts.length > 0) {
        console.log(`Resolved ${conflicts.length} conflicts`);
        showNotification(`Resolved ${conflicts.length} conflicts during sync`);
    }
    
    return merged;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}