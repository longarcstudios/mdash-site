/**
 * mdash Documentation Search
 * Client-side full-text search with content indexing
 * 
 * Usage: Include this script in docs.html and add the search HTML structure
 */

(function() {
    'use strict';

    // Search index - will be populated on init
    let searchIndex = [];
    let searchModal = null;
    let searchInput = null;
    let searchResults = null;
    let isOpen = false;

    // Initialize search on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        buildSearchIndex();
        createSearchModal();
        bindEvents();
    }

    /**
     * Build search index from page content
     */
    function buildSearchIndex() {
        // Index all documentation sections
        const sections = document.querySelectorAll('.doc-section');
        
        sections.forEach(section => {
            const id = section.id || '';
            const heading = section.querySelector('h1, h2, h3');
            const title = heading ? heading.textContent.trim() : '';
            
            // Get all text content, excluding code blocks for cleaner results
            const contentElements = section.querySelectorAll('p, li, td, .info-box');
            let content = '';
            contentElements.forEach(el => {
                content += ' ' + el.textContent;
            });
            content = content.trim().substring(0, 500); // Limit content length

            if (title || content) {
                searchIndex.push({
                    id: id,
                    title: title,
                    content: content,
                    section: findParentSection(section),
                    element: section
                });
            }
        });

        // Also index sidebar navigation items
        const navItems = document.querySelectorAll('.sidebar-nav a');
        navItems.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = href.substring(1);
                // Check if already indexed
                const exists = searchIndex.some(item => item.id === targetId);
                if (!exists) {
                    searchIndex.push({
                        id: targetId,
                        title: link.textContent.trim(),
                        content: '',
                        section: link.closest('.nav-group')?.querySelector('.nav-group-title')?.textContent || '',
                        element: document.getElementById(targetId)
                    });
                }
            }
        });

        console.log(`[mdash-search] Indexed ${searchIndex.length} sections`);
    }

    function findParentSection(element) {
        // Find the parent nav group for breadcrumb purposes
        const id = element.id;
        if (!id) return '';
        
        const navLink = document.querySelector(`.sidebar-nav a[href="#${id}"]`);
        if (navLink) {
            const group = navLink.closest('.nav-group');
            if (group) {
                const groupTitle = group.querySelector('.nav-group-title');
                return groupTitle ? groupTitle.textContent.trim() : '';
            }
        }
        return '';
    }

    /**
     * Create search modal HTML
     */
    function createSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'search-modal';
        modal.innerHTML = `
            <div class="search-backdrop"></div>
            <div class="search-container">
                <div class="search-header">
                    <div class="search-input-wrapper">
                        <span class="search-icon">⌘</span>
                        <input type="text" class="search-input" placeholder="Search documentation..." autocomplete="off" spellcheck="false">
                        <span class="search-shortcut">ESC</span>
                    </div>
                </div>
                <div class="search-results"></div>
                <div class="search-footer">
                    <span class="search-hint">↑↓ Navigate</span>
                    <span class="search-hint">↵ Select</span>
                    <span class="search-hint">ESC Close</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        searchModal = modal;
        searchInput = modal.querySelector('.search-input');
        searchResults = modal.querySelector('.search-results');

        // Add styles
        addSearchStyles();
    }

    /**
     * Add CSS styles for search modal
     */
    function addSearchStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .search-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
            }

            .search-modal.open {
                display: flex;
            }

            .search-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(10, 10, 15, 0.9);
                backdrop-filter: blur(4px);
            }

            .search-container {
                position: relative;
                width: 100%;
                max-width: 600px;
                margin: 0 20px;
                background: var(--bg-surface, #12121A);
                border: 1px solid var(--border, #1E1E2E);
                box-shadow: 0 0 60px rgba(0, 212, 255, 0.1);
            }

            .search-header {
                border-bottom: 1px solid var(--border, #1E1E2E);
            }

            .search-input-wrapper {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                gap: 12px;
            }

            .search-icon {
                color: var(--text-dim, #3A3A4A);
                font-size: 0.9rem;
            }

            .search-input {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                color: var(--text-bright, #FFFFFF);
                font-family: var(--font-mono, 'JetBrains Mono', monospace);
                font-size: 1rem;
            }

            .search-input::placeholder {
                color: var(--text-dim, #3A3A4A);
            }

            .search-shortcut {
                padding: 4px 8px;
                background: var(--bg-elevated, #1A1A24);
                color: var(--text-dim, #3A3A4A);
                font-size: 0.7rem;
                border: 1px solid var(--border, #1E1E2E);
            }

            .search-results {
                max-height: 400px;
                overflow-y: auto;
            }

            .search-results::-webkit-scrollbar {
                width: 6px;
            }

            .search-results::-webkit-scrollbar-track {
                background: transparent;
            }

            .search-results::-webkit-scrollbar-thumb {
                background: var(--border, #1E1E2E);
            }

            .search-result-item {
                display: block;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border, #1E1E2E);
                text-decoration: none;
                transition: background 0.15s ease;
                cursor: pointer;
            }

            .search-result-item:hover,
            .search-result-item.selected {
                background: var(--bg-elevated, #1A1A24);
            }

            .search-result-item.selected {
                border-left: 2px solid var(--cyan, #00D4FF);
                padding-left: 18px;
            }

            .search-result-section {
                font-size: 0.7rem;
                color: var(--text-dim, #3A3A4A);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 4px;
            }

            .search-result-title {
                color: var(--text-bright, #FFFFFF);
                font-weight: 500;
                margin-bottom: 4px;
            }

            .search-result-title mark {
                background: rgba(0, 212, 255, 0.3);
                color: var(--cyan, #00D4FF);
            }

            .search-result-excerpt {
                font-size: 0.85rem;
                color: var(--text-muted, #6B6B7B);
                line-height: 1.5;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .search-result-excerpt mark {
                background: rgba(0, 212, 255, 0.2);
                color: var(--cyan, #00D4FF);
            }

            .search-empty {
                padding: 40px 20px;
                text-align: center;
                color: var(--text-dim, #3A3A4A);
            }

            .search-empty-icon {
                font-size: 2rem;
                margin-bottom: 12px;
            }

            .search-footer {
                display: flex;
                gap: 16px;
                padding: 12px 20px;
                border-top: 1px solid var(--border, #1E1E2E);
                background: var(--bg-elevated, #1A1A24);
            }

            .search-hint {
                font-size: 0.7rem;
                color: var(--text-dim, #3A3A4A);
            }

            /* Search trigger button */
            .search-trigger {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--bg-surface, #12121A);
                border: 1px solid var(--border, #1E1E2E);
                color: var(--text-muted, #6B6B7B);
                font-family: var(--font-mono, 'JetBrains Mono', monospace);
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .search-trigger:hover {
                border-color: var(--cyan, #00D4FF);
                color: var(--cyan, #00D4FF);
            }

            .search-trigger-key {
                padding: 2px 6px;
                background: var(--bg-elevated, #1A1A24);
                border: 1px solid var(--border, #1E1E2E);
                font-size: 0.7rem;
            }

            @media (max-width: 768px) {
                .search-modal {
                    padding-top: 10vh;
                }

                .search-footer {
                    display: none;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Bind event handlers
     */
    function bindEvents() {
        // Keyboard shortcut: Cmd/Ctrl + K
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
            
            // Also allow "/" to open search when not in input
            if (e.key === '/' && !isInputFocused()) {
                e.preventDefault();
                openSearch();
            }

            if (e.key === 'Escape' && isOpen) {
                closeSearch();
            }
        });

        // Close on backdrop click
        searchModal.querySelector('.search-backdrop').addEventListener('click', closeSearch);

        // Input handling
        searchInput.addEventListener('input', debounce(handleSearch, 150));
        searchInput.addEventListener('keydown', handleKeyNavigation);

        // Add search trigger button to sidebar if it exists
        const sidebar = document.querySelector('.docs-sidebar');
        if (sidebar) {
            const trigger = document.createElement('button');
            trigger.className = 'search-trigger';
            trigger.innerHTML = `
                <span>Search docs...</span>
                <span class="search-trigger-key">⌘K</span>
            `;
            trigger.addEventListener('click', openSearch);
            
            // Insert at top of sidebar
            sidebar.insertBefore(trigger, sidebar.firstChild);
        }
    }

    function isInputFocused() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    }

    /**
     * Open search modal
     */
    function openSearch() {
        isOpen = true;
        searchModal.classList.add('open');
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchInput.focus();
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close search modal
     */
    function closeSearch() {
        isOpen = false;
        searchModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    /**
     * Handle search input
     */
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (!query) {
            searchResults.innerHTML = '';
            return;
        }

        const results = searchIndex.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(query);
            const contentMatch = item.content.toLowerCase().includes(query);
            return titleMatch || contentMatch;
        }).slice(0, 10); // Limit to 10 results

        renderResults(results, query);
    }

    /**
     * Render search results
     */
    function renderResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">∅</div>
                    <div>No results found for "${escapeHtml(query)}"</div>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = results.map((item, index) => `
            <a href="#${item.id}" class="search-result-item${index === 0 ? ' selected' : ''}" data-index="${index}">
                ${item.section ? `<div class="search-result-section">${escapeHtml(item.section)}</div>` : ''}
                <div class="search-result-title">${highlightMatch(item.title, query)}</div>
                ${item.content ? `<div class="search-result-excerpt">${highlightMatch(truncate(item.content, 150), query)}</div>` : ''}
            </a>
        `).join('');

        // Bind click handlers
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                closeSearch();
                
                // Navigate to section
                if (href) {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Update URL without scrolling
                        history.pushState(null, '', href);
                    }
                }
            });
        });
    }

    /**
     * Handle keyboard navigation in results
     */
    function handleKeyNavigation(e) {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        const selected = searchResults.querySelector('.search-result-item.selected');
        let selectedIndex = selected ? parseInt(selected.dataset.index) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
        } else if (e.key === 'Enter' && selected) {
            e.preventDefault();
            selected.click();
            return;
        } else {
            return;
        }

        items.forEach((item, i) => {
            item.classList.toggle('selected', i === selectedIndex);
        });

        // Scroll selected into view
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    /**
     * Utility: Highlight matching text
     */
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Utility: Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Escape regex special chars
     */
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Utility: Truncate text
     */
    function truncate(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Utility: Debounce function
     */
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Expose API for external use
    window.mdashSearch = {
        open: openSearch,
        close: closeSearch,
        reindex: buildSearchIndex
    };

})();
