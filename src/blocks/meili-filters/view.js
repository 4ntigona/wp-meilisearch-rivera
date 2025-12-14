/* eslint-disable no-console */
import { MeiliSearch } from 'meilisearch';

document.addEventListener('DOMContentLoaded', () => {
    const blocks = document.querySelectorAll('.wp-block-pj-meili-filters');
    if (blocks.length === 0) return;

    // Configuration
    const config = window.MeiliBlockData || window.MeiliData || {
        host: 'http://127.0.0.1:7700',
        publicKey: '',
        indexName: 'pej_livros'
    };

    const client = new MeiliSearch({
        host: config.host,
        apiKey: config.publicKey,
    });
    const index = client.index(config.indexName);

    blocks.forEach(async (block) => {
        const params = JSON.parse(block.dataset.params || '{}');
        const container = block.querySelector('.pj-filters-loading');
        if (container) container.innerHTML = ''; // Clear loading

        // Filter State (Scoped to this block)
        const state = {
            selected: {
                'pa_formato': params.formats || [],
                'product_cat': params.categories || [],
                'pa_autoria-livro': params.authors || [],
                'pa_organizacao-livro': params.organizations || [],
                'product_tag': params.tags || []
            }
        };

        function dispatchUpdate() {
            const filters = [];

            // Text Filters
            Object.keys(state.selected).forEach(key => {
                const values = state.selected[key];
                if (values.length > 0) {
                    // OR betweeen values
                    const group = values.map(v => `${key} = "${v}"`).join(' OR ');
                    filters.push(`(${group})`);
                }
            });

            const event = new CustomEvent('meili-filter-change', {
                detail: { filterString: filters.join(' AND ') }
            });
            document.dispatchEvent(event);
        }

        // Construct UI Skeleton based on params
        const uiMap = [
            { key: 'pa_formato', label: 'Formato', show: params.showFormat, type: 'checkbox' },
            { key: 'product_cat', label: 'Categoria', show: params.showCategory, type: 'checkbox' },
            { key: 'pa_autoria-livro', label: 'Autoria', show: params.showAuthor, type: 'search-checkbox' },
            { key: 'pa_organizacao-livro', label: 'Organização', show: params.showOrg, type: 'search-checkbox' }
        ];

        // Listen for Facet Updates from Product Block
        document.addEventListener('meili-stats-update', (e) => {
            const { facetDistribution, loading } = e.detail;
            if (loading) return; // Don't update UI while loading to avoid flicker or empty states

            updateFilterUI(facetDistribution);

            if (container) container.innerHTML = ''; // Clear loading message
        });

        // Function to Render/Update Widgets
        function updateFilterUI(facetDist) {
            uiMap.forEach(widget => {
                if (!widget.show) return;

                // Find existing wrapper or create
                let wrapper = block.querySelector(`.pj-filter-group[data-key="${widget.key}"]`);

                if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'ct-widget widget_block pj-filter-group';
                    wrapper.dataset.key = widget.key;
                    wrapper.innerHTML = `<h5 class="wp-block-heading widget-title eplus-wrapper has-small-font-size">${widget.label}</h5>`;

                    // Render Skeleton
                    if (widget.type === 'checkbox' || widget.type === 'search-checkbox') {
                        renderCheckboxWidget(wrapper, widget.key, {}, widget.type === 'search-checkbox');
                    }
                    block.appendChild(wrapper);
                }

                // Update List
                const ul = wrapper.querySelector('ul.ct-filter-widget');
                if (ul) {
                    ul.innerHTML = renderListItems(widget.key, facetDist[widget.key] || {});
                }
            });
        }

        // Initial Trigger to ensure products block knows filters are ready (optional, but good for sync)
        dispatchUpdate();
        // Note: dispatchUpdate sends the current state. If products block is listening, it will search and reply with stats.

        /* 
           Legacy Fetch Logic Removed. 
           We now rely fully on 'meili-stats-update' to drive the UI.
        */

        // Event Listener Delegation
        block.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                const key = e.target.dataset.key;
                const value = e.target.value;

                if (e.target.checked) {
                    state.selected[key].push(value);
                } else {
                    state.selected[key] = state.selected[key].filter(v => v !== value);
                }
                dispatchUpdate();
            }
        });

        // Search Input Listener
        block.addEventListener('input', (e) => {
            if (e.target.matches('.pj-search-filter')) {
                const term = e.target.value.toLowerCase();
                const list = e.target.nextElementSibling; // ul
                const items = list.querySelectorAll('li');

                items.forEach(item => {
                    const label = item.querySelector('.ct-filter-label').innerText.toLowerCase();
                    if (label.includes(term)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });

        function renderCheckboxWidget(wrapper, key, facets, searchable, selectedValues = []) {
            let searchHtml = '';
            if (searchable) {
                // Ensure unique ID for search input to avoid conflicts if multiple widgets
                searchHtml = `
                    <div class="ct-filter-search">
                        <input type="search" placeholder="Buscar..." class="pj-search-filter" data-key="${key}">
                    </div>`;
            }

            const listItems = renderListItems(key, facets);

            wrapper.innerHTML += `
                <div class="ct-filter-widget-wrapper">
                    ${searchHtml}
                    <ul class="ct-filter-widget" data-display-type="list" style="max-height: 250px; overflow-y: auto;">
                        ${listItems}
                    </ul>
                </div>
            `;
        }

        function renderListItems(key, facets) {
            return Object.keys(facets).map(val => {
                const count = facets[val];
                // Use state directly from closure
                const isChecked = state.selected[key].includes(val) ? 'checked' : '';
                return `
                    <li class="ct-filter-item">
                        <div class="ct-filter-item-inner">
                            <label>
                                <input type="checkbox" class="ct-checkbox" name="${key}" value="${val}" data-key="${key}" ${isChecked}>
                                <span class="ct-filter-label">${val} (${count})</span>
                            </label>
                        </div>
                    </li>
                `;
            }).join('');
        }

    });
});
