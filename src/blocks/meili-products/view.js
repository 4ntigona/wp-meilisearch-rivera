/* eslint-disable no-console */
import { MeiliSearch } from 'meilisearch';

document.addEventListener('DOMContentLoaded', () => {
    const blocks = document.querySelectorAll('.wp-block-pj-meili-products');

    if (blocks.length === 0) return;

    // Configuração Global (vinda do wp_localize_script)
    // Tenta MeiliBlockData (do plugin) primeiro, depois MeiliData (do mu-plugin), depois fallback
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
        const limit = params.limit || 10;
        const columns = params.columns || 4;

        // Initialize Filter State from Context Params
        // This is the "Initial State". If a Filter Block is present, it will eventually override this via event.
        // If no Filter Block is present, this remains the persistent context.
        const initialContext = [];
        if (params.categories && params.categories.length > 0) {
            const catFilters = params.categories.map(c => `product_cat = "${c}"`).join(' OR ');
            initialContext.push(`(${catFilters})`);
        }
        if (params.authors && params.authors.length > 0) {
            const authFilters = params.authors.map(a => `pa_autoria-livro = "${a}"`).join(' OR ');
            initialContext.push(`(${authFilters})`);
        }
        if (params.tags && params.tags.length > 0) {
            const tagFilters = params.tags.map(t => `product_tag = "${t}"`).join(' OR ');
            initialContext.push(`(${tagFilters})`);
        }
        if (params.formats && params.formats.length > 0) {
            const formatFilters = params.formats.map(f => `pa_formato = "${f}"`).join(' OR ');
            initialContext.push(`(${formatFilters})`);
        }
        if (params.organizations && params.organizations.length > 0) {
            const orgFilters = params.organizations.map(o => `pa_organizacao-livro = "${o}"`).join(' OR ');
            initialContext.push(`(${orgFilters})`);
        }

        // The active filter string. Starts with context, but can be replaced by Filter Block events.
        let activeFilterString = initialContext.join(' AND ');

        // Sorting State
        let currentSort = params.sortStr || '';

        // Paging State
        let currentPage = 1;

        const broadcastStats = (search, loading = false) => {
            const event = new CustomEvent('meili-stats-update', {
                detail: {
                    totalHits: search ? search.estimatedTotalHits : 0,
                    limit: limit,
                    page: currentPage,
                    loading: loading,
                    facetDistribution: search ? (search.facetDistribution || {}) : {}
                }
            });
            document.dispatchEvent(event);
        };

        const fetchBooks = async (append = false) => {
            try {
                broadcastStats(null, true); // Loading Start

                // Calculate Offset
                const offset = (currentPage - 1) * limit;

                const searchParams = {
                    limit: limit,
                    offset: offset,
                    filter: activeFilterString,
                    facets: ['pa_formato', 'product_cat', 'pa_autoria-livro', 'pa_organizacao-livro']
                };

                if (currentSort) {
                    searchParams.sort = [currentSort];
                }

                const search = await index.search('', searchParams);
                broadcastStats(search, false); // Loading End & Stats

                if (search.hits.length > 0) {
                    const hitsHtml = search.hits.map(hit => renderCard(hit)).join('');

                    if (append) {
                        block.insertAdjacentHTML('beforeend', hitsHtml);
                    } else {
                        block.innerHTML = hitsHtml;
                    }
                } else {
                    if (!append) block.innerHTML = '<p>Nenhum livro encontrado.</p>';
                }

            } catch (error) {
                console.error('MeiliSearch Error:', error);
                if (!append) block.innerHTML = '<p>Erro ao carregar livros.</p>';
                broadcastStats(null, false);
            }
        };

        // Initial Load
        fetchBooks();

        // Listen for External Filter Changes
        // The Filter Block is the source of truth for complex filtering.
        // It sends the COMPLETE filter string (including context if selected).
        document.addEventListener('meili-filter-change', (e) => {
            if (e.detail && e.detail.filterString !== undefined) {
                activeFilterString = e.detail.filterString;
                currentPage = 1; // Reset to page 1 on filter change
                fetchBooks(false);
            }
        });

        // Listen for Sort Changes (WooCommerce Select)
        const sortSelect = document.querySelector('.pj-ordering .pj-orderby');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                e.preventDefault(); // Prevent form submit
                e.stopImmediatePropagation(); // Stop other listeners
                const val = e.target.value;

                // Map Woo Sorts to Meili Sorts
                const sortMap = {
                    'date': 'post_date_timestamp:desc',
                    'oldest_to_recent': 'post_date_timestamp:asc',
                    'title': 'post_title:asc',
                    'price': 'price:asc',
                    'price-desc': 'price:desc'
                };

                currentSort = sortMap[val] || 'post_date_timestamp:desc';
                currentPage = 1;
                fetchBooks(false);
            });
        }

        // Listen for Page Changes
        document.addEventListener('meili-page-change', (e) => {
            const { page, infinite } = e.detail;
            if (page) {
                currentPage = page;
                fetchBooks(infinite); // Append if infinite
            }
        });

        // Update Stats UI (Count)
        document.addEventListener('meili-stats-update', (e) => {
            const { totalHits, limit, page, loading } = e.detail;
            const countEl = document.querySelector('.woocommerce-result-count');

            if (countEl) {
                if (loading) {
                    countEl.innerText = 'Atualizando...';
                } else {
                    const start = (page - 1) * limit + 1;
                    const end = Math.min(page * limit, totalHits);
                    countEl.innerText = `Exibindo ${start}–${end} de ${totalHits} resultados`;
                }
            }
        });
    });

    function renderCard(hit) {
        const title = hit.post_title;
        const link = hit.permalink;
        const img = hit.image || 'placeholder.jpg';

        // Categorias
        let catsHtml = '';
        if (hit.product_cat_rich && Array.isArray(hit.product_cat_rich)) {
            const listItems = hit.product_cat_rich.map(cat => {
                return `<li rel="tag" class="ct-term-${cat.id}"><a href="${cat.link}">${cat.name}</a></li>`;
            }).join('');
            catsHtml = `<ul class="categorias wp-block-getwid-template-post-custom-field custom-field-categorias">${listItems}</ul>`;
        }

        // Autoria / Organizacao
        let authorHtml = '';
        const authors = hit['pa_autoria-livro'] || hit['pa_organizacao-livro'];
        if (authors && Array.isArray(authors)) {
            const label = authors.join(', ');
            authorHtml = `
                <div class="autoria wp-block-getwid-template-post-custom-field custom-field-autoria">
                    <span class="autoria-list">${label}</span>
                </div>
            `;
        }

        // Preço
        const price = parseFloat(hit.price);
        let priceHtml = '';

        if (price > 0) {
            const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

            if (hit.on_sale && hit.regular_price) {
                const regular = formatMoney(hit.regular_price);
                const sale = formatMoney(price);
                priceHtml = `<span class="preco"><del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${regular}</bdi></span></del> <ins><span class="woocommerce-Price-amount amount"><bdi>${sale}</bdi></span></ins></span>`;
            } else {
                const formattedPrice = formatMoney(price);
                priceHtml = `<span class="preco"><span class="woocommerce-Price-amount amount"><bdi>${formattedPrice}</bdi></span></span>`;
            }
        }

        return `
            <div class="wp-block-getwid-custom-post-type__post">
                <div class="card-product card-product__featured wp-block-group alignfull eplus-wrapper is-layout-flow wp-block-group-is-layout-flow">
                    <figure class="alignfull wp-block-post-featured-image">
                        <a href="${link}" target="_self">
                            <img decoding="async" src="${img}" class="attachment-post-thumbnail size-post-thumbnail wp-post-image" alt="${title}" style="object-fit:cover;" />
                        </a>
                    </figure>

                    ${catsHtml}

                    <h6 class="has-text-color has-palette-color-3-color wp-block-post-title">
                        <a href="${link}">${title}</a>
                    </h6>

                    ${authorHtml}

                    ${priceHtml}

                    <a href="${link}" class="button is-primary">Saiba mais</a>
                </div>
            </div>
        `;
    }
});
