import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, FormTokenField, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import metadata from './block.json';

registerBlockType(metadata.name, {
    edit: ({ attributes, setAttributes }) => {
        const { limit, categories, authors, tags, organizations, formats, sortStr, columns } = attributes;
        const blockProps = useBlockProps();

        // States for search
        const [catSearch, setCatSearch] = useState('');
        const [authSearch, setAuthSearch] = useState('');
        const [tagSearch, setTagSearch] = useState('');
        const [orgSearch, setOrgSearch] = useState('');
        const [fmtSearch, setFmtSearch] = useState('');

        // Fetch Terms with Search
        const { catTerms, authTerms, tagTerms, orgTerms, fmtTerms } = useSelect((select) => {
            return {
                catTerms: select('core').getEntityRecords('taxonomy', 'product_cat', { per_page: 20, search: catSearch }) || [],
                authTerms: select('core').getEntityRecords('taxonomy', 'pa_autoria-livro', { per_page: 20, search: authSearch }) || [],
                tagTerms: select('core').getEntityRecords('taxonomy', 'product_tag', { per_page: 50, search: tagSearch }) || [], // Higher limit for tags
                orgTerms: select('core').getEntityRecords('taxonomy', 'pa_organizacao-livro', { per_page: 20, search: orgSearch }) || [],
                fmtTerms: select('core').getEntityRecords('taxonomy', 'pa_formato', { per_page: 20, search: fmtSearch }) || [],
            };
        }, [catSearch, authSearch, tagSearch, orgSearch, fmtSearch]);

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

                        <FormTokenField
                            label="Organização"
                            value={organizations || []}
                            suggestions={getSuggestions(orgTerms)}
                            onChange={(value) => setAttributes({ organizations: value })}
                            onInputChange={(value) => setOrgSearch(value)}
                        />

                        <FormTokenField
                            label="Formato"
                            value={formats || []}
                            suggestions={getSuggestions(fmtTerms)}
                            onChange={(value) => setAttributes({ formats: value })}
                            onInputChange={(value) => setFmtSearch(value)}
                        />

                        <hr />
                        <h3>Filtros Personalizados</h3>
                        <CustomFiltersControl
                            attributes={attributes}
                            setAttributes={setAttributes}
                        />
                    </PanelBody>
                </InspectorControls>
                <div className="pj-meili-placeholder">
                    Exibindo {limit} produtos em {columns} colunas. Filtros ativos:
                    {(categories || []).length + (authors || []).length + (tags || []).length + (organizations || []).length + (formats || []).length + (attributes.customFilters || []).length}
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

// Componente Separado para Filtros Personalizados
function CustomFiltersControl({ attributes, setAttributes }) {
    const { customFilters } = attributes;
    const [taxSearch, setTaxSearch] = useState('');

    // Lista todas as taxinomias
    const taxonomies = useSelect((select) => {
        const taxs = select('core').getTaxonomies({ per_page: 50 });
        return (taxs || []).filter(t => t.slug.startsWith('pa_')); // Apenas atributos
    }, []);

    const addFilter = () => {
        const newFilters = [...(customFilters || []), { taxonomy: '', terms: [] }];
        setAttributes({ customFilters: newFilters });
    };

    const removeFilter = (index) => {
        const newFilters = [...customFilters];
        newFilters.splice(index, 1);
        setAttributes({ customFilters: newFilters });
    };

    const updateFilter = (index, key, value) => {
        const newFilters = [...customFilters];
        newFilters[index] = { ...newFilters[index], [key]: value };
        setAttributes({ customFilters: newFilters });
    };

    return (
        <div>
            {(customFilters || []).map((filter, index) => (
                <div key={index} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <SelectControl
                        label="Atributo"
                        value={filter.taxonomy}
                        options={[
                            { label: 'Selecione...', value: '' },
                            ...taxonomies.map(t => ({ label: t.name, value: t.slug }))
                        ]}
                        onChange={(val) => updateFilter(index, 'taxonomy', val)}
                    />

                    {filter.taxonomy && (
                        <TermSelector
                            taxonomy={filter.taxonomy}
                            value={filter.terms}
                            onChange={(val) => updateFilter(index, 'terms', val)}
                        />
                    )}

                    <button
                        className="components-button is-secondary is-destructive is-small"
                        onClick={() => removeFilter(index)}
                        style={{ marginTop: '5px' }}
                    >
                        Remover Filtro
                    </button>
                </div>
            ))}
            <button className="components-button is-primary" onClick={addFilter}>
                + Adicionar Filtro
            </button>
        </div>
    );
}

function TermSelector({ taxonomy, value, onChange }) {
    const [search, setSearch] = useState('');
    const terms = useSelect((select) => {
        return select('core').getEntityRecords('taxonomy', taxonomy, { per_page: 20, search: search }) || [];
    }, [taxonomy, search]);

    return (
        <FormTokenField
            label="Termos"
            value={value || []}
            suggestions={terms.map(t => t.name)}
            onChange={onChange}
            onInputChange={setSearch}
        />
    );
}