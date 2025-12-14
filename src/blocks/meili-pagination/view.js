document.addEventListener('DOMContentLoaded', () => {
    const blocks = document.querySelectorAll('.wp-block-pj-meili-pagination');
    if (blocks.length === 0) return;

    // State
    // We assume ONE product block per page for simplicity right now, 
    // or we'd need a channel ID. For now, use global event.
    let currentPage = 1;
    let totalPages = 1;
    let isLoading = false;

    blocks.forEach(block => {
        const params = JSON.parse(block.dataset.params || '{}');
        const type = params.type || 'classic';
        const container = block.querySelector('.pj-pagination-container');

        // Listen for Stats Update from Product Block
        document.addEventListener('meili-stats-update', (e) => {
            const { totalHits, limit, page, loading } = e.detail;

            if (loading !== undefined) isLoading = loading;

            if (totalHits !== undefined && limit) {
                totalPages = Math.ceil(totalHits / limit);
                currentPage = page || 1;
                render();
            }
        });

        // Intersection Observer for Infinite
        if (type === 'infinite') {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading && currentPage < totalPages) {
                    dispatchPageChange(currentPage + 1, true);
                }
            }, { rootMargin: '100px' });
            observer.observe(block);
        }

        function render() {
            container.innerHTML = '';

            if (totalPages <= 1) return;

            if (type === 'classic') {
                renderClassic(container);
            } else {
                renderInfinite(container);
            }
        }

        function renderInfinite(wrapper) {
            if (currentPage >= totalPages) {
                wrapper.innerHTML = '<div class="pj-infinite-finished">Todos os produtos exibidos.</div>';
            } else {
                // Spinner handled by Product Block usually, but we can show one here
                wrapper.innerHTML = '<div class="pj-infinite-loader">Carregando mais...</div>';
            }
        }

        function renderClassic(wrapper) {
            let html = '<nav class="ct-pagination" data-pagination="simple">';

            // Prev
            if (currentPage > 1) {
                html += `<a class="prev page-numbers" href="#" data-page="${currentPage - 1}"><svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M10.9,15c-0.2,0-0.4-0.1-0.6-0.2L3.6,8c-0.3-0.3-0.3-0.8,0-1.1l6.6-6.6c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1L5.2,7.4l6.2,6.2c0.3,0.3,0.3,0.8,0,1.1C11.3,14.9,11.1,15,10.9,15z"></path></svg>Anterior</a>`;
            }

            html += '<div class="ct-hidden-sm">';

            // Logic for DOTS (Simplified: Show all or range? User example showed dots)
            // Example: 1 2 3 4 5 ... 83
            // Let's implement full range or simple neighborhood

            const range = [];
            const delta = 2;
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                    range.push(i);
                }
            }

            let lastFunc = 0;
            range.forEach(i => {
                if (lastFunc + 1 < i) {
                    html += '<span class="page-numbers dots">…</span>';
                }
                if (i === currentPage) {
                    html += `<span aria-current="page" class="page-numbers current">${i}</span>`;
                } else {
                    html += `<a class="page-numbers" href="#" data-page="${i}">${i}</a>`;
                }
                lastFunc = i;
            });

            html += '</div>';

            // Next
            if (currentPage < totalPages) {
                html += `<a class="next page-numbers" href="#" data-page="${currentPage + 1}">Próxima <svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M4.1,15c0.2,0,0.4-0.1,0.6-0.2L11.4,8c0.3-0.3,0.3-0.8,0-1.1L4.8,0.2C4.5-0.1,4-0.1,3.7,0.2C3.4,0.5,3.4,1,3.7,1.3l6.1,6.1l-6.2,6.2c-0.3,0.3-0.3,0.8,0,1.1C3.7,14.9,3.9,15,4.1,15z"></path></svg></a>`;
            }

            html += '</nav>';
            wrapper.innerHTML = html;

            // Click Events
            wrapper.querySelectorAll('a.page-numbers').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(e.currentTarget.dataset.page);
                    dispatchPageChange(page, false);

                    // Scroll to Top with Offset
                    const productBlock = document.querySelector('.wp-block-pj-meili-products');
                    if (productBlock) {
                        const getVarPx = (name) => {
                            const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
                            return val ? parseFloat(val) : 0;
                        };

                        const headerHeight = getVarPx('--header-height');
                        const adminBar = getVarPx('--admin-bar'); // User specified variable

                        // Fallback/Correction: sometimes admin vars are on body, or standard WP ID
                        // But user asked for specific variables.

                        const offset = headerHeight + adminBar + 20; // +20px padding for breathing room
                        const offsetPosition = offset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                    }
                });
            });
        }
    });

    function dispatchPageChange(page, isInfinite) {
        const event = new CustomEvent('meili-page-change', {
            detail: { page: page, infinite: isInfinite }
        });
        document.dispatchEvent(event);
    }
});
