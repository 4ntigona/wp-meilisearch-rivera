<?php

if (!defined('ABSPATH'))
    exit;

/**
 * Responsável por construir os documentos e realizar a indexação.
 */
class Meili_Indexer
{

    private $client;
    const BATCH_SIZE = 50; // Smaller batch size for AJAX

    public function __construct()
    {
        $this->client = Meili_Client::instance()->get_client();
    }

    /**
     * Constrói o documento de um produto para ser indexado.
     * @param int $post_id O ID do produto.
     * @return array|null O documento ou nulo em caso de erro.
     */
    public function build_product_document($post_id)
    {
        $product = wc_get_product($post_id);
        if (!$product || $product->get_status() !== 'publish')
            return null;

        $title = get_the_title($post_id);
        $document = [
            'id' => $post_id,
            'post_title' => $title,
            'permalink' => get_permalink($post_id),
            'image' => get_the_post_thumbnail_url($post_id, 'large') ?: 'https://placehold.co/300x400/white/1559ed?text=' . urlencode($title),

            // Novos campos de preço para a lógica de exibição
            'price' => (float) $product->get_price(),
            'regular_price' => (float) $product->get_regular_price(),
            'sale_price' => $product->get_sale_price() ? (float) $product->get_sale_price() : null,
            'on_sale' => $product->is_on_sale(),
            'post_date_timestamp' => $product->get_date_created() ? $product->get_date_created()->getTimestamp() : 0,
        ];

        // Adiciona todos os atributos do produto ao documento.
        foreach ($product->get_attributes() as $attribute) {
            $document[$attribute->get_name()] = $product->get_attribute($attribute->get_name());
        }

        // --- PATCH PEDRO & JOÃO ---
        // Garante indexação de taxonomias personalizadas
        $custom_taxonomies = [
            'pa_autoria-livro',
            'pa_organizacao-livro',
            'product_cat',
            'product_tag',
            'pa_formato'
        ];

        foreach ($custom_taxonomies as $tax) {
            $terms = wc_get_product_terms($post_id, $tax); // Remove fields=>names to get objects
            if (!is_wp_error($terms) && !empty($terms)) {
                // Field for Faceting (Strings)
                $document[$tax] = wp_list_pluck($terms, 'name');

                // Field for Display (Rich Data) - New field to avoid breaking facets
                $document[$tax . '_rich'] = array_map(function ($term) {
                    return [
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                        'link' => get_term_link($term)
                    ];
                }, $terms);
            }
        }
        // --- FIM PATCH ---


        // Adiciona dinamicamente os campos ACF selecionados pelo admin.
        $selected_acf_fields = get_option(MEILI_ACF_OPTION_NAME, []);
        if (!empty($selected_acf_fields) && function_exists('get_field')) {
            foreach ($selected_acf_fields as $field_name) {
                $field_value = get_field($field_name, $post_id);
                if ($field_value) {
                    $document[$field_name] = is_array($field_value) ? implode(' ', $field_value) : $field_value;
                }
            }
        }
        return $document;
    }

    /**
     * Processa um único lote de produtos para indexação via AJAX.
     * @param int $paged O número da página/lote a ser processado.
     * @return int O número de produtos processados neste lote.
     */
    public function process_indexing_batch($paged = 1)
    {
        if (!$this->client)
            return 0;

        if (!defined('MEILI_INDEX_NAME'))
            define('MEILI_INDEX_NAME', 'produtos');

        $args = [
            'post_type' => 'product',
            'posts_per_page' => self::BATCH_SIZE,
            'paged' => $paged,
            'post_status' => 'publish',
        ];

        $query = new WP_Query($args);

        if (!$query->have_posts()) {
            return 0; // Nenhum produto encontrado neste lote.
        }

        $documents = [];
        foreach ($query->posts as $post) {
            $document = $this->build_product_document($post->ID);
            if ($document) {
                $documents[] = $document;
            }
        }

        if (!empty($documents)) {
            $this->client->index(MEILI_INDEX_NAME)->addDocuments($documents, 'id');
            return count($documents);
        }

        wp_reset_postdata();
        return 0;
    }
}
