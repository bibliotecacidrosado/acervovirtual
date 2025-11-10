// Variáveis globais
let todosLivros = [];
let livrosFiltrados = [];
let categoriasUnicas = new Set();
let paginaAtual = 1;
const livrosPorPagina = 10;
let livroParaCompartilhar = null;
let timeoutBusca = null;
const delayDebounce = 150; // Reduzido de 300ms para 150ms

// Monitor de performance
const performanceMonitor = {
    startTime: Date.now(),
    mark: (name) => console.log(`Performance ${name}: ${Date.now() - performanceMonitor.startTime}ms`),
    measure: (name, fn) => {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`Performance ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
};

// Carregar dados quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando carregamento da biblioteca...');
    carregarLivrosDaPlanilha();
});

// Função para carregar dados do arquivo dados.json no GitHub
async function carregarLivrosDaPlanilha() {
    try {
        performanceMonitor.mark('inicio-carregamento');
        
        // URL do arquivo dados.json no GitHub (substitua pelo seu caminho real)
        const url = 'https://raw.githubusercontent.com/bibliotecacidrosado/acervovirtual/refs/heads/main/dados.json';
        
        // Adicionar timestamp para evitar cache
        const response = await fetch(url + '?t=' + new Date().getTime());
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar dados: ${response.status} ${response.statusText}`);
        }
        
        const livros = await response.json();
        performanceMonitor.mark('dados-recebidos');
        
        processarLivros(livros);
        performanceMonitor.mark('processamento-concluido');
        
    } catch (error) {
        console.error('❌ Erro detalhado:', error);
        mostrarErro(error);
        
        // Tentar carregar dados de fallback se disponível
        setTimeout(() => {
            console.log('🔄 Tentando carregar dados de fallback...');
            carregarDadosFallback();
        }, 2000);
    }
}

// Função fallback caso o arquivo principal não carregue
async function carregarDadosFallback() {
    try {
        // Tentar carregar de uma URL alternativa ou versão em cache
        const response = await fetch('dados.json');
        if (response.ok) {
            const livros = await response.json();
            processarLivros(livros);
        }
    } catch (error) {
        console.error('❌ Também falhou ao carregar fallback:', error);
    }
}

// **CORREÇÃO 1: Validação defensiva robusta dos dados**
function processarLivros(livros) {
    console.log('🔍 Processando livros...', { 
        count: livros?.length || 0, 
        type: typeof livros,
        isArray: Array.isArray(livros)
    });
    
    // Validação robusta
    if (!Array.isArray(livros)) {
        throw new Error(`❌ Esperado array de livros, recebido: ${typeof livros}. Dados: ${JSON.stringify(livros).substring(0, 200)}...`);
    }
    
    // Limpar e validar cada livro
    todosLivros = livros
        .filter(livro => livro && typeof livro === 'object') // Remove null/undefined
        .map((livro, index) => {
            // Garantir que todos os campos existem e são strings
            return {
                titulo: String(livro.titulo || '').trim(),
                autor: String(livro.autor || '').trim(),
                categoria: String(livro.categoria || 'Sem categoria').trim(),
                link: String(livro.link || '#').trim(),
                capa: String(livro.capa || 'https://via.placeholder.com/200x300?text=Sem+Capa').trim(),
                indice_entrada: index
            };
        })
        .filter(livro => livro.titulo.length > 0); // Remove livros sem título
    
    console.log(`✅ Processados ${todosLivros.length} livros válidos de ${livros.length} recebidos`);
    
    // Ordenar por índice de entrada (mais recentes primeiro)
    livrosFiltrados = ordenarLivros(todosLivros, 'recentes');
    
    // Definir a opção selecionada no dropdown como "Mais Recentes"
    document.getElementById('ordenacao').value = 'recentes';
    
    // Coletar categorias únicas
    categoriasUnicas.clear();
    todosLivros.forEach(livro => {
        if (livro.categoria) {
            categoriasUnicas.add(livro.categoria);
        }
    });
    
    // Atualizar interface
    atualizarEstatisticas();
    preencherDropdownCategorias();
    exibirLivros();
    verificarParametrosUrl();
    
    console.log('🎉 Processamento concluído com sucesso!');
}

