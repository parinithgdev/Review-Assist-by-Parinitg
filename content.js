// Wait for page to load, then wait additional 5 seconds
setTimeout(() => {
    initializeExtension();
}, 5000);

// Global variables to store scan results
let cachedWordCategories = {};
let cachedMatches = null;
let cachedMrCategories = ['U', 'PG', '12', '15', '18'];
let cachedCdCategories = ['Language', 'Discrimination', 'Sex references', 'Sexual violence', 'Drugs', 'Racial language'];
let detectedDuration = null;

function initializeExtension() {
    // Get configurations from storage
    chrome.storage.local.get(['timestampConfig', 'captionConfig'], function(result) {
        const timestampConfig = result.timestampConfig || {};
        const captionConfig = result.captionConfig || {};
        const currentUrl = window.location.href;
        
        // Check if current URL matches timestamp config
        if (timestampConfig.url && timestampConfig.element && urlMatches(currentUrl, timestampConfig.url)) {
            console.log('Initializing timestamp copy for:', currentUrl);
            initializeTimestampCopy(timestampConfig.element);
        }
        
        // Check if current URL matches caption config
        if (captionConfig.url && captionConfig.element && urlMatches(currentUrl, captionConfig.url)) {
            console.log('Initializing word tracker for:', currentUrl);
            initializeWordTracker(captionConfig.element);
        }

        // Fallback to hardcoded domains if no config is set (for backward compatibility)
        if (!timestampConfig.url && !captionConfig.url) {
            if (window.location.hostname.includes('vcc-review-caption-alpha.corp')) {
                initializeWordTracker('div.panel-body#full-caps');
            }
            
            if (window.location.hostname.includes('atv-optic-domain-tooling-prod-iad.iad.proxy')) {
                initializeTimestampCopy('.vjs-current-time-display');
            }
        }
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

function initializeWordTracker(elementSelector) {
    // Get stored words - USING LOCAL STORAGE
    chrome.storage.local.get(['wordCategories'], function(result) {
        cachedWordCategories = result.wordCategories || {};
        
        if (Object.keys(cachedWordCategories).length === 0) {
            showNoWordsPrompt();
            return;
        }
        
        scanForWords(cachedWordCategories, elementSelector);
    });
}

function initializeTimestampCopy(elementSelector) {
    (function () {
        let currentButton = null;

        function createButton(container = document.body) {
            if (currentButton && currentButton.parentNode) {
                currentButton.remove();
            }

            const button = document.createElement("button");
            button.id = "timestampCopyBtn";
            button.textContent = "Copy Timestamp";

            // Load saved position or use default
            const savedPos = JSON.parse(localStorage.getItem("timestampBtnPos")) || {
                bottom: 35,
                left: 60
            };

            button.style.cssText = `
                position: fixed;
                bottom: ${savedPos.bottom}px;
                left: ${savedPos.left}px;
                z-index: 2147483647;
                padding: 12px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: move;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                user-select: none;
                font-family: Arial, sans-serif;
                transition: background 0.3s ease;
            `;

            button.onclick = () => {
                const el = document.querySelector(elementSelector);
                if (el) {
                    const textContent = el.textContent || el.innerText || '';
                    if (textContent.trim()) {
                        navigator.clipboard.writeText(textContent.trim()).then(() => {
                            button.textContent = "Copied!";
                            button.style.background = "#28a745";
                            setTimeout(() => {
                                button.textContent = "Copy Timestamp";
                                button.style.background = "#007bff";
                            }, 1500);
                        }).catch(() => {
                            button.textContent = "Copy Failed";
                            button.style.background = "#dc3545";
                            setTimeout(() => {
                                button.textContent = "Copy Timestamp";
                                button.style.background = "#007bff";
                            }, 1500);
                        });
                    } else {
                        button.textContent = "No Content";
                        button.style.background = "#ffc107";
                        setTimeout(() => {
                            button.textContent = "Copy Timestamp";
                            button.style.background = "#007bff";
                        }, 1500);
                    }
                } else {
                    button.textContent = "Element Not Found";
                    button.style.background = "#dc3545";
                    setTimeout(() => {
                        button.textContent = "Copy Timestamp";
                        button.style.background = "#007bff";
                    }, 1500);
                }
            };

            // --- Bottom-anchored drag logic with persistence ---
            let offsetX, offsetY, isDragging = false;

            button.addEventListener("mousedown", (e) => {
                isDragging = true;
                offsetX = e.clientX - button.getBoundingClientRect().left;
                offsetY = e.clientY - button.getBoundingClientRect().top;
                document.body.style.userSelect = "none";
                e.preventDefault();
            });

            document.addEventListener("mousemove", (e) => {
                if (isDragging) {
                    button.style.left = `${e.clientX - offsetX}px`;
                    const buttonHeight = button.offsetHeight;
                    button.style.bottom = `${window.innerHeight - e.clientY - (buttonHeight - offsetY)}px`;
                }
            });

            document.addEventListener("mouseup", () => {
                if (isDragging) {
                    // Save position on mouse release
                    localStorage.setItem("timestampBtnPos", JSON.stringify({
                        bottom: parseInt(button.style.bottom),
                        left: parseInt(button.style.left)
                    }));
                }
                isDragging = false;
                document.body.style.userSelect = "auto";
            });

            container.appendChild(button);
            currentButton = button;
            return button;
        }

        createButton();

        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => {
                if (document.fullscreenElement) {
                    createButton(document.fullscreenElement);
                } else {
                    createButton(document.body);
                }
            }, 100);
        });

        document.addEventListener('webkitfullscreenchange', () => {
            setTimeout(() => {
                const fullscreenElement = document.webkitFullscreenElement || document.webkitCurrentFullScreenElement;
                if (fullscreenElement) {
                    createButton(fullscreenElement);
                } else {
                    createButton(document.body);
                }
            }, 100);
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('vjs-fullscreen-control') || 
                e.target.closest('.vjs-fullscreen-control')) {
                setTimeout(() => {
                    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
                    if (fullscreenElement) {
                        createButton(fullscreenElement);
                    } else {
                        createButton(document.body);
                    }
                }, 500);
            }
        });
    })();
}

function showNoWordsPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.id = 'wordTrackerPrompt';
    promptDiv.className = 'word-tracker-floating';
    promptDiv.innerHTML = `
        <div class="word-tracker-header">
            <h3>
                <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Extension Icon" class="header-icon-img">Caption Assist by Parinitg
            </h3>
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="word-tracker-content">
            <p>No words have been configured yet. Please set up your word categories using the extension popup.</p>
            <p>Click the extension icon in your browser toolbar to get started.</p>
        </div>
    `;
    
    document.body.appendChild(promptDiv);
    makeDraggable(promptDiv);
}

function extractDurationFromContent(captionContent) {
    // Look for WebVTT timestamp patterns
    const timestampRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g;
    const timestamps = [];
    let match;
    
    while ((match = timestampRegex.exec(captionContent)) !== null) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        timestamps.push(totalSeconds);
    }
    
    if (timestamps.length > 0) {
        // Return the maximum timestamp as the duration
        const maxSeconds = Math.max(...timestamps);
        const hours = Math.floor(maxSeconds / 3600);
        const minutes = Math.floor((maxSeconds % 3600) / 60);
        const seconds = maxSeconds % 60;
        return { totalMinutes: Math.ceil(maxSeconds / 60), formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` };
    }
    
    return null;
}

function getFWordMRCategory(occurrences, durationMinutes) {
    // F-word thresholds based on duration
    const thresholds = [
        { duration: 15, maxOccurrences: 1 },
        { duration: 30, maxOccurrences: 2 },
        { duration: 45, maxOccurrences: 3 },
        { duration: 60, maxOccurrences: 4 },
        { duration: 90, maxOccurrences: 5 }
    ];
    
    // Find the appropriate threshold
    let applicableThreshold = null;
    for (const threshold of thresholds) {
        if (durationMinutes <= threshold.duration) {
            applicableThreshold = threshold;
            break;
        }
    }
    
    // If duration is longer than 90 minutes, use the 90-minute threshold
    if (!applicableThreshold) {
        applicableThreshold = thresholds[thresholds.length - 1];
    }
    
    // Return 15 if occurrences exceed threshold, otherwise 12
    return occurrences > applicableThreshold.maxOccurrences ? '15' : '12';
}

function scanForWords(wordCategories) {
    // Find the specific div containing WebVTT content
    const captionDiv = document.querySelector('div.panel-body#full-caps');
    let captionContent = '';
    
    if (captionDiv) {
        captionContent = captionDiv.textContent || captionDiv.innerText || '';
    }
    
    if (!captionContent.trim()) {
        console.log('No caption content found in div.panel-body#full-caps');
        return;
    }
    
    // Extract duration from content
    detectedDuration = extractDurationFromContent(captionContent);
    
    // Convert content to lowercase for case-insensitive matching
    const lowerCaptionContent = captionContent.toLowerCase();
    
    // Find matches
    const matches = {};
    const mrCategories = ['U', 'PG', '12', '15', '18'];
    const cdCategories = ['Language', 'Discrimination', 'Sex references', 'Sexual violence', 'Drugs', 'Racial language'];
    
    // Initialize matches structure
    mrCategories.forEach(mr => {
        matches[mr] = {};
        cdCategories.forEach(cd => {
            matches[mr][cd] = {};
        });
    });

    // Handle special F-words category with separated processing
    let totalFWordOccurrences = 0;
    if (wordCategories['SPECIAL_F_WORDS']) {
        const normalWords = [];
        const symbolWords = [];
        
        // Classify words
        wordCategories['SPECIAL_F_WORDS'].forEach(word => {
            const cleanWord = word.trim();
            if (cleanWord.includes('----') || cleanWord.includes('****') || cleanWord.includes('____') || 
                cleanWord.includes('*') || cleanWord.includes('-') || cleanWord.includes('_')) {
                symbolWords.push(cleanWord);
            } else {
                normalWords.push(cleanWord);
            }
        });
        
        console.log('Counting - Normal words:', normalWords);
        console.log('Counting - Symbol words:', symbolWords);
        
        // Process normal words (with word boundaries)
        if (normalWords.length > 0) {
            normalWords.forEach(word => {
                const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
                const matches = lowerCaptionContent.match(regex) || [];
                totalFWordOccurrences += matches.length;
                if (matches.length > 0) {
                    console.log(`Normal word "${word}": ${matches.length} matches`);
                }
            });
        }
        
        // Process symbol words (without word boundaries, longest first to avoid partial matches)
        if (symbolWords.length > 0) {
            symbolWords.sort((a, b) => b.length - a.length);
            
            // Track processed positions to avoid double-counting overlapping matches
            let processedRanges = [];
            
            symbolWords.forEach(word => {
                const regex = new RegExp(escapeRegExp(word), 'gi');
                let match;
                let wordMatches = 0;
                
                while ((match = regex.exec(lowerCaptionContent)) !== null) {
                    const start = match.index;
                    const end = match.index + match[0].length;
                    
                    // Check if this match overlaps with any already processed range
                    const overlaps = processedRanges.some(range => 
                        (start < range.end && end > range.start)
                    );
                    
                    if (!overlaps) {
                        processedRanges.push({start, end});
                        wordMatches++;
                        totalFWordOccurrences++;
                    }
                }
                
                if (wordMatches > 0) {
                    console.log(`Symbol word "${word}": ${wordMatches} matches`);
                }
            });
        }
        
        console.log(`Total F-word occurrences: ${totalFWordOccurrences}`);
        
        if (totalFWordOccurrences > 0 && detectedDuration) {
            const appropriateMR = getFWordMRCategory(totalFWordOccurrences, detectedDuration.totalMinutes);
            matches[appropriateMR]['Language']['fuck'] = totalFWordOccurrences;
        }
    }
    
    // Search for regular words (excluding special F-words category)
    Object.keys(wordCategories).forEach(categoryKey => {
        if (categoryKey === 'SPECIAL_F_WORDS') return; // Skip special category
        
        const [mr, cd] = categoryKey.split('_');
        const words = wordCategories[categoryKey];
        
        words.forEach(word => {
            const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
            const occurrences = (lowerCaptionContent.match(regex) || []).length;
            
            if (occurrences > 0) {
                matches[mr][cd][word] = occurrences;
            }
        });
    });
    
    // Check if any matches were found
    let hasMatches = false;
    for (const mr of mrCategories) {
        for (const cd of cdCategories) {
            if (Object.keys(matches[mr][cd]).length > 0) {
                hasMatches = true;
                break;
            }
        }
        if (hasMatches) break;
    }
    
    // Cache the results
    cachedMatches = matches;
    
    if (hasMatches || detectedDuration) {
        displayResults(matches, mrCategories, cdCategories);
    }
}

function displayResults(matches, mrCategories, cdCategories) {
    // Remove existing results
    const existing = document.getElementById('wordTrackerResults');
    if (existing) {
        existing.remove();
    }
    
    // Filter out empty CD categories
    const activeCdCategories = cdCategories.filter(cd => {
        return mrCategories.some(mr => {
            const words = matches[mr][cd];
            return words && Object.keys(words).length > 0;
        });
    });
    
    // If no active categories, don't show the table
    if (activeCdCategories.length === 0 && !detectedDuration) {
        return;
    }
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'wordTrackerResults';
    resultsDiv.className = 'word-tracker-floating';
    
    let tableHTML = `
        <div class="word-tracker-header">
            <h3>
                <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Extension Icon" class="header-icon-img">Caption Assist by Parinitg
            </h3>
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="word-tracker-content">
    `;
    
    // Add duration info if available
    if (detectedDuration) {
        tableHTML += `<div style="margin-bottom: 15px; padding: 10px; background-color: #e9ecef; border-radius: 4px; font-weight: bold; text-align: center;">
            Detected Content Duration: ${detectedDuration.formatted} (${detectedDuration.totalMinutes} minutes)
        </div>`;
    }
    
    if (activeCdCategories.length > 0) {
        tableHTML += `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>MR \\ CD</th>
        `;
        
        // Add column headers only for active categories
        activeCdCategories.forEach(cd => {
            tableHTML += `<th>${cd}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        // Add rows
        mrCategories.forEach(mr => {
            // Check if this MR has any words in active categories
            let mrHasWords = activeCdCategories.some(cd => {
                const words = matches[mr][cd];
                return words && Object.keys(words).length > 0;
            });
            
            if (mrHasWords) {
                tableHTML += `<tr><th>${mr}</th>`;
                
                activeCdCategories.forEach(cd => {
                    const words = matches[mr][cd];
                    let cellContent = '';
                    
                    if (Object.keys(words).length > 0) {
                        const wordEntries = Object.entries(words).map(([word, count]) => {
                            // Special formatting for F-word
                            if (word === 'fuck') {
                                return `<span class="clickable-word" data-word="fuck">fuck(${count})</span>`;
                            }
                            return `<span class="clickable-word" data-word="${word}">${word}: ${count}</span>`;
                        });
                        cellContent = wordEntries.join('<br>');
                    }
                    
                    tableHTML += `<td>${cellContent}</td>`;
                });
                
                tableHTML += '</tr>';
            }
        });
        
        tableHTML += '</tbody></table>';
    }
    
    tableHTML += '</div>';
    resultsDiv.innerHTML = tableHTML;
    
    // Add click event listeners for words
    resultsDiv.addEventListener('click', function(e) {
        if (e.target.classList.contains('clickable-word')) {
            const word = e.target.getAttribute('data-word');
            searchWordOnPage(word);
        }
    });
    
    document.body.appendChild(resultsDiv);
    makeDraggable(resultsDiv);
}

