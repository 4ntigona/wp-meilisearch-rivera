# Busca Meilisearch para WooCommerce (Plugin Customizado)

Este é um plugin customizado para WordPress que integra uma loja WooCommerce a uma instância auto-hospedada (self-hosted) do [Meilisearch](https://www.meilisearch.com/), um motor de busca open-source extremamente rápido e relevante.

O plugin substitui a busca padrão do WordPress/WooCommerce por uma experiência de busca instantânea e poderosa, indexando produtos e seus metadados para fornecer resultados em milissegundos.

## Recursos Principais

* **Conexão Segura:** Conecta-se a uma instância Meilisearch usando credenciais seguras definidas no `wp-config.php`.
* **Sincronização Automática:** Mantém o índice do Meilisearch sincronizado em tempo real. Produtos são adicionados, atualizados ou removidos do índice automaticamente sempre que uma alteração ocorre no WordPress.
* **Indexação Customizável:** Oferece uma página de administração (`Ferramentas > Meilisearch`) onde é possível selecionar quais atributos de produto (WooCommerce) e campos customizados (ACF) devem ser incluídos na busca.
* **Reindexação em Massa:** Inclui uma ferramenta de reindexação via AJAX com barra de progresso, ideal para a configuração inicial ou para reconstruir o índice quando necessário.
* **Arquitetura Robusta:** Escrito com uma estrutura orientada a objetos, separando as responsabilidades de conexão, indexação e sincronização para facilitar a manutenção e extensão.

## Requisitos

* WordPress 5.0 ou superior
* WooCommerce 3.0 ou superior
* PHP 7.4 ou superior
* [Composer](https://getcomposer.org/) para gestão de dependências
* Acesso a uma instância do Meilisearch v1.x rodando em um servidor.

## Instalação

1.  **Clone o Repositório:**
    Clone este repositório para o seu diretório `wp-content/plugins/`.
    ```bash
    git clone [URL_DO_SEU_REPOSITORIO] wp-content/plugins/wp-meilisearch-rivera
    ```

2.  **Instale as Dependências:**
    Acesse o diretório do plugin e execute o Composer para instalar a biblioteca PHP do Meilisearch.
    ```bash
    cd wp-content/plugins/wp-meilisearch-rivera
    composer install
    ```

3.  **Ative o Plugin:**
    Acesse o painel de administração do WordPress, na seção "Plugins", e ative o plugin "Busca Meilisearch AVFARMA".

## Configuração

Para que o plugin funcione, é necessário configurar as credenciais de acesso ao seu servidor Meilisearch.

1.  **Defina as Constantes:**
    Abra o seu arquivo `wp-config.php` e adicione as seguintes constantes, substituindo os valores pelos da sua instância Meilisearch:

    ```php
    /**
     * Configurações do Meilisearch
     */
    define('MEILI_HOST', '[https://search.seu-dominio.com.br](https://search.seu-dominio.com.br)'); // A URL pública do seu servidor Meilisearch
    define('MEILI_MASTER_KEY', 'SUA_CHAVE_MESTRA_ULTRA_SECRETA_AQUI'); // A Master Key da sua instância
    define('MEILI_INDEX_NAME', 'produtos'); // O nome do índice que será criado/utilizado
    ```

2.  **Configure os Campos Indexáveis:**
    * No painel do WordPress, vá para `Ferramentas > Meilisearch`.
    * Se a conexão for bem-sucedida, você verá uma mensagem de sucesso.
    * Na seção "Configurações do Índice", selecione todos os Atributos de Produto (WooCommerce) e Campos Customizados (ACF) que você deseja que sejam pesquisáveis.
    * Clique em "Salvar Configurações do Índice". Esta ação também enviará as configurações de atributos pesquisáveis para a sua instância Meilisearch.

3.  **Execute a Primeira Indexação:**
    * Na mesma página, na seção "Sincronização em Massa", clique no botão "Re-indexar Todos os Produtos".
    * Aguarde até que a barra de progresso chegue a 100%. Este processo irá enviar todos os seus produtos publicados para o Meilisearch.

Após estes passos, seu sistema estará configurado. A sincronização automática garantirá que quaisquer novos produtos ou alterações sejam refletidos no índice de busca.

## Implementação no Frontend

Este plugin foca na lógica de backend (indexação e sincronização). A implementação da interface de busca no frontend deve ser feita no seu tema.

A abordagem recomendada é criar um endpoint na API REST do WordPress que atue como um proxy seguro para o Meilisearch, evitando a exposição de chaves de API no lado do cliente. O tema `avfarma-child` que acompanha o projeto contém um exemplo de como fazer isso:

* **Backend (Proxy):** O arquivo `functions.php` do tema cria um endpoint (`/wp-json/meili/v1/search`) que recebe a query de busca, a encaminha para o Meilisearch com a chave segura e devolve os resultados.
* **Frontend (JavaScript):** O arquivo `js/meili-search.js` contém a lógica para capturar a digitação do usuário, enviar uma requisição AJAX para o endpoint do WordPress e renderizar os resultados recebidos de forma dinâmica.

Esta arquitetura desacoplada garante segurança e performance.
