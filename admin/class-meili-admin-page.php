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
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);

        // AJAX endpoints for re-indexing
        add_action('wp_ajax_meili_get_total_products', [$this, 'ajax_get_total_products']);
        add_action('wp_ajax_meili_process_batch', [$this, 'ajax_process_batch']);
    }

    public function add_admin_menu() {
        add_management_page('Meilisearch', 'Meilisearch', 'manage_options', 'meili-search-admin', [$this, 'render_page_html']);
    }

    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'tools_page_meili-search-admin') {
            return;
        }
        wp_enqueue_script(
            'meili-admin-script',
            plugin_dir_url(__FILE__) . 'js/admin-script.js',
            ['jquery'],
            Wp_Meili_Search_Plugin::VERSION,
            true
        );
        wp_localize_script('meili-admin-script', 'meili_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('meili_reindex_nonce'),
        ]);
    }

    public function render_page_html() {
        ?>
        <div class="wrap">
            <h1><span class="dashicons dashicons-search"></span> Gerenciamento Meilisearch</h1>
            <p>Use esta página para configurar e sincronizar seus produtos com o Meilisearch.</p>

            <?php if (isset($_GET['message'])): ?>
                <div class="notice notice-<?php echo strpos(urldecode($_GET['message']), 'Erro') === 0 ? 'error' : 'success'; ?> is-dismissible">
                    <p><?php echo esc_html(urldecode($_GET['message'])); ?></p>
                </div>
            <?php endif; ?>

            <?php if (!$this->client): ?>
                <div class="notice notice-error" style="margin-top: 20px;"><p><strong>Erro de Conexão:</strong> Não foi possível conectar ao Meilisearch. Verifique as constantes <code>MEILI_HOST</code> e <code>MEILI_MASTER_KEY</code> em seu arquivo <code>wp-config.php</code> e certifique-se de que o servidor Meilisearch está rodando.</p></div>
                <?php return; ?>
            <?php else: ?>
                 <div class="notice notice-success is-dismissible"><p>Conectado com sucesso ao Meilisearch no Host: <strong><?php echo esc_html(defined('MEILI_HOST') ? MEILI_HOST : ''); ?></strong> | Índice: <strong><?php echo esc_html(defined('MEILI_INDEX_NAME') ? MEILI_INDEX_NAME : ''); ?></strong></p></div>
            <?php endif; ?>

            <!-- Seção de Configurações do Índice -->
            <form method="post">
                <input type="hidden" name="meili_action" value="configure_index_settings">
                <?php wp_nonce_field('meili_admin_action_nonce'); ?>
                <div style="margin-top: 20px; padding: 20px; background: #fff; border: 1px solid #ccd0d4;">
                    <h2><span class="dashicons dashicons-admin-settings"></span> 1. Configurações do Índice</h2>
                    <p>Selecione todos os campos que devem ser incluídos na busca.</p>
                    
                    <h3>Atributos de Produto (WooCommerce)</h3>
                    <?php $this->render_wc_attributes_selection(); ?>
                    <hr style="margin: 20px 0;">

                    <h3>Campos Customizados (ACF)</h3>
                    <?php $this->render_acf_fields_selection(); ?>
                    <hr style="margin: 20px 0;">
                    <?php submit_button('Salvar Configurações do Índice'); ?>
                </div>
            </form>

            <!-- Seção de Sincronização em Massa -->
            <div style="margin-top: 20px; padding: 20px; background: #fff; border: 1px solid #ccd0d4;">
                <h2><span class="dashicons dashicons-upload"></span> 2. Sincronização em Massa</h2>
                <p>Clique no botão abaixo para iniciar a indexação de todos os produtos. Este processo pode demorar.</p>
                <button id="meili-reindex-button" class="button button-primary">Re-indexar Todos os Produtos</button>
                <div id="meili-progress-container" style="display:none; margin-top: 15px;">
                    <div id="meili-progress-bar-wrapper" style="background-color: #ddd; border-radius: 4px; overflow: hidden;">
                        <div id="meili-progress-bar" style="width: 0%; background-color: #0073aa; color: white; text-align: center; height: 25px; line-height: 25px; transition: width 0.5s;">0%</div>
                    </div>
                    <div id="meili-progress-log" style="margin-top: 10px; font-family: monospace; max-height: 200px; overflow-y: auto; background: #f3f3f3; padding: 10px; border-radius: 4px;"></div>
                </div>
            </div>
        </div>
        <?php
    }

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

    public function handle_form_actions() {
        if (!isset($_POST['meili_action']) || !check_admin_referer('meili_admin_action_nonce')) return;
        $action = sanitize_text_field($_POST['meili_action']);
        $message = '';
        if ($action === 'configure_index_settings') {
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
                $message = 'Configurações do índice salvas com sucesso!';
            } else {
                $message = 'Erro: Conexão com o Meilisearch perdida.';
            }
        }
        wp_redirect(add_query_arg('message', urlencode($message), wp_get_referer()));
        exit;
    }

    // --- AJAX Handlers ---

    public function ajax_get_total_products() {
        check_ajax_referer('meili_reindex_nonce', 'nonce');
        $query = new WP_Query(['post_type' => 'product', 'post_status' => 'publish', 'posts_per_page' => -1]);
        wp_send_json_success(['total' => $query->post_count]);
    }

    public function ajax_process_batch() {
        check_ajax_referer('meili_reindex_nonce', 'nonce');
        $paged = isset($_POST['page']) ? absint($_POST['page']) : 1;
        $processed_count = $this->indexer->process_indexing_batch($paged);
        wp_send_json_success(['processed' => $processed_count]);
    }
}