// Function to reopen word tracker (called from popup)
function reopenWordTracker() {
    // If we have cached results, display them immediately
    if (cachedMatches && Object.keys(cachedWordCategories).length > 0) {
        displayResults(cachedMatches, cachedMrCategories, cachedCdCategories);
    } else {
        // Otherwise, re-scan
        initializeWordTracker();
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reopenWordTracker') {
        reopenWordTracker();
        sendResponse({ success: true });
    }
});

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.word-tracker-header');
    
    if (header) {
        header.style.cursor = 'move';
        header.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Global variables for word searching
let currentSearchTerm = '';
let currentSearchVariants = [];
let allFoundElements = [];
let currentHighlightIndex = -1;

function searchWordOnPage(searchWord) {
    // If clicking the same word, go to next occurrence
    if (currentSearchTerm === searchWord && allFoundElements.length > 0) {
        highlightNextOccurrence();
        return;
    }
    
    // Clear any existing highlights
    clearAllHighlights();
    
    // Set up search terms
    currentSearchTerm = searchWord;
    
    // For F-word, get all variants from cached categories or use hardcoded list
    if (searchWord === 'fuck') {
        if (cachedWordCategories && cachedWordCategories['SPECIAL_F_WORDS']) {
            currentSearchVariants = [...cachedWordCategories['SPECIAL_F_WORDS']];
        } else {
            currentSearchVariants = ['fuck', 'fuckin', 'fucked', 'fucking', 'fucker', 'fuckers', 'fucks', 'fuckoff', 'fuck-', 'fuckinhell', 'fuckup', '----', '----ing', '----ed', '----ers', '----in', '****', '****in', '****ing', '****ed', '----off', '****off', '*******', '******', '____ing', '____ed', '____', '____in', '____off', 'bleep', 'feck', 'feckoff', 'feckin', 'fecking', 'fecked', 'phuck', 'phucking', 'phucked', 'phuckin', 'f***', 'f***ing', 'f***in', 'f---ing', 'f---', 'f---ed', 'eff', 'effed', 'effin', 'effing', 'f word', 'fuc', 'fucin', 'the f', 'omfg', 'wtf', 'mf', 'f no', 'stfu', 'snafu', 'fecks', 'fook', 'fookin', 'fookup', 'fooked', 'fooking', 'fooks', 'effu', 'fu', 'f u', 'f up', 'f-off','f off'];
        }
    } else {
        currentSearchVariants = [searchWord];
    }
    
    // Find and highlight all occurrences
    findAndHighlightAll();
    
    // Start with the first occurrence if any found
    if (allFoundElements.length > 0) {
        currentHighlightIndex = -1; // Start at -1 so first click goes to 0
        highlightNextOccurrence(); // This will set it to 0 and highlight first
    } else {
        alert(`No occurrences of "${searchWord}" found on this page.`);
    }
}

// Updated search function with separated processing
function findAndHighlightAll() {
    allFoundElements = [];
    
    const normalWords = [];
    const symbolWords = [];
    
    // Same classification as counting
    currentSearchVariants.forEach(word => {
        const cleanWord = word.trim();
        if (cleanWord.includes('----') || cleanWord.includes('****') || cleanWord.includes('____') || 
            cleanWord.includes('*') || cleanWord.includes('-') || cleanWord.includes('_')) {
            symbolWords.push(cleanWord);
        } else {
            normalWords.push(cleanWord);
        }
    });
    
    console.log('Search - Normal words:', normalWords);
    console.log('Search - Symbol words:', symbolWords);
    
    // Process normal words first
    if (normalWords.length > 0) {
        processWordsWithBoundaries(normalWords);
    }
    
    // Process symbol words second (avoiding already highlighted areas)
    if (symbolWords.length > 0) {
        symbolWords.sort((a, b) => b.length - a.length);
        processSymbolWords(symbolWords);
    }
    
    console.log('Total highlighted elements:', allFoundElements.length);
}

function processWordsWithBoundaries(words) {
    const pattern = words.map(term => `\\b${escapeRegExp(term)}\\b`).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    highlightMatches(regex, 'normal');
}

function processSymbolWords(words) {
    // Process longest first to avoid partial matches
    words.forEach(word => {
        const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
        highlightMatches(regex, 'symbol');
    });
}

function highlightMatches(regex, wordType) {
    // Get all text nodes that haven't been processed yet
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                
                // Skip script, style, and tracker elements
                if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
                    parent.closest('#wordTrackerResults') || parent.closest('.word-tracker-floating'))) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip already highlighted text
                if (parent && parent.classList.contains('word-search-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip hidden elements
                if (parent && !isElementVisible(parent)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return regex.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    console.log(`Processing ${textNodes.length} text nodes for ${wordType} words`);
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        
        if (matches.length > 0) {
            const parent = textNode.parentNode;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            
            matches.forEach(match => {
                // Add text before match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }
                
                // Create highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'word-search-highlight';
                highlightSpan.textContent = match[0];
                highlightSpan.style.cssText = `
                    background-color: yellow;
                    color: black;
                    padding: 1px 2px;
                    border-radius: 2px;
                    font-weight: normal;
                `;
                
                fragment.appendChild(highlightSpan);
                allFoundElements.push(highlightSpan);
                
                lastIndex = match.index + match[0].length;
            });
            
            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            
            // Replace the original text node
            parent.replaceChild(fragment, textNode);
        }
    });
}

