<?php
/**
 * Plugin Name:       Busca Meilisearch AVFARMA
 * Description:       Integra a busca do WordPress e WooCommerce com um servidor Meilisearch auto-hospedado.
 * Version:           0.0.12
 * Author:            RIVERA
 * Author URI:        https://pedrorivera.me
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-meili-search
 */

if (!defined('ABSPATH')) exit;

/**
 * Classe principal do Plugin.
 * Atua como um carregador, inicializando todas as partes do plugin.
 */
final class Wp_Meili_Search_Plugin {

    /**
     * Versão do Plugin.
     */
    const VERSION = '0.0.12';

    /**
     * Construtor da classe.
     */
    private function __construct() {
        $this->define_constants();
        $this->load_dependencies();
        $this->init_plugin();

        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [$this, 'add_settings_link']);
    }

    /**
     * Define as constantes do plugin.
     */
    private function define_constants() {
        // As constantes de conexão (MEILI_HOST, MEILI_MASTER_KEY, MEILI_INDEX_NAME)
        // devem ser definidas no wp-config.php.

        // Constantes de opções do WordPress para os campos selecionáveis.
        define('MEILI_ACF_OPTION_NAME', 'meili_searchable_acf_fields');
        define('MEILI_WC_ATTR_OPTION_NAME', 'meili_searchable_wc_attributes');
    }

    /**
     * Carrega os arquivos de dependência.
     */
    private function load_dependencies() {
        $autoloader = __DIR__ . '/vendor/autoload.php';
        if (!file_exists($autoloader)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p><strong>Plugin Meilisearch:</strong> Dependências não encontradas. Execute <code>composer install</code>.</p></div>';
            });
            return;
        }
        require_once $autoloader;

        require_once __DIR__ . '/includes/class-meili-client.php';
        require_once __DIR__ . '/includes/class-meili-indexer.php';
        require_once __DIR__ . '/includes/class-meili-synchronizer.php';
        require_once __DIR__ . '/admin/class-meili-admin-page.php';
    }

    /**
     * Inicializa as classes do plugin.
     */
    private function init_plugin() {
        Meili_Client::instance();
        new Meili_Synchronizer();
        new Meili_Admin_Page();
    }

    /**
     * Adiciona um link de "Configurações" na página de plugins.
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('tools.php?page=meili-search-admin') . '">' . __('Configurações', 'wp-meili-search') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Ponto de entrada estático para o plugin.
     */
    public static function run() {
        static $instance = null;
        if ($instance === null) {
            $instance = new self();
        }
        return $instance;
    }
}

Wp_Meili_Search_Plugin::run();
