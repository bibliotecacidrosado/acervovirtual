// ========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================

const CONFIG = {
    LIVROS_POR_PAGINA: 10,
    DELAY_DEBOUNCE: 150, // Reduzido de 300ms para 150ms para busca mais rápida
    CACHE_EXPIRACAO: 5 * 60 * 1000, // 5 minutos
    LIVROS_RECENTES_COUNT: 20,
    JSON_URL: 'https://raw.githubusercontent.com/bibliotecacidrosado/acervovirtual/refs/heads/main/dados.json',
    FALLBACK_URL: 'dados.json'
};

// Estado da aplicação
const state = {
    todosLivros: [],
    livrosFiltrados: [],
    categoriasUnicas: new Set(),
    paginaAtual: 1,
    livroParaCompartilhar: null,
    timeoutBusca: null,
    cacheTimestamp: null
};

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', inicializar);

function inicializar() {
    configurarEventListeners();
    carregarLivrosDaPlanilha();
}

// ========================================
// EVENT LISTENERS (Event Delegation)
// ========================================

function configurarEventListeners() {
    // Busca com debounce
    document.getElementById('busca').addEventListener('input', filtrarLivrosDebounced);
    
    // Filtros
    document.getElementById('filtro-categoria').addEventListener('change', filtrarLivros);
    document.getElementById('ordenacao').addEventListener('change', filtrarLivros);
    
    // Paginação - usando event delegation no container
    const controlesContainer = document.getElementById('controles-paginacao');
    controlesContainer.addEventListener('click', handlePaginacaoClick);
    
    // Modal - event delegation
    const modalBotoes = document.querySelector('.modal-botoes');
    if (modalBotoes) {
        modalBotoes.addEventListener('click', handleModalClick);
    }
    
    // Fechar modal ao clicar fora
    const modal = document.getElementById('modalCompartilhar');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) fecharModal();
    });
    
    // Grid de livros - event delegation para compartilhamento
    document.getElementById('livros-container').addEventListener('click', handleLivrosClick);
}

// ========================================
// CARREGAMENTO DE DADOS
// ========================================

