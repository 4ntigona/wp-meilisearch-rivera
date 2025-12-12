import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, FormTokenField, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import metadata from './block.json';

registerBlockType(metadata.name, {
    edit: ({ attributes, setAttributes }) => {
        const { limit, categories, authors, tags, sortStr, columns } = attributes;
        const blockProps = useBlockProps();

        // States for search
        const [catSearch, setCatSearch] = useState('');
        const [authSearch, setAuthSearch] = useState('');
        const [tagSearch, setTagSearch] = useState('');

        // Fetch Terms with Search
        const { catTerms, authTerms, tagTerms } = useSelect((select) => {
            return {
                catTerms: select('core').getEntityRecords('taxonomy', 'product_cat', { per_page: 20, search: catSearch }) || [],
                authTerms: select('core').getEntityRecords('taxonomy', 'pa_autoria-livro', { per_page: 20, search: authSearch }) || [],
                tagTerms: select('core').getEntityRecords('taxonomy', 'product_tag', { per_page: 50, search: tagSearch }) || [], // Higher limit for tags
            };
        }, [catSearch, authSearch, tagSearch]);

        // Helper helpers
        const getSuggestions = (terms) => {
            if (!Array.isArray(terms)) return [];
            return terms.map(t => t.name || '').filter(n => n);
        };

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title="Configurações">
                        <RangeControl
                            label="Quantidade de Livros"
                            value={limit}
                            onChange={(value) => setAttributes({ limit: value })}
                            min={1}
                            max={50}
                        />

                        <RangeControl
                            label="Colunas"
                            value={columns}
                            onChange={(value) => setAttributes({ columns: value })}
                            min={2}
                            max={6}
                        />

                        <SelectControl
                            label="Ordenar por"
                            value={sortStr}
                            options={[
                                { label: 'Relevância', value: '' },
                                { label: 'Mais Recentes', value: 'post_date_timestamp:desc' },
                                { label: 'Mais Antigos', value: 'post_date_timestamp:asc' },
                                { label: 'Título (A-Z)', value: 'post_title:asc' },
                                { label: 'Título (Z-A)', value: 'post_title:desc' },
                                { label: 'Preço (Menor)', value: 'price:asc' },
                                { label: 'Preço (Maior)', value: 'price:desc' },
                            ]}
                            onChange={(value) => setAttributes({ sortStr: value })}
                        />

                        <FormTokenField
                            label="Categorias"
                            value={categories || []}
                            suggestions={getSuggestions(catTerms)}
                            onChange={(value) => setAttributes({ categories: value })}
                            onInputChange={(value) => setCatSearch(value)}
                        />

                        <FormTokenField
                            label="Autores"
                            value={authors || []}
                            suggestions={getSuggestions(authTerms)}
                            onChange={(value) => setAttributes({ authors: value })}
                            onInputChange={(value) => setAuthSearch(value)}
                        />

                        <FormTokenField
                            label="Tags"
                            value={tags || []}
                            suggestions={getSuggestions(tagTerms)}
                            onChange={(value) => setAttributes({ tags: value })}
                            onInputChange={(value) => setTagSearch(value)}
                        />
                    </PanelBody>
                </InspectorControls>
                <div className="pj-meili-placeholder">
                    Exibindo {limit} produtos em {columns} colunas. Filtros ativos:
                    {(categories || []).length + (authors || []).length + (tags || []).length}
                </div>
            </div>
        );
    },
    save: ({ attributes }) => {
        const { columns } = attributes;
        const blockProps = useBlockProps.save({
            className: `wp-block-getwid-custom-post-type__wrapper getwid-columns getwid-columns-${columns}`
        });

        return (
            <div {...blockProps} data-params={JSON.stringify(attributes)}>
                <span className="pj-loading">Carregando livros...</span>
            </div>
        );
    }
});