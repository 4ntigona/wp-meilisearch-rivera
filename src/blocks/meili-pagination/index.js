import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import metadata from './block.json';

registerBlockType(metadata.name, {
    edit: ({ attributes, setAttributes }) => {
        const { type } = attributes;
        const blockProps = useBlockProps();

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title="Configurações">
                        <SelectControl
                            label="Tipo de Paginação"
                            value={type}
                            options={[
                                { label: 'Clássica (Numérica)', value: 'classic' },
                                { label: 'Rolagem Infinita', value: 'infinite' }
                            ]}
                            onChange={(value) => setAttributes({ type: value })}
                        />
                    </PanelBody>
                </InspectorControls>
                <div className="pj-pagination-placeholder" style={{ padding: '10px', background: '#f0f0f0', textAlign: 'center' }}>
                    Paginação: {type === 'classic' ? 'Clássica' : 'Infinita'}
                </div>
            </div>
        );
    },
    save: ({ attributes }) => {
        const blockProps = useBlockProps.save();
        return (
            <div {...blockProps} data-params={JSON.stringify(attributes)}>
                <div className="pj-pagination-container"></div>
            </div>
        );
    }
});
