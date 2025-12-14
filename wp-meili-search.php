<?php
/**
 * Plugin Name:       Busca Meilisearch
 * Description:       Integra a busca do WordPress e WooCommerce com um servidor Meilisearch auto-hospedado.
 * Version:           0.0.12
 * Author:            RIVERA
 * Author URI:        https://pedrorivera.me
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-meili-search
 */

if (!defined('ABSPATH'))
    exit;

/**
 * Classe principal do Plugin.
 * Atua como um carregador, inicializando todas as partes do plugin.
 */
final class Wp_Meili_Search_Plugin
{

    /**
     * Versão do Plugin.
     */
    const VERSION = '0.0.12';

    /**
     * Construtor da classe.
     */
    private function __construct()
    {
        $this->define_constants();
        $this->load_dependencies();
        $this->init_plugin();

        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [$this, 'add_settings_link']);
    }

    /**
     * Define as constantes do plugin.
     */
    private function define_constants()
    {
        // As constantes de conexão (MEILI_HOST, MEILI_MASTER_KEY, MEILI_INDEX_NAME)
        // devem ser definidas no wp-config.php.

        // Constantes de opções do WordPress para os campos selecionáveis.
        define('MEILI_ACF_OPTION_NAME', 'meili_searchable_acf_fields');
        define('MEILI_WC_ATTR_OPTION_NAME', 'meili_searchable_wc_attributes');
    }

    /**
     * Carrega os arquivos de dependência.
     */
    private function load_dependencies()
    {
        $autoloader = __DIR__ . '/vendor/autoload.php';
        if (!file_exists($autoloader)) {
            add_action('admin_notices', function () {
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
    private function init_plugin()
    {
        Meili_Client::instance();
        new Meili_Synchronizer();
        new Meili_Admin_Page();

        add_action('init', [$this, 'register_blocks']);
    }

    public function register_blocks()
    {
        register_block_type(__DIR__ . '/build/blocks/meili-products');
        register_block_type(__DIR__ . '/build/blocks/meili-filters');
        register_block_type(__DIR__ . '/build/blocks/meili-pagination');

        $script_handle = 'pj-meili-products-view-script'; // WordPress gera handles baseado no block.json viewScript. Se 'view' for o nome, o handle é 'pj-meili-products-view-script'? 
        // Na verdade, wp-scripts gera handles. Precisamos checar se o handle automatico pega. 
        // O build/blocks/meili-products/block.json tem "viewScript": "file:./view.js".
        // O handle gerado costuma ser slug-view-script.

        // Vamos garantir que os dados passem. Melhor usar wp_enqueue_script no render_callback se fosse dinamico PHP, mas é client side.
        // O view.js é enfileirado automaticamente pelo Block Editor no frontend?
        // Sim, se definido no block.json. 

        // Mas para passar variaveis PHP (Public Key) para o JS, precisamos de wp_localize_script ligado ao handle.
        // O handle deve ser 'pj-meili-products-view-script'.

        // Pega options
        $host = defined('MEILI_HOST') ? MEILI_HOST : 'http://127.0.0.1:7700'; // Default local
        $key = defined('MEILI_MASTER_KEY') ? MEILI_MASTER_KEY : '';
        $index = defined('MEILI_INDEX_NAME') ? MEILI_INDEX_NAME : 'pej_livros';

        $data = [
            'host' => $host,
            'publicKey' => $key,
            'indexName' => $index,
            'placeholder_img' => plugin_dir_url(__FILE__) . 'assets/placeholder.jpg'
        ];

        // Tenta descobrir handle. Para block.json, o WP 5.8+ enfileira assets.
        // Vou hookar no wp_enqueue_scripts para garantir.
        add_action('wp_enqueue_scripts', function () use ($data) {
            // O handle é gerado pelo WP. O nome é "pj-meili-products-view-script".
            wp_localize_script('pj-meili-products-view-script', 'MeiliBlockData', $data);
        });
    }

    /**
     * Adiciona um link de "Configurações" na página de plugins.
     */
    public function add_settings_link($links)
    {
        $settings_link = '<a href="' . admin_url('tools.php?page=meili-search-admin') . '">' . __('Configurações', 'wp-meili-search') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Ponto de entrada estático para o plugin.
     */
    public static function run()
    {
        static $instance = null;
        if ($instance === null) {
            $instance = new self();
        }
        return $instance;
    }
}

Wp_Meili_Search_Plugin::run();
