// ===== MAIN APPLICATION LOGIC =====

// Global variables to store application state
let allSnippets = []; // Store all snippets for filtering
let isEditMode = false; // Track if we're editing an existing snippet
let editingSnippetId = null; // Store the ID of the snippet being edited

// DOM element references - cache these for better performance
const snippetForm = document.getElementById('snippet-form');
const titleInput = document.getElementById('snippet-title');
const languageInput = document.getElementById('snippet-language');
const contentInput = document.getElementById('snippet-content');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');
const snippetsContainer = document.getElementById('snippets-container');
const loadingElement = document.getElementById('loading');
const noSnippetsElement = document.getElementById('no-snippets');

// ===== APPLICATION INITIALIZATION =====

/**
 * Initialize the application when the DOM is fully loaded
 * This function sets up event listeners and loads existing snippets
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Code Snippet Manager starting up...');
    
    // Set up all event listeners
    setupEventListeners();
    
    // Load existing snippets from Firebase
    await loadSnippets();
    
    console.log('✅ Application initialized successfully!');
});

/**
 * Set up all event listeners for the application
 * This separates the event setup logic for better organization
 */
function setupEventListeners() {
    // Form submission handler
    snippetForm.addEventListener('submit', handleFormSubmit);
    
    // Cancel button handler (for edit mode)
    cancelBtn.addEventListener('click', cancelEdit);
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Language filter functionality
    languageFilter.addEventListener('change', handleLanguageFilter);
    
    console.log('📡 Event listeners set up successfully');
}

// ===== SNIPPET LOADING & DISPLAY =====

/**
 * Load all snippets from Firebase and display them
 * Shows loading state while fetching data
 */
async function loadSnippets() {
    try {
        // Show loading indicator
        showLoading(true);
        
        // Fetch snippets from Firebase
        console.log('📡 Fetching snippets from Firebase...');
        allSnippets = await getAllSnippets();
        
        // Display the snippets
        displaySnippets(allSnippets);
        
        console.log(`✅ Loaded ${allSnippets.length} snippets successfully`);
    } catch (error) {
        console.error('❌ Error loading snippets:', error);
        showErrorMessage('Failed to load snippets. Please refresh the page and try again.');
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
}

/**
 * Display snippets in the UI
 * @param {Array} snippets - Array of snippet objects to display
 */
function displaySnippets(snippets) {
    // Clear the container
    snippetsContainer.innerHTML = '';
    
    // Show appropriate message if no snippets
    if (snippets.length === 0) {
        noSnippetsElement.style.display = 'block';
        return;
    }
    
    // Hide the "no snippets" message
    noSnippetsElement.style.display = 'none';
    
    // Create and append snippet cards
    snippets.forEach(snippet => {
        const snippetCard = createSnippetCard(snippet);
        snippetsContainer.appendChild(snippetCard);
    });
    
    // Add fade-in animation to new cards
    const cards = snippetsContainer.querySelectorAll('.snippet-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100); // Stagger the animations
    });
}

/**
 * Create a snippet card element
 * @param {Object} snippet - The snippet data
 * @returns {HTMLElement} - The created card element
 */
function createSnippetCard(snippet) {
    // Create the main card container
    const card = document.createElement('div');
    card.className = 'snippet-card';
    
    // Format the creation date
    const createdDate = snippet.createdAt ? 
        new Date(snippet.createdAt.toDate()).toLocaleDateString() : 
        'Unknown date';
    
    // Build the card HTML
    card.innerHTML = `
        <div class="snippet-header">
            <div class="snippet-info">
                <h3>${escapeHtml(snippet.title)}</h3>
                <span class="snippet-language">${escapeHtml(snippet.language)}</span>
                <p class="snippet-date">Created: ${createdDate}</p>
            </div>
            <div class="snippet-actions">
                <button class="btn btn-edit" onclick="editSnippet('${snippet.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="confirmDeleteSnippet('${snippet.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        <div class="snippet-content">
            <button class="copy-button" onclick="copyToClipboard('${snippet.id}')">
                <i class="fas fa-copy"></i> Copy
            </button>
            <pre id="snippet-${snippet.id}">${escapeHtml(snippet.content)}</pre>
        </div>
    `;
    
    return card;
}

// ===== FORM HANDLING =====

/**
 * Handle form submission for both adding new snippets and editing existing ones
 * @param {Event} event - The form submit event
 */