function isElementVisible(element) {
    // Check if element or any parent is hidden
    let current = element;
    while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        
        // Check various ways an element can be hidden
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0' ||
            current.hidden === true ||
            (style.height === '0px' && style.overflow === 'hidden') ||
            (style.width === '0px' && style.overflow === 'hidden')) {
            return false;
        }
        
        current = current.parentElement;
    }
    
    // Additional check for elements that are positioned off-screen
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return false;
    }
    
    return true;
}

function highlightNextOccurrence() {
    if (allFoundElements.length === 0) return;
    
    // Reset all highlights to yellow
    allFoundElements.forEach(el => {
        if (el && el.parentNode) { // Check if element still exists
            el.style.backgroundColor = 'yellow';
            el.style.fontWeight = 'normal';
        }
    });
    
    // Move to next occurrence (with wrap-around)
    currentHighlightIndex = (currentHighlightIndex + 1) % allFoundElements.length;
    
    // Highlight current occurrence
    const currentElement = allFoundElements[currentHighlightIndex];
    if (currentElement && currentElement.parentNode) {
        currentElement.style.backgroundColor = 'orange';
        currentElement.style.fontWeight = 'bold';
        
        // Scroll to the element
        scrollToElement(currentElement);
        
        // Show position indicator
        showPositionIndicator(currentHighlightIndex + 1, allFoundElements.length);
    }
}

