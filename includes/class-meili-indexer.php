<?php

if (!defined('ABSPATH')) exit;

/**
 * Responsável por construir os documentos e realizar a indexação.
 */
class Meili_Indexer {

    private $client;

    public function __construct() {
        $this->client = Meili_Client::instance()->get_client();
    }

    /**
     * Constrói o documento de um produto para ser indexado.
     */
    public function build_product_document($post_id) {
        $product = wc_get_product($post_id);
        if (!$product || $product->get_status() !== 'publish') return null;

        $document = [
            'id'           => $post_id,
            'post_title'   => get_the_title($post_id),
            'content'      => strip_tags($product->get_short_description() ?: $product->get_description()),
            'permalink'    => get_permalink($post_id),
            'price'        => (float) $product->get_price(),
            'stock_status' => $product->get_stock_status(),
            'image'        => get_the_post_thumbnail_url($post_id, 'medium') ?: 'https://placehold.co/300x300?text=Sem+Imagem',
            'categories'   => wp_get_post_terms($post_id, 'product_cat', ['fields' => 'names']),
            'tags'         => wp_get_post_terms($post_id, 'product_tag', ['fields' => 'names']),
        ];

        foreach ($product->get_attributes() as $attribute) {
            $document[$attribute->get_name()] = $product->get_attribute($attribute->get_name());
        }

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
     * Realiza a indexação em massa de todos os produtos.
     */
    public function bulk_index_products() {
        if (!$this->client) return 0;
        
        $batch_size = 100; $page = 1; $processed_count = 0;
        $args = ['post_type' => 'product', 'posts_per_page' => $batch_size, 'paged' => $page, 'post_status' => 'publish'];
        $query = new WP_Query($args);

        while ($query->have_posts()) {
            $documents = [];
            foreach ($query->posts as $post) {
                $document = $this->build_product_document($post->ID);
                if ($document) $documents[] = $document;
            }
            if (!empty($documents)) {
                $this->client->index(MEILI_INDEX_NAME)->addDocuments($documents, 'id');
                $processed_count += count($documents);
            }
            $page++;
            $query->query($args);
        }
        wp_reset_postdata();
        return $processed_count;
    }
}
