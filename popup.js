document.addEventListener('DOMContentLoaded', function() {
    // Main view elements
    const wordInput = document.getElementById('wordInput');
    const mrSelect = document.getElementById('mrSelect');
    const cdSelect = document.getElementById('cdSelect');
    const addBtn = document.getElementById('addBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const showTrackerBtn = document.getElementById('showTrackerBtn');
    const setupBtn = document.getElementById('setupBtn');
    const status = document.getElementById('status');
    const savedWordsDiv = document.getElementById('savedWords');
    
    // Setup view elements
    const mainView = document.getElementById('mainView');
    const setupView = document.getElementById('setupView');
    const backBtn = document.getElementById('backBtn');
    const timestampUrl = document.getElementById('timestampUrl');
    const timestampElement = document.getElementById('timestampElement');
    const captionUrl = document.getElementById('captionUrl');
    const captionElement = document.getElementById('captionElement');
    const saveTimestampBtn = document.getElementById('saveTimestampBtn');
    const saveCaptionBtn = document.getElementById('saveCaptionBtn');
    const setupStatus = document.getElementById('setupStatus');
    const currentConfig = document.getElementById('currentConfig');
    const configDisplay = document.getElementById('configDisplay');

    // Load saved words and config on startup
    loadSavedWords();
    loadCurrentConfig();

    // Event listeners for main view
    addBtn.addEventListener('click', addWords);
    deleteBtn.addEventListener('click', deleteWords);
    showTrackerBtn.addEventListener('click', showWordTracker);
    setupBtn.addEventListener('click', showSetupView);
    
    // Event listeners for setup view
    backBtn.addEventListener('click', showMainView);
    saveTimestampBtn.addEventListener('click', saveTimestampConfig);
    saveCaptionBtn.addEventListener('click', saveCaptionConfig);

    function showSetupView() {
        mainView.style.display = 'none';
        setupView.style.display = 'block';
        loadSetupConfig();
    }

    function showMainView() {
        setupView.style.display = 'none';
        mainView.style.display = 'block';
    }

    function loadSetupConfig() {
        chrome.storage.local.get(['timestampConfig', 'captionConfig'], function(result) {
            const timestampConfig = result.timestampConfig || {};
            const captionConfig = result.captionConfig || {};
            
            timestampUrl.value = timestampConfig.url || '';
            timestampElement.value = timestampConfig.element || '';
            captionUrl.value = captionConfig.url || '';
            captionElement.value = captionConfig.element || '';
            
            updateConfigDisplay(timestampConfig, captionConfig);
        });
    }

    function updateConfigDisplay(timestampConfig, captionConfig) {
        let html = '';
        
        if (timestampConfig.url && timestampConfig.element) {
            html += `<div class="config-item"><strong>Timestamp:</strong> ${timestampConfig.url} → ${timestampConfig.element}</div>`;
        } else {
            html += `<div class="config-item"><strong>Timestamp:</strong> Not configured</div>`;
        }
        
        if (captionConfig.url && captionConfig.element) {
            html += `<div class="config-item"><strong>Caption:</strong> ${captionConfig.url} → ${captionConfig.element}</div>`;
        } else {
            html += `<div class="config-item"><strong>Caption:</strong> Not configured</div>`;
        }
        
        configDisplay.innerHTML = html || 'No configuration set';
    }

    function loadCurrentConfig() {
        chrome.storage.local.get(['timestampConfig', 'captionConfig'], function(result) {
            const timestampConfig = result.timestampConfig || {};
            const captionConfig = result.captionConfig || {};
            updateConfigDisplay(timestampConfig, captionConfig);
        });
    }

    function saveTimestampConfig() {
        const url = timestampUrl.value.trim();
        const element = timestampElement.value.trim();
        
        if (!url || !element) {
            showSetupStatus('Please fill in both URL and element selector', 'error');
            return;
        }
        
        const config = { url, element };
        chrome.storage.local.set({ timestampConfig: config }, function() {
            if (chrome.runtime.lastError) {
                showSetupStatus('Error saving timestamp config: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            showSetupStatus('Timestamp configuration saved!', 'success');
            loadCurrentConfig();
        });
    }

    function saveCaptionConfig() {
        const url = captionUrl.value.trim();
        const element = captionElement.value.trim();
        
        if (!url || !element) {
            showSetupStatus('Please fill in both URL and element selector', 'error');
            return;
        }
        
        const config = { url, element };
        chrome.storage.local.set({ captionConfig: config }, function() {
            if (chrome.runtime.lastError) {
                showSetupStatus('Error saving caption config: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            showSetupStatus('Caption configuration saved!', 'success');
            loadCurrentConfig();
        });
    }

    function showSetupStatus(message, type) {
        setupStatus.innerHTML = `<div class="status ${type}">${message}</div>`;
        setTimeout(() => {
            setupStatus.innerHTML = '';
        }, 3000);
    }

    function showStatus(message, type) {
        status.innerHTML = `<div class="status ${type}">${message}</div>`;
        setTimeout(() => {
            status.innerHTML = '';
        }, 3000);
    }

    function showWordTracker() {
        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            
            // Check if we have caption config and if current page matches
            chrome.storage.local.get(['captionConfig'], function(result) {
                const captionConfig = result.captionConfig || {};
                
                if (!captionConfig.url || !captionConfig.element) {
                    showStatus('Please configure caption settings in Setup first', 'error');
                    return;
                }
                
                // Check if current URL matches the configured pattern
                if (urlMatches(currentTab.url, captionConfig.url)) {
                    // Send message to content script to reopen word tracker
                    chrome.tabs.sendMessage(currentTab.id, { action: 'reopenWordTracker' }, function(response) {
                        if (chrome.runtime.lastError) {
                            showStatus('Extension not loaded on this page. Please refresh the page.', 'error');
                        } else if (response && response.success) {
                            showStatus('Caption Assist opened!', 'success');
                            // Close popup after successful action
                            setTimeout(() => {
                                window.close();
                            }, 1000);
                        } else {
                            showStatus('Failed to open Caption Assist', 'error');
                        }
                    });
                } else {
                    showStatus('Word tracker only works on configured caption pages', 'error');
                }
            });
        });
    }

    function urlMatches(currentUrl, pattern) {
        // Convert pattern to regex
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
            .replace(/\*/g, '.*'); // Replace * with .*
        
        const regex = new RegExp('^' + regexPattern + '$', 'i');
        return regex.test(currentUrl);
    }

    function isFWordVariant(word) {
        const fWordVariants = ['fuck', 'fucked', 'fucking', 'fucks', 'fucker', 'fuckin'];
        return fWordVariants.includes(word.toLowerCase());
    }

    function addWords() {
        const words = wordInput.value.trim();
        if (!words) {
            showStatus('Please enter at least one word', 'error');
            return;
        }

        const mr = mrSelect.value;
        const cd = cdSelect.value;
        
        // Split words by comma and clean them up
        const wordList = words.split(',').map(word => word.trim().toLowerCase()).filter(word => word);
        
        if (wordList.length === 0) {
            showStatus('Please enter valid words', 'error');
            return;
        }

        // Check if any F-word variants are being added
        const fWordVariants = wordList.filter(word => isFWordVariant(word));
        if (fWordVariants.length > 0) {
            showStatus('F-word variants are handled automatically based on duration. Please use other words.', 'error');
            return;
        }

        // Get existing data - USING LOCAL STORAGE
        chrome.storage.local.get(['wordCategories'], function(result) {
            if (chrome.runtime.lastError) {
                showStatus('Error accessing storage: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            const wordCategories = result.wordCategories || {};
            
            // Initialize category if doesn't exist
            const categoryKey = `${mr}_${cd}`;
            if (!wordCategories[categoryKey]) {
                wordCategories[categoryKey] = [];
            }
            
            // Add new words (avoid duplicates)
            let addedCount = 0;
            wordList.forEach(word => {
                if (!wordCategories[categoryKey].includes(word)) {
                    wordCategories[categoryKey].push(word);
                    addedCount++;
                }
            });
            
            // Save updated data
            chrome.storage.local.set({wordCategories}, function() {
                if (chrome.runtime.lastError) {
                    showStatus('Error saving words: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                if (addedCount > 0) {
                    showStatus(`Added ${addedCount} word(s) to ${mr} - ${cd}`, 'success');
                    wordInput.value = '';
                    loadSavedWords();
                } else {
                    showStatus('All words already exist in this category', 'error');
                }
            });
        });
    }

    function deleteWords() {
        const words = wordInput.value.trim();
        if (!words) {
            showStatus('Please enter words to delete', 'error');
            return;
        }

        const mr = mrSelect.value;
        const cd = cdSelect.value;
        
        // Split words by comma and clean them up
        const wordList = words.split(',').map(word => word.trim().toLowerCase()).filter(word => word);
        
        if (wordList.length === 0) {
            showStatus('Please enter valid words', 'error');
            return;
        }

        // Check if any F-word variants are being deleted
        const fWordVariants = wordList.filter(word => isFWordVariant(word));
        if (fWordVariants.length > 0) {
            showStatus('F-word variants cannot be deleted as they are handled automatically.', 'error');
            return;
        }

        // Get existing data - USING LOCAL STORAGE
        chrome.storage.local.get(['wordCategories'], function(result) {
            if (chrome.runtime.lastError) {
                showStatus('Error accessing storage: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            const wordCategories = result.wordCategories || {};
            const categoryKey = `${mr}_${cd}`;
            
            if (!wordCategories[categoryKey]) {
                showStatus('No words found in this category', 'error');
                return;
            }
            
            // Remove words
            let deletedCount = 0;
            wordList.forEach(word => {
                const index = wordCategories[categoryKey].indexOf(word);
                if (index > -1) {
                    wordCategories[categoryKey].splice(index, 1);
                    deletedCount++;
                }
            });
            
            // Clean up empty categories
            if (wordCategories[categoryKey].length === 0) {
                delete wordCategories[categoryKey];
            }
            
            // Save updated data
            chrome.storage.local.set({wordCategories}, function() {
                if (chrome.runtime.lastError) {
                    showStatus('Error saving changes: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                if (deletedCount > 0) {
                    showStatus(`Deleted ${deletedCount} word(s) from ${mr} - ${cd}`, 'success');
                    wordInput.value = '';
                    loadSavedWords();
                } else {
                    showStatus('No matching words found to delete', 'error');
                }
            });
        });
    }

    function loadSavedWords() {
        chrome.storage.local.get(['wordCategories'], function(result) {
            if (chrome.runtime.lastError) {
                savedWordsDiv.innerHTML = '<div style="text-align: center; color: #ff0000;">Error loading words: ' + chrome.runtime.lastError.message + '</div>';
                return;
            }
            
            const wordCategories = result.wordCategories || {};
            
            if (Object.keys(wordCategories).length === 0) {
                savedWordsDiv.innerHTML = '<div style="text-align: center; color: #666;">No words saved yet</div>';
                return;
            }
            
            let html = '<h3 style="margin-top: 0;">Saved Words:</h3>';
            
            // Group by MR then CD
            const mrCategories = ['U', 'PG', '12', '15', '18'];
            const cdCategories = ['Language', 'Discrimination', 'Sex references', 'Sexual violence', 'Drugs', 'Racial language'];
            
            // Add special F-words section
            if (wordCategories['SPECIAL_F_WORDS'] && wordCategories['SPECIAL_F_WORDS'].length > 0) {
                html += '<div class="category-group"><div class="category-title">Special F-words (Dynamic MR based on duration):</div>';
                html += `<div class="word-list"><strong>Language:</strong> ${wordCategories['SPECIAL_F_WORDS'].join(', ')}</div>`;
                html += '</div>';
            }
            
            mrCategories.forEach(mr => {
                let mrHasWords = false;
                let mrHtml = `<div class="category-group"><div class="category-title">${mr}:</div>`;
                
                cdCategories.forEach(cd => {
                    const categoryKey = `${mr}_${cd}`;
                    if (wordCategories[categoryKey] && wordCategories[categoryKey].length > 0) {
                        mrHasWords = true;
                        mrHtml += `<div class="word-list"><strong>${cd}:</strong> ${wordCategories[categoryKey].join(', ')}</div>`;
                    }
                });
                
                mrHtml += '</div>';
                
                if (mrHasWords) {
                    html += mrHtml;
                }
            });
            
            savedWordsDiv.innerHTML = html;
        });
    }
});