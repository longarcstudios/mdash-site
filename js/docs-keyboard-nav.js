/**
 * mdash Documentation Keyboard Navigation
 * Full tab/arrow key support for sidebar navigation
 * 
 * Usage: Include this script in docs.html
 */

(function() {
    'use strict';

    let sidebar = null;
    let navItems = [];
    let currentIndex = -1;
    let isNavigating = false;

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        sidebar = document.querySelector('.docs-sidebar, .sidebar');
        if (!sidebar) {
            console.log('[mdash-nav] No sidebar found');
            return;
        }

        collectNavItems();
        bindEvents();
        highlightCurrentSection();

        console.log(`[mdash-nav] Initialized with ${navItems.length} navigable items`);
    }

    /**
     * Collect all navigable items in the sidebar
     */
    function collectNavItems() {
        navItems = Array.from(sidebar.querySelectorAll('a[href^="#"], .nav-group-title'));
        
        // Make nav group titles focusable
        navItems.forEach((item, index) => {
            if (!item.getAttribute('tabindex')) {
                item.setAttribute('tabindex', '0');
            }
            item.dataset.navIndex = index;
        });
    }

    /**
     * Bind keyboard event handlers
     */
    function bindEvents() {
        // Sidebar keyboard navigation
        sidebar.addEventListener('keydown', handleSidebarKeydown);

        // Global keyboard shortcuts
        document.addEventListener('keydown', handleGlobalKeydown);

        // Track focus within sidebar
        sidebar.addEventListener('focusin', (e) => {
            const index = parseInt(e.target.dataset?.navIndex);
            if (!isNaN(index)) {
                currentIndex = index;
            }
        });

        // Scroll spy - highlight current section
        if ('IntersectionObserver' in window) {
            setupScrollSpy();
        }

        // Make nav groups expandable via keyboard
        sidebar.querySelectorAll('.nav-group-title').forEach(title => {
            title.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNavGroup(title);
                }
            });
            
            title.addEventListener('click', () => {
                toggleNavGroup(title);
            });
        });
    }

    /**
     * Handle keydown events within sidebar
     */
    function handleSidebarKeydown(e) {
        const { key } = e;

        switch (key) {
            case 'ArrowDown':
            case 'j': // Vim-style
                e.preventDefault();
                navigateNext();
                break;

            case 'ArrowUp':
            case 'k': // Vim-style
                e.preventDefault();
                navigatePrev();
                break;

            case 'ArrowRight':
            case 'l': // Vim-style
                e.preventDefault();
                expandCurrentGroup();
                break;

            case 'ArrowLeft':
            case 'h': // Vim-style
                e.preventDefault();
                collapseCurrentGroup();
                break;

            case 'Enter':
            case ' ':
                if (e.target.tagName === 'A') {
                    // Let the link navigate naturally
                    return;
                }
                e.preventDefault();
                activateCurrentItem();
                break;

            case 'Home':
                e.preventDefault();
                navigateFirst();
                break;

            case 'End':
                e.preventDefault();
                navigateLast();
                break;
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    function handleGlobalKeydown(e) {
        // Don't interfere with input elements
        if (isInputFocused()) return;

        // 's' to focus sidebar (common pattern)
        if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
            // Only if not in search modal
            if (!document.querySelector('.search-modal.open')) {
                e.preventDefault();
                focusSidebar();
            }
        }

        // 'g' then 't' for go to top
        // 'g' then 'b' for go to bottom
        // Implement simple g prefix commands
    }

    /**
     * Navigate to next item
     */
    function navigateNext() {
        if (currentIndex < navItems.length - 1) {
            currentIndex++;
            focusItem(currentIndex);
        }
    }

    /**
     * Navigate to previous item
     */
    function navigatePrev() {
        if (currentIndex > 0) {
            currentIndex--;
            focusItem(currentIndex);
        }
    }

    /**
     * Navigate to first item
     */
    function navigateFirst() {
        currentIndex = 0;
        focusItem(currentIndex);
    }

    /**
     * Navigate to last item
     */
    function navigateLast() {
        currentIndex = navItems.length - 1;
        focusItem(currentIndex);
    }

    /**
     * Focus a specific item
     */
    function focusItem(index) {
        const item = navItems[index];
        if (item) {
            item.focus();
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Focus the sidebar
     */
    function focusSidebar() {
        if (currentIndex < 0) currentIndex = 0;
        focusItem(currentIndex);
    }

    /**
     * Activate current item (navigate to section)
     */
    function activateCurrentItem() {
        const item = navItems[currentIndex];
        if (!item) return;

        if (item.tagName === 'A') {
            const href = item.getAttribute('href');
            if (href?.startsWith('#')) {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, '', href);
                    
                    // Focus main content after navigation
                    setTimeout(() => {
                        const main = document.querySelector('.docs-content, main');
                        if (main) main.focus();
                    }, 300);
                }
            }
        } else if (item.classList.contains('nav-group-title')) {
            toggleNavGroup(item);
        }
    }

    /**
     * Toggle nav group expansion
     */
    function toggleNavGroup(title) {
        const group = title.closest('.nav-group');
        if (group) {
            group.classList.toggle('collapsed');
            const isCollapsed = group.classList.contains('collapsed');
            title.setAttribute('aria-expanded', !isCollapsed);
        }
    }

    /**
     * Expand current nav group
     */
    function expandCurrentGroup() {
        const item = navItems[currentIndex];
        if (!item) return;

        const group = item.closest('.nav-group');
        if (group?.classList.contains('collapsed')) {
            group.classList.remove('collapsed');
            const title = group.querySelector('.nav-group-title');
            if (title) title.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Collapse current nav group
     */
    function collapseCurrentGroup() {
        const item = navItems[currentIndex];
        if (!item) return;

        const group = item.closest('.nav-group');
        if (group && !group.classList.contains('collapsed')) {
            group.classList.add('collapsed');
            const title = group.querySelector('.nav-group-title');
            if (title) {
                title.setAttribute('aria-expanded', 'false');
                title.focus();
                currentIndex = parseInt(title.dataset.navIndex) || 0;
            }
        }
    }

    /**
     * Setup scroll spy to highlight current section
     */
    function setupScrollSpy() {
        const sections = document.querySelectorAll('.doc-section[id], section[id]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    highlightNavItem(id);
                }
            });
        }, {
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0
        });

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Highlight nav item for current section
     */
    function highlightNavItem(sectionId) {
        // Remove existing highlights
        sidebar.querySelectorAll('.nav-link-active').forEach(el => {
            el.classList.remove('nav-link-active');
        });

        // Add highlight to matching link
        const link = sidebar.querySelector(`a[href="#${sectionId}"]`);
        if (link) {
            link.classList.add('nav-link-active');
            
            // Ensure parent group is expanded
            const group = link.closest('.nav-group');
            if (group?.classList.contains('collapsed')) {
                group.classList.remove('collapsed');
            }
        }
    }

    /**
     * Highlight based on current URL hash
     */
    function highlightCurrentSection() {
        const hash = window.location.hash;
        if (hash) {
            highlightNavItem(hash.substring(1));
        }
    }

    /**
     * Check if an input element is focused
     */
    function isInputFocused() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    }

    // Add required CSS for keyboard navigation
    const styles = document.createElement('style');
    styles.textContent = `
        /* Keyboard navigation focus styles */
        .docs-sidebar a:focus,
        .sidebar a:focus,
        .nav-group-title:focus {
            outline: none;
            background: var(--bg-elevated, #1A1A24);
            box-shadow: inset 2px 0 0 var(--cyan, #00D4FF);
        }

        .docs-sidebar a:focus-visible,
        .sidebar a:focus-visible,
        .nav-group-title:focus-visible {
            outline: 2px solid var(--cyan, #00D4FF);
            outline-offset: -2px;
        }

        /* Active nav link */
        .nav-link-active {
            color: var(--cyan, #00D4FF) !important;
            background: var(--bg-elevated, #1A1A24);
        }

        .nav-link-active::before {
            content: '▸';
            position: absolute;
            left: 8px;
            color: var(--cyan, #00D4FF);
        }

        /* Collapsible nav groups */
        .nav-group.collapsed .nav-group-links {
            display: none;
        }

        .nav-group-title {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nav-group-title::before {
            content: '▾';
            font-size: 0.7em;
            transition: transform 0.2s ease;
        }

        .nav-group.collapsed .nav-group-title::before {
            transform: rotate(-90deg);
        }

        /* Skip to content link */
        .skip-link {
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: var(--cyan, #00D4FF);
            color: var(--bg-deep, #0A0A0F);
            text-decoration: none;
            z-index: 10001;
            transition: top 0.2s ease;
        }

        .skip-link:focus {
            top: 16px;
        }

        /* Keyboard shortcut hints */
        .keyboard-hint {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 16px;
            background: var(--bg-surface, #12121A);
            border: 1px solid var(--border, #1E1E2E);
            font-size: 0.75rem;
            color: var(--text-dim, #3A3A4A);
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .keyboard-hint.visible {
            opacity: 1;
        }

        .keyboard-hint kbd {
            padding: 2px 6px;
            background: var(--bg-elevated, #1A1A24);
            border: 1px solid var(--border, #1E1E2E);
            margin: 0 2px;
        }
    `;
    document.head.appendChild(styles);

    // Add skip link for accessibility
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Expose API
    window.mdashNav = {
        focusSidebar,
        navigateNext,
        navigatePrev,
        refresh: collectNavItems
    };

})();