async function handleFormSubmit(event) {
    // Prevent the default form submission behavior
    event.preventDefault();
    
    // Get form data
    const formData = getFormData();
    
    // Validate the form data
    if (!validateFormData(formData)) {
        return; // Stop if validation fails
    }
    
    try {
        // Disable the submit button to prevent multiple submissions
        setFormLoading(true);
        
        if (isEditMode) {
            // Update existing snippet
            console.log('📝 Updating snippet:', editingSnippetId);
            await updateSnippet(editingSnippetId, formData);
            showSuccessMessage('Snippet updated successfully!');
            cancelEdit(); // Exit edit mode
        } else {
            // Add new snippet
            console.log('➕ Adding new snippet');
            await addSnippet(formData);
            showSuccessMessage('Snippet added successfully!');
        }
        
        // Reset form and reload snippets
        resetForm();
        await loadSnippets();
        
    } catch (error) {
        console.error('❌ Error saving snippet:', error);
        const errorMessage = handleFirebaseError(error);
        showErrorMessage(errorMessage);
    } finally {
        // Re-enable the submit button
        setFormLoading(false);
    }
}

/**
 * Get data from the form inputs
 * @returns {Object} - Form data object
 */
function getFormData() {
    return {
        title: titleInput.value.trim(),
        language: languageInput.value,
        content: contentInput.value.trim()
    };
}

/**
 * Validate form data before submission
 * @param {Object} data - The form data to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateFormData(data) {
    const errors = [];
    
    // Check title
    if (!data.title) {
        errors.push('Title is required');
    } else if (data.title.length < 3) {
        errors.push('Title must be at least 3 characters long');
    } else if (data.title.length > 100) {
        errors.push('Title must be less than 100 characters');
    }
    
    // Check language
    if (!data.language) {
        errors.push('Please select a programming language');
    }
    
    // Check content
    if (!data.content) {
        errors.push('Code content is required');
    } else if (data.content.length < 5) {
        errors.push('Code content must be at least 5 characters long');
    }
    
    // Show errors if any
    if (errors.length > 0) {
        showErrorMessage('Please fix the following errors:\n• ' + errors.join('\n• '));
        return false;
    }
    
    return true;
}

/**
 * Reset the form to its initial state
 */
function resetForm() {
    snippetForm.reset();
    isEditMode = false;
    editingSnippetId = null;
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Snippet';
    cancelBtn.style.display = 'none';
}

/**
 * Set form loading state
 * @param {boolean} loading - Whether the form is in loading state
 */
function setFormLoading(loading) {
    if (loading) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    } else {
        addBtn.disabled = false;
        addBtn.innerHTML = isEditMode ? 
            '<i class="fas fa-save"></i> Update Snippet' : 
            '<i class="fas fa-plus"></i> Add Snippet';
    }
}

// ===== EDIT FUNCTIONALITY =====

/**
 * Enter edit mode for a specific snippet
 * @param {string} snippetId - The ID of the snippet to edit
 */
async function editSnippet(snippetId) {
    try {
        console.log('✏️ Entering edit mode for snippet:', snippetId);
        
        // Find the snippet in our local data
        const snippet = allSnippets.find(s => s.id === snippetId);
        
        if (!snippet) {
            // If not found locally, fetch from Firebase
            const fetchedSnippet = await getSnippetById(snippetId);
            if (!fetchedSnippet) {
                showErrorMessage('Snippet not found');
                return;
            }
        }
        
        // Populate the form with snippet data
        titleInput.value = snippet.title;
        languageInput.value = snippet.language;
        contentInput.value = snippet.content;
        
        // Set edit mode state
        isEditMode = true;
        editingSnippetId = snippetId;
        
        // Update UI for edit mode
        addBtn.innerHTML = '<i class="fas fa-save"></i> Update Snippet';
        cancelBtn.style.display = 'inline-flex';
        
        // Scroll to form
        document.querySelector('.add-snippet-section').scrollIntoView({
            behavior: 'smooth'
        });
        
        // Focus on title input
        titleInput.focus();
        
    } catch (error) {
        console.error('❌ Error entering edit mode:', error);
        showErrorMessage('Failed to load snippet for editing');
    }
}

/**
 * Cancel edit mode and return to add mode
 */
function cancelEdit() {
    console.log('❌ Cancelling edit mode');
    resetForm();
}

// ===== DELETE FUNCTIONALITY =====

/**
 * Show confirmation dialog and delete snippet if confirmed
 * @param {string} snippetId - The ID of the snippet to delete
 */
