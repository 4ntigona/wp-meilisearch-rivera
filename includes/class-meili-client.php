<?php

if (!defined('ABSPATH')) exit;

/**
 * Gerencia a conexão com o cliente Meilisearch.
 * Usa o padrão Singleton para garantir uma única instância do cliente.
 */
class Meili_Client {

    private static $instance = null;
    private $client = null;

    /**
     * Construtor privado para prevenir instanciação direta.
     */
    private function __construct() {
        if (empty(MEILI_HOST) || empty(MEILI_MASTER_KEY)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p><strong>Plugin Meilisearch:</strong> Constantes <code>MEILI_HOST</code> e/ou <code>MEILI_MASTER_KEY</code> não definidas em <code>wp-config.php</code>.</p></div>';
            });
            return;
        }

        try {
            $this->client = new \MeiliSearch\Client(MEILI_HOST, MEILI_MASTER_KEY);
        } catch (\Exception $e) {
            error_log('Erro ao conectar com Meilisearch: ' . $e->getMessage());
            $this->client = null;
        }
    }

    /**
     * Retorna a instância única da classe.
     */
    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Retorna o objeto do cliente Meilisearch.
     */
    public function get_client() {
        return $this->client;
    }
}