// Mostrar erro
function mostrarErro(error) {
    console.error('❌ Erro:', error);
    document.getElementById('livros-container').innerHTML = `
        <div class="sem-resultados">
            <h3>❌ Erro ao carregar os dados</h3>
            <p><strong>Mensagem:</strong> ${error.message || error}</p>
            <p><strong>Possíveis causas:</strong></p>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>O arquivo dados.json não existe ou está inacessível</li>
                <li>O repositório não está configurado como público</li>
                <li>Erro de rede ou conexão</li>
            </ul>
            <p style="margin-top: 1rem;"><strong>Soluções:</strong></p>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>Verifique se o repositório é público</li>
                <li>Confirme se o arquivo dados.json existe</li>
                <li>Teste o link direto do arquivo</li>
            </ul>
            <button onclick="carregarLivrosDaPlanilha()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cor-primaria); color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Tentar Novamente</button>
        </div>
    `;
}

// Preencher dropdown de categorias
function preencherDropdownCategorias() {
    const select = document.getElementById('filtro-categoria');
    select.innerHTML = '<option value="">Todas as categorias</option>';
    
    // Ordenar categorias alfabeticamente
    const categoriasOrdenadas = Array.from(categoriasUnicas).sort();
    
    categoriasOrdenadas.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        select.appendChild(option);
    });
}

// **CORREÇÃO 2: Função otimizada para criar cards**
function criarCardLivro(livro, index) {
    const card = document.createElement('div');
    card.className = 'card-livro';
    card.setAttribute('data-livro', livro.titulo.toLowerCase().replace(/\s+/g, '-'));
    
    // Verificar se é recente (últimos 20 adicionados)
    const isRecent = livro.indice_entrada >= (todosLivros.length - 20);
    
    // Escape de strings para evitar XSS
    const titulo = livro.titulo.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const autor = livro.autor.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    card.innerHTML = `
        <div class="capa-container ${isRecent ? 'livro-recente' : ''}">
            <img src="${livro.capa}" 
                 alt="Capa do livro ${titulo}" 
                 class="card-capa"
                 loading="lazy"
                 decoding="async"
                 width="200" 
                 height="300"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x300?text=Capa+Não+Disponível'">
            <button class="icone-compartilhar" 
                    aria-label="Compartilhar livro ${titulo}"
                    onclick="compartilharLivro('${livro.titulo.replace(/'/g, "\\'")}', '${livro.autor.replace(/'/g, "\\'")}', '${livro.link}', '${livro.capa}')">↗</button>
        </div>
        <div class="card-corpo">
            <h3 class="card-titulo">${titulo}</h3>
            <p class="card-autor">${autor}</p>
            ${livro.categoria ? `<span class="card-categoria">${livro.categoria}</span>` : ''}
            <a href="${livro.link}" target="_blank" class="card-botao" rel="noopener noreferrer" aria-label="Ler livro ${titulo}">📖 Ler Livro</a>
        </div>
    `;
    
    return card;
}