function confirmDeleteSnippet(snippetId) {
    // Find snippet title for confirmation message
    const snippet = allSnippets.find(s => s.id === snippetId);
    const snippetTitle = snippet ? snippet.title : 'this snippet';
    
    // Show confirmation dialog
    const confirmed = confirm(
        `Are you sure you want to delete "${snippetTitle}"?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
        deleteSnippetById(snippetId);
    }
}

/**
 * Delete a snippet by its ID
 * @param {string} snippetId - The ID of the snippet to delete
 */
async function deleteSnippetById(snippetId) {
    try {
        console.log('🗑️ Deleting snippet:', snippetId);
        
        // Delete from Firebase
        await deleteSnippet(snippetId);
        
        // Show success message
        showSuccessMessage('Snippet deleted successfully!');
        
        // Reload snippets to update the UI
        await loadSnippets();
        
    } catch (error) {
        console.error('❌ Error deleting snippet:', error);
        const errorMessage = handleFirebaseError(error);
        showErrorMessage(errorMessage);
    }
}

// ===== SEARCH & FILTER FUNCTIONALITY =====

/**
 * Handle search input changes
 * @param {Event} event - The input event
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    console.log('🔍 Searching for:', searchTerm);
    
    // Filter snippets based on search term
    const filteredSnippets = filterSnippets(searchTerm, languageFilter.value);
    displaySnippets(filteredSnippets);
}

/**
 * Handle language filter changes
 * @param {Event} event - The change event
 */
function handleLanguageFilter(event) {
    const selectedLanguage = event.target.value;
    console.log('🏷️ Filtering by language:', selectedLanguage || 'All');
    
    // Filter snippets based on selected language
    const filteredSnippets = filterSnippets(searchInput.value.toLowerCase().trim(), selectedLanguage);
    displaySnippets(filteredSnippets);
}

/**
 * Filter snippets based on search term and language
 * @param {string} searchTerm - The search term
 * @param {string} language - The selected language filter
 * @returns {Array} - Filtered snippets array
 */
function filterSnippets(searchTerm, language) {
    return allSnippets.filter(snippet => {
        // Check if snippet matches search term (in title or content)
        const matchesSearch = !searchTerm || 
            snippet.title.toLowerCase().includes(searchTerm) ||
            snippet.content.toLowerCase().includes(searchTerm);
        
        // Check if snippet matches language filter
        const matchesLanguage = !language || snippet.language === language;
        
        return matchesSearch && matchesLanguage;
    });
}

// ===== UTILITY FUNCTIONS =====

/**
 * Copy snippet content to clipboard
 * @param {string} snippetId - The ID of the snippet to copy
 */
async function copyToClipboard(snippetId) {
    try {
        const snippetElement = document.getElementById(`snippet-${snippetId}`);
        const content = snippetElement.textContent;
        
        // Use the Clipboard API to copy text
        await navigator.clipboard.writeText(content);
        
        // Show temporary success feedback
        const copyButton = snippetElement.parentElement.querySelector('.copy-button');
        const originalText = copyButton.innerHTML;
        
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyButton.style.background = '#48bb78';
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error copying to clipboard:', error);
        showErrorMessage('Failed to copy to clipboard');
    }
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - Escaped HTML text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show/hide loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
}

/**
 * Show success message to user
 * @param {string} message - The success message to display
 */
function showSuccessMessage(message) {
    // Create and show a temporary success notification
    const notification = createNotification(message, 'success');
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * Show error message to user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    // Create and show a temporary error notification
    const notification = createNotification(message, 'error');
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds (longer for errors)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

/**
 * Create a notification element
 * @param {string} message - The notification message
 * @param {string} type - The notification type ('success' or 'error')
 * @returns {HTMLElement} - The notification element
 */
function createNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease-out;
        background: ${type === 'success' ? 
            'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 
            'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)'};
    `;
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span style="margin-left: 10px;">${escapeHtml(message)}</span>
    `;
    
    // Add click to dismiss
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    return notification;
}

// ===== KEYBOARD SHORTCUTS =====

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - The keyboard event
 */
document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Enter to submit form
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (document.activeElement === titleInput || 
            document.activeElement === languageInput || 
            document.activeElement === contentInput) {
            event.preventDefault();
            snippetForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape key to cancel edit mode
    if (event.key === 'Escape' && isEditMode) {
        event.preventDefault();
        cancelEdit();
    }
});

// ===== ERROR BOUNDARY =====

/**
 * Global error handler for unhandled errors
 */
window.addEventListener('error', (event) => {
    console.error('🚨 Unhandled error:', event.error);
    showErrorMessage('An unexpected error occurred. Please refresh the page and try again.');
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    showErrorMessage('An unexpected error occurred. Please refresh the page and try again.');
    event.preventDefault(); // Prevent the default browser behavior
});

console.log('📜 App.js loaded successfully!');