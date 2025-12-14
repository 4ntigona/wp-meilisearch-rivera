<?php
// Script to forcefully update Meilisearch Settings
// Usage: wp eval-file update-settings.php

if (!defined('ABSPATH')) {
    // If running directly, load WP (optional fallback, but better to prevent direct access)
    // require_once('../../../wp-load.php'); 
}

// Ensure Meili Client Class is available
if (!class_exists('Meili_Client')) {
    require_once plugin_dir_path(__FILE__) . 'includes/class-meili-client.php';
}

$client = Meili_Client::instance()->get_client();
$index_name = defined('MEILI_INDEX_NAME') ? MEILI_INDEX_NAME : 'pej_livros';

if (!$client) {
    echo "Erro: Não foi possível conectar ao Meilisearch.\n";
    exit;
}

try {
    $index = $client->index($index_name);

    // Update Faceting Settings
    $settings = [
        'faceting' => [
            'maxValuesPerFacet' => 10000, // Increase limit
            'sortFacetValuesBy' => ['*' => 'alpha']
        ],
        // Ensure filterable attributes are set correctly too
        'filterableAttributes' => [
            'pa_ano-de-lancamento',
            'pa_autoria-livro',
            'pa_formato',
            'pa_organizacao-livro',
            'price',
            'product_cat',
            'product_tag'
        ]
    ];

    $res = $index->updateSettings($settings);

    echo "Sucesso! Configurações enviadas para o índice '$index_name'.\n";
    echo "Task UID: " . $res['taskUid'] . "\n";
    echo "Verifique o status da task se necessário.\n";

} catch (Exception $e) {
    echo "Erro ao atualizar settings: " . $e->getMessage() . "\n";
}