// Exibir livros na tela com paginação otimizada
function exibirLivros() {
    const container = document.getElementById('livros-container');
    const controlesPaginacao = document.getElementById('controles-paginacao');
    
    if (livrosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="sem-resultados">
                <h3>Nenhum livro encontrado</h3>
                <p>Tente ajustar os filtros de busca.</p>
            </div>
        `;
        controlesPaginacao.style.display = 'none';
        return;
    }

    // Calcular índices para a página atual
    const indiceInicio = (paginaAtual - 1) * livrosPorPagina;
    const indiceFim = indiceInicio + livrosPorPagina;
    const livrosPagina = livrosFiltrados.slice(indiceInicio, indiceFim);
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    livrosPagina.forEach((livro, index) => {
        const card = criarCardLivro(livro, index);
        fragment.appendChild(card);
    });
    
    // Substituir todo conteúdo de uma vez
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Configurar virtual scrolling
    setTimeout(() => configurarVirtualScrolling(), 100);
    
    // Atualizar controles de paginação
    atualizarControlesPaginacao();
}

// **CORREÇÃO 3: Virtual Scrolling para melhor performance**
function configurarVirtualScrolling() {
    const container = document.getElementById('livros-container');
    const cards = container.querySelectorAll('.card-livro');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Card visível
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                } else {
                    // Card fora da tela (otimização)
                    entry.target.style.opacity = '0.7';
                    entry.target.style.transform = 'translateY(5px)';
                }
            });
        }, {
            rootMargin: '200px' // Carregar com antecedência
        });
        
        cards.forEach(card => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            observer.observe(card);
        });
    }
}

// Atualizar controles de paginação
function atualizarControlesPaginacao() {
    const controlesPaginacao = document.getElementById('controles-paginacao');
    const totalPaginas = Math.ceil(livrosFiltrados.length / livrosPorPagina);
    
    if (livrosFiltrados.length <= livrosPorPagina) {
        controlesPaginacao.style.display = 'none';
        return;
    }
    
    controlesPaginacao.style.display = 'flex';
    
    // Atualizar números de página
    const paginacaoNumeros = document.getElementById('paginacao-numeros');
    paginacaoNumeros.innerHTML = '';
    
    // Calcular quais números de página mostrar
    let inicioPagina = Math.max(1, paginaAtual - 2);
    let fimPagina = Math.min(totalPaginas, inicioPagina + 4);
    
    // Ajustar se estiver no final
    if (fimPagina - inicioPagina < 4) {
        inicioPagina = Math.max(1, fimPagina - 4);
    }
    
    // Botão para primeira página
    if (inicioPagina > 1) {
        const btn = document.createElement('button');
        btn.className = 'btn-pagina';
        btn.textContent = '1';
        btn.onclick = () => irParaPagina(1);
        btn.setAttribute('aria-label', 'Ir para página 1');
        paginacaoNumeros.appendChild(btn);
        
        if (inicioPagina > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '6px';
            paginacaoNumeros.appendChild(ellipsis);
        }
    }
    
    // Botões para páginas numeradas
    for (let i = inicioPagina; i <= fimPagina; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-pagina' + (i === paginaAtual ? ' ativa' : '');
        btn.textContent = i;
        btn.onclick = () => irParaPagina(i);
        btn.setAttribute('aria-label', `Ir para página ${i}`);
        paginacaoNumeros.appendChild(btn);
    }
    
    // Botão para última página
    if (fimPagina < totalPaginas) {
        if (fimPagina < totalPaginas - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '6px';
            paginacaoNumeros.appendChild(ellipsis);
        }
        
        const btn = document.createElement('button');
        btn.className = 'btn-pagina';
        btn.textContent = totalPaginas;
        btn.onclick = () => irParaPagina(totalPaginas);
        btn.setAttribute('aria-label', `Ir para página ${totalPaginas}`);
        paginacaoNumeros.appendChild(btn);
    }
    
    // Habilitar/desabilitar botões de navegação
    const btnAnterior = document.getElementById('pagina-anterior');
    const btnProxima = document.getElementById('proxima-pagina');
    
    btnAnterior.disabled = (paginaAtual === 1);
    btnProxima.disabled = (paginaAtual === totalPaginas);
    
    // Atualizar campo de pular para página
    const inputPagina = document.getElementById('pular-para-pagina');
    inputPagina.value = paginaAtual;
    inputPagina.max = totalPaginas;
}

// Ir para página específica
function irParaPagina(numeroPagina) {
    const totalPaginas = Math.ceil(livrosFiltrados.length / livrosPorPagina);
    
    if (numeroPagina >= 1 && numeroPagina <= totalPaginas) {
        paginaAtual = numeroPagina;
        exibirLivros();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Ir para página anterior
function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        exibirLivros();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Ir para próxima página
function proximaPagina() {
    const totalPaginas = Math.ceil(livrosFiltrados.length / livrosPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        exibirLivros();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Pular para página específica
function pularParaPagina() {
    const input = document.getElementById('pular-para-pagina');
    const pagina = parseInt(input.value);
    
    if (!isNaN(pagina)) {
        irParaPagina(pagina);
    }
}

// **CORREÇÃO 4: Função de busca otimizada com processamento em lotes**
function filtrarLivros() {
    // Limpar o timeout anterior se existir
    if (timeoutBusca) {
        clearTimeout(timeoutBusca);
    }
    
    // Mostrar loading mais responsivo
    mostrarLoadingBusca();
    
    // Configurar novo timeout mais rápido
    timeoutBusca = setTimeout(() => {
        performanceMonitor.measure('busca', () => {
            executarFiltragem();
        });
    }, delayDebounce);
}

// Função que realmente executa a filtragem
function executarFiltragem() {
    const termoBusca = document.getElementById('busca').value.trim().toLowerCase();
    const categoriaSelecionada = document.getElementById('filtro-categoria').value;
    const ordenacaoSelecionada = document.getElementById('ordenacao').value;
    
    // Resetar para a primeira página ao filtrar
    paginaAtual = 1;
    
    // Filtragem otimizada com validação defensiva
    livrosFiltrados = todosLivros.filter(livro => {
        // Validação defensiva dos campos
        const titulo = (livro.titulo || '').toLowerCase();
        const autor = (livro.autor || '').toLowerCase();
        
        const correspondeBusca = !termoBusca || 
            titulo.includes(termoBusca) || 
            autor.includes(termoBusca);
        
        const correspondeCategoria = !categoriaSelecionada || 
            livro.categoria === categoriaSelecionada;
        
        return correspondeBusca && correspondeCategoria;
    });
    
    // Aplicar ordenação
    livrosFiltrados = ordenarLivros(livrosFiltrados, ordenacaoSelecionada);
    
    // Atualizar interface
    atualizarEstatisticas();
    exibirLivros();
    esconderLoadingBusca();
}

// **CORREÇÃO 5: Loading states melhorados**
function mostrarLoadingBusca() {
    const buscaInput = document.getElementById('busca');
    const container = document.getElementById('livros-container');
    
    // Loading mais rápido e sutil
    buscaInput.classList.add('buscando');
    
    // Mostrar loading apenas se já tiver dados carregados
    if (todosLivros.length > 0) {
        container.innerHTML = `
            <div class="loading-busca" style="
                text-align: center;
                padding: 2rem;
                grid-column: 1/-1;
            ">
                <div class="loading-spinner" style="
                    width: 30px;
                    height: 30px;
                    border: 3px solid rgba(255, 109, 0, 0.2);
                    border-top-color: var(--cor-primaria);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                "></div>
                <p style="margin-top: 1rem; color: var(--cor-texto-claro);">🔍 Buscando...</p>
            </div>
        `;
    }
}

// Esconder indicador de busca
function esconderLoadingBusca() {
    const buscaInput = document.getElementById('busca');
    buscaInput.classList.remove('buscando');
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    document.getElementById('total-livros').textContent = todosLivros.length;
    document.getElementById('livros-visiveis').textContent = livrosFiltrados.length;
    document.getElementById('total-categorias').textContent = categoriasUnicas.size;
}

// Função para forçar atualização dos dados
function atualizarDados() {
    document.getElementById('livros-container').innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>🔄 Atualizando dados...</p>
        </div>
    `;
    carregarLivrosDaPlanilha();
}

// Função para detectar parâmetros na URL (para links diretos)
function verificarParametrosUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const livroParam = urlParams.get('livro');
    
    if (livroParam) {
        // Buscar livro pelo título
        const livroEncontrado = todosLivros.find(livro => 
            livro.titulo.toLowerCase().replace(/\s+/g, '-') === livroParam
        );
        
        if (livroEncontrado) {
            // Rolagem suave para o livro
            setTimeout(() => {
                const card = document.querySelector(`[data-livro="${livroParam}"]`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.boxShadow = '0 0 0 3px var(--cor-primaria)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                    }, 3000);
                }
            }, 1000);
        }
    }
}

