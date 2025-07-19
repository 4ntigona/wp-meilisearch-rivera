<?php
/**
 * Plugin Name:       Busca Meilisearch AVFARMA
 * Description:       Integra a busca do WordPress e WooCommerce com um servidor Meilisearch auto-hospedado.
 * Version:           0.0.5
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
    const VERSION = '0.0.5';

    /**
     * Construtor da classe.
     */
    private function __construct() {
        $this->define_constants();
        $this->load_dependencies();
        $this->init_plugin();
    }

    /**
     * Define as constantes do plugin.
     */
    private function define_constants() {
        // Constantes de configuração lidas do wp-config.php
        define('MEILI_HOST', defined('MEILI_HOST') ? MEILI_HOST : '');
        define('MEILI_MASTER_KEY', defined('MEILI_MASTER_KEY') ? MEILI_MASTER_KEY : '');
        define('MEILI_INDEX_NAME', defined('MEILI_INDEX_NAME') ? MEILI_INDEX_NAME : 'produtos');
        
        // Constantes de opções do WordPress
        define('MEILI_ACF_OPTION_NAME', 'meili_searchable_acf_fields');
        define('MEILI_WC_ATTR_OPTION_NAME', 'meili_searchable_wc_attributes');
    }

    /**
     * Carrega os arquivos de dependência.
     */
    private function load_dependencies() {
        // Autoloader do Composer
        $autoloader = __DIR__ . '/vendor/autoload.php';
        if (!file_exists($autoloader)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p><strong>Plugin Meilisearch:</strong> Dependências não encontradas. Execute <code>composer install</code>.</p></div>';
            });
            return;
        }
        require_once $autoloader;

        // Classes do Plugin
        require_once __DIR__ . '/includes/class-meili-client.php';
        require_once __DIR__ . '/includes/class-meili-indexer.php';
        require_once __DIR__ . '/includes/class-meili-synchronizer.php';
        require_once __DIR__ . '/admin/class-meili-admin-page.php';
    }

    /**
     * Inicializa as classes do plugin.
     */
    private function init_plugin() {
        Meili_Client::instance(); // Garante que a conexão seja validada
        new Meili_Synchronizer();
        new Meili_Admin_Page();
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

// Inicia o plugin.
Wp_Meili_Search_Plugin::run();