function scrollToElement(element) {
    if (!element || !element.parentNode) return;
    
    // Check if element is in a scrollable container
    const scrollableParent = findScrollableParent(element);
    
    if (scrollableParent && scrollableParent !== document.documentElement && scrollableParent !== document.body) {
        // Calculate position within scrollable container
        const containerRect = scrollableParent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        const containerHeight = scrollableParent.clientHeight;
        
        // Scroll container to center the element
        scrollableParent.scrollTop += relativeTop - (containerHeight / 2);
    }
    
    // Also scroll the main page smoothly
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });
}

function findScrollableParent(element) {
    let parent = element.parentElement;
    
    while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        
        if (overflowY === 'scroll' || overflowY === 'auto' || overflowX === 'scroll' || overflowX === 'auto') {
            // Check if it actually has scrollable content
            if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
                return parent;
            }
        }
        
        parent = parent.parentElement;
    }
    
    return document.documentElement;
}

function clearAllHighlights() {
    // Remove all existing highlights
    const highlights = document.querySelectorAll('.word-search-highlight');
    highlights.forEach(highlight => {
        if (highlight.parentNode) {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize(); // Merge adjacent text nodes
        }
    });
    
    allFoundElements = [];
    currentHighlightIndex = -1;
    currentSearchTerm = '';
    currentSearchVariants = [];
    
    // Remove position indicator
    const indicator = document.getElementById('positionIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function showPositionIndicator(current, total) {
    // Remove existing indicator
    const existing = document.getElementById('positionIndicator');
    if (existing) {
        existing.remove();
    }
    
    // Show a small, temporary indicator
    const indicator = document.createElement('div');
    indicator.id = 'positionIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0.9;
    `;
    indicator.textContent = `${current} of ${total}`;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }, 2000);
}