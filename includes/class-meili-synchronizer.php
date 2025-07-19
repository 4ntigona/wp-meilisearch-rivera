<?php

if (!defined('ABSPATH')) exit;

/**
 * Gerencia os hooks do WordPress para sincronização em tempo real.
 */
class Meili_Synchronizer {

    private $client;
    private $indexer;

    public function __construct() {
        $this->client = Meili_Client::instance()->get_client();
        $this->indexer = new Meili_Indexer();

        add_action('save_post_product', [$this, 'sync_on_save'], 10, 1);
        add_action('wp_trash_post', [$this, 'delete_from_index'], 10, 1);
    }

    /**
     * Sincroniza um produto quando ele é salvo.
     */
    public function sync_on_save($post_id) {
        if (!$this->client || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
        
        $document = $this->indexer->build_product_document($post_id);
        if ($document) {
            $this->client->index(MEILI_INDEX_NAME)->addDocuments([$document], 'id');
        }
    }

    /**
     * Remove um produto do índice quando ele é movido para a lixeira.
     */
    public function delete_from_index($post_id) {
        if (!$this->client || get_post_type($post_id) !== 'product') return;
        
        $this->client->index(MEILI_INDEX_NAME)->deleteDocument($post_id);
    }
}
