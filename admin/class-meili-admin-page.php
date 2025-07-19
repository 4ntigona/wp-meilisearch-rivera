<?php

if (!defined('ABSPATH')) exit;

/**
 * Cria e gerencia a página de administração do plugin.
 */
class Meili_Admin_Page {

    private $client;
    private $indexer;

    public function __construct() {
        $this->client = Meili_Client::instance()->get_client();
        $this->indexer = new Meili_Indexer();

        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'handle_form_actions']);
    }

    /**
     * Adiciona a página ao menu de administração.
     */
    public function add_admin_menu() {
        add_management_page('Meilisearch', 'Meilisearch', 'manage_options', 'meili-search-admin', [$this, 'render_page_html']);
    }

    /**
     * Renderiza o HTML da página de administração.
     */
    public function render_page_html() {
        ?>
        <div class="wrap">
            <h1><span class="dashicons dashicons-search"></span> Gerenciamento Meilisearch</h1>
            <p>Use esta página para configurar e sincronizar seus produtos com o Meilisearch.</p>

            <?php if (isset($_GET['message'])): ?>
                <div class="notice notice-success is-dismissible"><p><?php echo esc_html(urldecode($_GET['message'])); ?></p></div>
            <?php endif; ?>

            <?php if (!$this->client): ?>
                <div class="notice notice-warning"><p><strong>Ação Necessária:</strong> Não foi possível conectar ao Meilisearch. Verifique as constantes em <code>wp-config.php</code> e se o servidor Meilisearch está rodando.</p></div>
                <?php return; ?>
            <?php endif; ?>

            <form method="post">
                <input type="hidden" name="meili_action" value="configure_settings">
                <?php wp_nonce_field('meili_admin_action_nonce'); ?>
                
                <div style="margin-top: 20px; padding: 20px; background: #fff; border: 1px solid #ccd0d4;">
                    <h2><span class="dashicons dashicons-admin-settings"></span> Configurações do Índice</h2>
                    <p>Selecione todos os campos que devem ser incluídos na busca.</p>
                    
                    <h3>Atributos de Produto (WooCommerce)</h3>
                    <?php $this->render_wc_attributes_selection(); ?>
                    <hr style="margin: 20px 0;">

                    <h3>Campos Customizados (ACF)</h3>
                    <?php $this->render_acf_fields_selection(); ?>
                    <hr style="margin: 20px 0;">
                    <?php submit_button('Salvar Configurações e Atualizar Índice'); ?>
                </div>
            </form>

            <div style="margin-top: 20px; padding: 20px; background: #fff; border: 1px solid #ccd0d4;">
                <h2><span class="dashicons dashicons-upload"></span> Sincronização em Massa</h2>
                <form method="post">
                    <input type="hidden" name="meili_action" value="reindex_all">
                    <?php wp_nonce_field('meili_admin_action_nonce'); ?>
                    <?php submit_button('Re-indexar Todos os Produtos'); ?>
                </form>
            </div>
        </div>
        <?php
    }
    
    /**
     * Renderiza os checkboxes para seleção de atributos WooCommerce.
     */
    private function render_wc_attributes_selection() {
        if (!function_exists('wc_get_attribute_taxonomies')) return;

        $attributes = wc_get_attribute_taxonomies();
        $selected_wc_attributes = get_option(MEILI_WC_ATTR_OPTION_NAME, []);
        if (!$attributes) {
            echo '<p>Nenhum atributo de produto global encontrado.</p>';
            return;
        }
        
        echo '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">';
        foreach ($attributes as $attr) {
            $attr_name = 'pa_' . $attr->attribute_name;
            $is_checked = in_array($attr_name, $selected_wc_attributes);
            echo '<label><input type="checkbox" name="wc_attributes[]" value="' . esc_attr($attr_name) . '"' . checked($is_checked, true, false) . '> ' . esc_html($attr->attribute_label) . '</label>';
        }
        echo '</div>';
    }

    /**
     * Renderiza os checkboxes para seleção de campos ACF.
     */
    private function render_acf_fields_selection() {
        if (!function_exists('acf_get_field_groups')) {
            echo '<p>O plugin Advanced Custom Fields não está ativo.</p>';
            return;
        }

        $field_groups = acf_get_field_groups(['post_type' => 'product']);
        $selected_acf_fields = get_option(MEILI_ACF_OPTION_NAME, []);
        if (!$field_groups) {
            echo '<p>Nenhum grupo de campos ACF encontrado para o tipo de post "Produto".</p>';
            return;
        }
        
        foreach ($field_groups as $group) {
            echo '<h4>' . esc_html($group['title']) . '</h4>';
            $fields = acf_get_fields($group['key']);
            $searchable_types = ['text', 'textarea', 'number', 'email', 'wysiwyg', 'select', 'checkbox', 'radio'];
            
            echo '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">';
            foreach ($fields as $field) {
                if (in_array($field['type'], $searchable_types)) {
                    $is_checked = in_array($field['name'], $selected_acf_fields);
                    echo '<label><input type="checkbox" name="acf_fields[]" value="' . esc_attr($field['name']) . '"' . checked($is_checked, true, false) . '> ' . esc_html($field['label']) . '</label>';
                }
            }
            echo '</div>';
        }
    }

    /**
     * Processa as ações dos formulários da página de admin.
     */
    public function handle_form_actions() {
        if (!isset($_POST['meili_action']) || !check_admin_referer('meili_admin_action_nonce')) return;

        $action = sanitize_text_field($_POST['meili_action']);
        $message = '';

        if ($action === 'configure_settings') {
            $selected_acf = isset($_POST['acf_fields']) ? array_map('sanitize_text_field', $_POST['acf_fields']) : [];
            $selected_wc_attr = isset($_POST['wc_attributes']) ? array_map('sanitize_text_field', $_POST['wc_attributes']) : [];
            update_option(MEILI_ACF_OPTION_NAME, $selected_acf);
            update_option(MEILI_WC_ATTR_OPTION_NAME, $selected_wc_attr);
            
            if ($this->client) {
                $index = $this->client->index(MEILI_INDEX_NAME);
                $base_attrs = ['post_title', 'categories', 'tags', 'content'];
                $searchable_attrs = array_unique(array_merge($base_attrs, $selected_wc_attr, $selected_acf));
                
                $index->updateSearchableAttributes($searchable_attrs);
                $index->updateSortableAttributes(['price']);
                $index->resetFilterableAttributes();
                $message = 'Configurações salvas e índice atualizado!';
            } else {
                $message = 'Erro: Não foi possível conectar ao Meilisearch.';
            }
        }

        if ($action === 'reindex_all') {
            $count = $this->indexer->bulk_index_products();
            $message = "Sincronização em massa concluída! {$count} produtos processados.";
        }

        wp_redirect(add_query_arg('message', urlencode($message), wp_get_referer()));
        exit;
    }
}
