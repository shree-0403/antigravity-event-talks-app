document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const releasesGrid = document.getElementById('releases-grid');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.chip');
    const tweetActionBar = document.getElementById('tweet-action-bar');
    const selectionPreviewText = document.getElementById('selection-preview-text');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    const tweetBtn = document.getElementById('tweet-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    // App State
    let allReleases = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedRelease = null;

    // Initialize
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        clearSelection();
        fetchReleases();
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRenderReleases();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-type');
            filterAndRenderReleases();
        });
    });

    cancelSelectionBtn.addEventListener('click', clearSelection);
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Fetch releases from Python backend
    async function fetchReleases() {
        showLoadingState();
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allReleases = data.releases || [];
            hideError();
            filterAndRenderReleases();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message || 'Failed to connect to the server. Please try again later.');
            releasesGrid.replaceChildren(); // Safe clear
        } finally {
            hideLoadingState();
        }
    }

    // Show loading skeleton cards
    function showLoadingState() {
        refreshBtn.classList.add('loading');
        releasesGrid.replaceChildren();
        
        // Render 6 skeleton cards
        for (let i = 0; i < 6; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card';
            releasesGrid.appendChild(skeletonCard);
        }
    }

    function hideLoadingState() {
        refreshBtn.classList.remove('loading');
    }

    function showError(message) {
        errorText.textContent = message; // Safe text insertion
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Filters and search logic
    function filterAndRenderReleases() {
        const filtered = allReleases.filter(release => {
            const matchesType = activeFilter === 'all' || release.type === activeFilter;
            
            const plainTextDesc = getPlainTextFromHTML(release.description).toLowerCase();
            const matchesSearch = searchQuery === '' || 
                release.type.toLowerCase().includes(searchQuery) ||
                release.date.toLowerCase().includes(searchQuery) ||
                plainTextDesc.includes(searchQuery);

            return matchesType && matchesSearch;
        });

        renderReleases(filtered);
    }

    // Helper to extract plain text from HTML string for searching/tweeting
    function getPlainTextFromHTML(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc.body.textContent || '';
    }

    // Render the grid of cards safely
    function renderReleases(releases) {
        releasesGrid.replaceChildren();

        if (releases.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const title = document.createElement('h3');
            title.textContent = 'No Release Notes Found';
            
            const desc = document.createElement('p');
            desc.textContent = 'Try adjusting your search query or filters.';
            
            emptyState.appendChild(title);
            emptyState.appendChild(desc);
            releasesGrid.appendChild(emptyState);
            return;
        }

        releases.forEach((release, index) => {
            const card = document.createElement('div');
            card.className = 'release-card';
            if (selectedRelease && selectedRelease.date === release.date && selectedRelease.description === release.description) {
                card.classList.add('selected');
            }

            // Card Header
            const header = document.createElement('div');
            header.className = 'card-header';

            const date = document.createElement('span');
            date.className = 'release-date';
            date.textContent = release.date;

            const badge = document.createElement('span');
            const typeClass = release.type.toLowerCase();
            badge.className = `badge badge-${typeClass}`;
            
            // Map types to friendly CSS class badges
            const allowedBadges = ['feature', 'change', 'issue', 'announcement', 'breaking'];
            if (!allowedBadges.includes(typeClass)) {
                badge.className = 'badge badge-fallback';
            }
            badge.textContent = release.type;

            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'card-header-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy';
            copyBtn.setAttribute('title', 'Copy Update to Clipboard');

            const svgDoc = new DOMParser().parseFromString(
                '<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 24 24" width="14" height="14" style="fill: currentColor; vertical-align: middle;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>', 
                'image/svg+xml'
            );
            copyBtn.appendChild(svgDoc.documentElement);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plainText = getPlainTextFromHTML(release.description);
                const textToCopy = `[${release.type}] ${release.date} - ${plainText.trim()}\nSource: ${release.link}`;
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.replaceChildren();
                    const checkSvgDoc = new DOMParser().parseFromString(
                        '<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 24 24" width="14" height="14" style="fill: var(--color-feature); vertical-align: middle;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
                        'image/svg+xml'
                    );
                    copyBtn.appendChild(checkSvgDoc.documentElement);
                    
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.replaceChildren();
                        copyBtn.appendChild(svgDoc.documentElement);
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            });

            actionsContainer.appendChild(badge);
            actionsContainer.appendChild(copyBtn);

            header.appendChild(date);
            header.appendChild(actionsContainer);

            // Card Body (Description)
            const body = document.createElement('div');
            body.className = 'card-body';
            
            // Render HTML content safely without using innerHTML
            renderSafeHTML(body, release.description);

            card.appendChild(header);
            card.appendChild(body);

            // Card click behavior (Select to Tweet)
            card.addEventListener('click', (e) => {
                // If user clicks a link inside the card, don't trigger selection
                if (e.target.tagName.toLowerCase() === 'a') {
                    return;
                }
                
                if (selectedRelease && selectedRelease.date === release.date && selectedRelease.description === release.description) {
                    clearSelection();
                } else {
                    selectRelease(release, card);
                }
            });

            releasesGrid.appendChild(card);
        });
    }

    // Zero-dependency safe HTML renderer (Strictly sanitizes and avoids innerHTML)
    function renderSafeHTML(container, htmlString) {
        container.replaceChildren();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        function cleanNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent);
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                const allowedTags = ['p', 'a', 'ul', 'li', 'code', 'pre', 'strong', 'em', 'br'];
                
                if (allowedTags.includes(tagName)) {
                    const newEl = document.createElement(tagName);
                    
                    if (tagName === 'a') {
                        const href = node.getAttribute('href');
                        // Validate link protocols to prevent javascript: XSS vectors
                        if (href && (href.startsWith('https://') || href.startsWith('http://'))) {
                            newEl.setAttribute('href', href);
                            newEl.setAttribute('target', '_blank');
                            newEl.setAttribute('rel', 'noopener noreferrer');
                        }
                    }
                    
                    for (const child of node.childNodes) {
                        const cleanChild = cleanNode(child);
                        if (cleanChild) {
                            newEl.appendChild(cleanChild);
                        }
                    }
                    return newEl;
                }
            }
            return null;
        }

        for (const child of doc.body.childNodes) {
            const cleanChild = cleanNode(child);
            if (cleanChild) {
                container.appendChild(cleanChild);
            }
        }
    }

    // Select release card
    function selectRelease(release, cardElement) {
        selectedRelease = release;
        
        // Update selection UI states in the grid
        const cards = document.querySelectorAll('.release-card');
        cards.forEach(c => c.classList.remove('selected'));
        cardElement.classList.add('selected');

        // Update Floating Action Bar details
        const plainText = getPlainTextFromHTML(release.description);
        selectionPreviewText.textContent = `(${release.date}) [${release.type}] - ${plainText}`;

        // Format and set up Twitter Intent URL
        const tweetText = formatTweetText(release, plainText);
        tweetBtn.setAttribute('href', `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`);

        // Display Action Bar
        tweetActionBar.classList.add('visible');
    }

    // Format Tweet message to match 280-char constraints
    function formatTweetText(release, plainText) {
        const header = `BigQuery ${release.type} (${release.date}): `;
        const link = ` ${release.link}`;
        
        // Max characters left for description (280 - header - link - safety padding)
        const maxDescLen = 280 - header.length - link.length - 5;
        
        let descText = plainText.trim().replace(/\s+/g, ' ');
        if (descText.length > maxDescLen) {
            descText = descText.substring(0, maxDescLen - 3) + '...';
        }
        
        return `${header}${descText}${link}`;
    }

    // Clear selection
    function clearSelection() {
        selectedRelease = null;
        const cards = document.querySelectorAll('.release-card');
        cards.forEach(c => c.classList.remove('selected'));
        
        tweetActionBar.classList.remove('visible');
        tweetBtn.removeAttribute('href');
        selectionPreviewText.textContent = '';
    }

    // Get current filtered list of release notes
    function getFilteredReleases() {
        return allReleases.filter(release => {
            const matchesType = activeFilter === 'all' || release.type === activeFilter;
            const plainTextDesc = getPlainTextFromHTML(release.description).toLowerCase();
            const matchesSearch = searchQuery === '' || 
                release.type.toLowerCase().includes(searchQuery) ||
                release.date.toLowerCase().includes(searchQuery) ||
                plainTextDesc.includes(searchQuery);
            return matchesType && matchesSearch;
        });
    }

    // Export current filtered results to CSV file
    function exportToCSV() {
        const filtered = getFilteredReleases();
        if (filtered.length === 0) {
            return;
        }

        const headers = ['Date', 'Type', 'Description', 'Link'];
        const rows = filtered.map(r => {
            const cleanDesc = getPlainTextFromHTML(r.description).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            return [
                r.date,
                r.type,
                cleanDesc,
                r.link
            ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
