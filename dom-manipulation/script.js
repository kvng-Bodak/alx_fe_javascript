let quotes = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadQuotes();
    populateCategories();
    restoreFilterPreference();
    setupEventListeners();
    showRandomQuote();
    setInterval(syncQuotes, 30000);
});

function setupEventListeners() {
    document.getElementById('newQuote').addEventListener('click', showRandomQuote);
    document.getElementById('addQuoteBtn').addEventListener('click', addQuote);
    document.getElementById('exportBtn').addEventListener('click', exportToJsonFile);
    document.getElementById('importFile').addEventListener('change', importFromJsonFile);
    document.getElementById('categoryFilter').addEventListener('change', filterQuotes);
}

function showRandomQuote() {
    const quoteDisplay = document.getElementById('quoteDisplay');
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
    
    showNotification('Quote added successfully!');
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
            showNotification('Quotes imported successfully!');
            
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

async function fetchQuotesFromServer() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts');
        const posts = await response.json();
        
        return posts.slice(0, 5).map(post => ({
            text: post.title,
            category: 'Server'
        }));
    } catch (error) {
        console.error('Failed to fetch from server:', error);
        return [];
    }
}

async function postQuotesToServer(quotesToPost) {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quotesToPost)
        });
        
        const result = await response.json();
        showNotification('Quotes posted to server successfully!');
        return result;
    } catch (error) {
        console.error('Failed to post to server:', error);
        showNotification('Failed to post quotes to server', 'error');
        return null;
    }
}

async function syncQuotes() {
    showNotification('Syncing with server...', 'warning');
    
    try {
        const serverQuotes = await fetchQuotesFromServer();
        const conflicts = [];
        
        serverQuotes.forEach(serverQuote => {
            const existingQuote = quotes.find(q => 
                q.text === serverQuote.text && q.category === serverQuote.category
            );
            
            if (!existingQuote) {
                quotes.push(serverQuote);
                conflicts.push(`Added: "${serverQuote.text}"`);
            }
        });
        
        if (conflicts.length > 0) {
            saveQuotes();
            populateCategories();
            showNotification(`Sync complete! Added ${conflicts.length} new quotes from server.`, 'success');
            
            const conflictList = conflicts.join('\n');
            if (confirm(`Server updates:\n${conflictList}\n\nKeep these changes?`)) {
                saveQuotes();
                showRandomQuote();
            } else {
                loadQuotes();
            }
        } else {
            showNotification('Sync complete - no new quotes from server.', 'success');
        }
        
        await postQuotesToServer(quotes);
        
    } catch (error) {
        showNotification('Sync failed!', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        color: white;
        font-weight: bold;
        background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#27ae60'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

createAddQuoteForm();

document.getElementById('syncBtn').addEventListener('click', syncQuotes);