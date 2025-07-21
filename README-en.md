# Meilisearch Search for WooCommerce (Custom Plugin)

This is a custom WordPress plugin that integrates a WooCommerce store with a self-hosted instance of [Meilisearch](https://www.meilisearch.com/), an extremely fast and relevant open-source search engine.

The plugin replaces the default WordPress/WooCommerce search with a powerful instant search experience, indexing products and their metadata to deliver results in milliseconds.

## Key Features

* **Secure Connection:** Connects to a Meilisearch instance using secure credentials defined in `wp-config.php`.
* **Automatic Synchronization:** Keeps the Meilisearch index synchronized in real-time. Products are automatically added, updated, or removed from the index whenever a change occurs in WordPress.
* **Customizable Indexing:** Provides an admin page (`Tools > Meilisearch`) where you can select which WooCommerce product attributes and Advanced Custom Fields (ACF) should be included in the search.
* **Bulk Re-indexing:** Includes an AJAX-powered re-indexing tool with a progress bar, ideal for initial setup or for rebuilding the index when needed.
* **Robust Architecture:** Written with an object-oriented structure, separating the responsibilities of connection, indexing, and synchronization for easy maintenance and extension.

## Requirements

* WordPress 5.0 or higher
* WooCommerce 3.0 or higher
* PHP 7.4 or higher
* [Composer](https://getcomposer.org/) for dependency management
* Access to a running Meilisearch v1.x instance on a server.

## Installation

1.  **Clone the Repository:**
    Clone this repository into your `wp-content/plugins/` directory.
    ```bash
    git clone [YOUR_REPOSITORY_URL] wp-content/plugins/wp-meilisearch-rivera
    ```

2.  **Install Dependencies:**
    Navigate to the plugin's directory and run Composer to install the Meilisearch PHP library.
    ```bash
    cd wp-content/plugins/wp-meilisearch-rivera
    composer install
    ```

3.  **Activate the Plugin:**
    Go to the WordPress admin panel, in the "Plugins" section, and activate the "Busca Meilisearch AVFARMA" plugin.

## Configuration

For the plugin to work, you need to configure the access credentials for your Meilisearch server.

1.  **Define Constants:**
    Open your `wp-config.php` file and add the following constants, replacing the values with those of your Meilisearch instance:

    ```php
    /**
     * Meilisearch Settings
     */
    define('MEILI_HOST', '[https://search.your-domain.com](https://search.your-domain.com)'); // The public URL of your Meilisearch server
    define('MEILI_MASTER_KEY', 'YOUR_ULTRA_SECRET_MASTER_KEY_HERE'); // The Master Key of your instance
    define('MEILI_INDEX_NAME', 'products'); // The name of the index to be created/used
    ```

2.  **Configure Indexable Fields:**
    * In the WordPress dashboard, go to `Tools > Meilisearch`.
    * If the connection is successful, you will see a success message.
    * In the "Index Settings" section, select all the Product Attributes (WooCommerce) and Custom Fields (ACF) you want to be searchable.
    * Click "Save Index Settings". This action will also send the searchable attributes configuration to your Meilisearch instance.

3.  **Run the First Indexing:**
    * On the same page, in the "Bulk Synchronization" section, click the "Re-index All Products" button.
    * Wait for the progress bar to reach 100%. This process will send all your published products to Meilisearch.

After these steps, your system will be configured. The automatic synchronization will ensure that any new products or changes are reflected in the search index.

## Frontend Implementation

This plugin focuses on the backend logic (indexing and synchronization). The implementation of the search interface on the frontend should be done in your theme.

The recommended approach is to create a WordPress REST API endpoint that acts as a secure proxy to Meilisearch, preventing the exposure of API keys on the client side. The accompanying `avfarma-child` theme provides an example of how to do this:

* **Backend (Proxy):** The theme's `functions.php` file creates an endpoint (`/wp-json/meili/v1/search`) that receives the search query, forwards it to Meilisearch with the secure key, and returns the results.
* **Frontend (JavaScript):** The `js/meili-search.js` file contains the logic to capture user input, send an AJAX request to the WordPress endpoint, and dynamically render the received results.

This decoupled architecture ensures both security and performance.
