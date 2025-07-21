jQuery(document).ready(function($) {
    'use strict';

    const reindexButton = $('#meili-reindex-button');
    const progressContainer = $('#meili-progress-container');
    const progressBar = $('#meili-progress-bar');
    const progressLog = $('#meili-progress-log');

    let totalProducts = 0;
    let processedProducts = 0;
    let currentPage = 1;
    const batchSize = 50; // Deve corresponder ao BATCH_SIZE no PHP

    reindexButton.on('click', function(e) {
        e.preventDefault();
        
        $(this).prop('disabled', true);
        progressContainer.show();
        progressLog.html('');
        processedProducts = 0;
        currentPage = 1;

        addToLog('Iniciando a re-indexação...');
        
        // 1. Obter o número total de produtos
        $.ajax({
            url: meili_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'meili_get_total_products',
                nonce: meili_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    totalProducts = response.data.total;
                    if (totalProducts > 0) {
                        addToLog(`Total de produtos encontrados: ${totalProducts}`);
                        processNextBatch();
                    } else {
                        addToLog('Nenhum produto para indexar.');
                        completeIndexing();
                    }
                } else {
                    addToLog('Erro: Não foi possível obter o total de produtos.');
                    completeIndexing();
                }
            },
            error: function() {
                addToLog('Erro de comunicação com o servidor ao obter total de produtos.');
                completeIndexing();
            }
        });
    });

    function processNextBatch() {
        if (processedProducts >= totalProducts && totalProducts > 0) {
            completeIndexing();
            return;
        }

        addToLog(`Processando lote ${currentPage}...`);

        $.ajax({
            url: meili_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'meili_process_batch',
                nonce: meili_ajax.nonce,
                page: currentPage
            },
            success: function(response) {
                if (response.success) {
                    const processedInBatch = response.data.processed;
                    if (processedInBatch > 0) {
                        processedProducts += processedInBatch;
                        updateProgress();
                        addToLog(`${processedInBatch} produtos indexados neste lote. Total: ${processedProducts}`);
                        currentPage++;
                        processNextBatch(); // Chama o próximo lote
                    } else {
                        // Não há mais produtos para processar
                        completeIndexing();
                    }
                } else {
                    addToLog('Erro ao processar o lote. Tentando novamente...');
                    setTimeout(processNextBatch, 3000); // Tenta novamente após 3 segundos
                }
            },
            error: function() {
                addToLog('Erro de comunicação com o servidor ao processar o lote. Tentando novamente...');
                setTimeout(processNextBatch, 3000); // Tenta novamente após 3 segundos
            }
        });
    }

    function updateProgress() {
        const percentage = totalProducts > 0 ? Math.round((processedProducts / totalProducts) * 100) : 100;
        progressBar.css('width', percentage + '%').text(percentage + '%');
    }

    function completeIndexing() {
        addToLog('Indexação concluída!');
        updateProgress(); // Garante que a barra chegue a 100%
        progressBar.text('Concluído!');
        reindexButton.prop('disabled', false);
    }

    function addToLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        // MUDANÇA: Envolve cada mensagem em um <div> para forçar a quebra de linha.
        progressLog.append(`<div>[${timestamp}] ${message}</div>`);
        // Auto-scroll para a parte inferior do log
        progressLog.scrollTop(progressLog[0].scrollHeight);
    }
});