// **FUNÇÕES DE COMPARTILHAMENTO (com melhorias de UX)**
function compartilharLivro(titulo, autor, link, capa) {
    livroParaCompartilhar = { titulo, autor, link, capa };
    
    // Atualizar o modal com as informações do livro
    document.getElementById('modalTituloLivro').textContent = titulo;
    document.getElementById('modalAutorLivro').textContent = autor;
    document.getElementById('modalCapaPreview').src = capa;
    
    document.getElementById('modalCompartilhar').classList.add('ativo');
    // Focar no botão de fechar para acessibilidade
    document.querySelector('.btn-fechar').focus();
}

// Função para fechar o modal
function fecharModal() {
    document.getElementById('modalCompartilhar').classList.remove('ativo');
    // Retornar foco para o elemento que abriu o modal
    document.getElementById('busca').focus();
}

// Compartilhar via WhatsApp
function compartilharWhatsApp() {
    const texto = `📚 *${livroParaCompartilhar.titulo}*
✍️ _${livroParaCompartilhar.autor}_

🔗 ${livroParaCompartilhar.link}

📖 Acesse o link para ler o livro completo!`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    fecharModal();
    mostrarToast('✅ Link compartilhado no WhatsApp!');
}

// Copiar link para a área de transferência
function copiarLink() {
    const texto = `📖 ${livroParaCompartilhar.titulo}
👤 ${livroParaCompartilhar.autor}
🔗 ${livroParaCompartilhar.link}

💡 Livro disponível na Biblioteca Digital Cid Rosado`;

    navigator.clipboard.writeText(texto)
        .then(() => {
            mostrarToast('✅ Link e informações copiados para a área de transferência!');
            fecharModal();
        })
        .catch(err => {
            console.error('Erro ao copiar link: ', err);
            // Fallback: copiar apenas o link
            navigator.clipboard.writeText(livroParaCompartilhar.link)
                .then(() => {
                    mostrarToast('✅ Link copiado para a área de transferência!');
                    fecharModal();
                })
                .catch(() => {
                    mostrarToast('❌ Não foi possível copiar o link. Tente novamente.');
                });
        });
}

