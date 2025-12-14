import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import metadata from './block.json';

registerBlockType(metadata.name, {
    edit: ({ attributes, setAttributes }) => {
        const { showPrice, showFormat, showCategory, showAuthor, showOrg } = attributes;
        const blockProps = useBlockProps();

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title="Exibição de Filtros">
                        <ToggleControl
                            label="Mostrar Formato"
                            checked={showFormat}
                            onChange={(value) => setAttributes({ showFormat: value })}
                        />
                        <ToggleControl
                            label="Mostrar Categoria"
                            checked={showCategory}
                            onChange={(value) => setAttributes({ showCategory: value })}
                        />
                        <ToggleControl
                            label="Mostrar Autoria"
                            checked={showAuthor}
                            onChange={(value) => setAttributes({ showAuthor: value })}
                        />
                        <ToggleControl
                            label="Mostrar Organização"
                            checked={showOrg}
                            onChange={(value) => setAttributes({ showOrg: value })}
                        />
                    </PanelBody>
                </InspectorControls>
                <div className="pj-meili-filters-placeholder">
                    <p><strong>Filtros Ativos:</strong></p>
                    <ul>
                        {showFormat && <li>Formato</li>}
                        {showCategory && <li>Categoria</li>}
                        {showAuthor && <li>Autoria</li>}
                        {showOrg && <li>Organização</li>}
                    </ul>
                </div>
            </div>
        );
    },
    save: ({ attributes }) => {
        const blockProps = useBlockProps.save();
        return (
            <div {...blockProps} data-params={JSON.stringify(attributes)}>
                <div className="pj-filters-loading">Carregando filtros...</div>
            </div>
        );
    }
});
