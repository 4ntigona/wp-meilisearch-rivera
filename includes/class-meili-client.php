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
        // Define as constantes se não estiverem definidas para evitar erros.
        if (!defined('MEILI_HOST')) define('MEILI_HOST', '');
        if (!defined('MEILI_MASTER_KEY')) define('MEILI_MASTER_KEY', '');

        if (empty(MEILI_HOST) || empty(MEILI_MASTER_KEY)) {
            return; // Não tenta conectar se as constantes estiverem ausentes.
        }

        try {
            $this->client = new \MeiliSearch\Client(MEILI_HOST, MEILI_MASTER_KEY);
            // Testa a conexão para garantir que é válida.
            if (!$this->client->isHealthy()) {
                throw new Exception('O servidor Meilisearch não está saudável.');
            }
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
