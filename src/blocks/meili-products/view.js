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

        // Build Filter
        const filters = [];

        if (params.categories && params.categories.length > 0) {
            const catFilters = params.categories.map(c => `product_cat = "${c}"`).join(' OR ');
            filters.push(`(${catFilters})`);
        }

        if (params.authors && params.authors.length > 0) {
            const authFilters = params.authors.map(a => `pa_autoria-livro = "${a}"`).join(' OR ');
            filters.push(`(${authFilters})`);
        }

        if (params.tags && params.tags.length > 0) { // Note: Must add product_tag to filterableAttributes
            const tagFilters = params.tags.map(t => `product_tag = "${t}"`).join(' OR ');
            filters.push(`(${tagFilters})`);
        }

        const filterString = filters.join(' AND ');
        const sortStr = params.sortStr || '';

        try {
            const searchParams = {
                limit: limit,
                filter: filterString
            };

            if (sortStr) {
                searchParams.sort = [sortStr];
            }

            const search = await index.search('', searchParams);

            if (search.hits.length > 0) {
                const hitsHtml = search.hits.map(hit => renderCard(hit)).join('');
                block.innerHTML = hitsHtml;
            } else {
                block.innerHTML = '<p>Nenhum livro encontrado.</p>';
            }

        } catch (error) {
            console.error('MeiliSearch Error:', error);
            block.innerHTML = '<p>Erro ao carregar livros.</p>';
        }
    });

    function renderCard(hit) {
        /*
          Mapeamento de Dados:
          - title: hit.post_title
          - permalink: hit.permalink
          - image: hit.image (Precisa de srcset?)
          - categories: hit.product_cat_rich (Array of Objects)
          - authors: hit.pa_autoria-livro (String Array?) - TODO: Check rich
          - orgs: hit.pa_organizacao-livro (String Array?)
          - price: hit.price
        */

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
        // Prioriza Autoria, se não Organization
        // Nota: O indexer manda arrays de strings para estes campos no momento (não rich).
        // O user quer "Roberto Valdés Puentes" (String).
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

        // MARKUP EXATO SOLICITADO
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