// Compartilhar via email
function compartilharEmail() {
    const assunto = `📚 Recomendação de livro: ${livroParaCompartilhar.titulo}`;
    const corpo = `Olá!

Recomendo que você confira este livro incrível:

📖 TÍTULO: ${livroParaCompartilhar.titulo}
✍️ AUTOR: ${livroParaCompartilhar.autor}

🔗 ACESSE AQUI: ${livroParaCompartilhar.link}

Atenciosamente,
Biblioteca Digital Cid Rosado`;
    
    const url = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = url;
    fecharModal();
    mostrarToast('✅ Cliente de email aberto!');
}

// **FUNÇÃO AUXILIAR: Toast notifications**
function mostrarToast(mensagem, tipo = 'sucesso') {
    // Remover toast anterior se existir
    const toastAnterior = document.querySelector('.toast');
    if (toastAnterior) {
        toastAnterior.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--cor-primaria);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Adicionar estilos de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Fechar modal ao clicar fora dele
document.addEventListener('click', function(event) {
    const modal = document.getElementById('modalCompartilhar');
    if (event.target === modal) {
        fecharModal();
    }
});

// Fechar modal com tecla Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('modalCompartilhar');
        if (modal.classList.contains('ativo')) {
            fecharModal();
        }
    }
});

// Navegação por teclado nos modais
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('modalCompartilhar');
    if (modal.classList.contains('ativo') && event.key === 'Tab') {
        // Focar nos elementos do modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }
});

// **ORDENAÇÃO (sem alterações significativas)**
function ordenarLivros(livros, tipoOrdenacao) {
    const livrosOrdenados = [...livros];
    
    switch(tipoOrdenacao) {
        case 'recentes':
            return livrosOrdenados.sort((a, b) => {
                if (a.indice_entrada === undefined && b.indice_entrada === undefined) return 0;
                if (a.indice_entrada === undefined) return 1;
                if (b.indice_entrada === undefined) return -1;
                return b.indice_entrada - a.indice_entrada;
            });
            
        case 'titulo-az':
            return livrosOrdenados.sort((a, b) => 
                a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' })
            );
            
        case 'titulo-za':
            return livrosOrdenados.sort((a, b) => 
                b.titulo.localeCompare(a.titulo, 'pt-BR', { sensitivity: 'base' })
            );
            
        case 'autor-az':
            return livrosOrdenados.sort((a, b) => 
                a.autor.localeCompare(b.autor, 'pt-BR', { sensitivity: 'base' })
            );
            
        case 'categoria':
            return livrosOrdenados.sort((a, b) => {
                const catCompare = (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR');
                return catCompare !== 0 ? catCompare : 
                    a.titulo.localeCompare(b.titulo, 'pt-BR');
            });
            
        case 'aleatoria':
        default:
            return aleatorizarArray(livrosOrdenados);
    }
}

function aleatorizarArray(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    
    return array;
}

console.log('✅ Script.js carregado com otimizações de performance!');