async function carregarLivrosDaPlanilha() {
    try {
        // Verificar cache
        const dadosCache = obterDadosCache();
        if (dadosCache) {
            console.log('Carregando do cache...');
            processarLivros(dadosCache);
            return;
        }
        
        // Fetch com estratégia de cache
        const response = await fetch(CONFIG.JSON_URL + '?t=' + Date.now(), {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do arquivo JSON');
        }
        
        const livros = await response.json();
        
        // Salvar no cache
        salvarDadosCache(livros);
        
        processarLivros(livros);
        
    } catch (error) {
        console.error('Erro detalhado:', error);
        mostrarErro(error);
        
        // Tentar fallback
        setTimeout(carregarDadosFallback, 2000);
    }
}

async function carregarDadosFallback() {
    try {
        const response = await fetch(CONFIG.FALLBACK_URL);
        if (response.ok) {
            const livros = await response.json();
            processarLivros(livros);
        }
    } catch (error) {
        console.error('Fallback também falhou:', error);
    }
}

// ========================================
// CACHE MANAGEMENT
// ========================================

function obterDadosCache() {
    try {
        const cache = localStorage.getItem('livrosCache');
        const timestamp = localStorage.getItem('livrosCacheTimestamp');
        
        if (cache && timestamp) {
            const idade = Date.now() - parseInt(timestamp);
            if (idade < CONFIG.CACHE_EXPIRACAO) {
                return JSON.parse(cache);
            }
        }
    } catch (e) {
        console.warn('Erro ao ler cache:', e);
    }
    return null;
}

function salvarDadosCache(livros) {
    try {
        localStorage.setItem('livrosCache', JSON.stringify(livros));
        localStorage.setItem('livrosCacheTimestamp', Date.now().toString());
    } catch (e) {
        console.warn('Erro ao salvar cache:', e);
    }
}

// ========================================
// PROCESSAMENTO DE DADOS
// ========================================

function processarLivros(livros) {
    if (!Array.isArray(livros)) {
        throw new Error('Dados não são um array');
    }
    
    // Adicionar índice de entrada em uma única passagem
    state.todosLivros = livros.map((livro, index) => ({
        ...livro,
        indice_entrada: index
    }));
    
    // Ordenar inicialmente por recentes
    state.livrosFiltrados = ordenarLivros([...state.todosLivros], 'recentes');
    
    // Coletar categorias únicas
    state.categoriasUnicas.clear();
    state.todosLivros.forEach(livro => {
        if (livro.categoria) {
            state.categoriasUnicas.add(livro.categoria);
        }
    });
    
    // Atualizar UI
    atualizarEstatisticas();
    preencherDropdownCategorias();
    exibirLivros();
    
    // Verificar parâmetros URL
    requestAnimationFrame(() => verificarParametrosUrl());
}

// ========================================
// RENDERIZAÇÃO OTIMIZADA
// ========================================

function exibirLivros() {
    const container = document.getElementById('livros-container');
    const controlesPaginacao = document.getElementById('controles-paginacao');
    
    if (state.livrosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="sem-resultados">
                <h3>Nenhum livro encontrado</h3>
                <p>Tente ajustar os filtros de busca.</p>
            </div>
        `;
        controlesPaginacao.style.display = 'none';
        return;
    }

    // Calcular índices para paginação
    const indiceInicio = (state.paginaAtual - 1) * CONFIG.LIVROS_POR_PAGINA;
    const indiceFim = indiceInicio + CONFIG.LIVROS_POR_PAGINA;
    const livrosPagina = state.livrosFiltrados.slice(indiceInicio, indiceFim);
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    livrosPagina.forEach(livro => {
        const card = criarCardLivro(livro);
        fragment.appendChild(card);
    });
    
    // Limpar e adicionar tudo de uma vez
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Implementar lazy loading
    requestAnimationFrame(() => observarImagens());
    
    // Atualizar controles
    atualizarControlesPaginacao();
}

function criarCardLivro(livro) {
    const card = document.createElement('div');
    card.className = 'card-livro';
    
    // Validação segura de campos
    const titulo = (livro.titulo || 'Sem título').toString();
    const autor = (livro.autor || 'Autor desconhecido').toString();
    const capa = livro.capa || 'https://via.placeholder.com/200x300?text=Sem+Capa';
    const link = livro.link || '#';
    const categoria = livro.categoria || '';
    
    card.setAttribute('data-livro', titulo.toLowerCase().replace(/\s+/g, '-'));
    
    const isRecent = livro.indice_entrada >= (state.todosLivros.length - CONFIG.LIVROS_RECENTES_COUNT);
    
    card.innerHTML = `
        <div class="capa-container ${isRecent ? 'livro-recente' : ''}">
            <img data-src="${capa}" 
                 alt="Capa do livro ${titulo}" 
                 class="card-capa"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/200x300?text=Imagem+Não+Encontrada'">
            <button class="icone-compartilhar" 
                    data-titulo="${escapeHtml(titulo)}"
                    data-autor="${escapeHtml(autor)}"
                    data-link="${link}"
                    data-capa="${capa}">↗</button>
        </div>
        <div class="card-corpo">
            <h3 class="card-titulo">${titulo}</h3>
            <p class="card-autor">${autor}</p>
            ${categoria ? `<span class="card-categoria">${categoria}</span>` : ''}
            <a href="${link}" target="_blank" class="card-botao">📖 Ler Livro</a>
        </div>
    `;
    
    return card;
}

// ========================================
// LAZY LOADING DE IMAGENS
// ========================================

function observarImagens() {
    const imagens = document.querySelectorAll('.card-capa[data-src]');
    
    if (!('IntersectionObserver' in window)) {
        // Fallback para navegadores antigos
        imagens.forEach(img => {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
        });
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    }, { 
        rootMargin: '50px 0px',
        threshold: 0.01
    });
    
    imagens.forEach(img => observer.observe(img));
}

// ========================================
// FILTRAGEM E ORDENAÇÃO
// ========================================

function filtrarLivrosDebounced() {
    // Limpar timeout anterior
    if (state.timeoutBusca) {
        clearTimeout(state.timeoutBusca);
    }
    
    mostrarLoadingBusca();
    
    state.timeoutBusca = setTimeout(() => {
        filtrarLivros();
    }, CONFIG.DELAY_DEBOUNCE);
}

function filtrarLivros() {
    const termoBusca = document.getElementById('busca').value.toLowerCase();
    const categoriaSelecionada = document.getElementById('filtro-categoria').value;
    const ordenacaoSelecionada = document.getElementById('ordenacao').value;
    
    // Resetar página
    state.paginaAtual = 1;
    
    // Filtrar com validação segura
    state.livrosFiltrados = state.todosLivros.filter(livro => {
        // Garantir que campos existem e são strings
        const titulo = (livro.titulo || '').toString().toLowerCase();
        const autor = (livro.autor || '').toString().toLowerCase();
        
        const correspondeBusca = !termoBusca || 
            titulo.includes(termoBusca) || 
            autor.includes(termoBusca);
        
        const correspondeCategoria = !categoriaSelecionada || 
            livro.categoria === categoriaSelecionada;
        
        return correspondeBusca && correspondeCategoria;
    });
    
    // Ordenar
    state.livrosFiltrados = ordenarLivros(state.livrosFiltrados, ordenacaoSelecionada);
    
    // Atualizar UI
    atualizarEstatisticas();
    exibirLivros();
    esconderLoadingBusca();
}

function ordenarLivros(livros, tipoOrdenacao) {
    const livrosOrdenados = [...livros];
    
    const comparadores = {
        'recentes': (a, b) => {
            if (a.indice_entrada === undefined && b.indice_entrada === undefined) return 0;
            if (a.indice_entrada === undefined) return 1;
            if (b.indice_entrada === undefined) return -1;
            return b.indice_entrada - a.indice_entrada;
        },
        'titulo-az': (a, b) => {
            const tituloA = (a.titulo || '').toString();
            const tituloB = (b.titulo || '').toString();
            return tituloA.localeCompare(tituloB, 'pt-BR', { sensitivity: 'base' });
        },
        'titulo-za': (a, b) => {
            const tituloA = (a.titulo || '').toString();
            const tituloB = (b.titulo || '').toString();
            return tituloB.localeCompare(tituloA, 'pt-BR', { sensitivity: 'base' });
        },
        'autor-az': (a, b) => {
            const autorA = (a.autor || '').toString();
            const autorB = (b.autor || '').toString();
            return autorA.localeCompare(autorB, 'pt-BR', { sensitivity: 'base' });
        },
        'categoria': (a, b) => {
            const catCompare = (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR');
            if (catCompare !== 0) return catCompare;
            const tituloA = (a.titulo || '').toString();
            const tituloB = (b.titulo || '').toString();
            return tituloA.localeCompare(tituloB, 'pt-BR');
        }
    };
    
    if (tipoOrdenacao === 'aleatoria') {
        return aleatorizarArray(livrosOrdenados);
    }
    
    return livrosOrdenados.sort(comparadores[tipoOrdenacao] || comparadores.recentes);
}

function aleatorizarArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ========================================
// PAGINAÇÃO
// ========================================

function handlePaginacaoClick(e) {
    const target = e.target;
    
    if (target.id === 'pagina-anterior') {
        paginaAnterior();
    } else if (target.id === 'proxima-pagina') {
        proximaPagina();
    } else if (target.id === 'btn-pular') {
        pularParaPagina();
    } else if (target.classList.contains('btn-pagina')) {
        const pagina = parseInt(target.textContent);
        if (!isNaN(pagina)) {
            irParaPagina(pagina);
        }
    }
}

function irParaPagina(numeroPagina) {
    const totalPaginas = Math.ceil(state.livrosFiltrados.length / CONFIG.LIVROS_POR_PAGINA);
    
    if (numeroPagina >= 1 && numeroPagina <= totalPaginas) {
        state.paginaAtual = numeroPagina;
        exibirLivros();
        // Scroll suave otimizado
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function paginaAnterior() {
    if (state.paginaAtual > 1) {
        irParaPagina(state.paginaAtual - 1);
    }
}

function proximaPagina() {
    const totalPaginas = Math.ceil(state.livrosFiltrados.length / CONFIG.LIVROS_POR_PAGINA);
    if (state.paginaAtual < totalPaginas) {
        irParaPagina(state.paginaAtual + 1);
    }
}

function pularParaPagina() {
    const input = document.getElementById('pular-para-pagina');
    const pagina = parseInt(input.value);
    if (!isNaN(pagina)) {
        irParaPagina(pagina);
    }
}

function atualizarControlesPaginacao() {
    const controlesPaginacao = document.getElementById('controles-paginacao');
    const totalPaginas = Math.ceil(state.livrosFiltrados.length / CONFIG.LIVROS_POR_PAGINA);
    
    if (state.livrosFiltrados.length <= CONFIG.LIVROS_POR_PAGINA) {
        controlesPaginacao.style.display = 'none';
        return;
    }
    
    controlesPaginacao.style.display = 'flex';
    
    // Atualizar números de página
    const paginacaoNumeros = document.getElementById('paginacao-numeros');
    const fragment = document.createDocumentFragment();
    
    // Calcular intervalo de páginas
    let inicioPagina = Math.max(1, state.paginaAtual - 2);
    let fimPagina = Math.min(totalPaginas, inicioPagina + 4);
    
    if (fimPagina - inicioPagina < 4) {
        inicioPagina = Math.max(1, fimPagina - 4);
    }
    
    // Primeira página
    if (inicioPagina > 1) {
        const btn = criarBotaoPagina(1);
        fragment.appendChild(btn);
        
        if (inicioPagina > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '6px';
            fragment.appendChild(ellipsis);
        }
    }
    
    // Páginas numeradas
    for (let i = inicioPagina; i <= fimPagina; i++) {
        const btn = criarBotaoPagina(i, i === state.paginaAtual);
        fragment.appendChild(btn);
    }
    
    // Última página
    if (fimPagina < totalPaginas) {
        if (fimPagina < totalPaginas - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '6px';
            fragment.appendChild(ellipsis);
        }
        
        const btn = criarBotaoPagina(totalPaginas);
        fragment.appendChild(btn);
    }
    
    paginacaoNumeros.innerHTML = '';
    paginacaoNumeros.appendChild(fragment);
    
    // Habilitar/desabilitar botões
    document.getElementById('pagina-anterior').disabled = (state.paginaAtual === 1);
    document.getElementById('proxima-pagina').disabled = (state.paginaAtual === totalPaginas);
    
    // Atualizar campo de pular
    document.getElementById('pular-para-pagina').value = state.paginaAtual;
    document.getElementById('pular-para-pagina').max = totalPaginas;
}

function criarBotaoPagina(numero, ativa = false) {
    const btn = document.createElement('button');
    btn.className = 'btn-pagina' + (ativa ? ' ativa' : '');
    btn.textContent = numero;
    return btn;
}

// ========================================
// COMPARTILHAMENTO
// ========================================

function handleLivrosClick(e) {
    const compartilharBtn = e.target.closest('.icone-compartilhar');
    if (compartilharBtn) {
        e.preventDefault();
        const { titulo, autor, link, capa } = compartilharBtn.dataset;
        compartilharLivro(titulo, autor, link, capa);
    }
}

function handleModalClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    
    const acoes = {
        'whatsapp': compartilharWhatsApp,
        'copiar': copiarLink,
        'email': compartilharEmail,
        'fechar': fecharModal
    };
    
    acoes[action]?.();
}

function compartilharLivro(titulo, autor, link, capa) {
    state.livroParaCompartilhar = { titulo, autor, link, capa };
    
    document.getElementById('modalTituloLivro').textContent = titulo;
    document.getElementById('modalAutorLivro').textContent = autor;
    document.getElementById('modalCapaPreview').src = capa;
    
    document.getElementById('modalCompartilhar').classList.add('ativo');
}

function fecharModal() {
    document.getElementById('modalCompartilhar').classList.remove('ativo');
}

function compartilharWhatsApp() {
    const { titulo, autor, link } = state.livroParaCompartilhar;
    const texto = `📚 *${titulo}*\n✍️ _${autor}_\n\n🔗 ${link}\n\n📖 Acesse o link para ler o livro completo!`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
    fecharModal();
}

function copiarLink() {
    const { titulo, autor, link } = state.livroParaCompartilhar;
    const texto = `📖 ${titulo}\n👤 ${autor}\n🔗 ${link}\n\n💡 Livro disponível na Biblioteca Digital Cid Rosado`;

    navigator.clipboard.writeText(texto)
        .then(() => {
            alert('✅ Link e informações copiados para a área de transferência!');
            fecharModal();
        })
        .catch(() => {
            // Fallback
            navigator.clipboard.writeText(link)
                .then(() => alert('Link copiado!'))
                .catch(() => alert('Não foi possível copiar o link.'));
        });
}

function compartilharEmail() {
    const { titulo, autor, link } = state.livroParaCompartilhar;
    const assunto = `📚 Recomendação de livro: ${titulo}`;
    const corpo = `Olá!\n\nRecomendo que você confira este livro incrível:\n\n📖 TÍTULO: ${titulo}\n✍️ AUTOR: ${autor}\n\n🔗 ACESSE AQUI: ${link}\n\nAtenciosamente,\nBiblioteca Digital Cid Rosado`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    fecharModal();
}

// ========================================
// UTILITÁRIOS
// ========================================

function preencherDropdownCategorias() {
    const select = document.getElementById('filtro-categoria');
    const fragment = document.createDocumentFragment();
    
    const optionTodas = document.createElement('option');
    optionTodas.value = '';
    optionTodas.textContent = 'Todas as categorias';
    fragment.appendChild(optionTodas);
    
    Array.from(state.categoriasUnicas).sort().forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        fragment.appendChild(option);
    });
    
    select.innerHTML = '';
    select.appendChild(fragment);
}

function atualizarEstatisticas() {
    document.getElementById('total-livros').textContent = state.todosLivros.length;
    document.getElementById('livros-visiveis').textContent = state.livrosFiltrados.length;
    document.getElementById('total-categorias').textContent = state.categoriasUnicas.size;
}

function mostrarErro(error) {
    document.getElementById('livros-container').innerHTML = `
        <div class="sem-resultados">
            <h3>Erro ao carregar os dados</h3>
            <p>${error.message || error}</p>
            <p>Verifique se a planilha está pública</p>
            <button onclick="carregarLivrosDaPlanilha()" 
                    style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cor-primaria); color: white; border: none; border-radius: 4px; cursor: pointer;">
                Tentar Novamente
            </button>
        </div>
    `;
}

function mostrarLoadingBusca() {
    const buscaInput = document.getElementById('busca');
    buscaInput.classList.add('buscando');
}

function esconderLoadingBusca() {
    const buscaInput = document.getElementById('busca');
    buscaInput.classList.remove('buscando');
}

function verificarParametrosUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const livroParam = urlParams.get('livro');
    
    if (livroParam) {
        const card = document.querySelector(`[data-livro="${livroParam}"]`);
        if (card) {
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.boxShadow = '0 0 0 3px var(--cor-primaria)';
                setTimeout(() => {
                    card.style.boxShadow = '';
                }, 3000);
            }, 500);
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exportar função para botão de recarregar
window.carregarLivrosDaPlanilha = carregarLivrosDaPlanilha;
