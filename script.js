// Aplicação principal
const LivrosApp = {
    // Configurações
    livrosPorPagina: 10,
    paginaAtual: 1,
    timeoutBusca: null,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
    
    // Dados
    todosLivros: [],
    livrosFiltrados: [],
    categoriasUnicas: new Set(),
    visualizacao: 'grid',
    
    // Inicialização
    init() {
        this.configurarEventListeners();
        this.carregarPreferencias();
        this.carregarLivrosDaPlanilha();
    },
    
    configurarEventListeners() {
        document.getElementById('busca').addEventListener('input', () => this.filtrarLivrosComDebounce());
        document.getElementById('filtro-categoria').addEventListener('change', () => this.filtrarLivros());
        document.getElementById('ordenacao').addEventListener('change', () => this.filtrarLivros());
        document.getElementById('itens-por-pagina').addEventListener('change', (e) => this.alterarItensPorPagina(e));
        document.getElementById('pagina-anterior').addEventListener('click', () => this.paginaAnterior());
        document.getElementById('proxima-pagina').addEventListener('click', () => this.proximaPagina());
        
        // Botão de favoritos (se implementado posteriormente)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-favorito')) {
                this.toggleFavorito(e.target.dataset.id);
            }
        });
    },
    
    carregarPreferencias() {
        // Carregar preferências do usuário
        const itensPorPagina = localStorage.getItem('itensPorPagina');
        if (itensPorPagina) {
            this.livrosPorPagina = parseInt(itensPorPagina);
            document.getElementById('itens-por-pagina').value = itensPorPagina;
        }
        
        const visualizacao = localStorage.getItem('visualizacaoLivros');
        if (visualizacao) {
            this.visualizacao = visualizacao;
            document.getElementById('livros-container').className = `${visualizacao}-livros`;
        }
    },
    
    async carregarLivrosDaPlanilha() {
        const cacheKey = 'livrosCache';
        const cacheTimestampKey = 'livrosCacheTimestamp';
        
        // Verificar cache
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        
        if (cachedData && cachedTimestamp && (Date.now() - cachedTimestamp < this.CACHE_DURATION)) {
            this.processarLivros(JSON.parse(cachedData));
            return;
        }
        
        try {
            // URL do arquivo dados.json no GitHub
            const url = 'https://raw.githubusercontent.com/bibliotecacidrosado/acervovirtual/main/dados.json';
            
            // Usar cache busting
            const response = await fetch(url + '?v=' + new Date().getTime());
            
            if (!response.ok) {
                throw new Error('Erro ao carregar dados: ' + response.status);
            }
            
            const livros = await response.json();
            
            // Verificar se a estrutura é válida
            if (!Array.isArray(livros)) {
                throw new Error('Formato de dados inválido');
            }
            
            // Salvar no cache
            localStorage.setItem(cacheKey, JSON.stringify(livros));
            localStorage.setItem(cacheTimestampKey, Date.now());
            
            this.processarLivros(livros);
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.mostrarErro(error);
            
            // Tentar usar cache mesmo expirado em caso de erro
            if (cachedData) {
                this.processarLivros(JSON.parse(cachedData));
            } else {
                // Tentar carregar fallback após 2 segundos
                setTimeout(() => {
                    this.carregarDadosFallback();
                }, 2000);
            }
        }
    },
    
    async carregarDadosFallback() {
        try {
            console.log('Tentando carregar fallback...');
            const response = await fetch('./dados.json?v=' + new Date().getTime());
            if (response.ok) {
                const livros = await response.json();
                this.processarLivros(livros);
            } else {
                throw new Error('Fallback também falhou');
            }
        } catch (error) {
            console.error('Erro no fallback:', error);
            this.mostrarErro({message: 'Não foi possível carregar os dados. Verifique sua conexão.'});
        }
    },
    
    processarLivros(livros) {
        if (!Array.isArray(livros)) {
            this.mostrarErro({message: 'Dados recebidos não são válidos'});
            return;
        }
        
        this.todosLivros = livros;
        this.livrosFiltrados = [...livros];
        
        // Coletar categorias únicas
        this.categoriasUnicas.clear();
        livros.forEach(livro => {
            if (livro.categoria && livro.categoria.trim() !== '') {
                this.categoriasUnicas.add(livro.categoria);
            }
        });
        
        // Atualizar estatísticas
        this.atualizarEstatisticas();
        
        // Preencher dropdown de categorias
        this.preencherDropdownCategorias();
        
        // Exibir livros
        this.exibirLivros();
        
        // Verificar parâmetros na URL
        this.verificarParametrosUrl();
    },
    
    mostrarErro(error) {
        const container = document.getElementById('livros-container');
        container.innerHTML = `
            <div class="sem-resultados">
                <h3>Erro ao carregar os dados</h3>
                <p>${error.message || 'Erro desconhecido'}</p>
                <p>Verifique se o arquivo dados.json existe no repositório</p>
                <button onclick="LivrosApp.forcarAtualizacao()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cor-primaria); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    },
    
    preencherDropdownCategorias() {
        const select = document.getElementById('filtro-categoria');
        select.innerHTML = '<option value="">Todas as categorias</option>';
        
        // Ordenar categorias alfabeticamente
        const categoriasOrdenadas = Array.from(this.categoriasUnicas).sort();
        
        categoriasOrdenadas.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            select.appendChild(option);
        });
    },
    
    exibirLivros() {
        const container = document.getElementById('livros-container');
        const controlesPaginacao = document.getElementById('controles-paginacao');
        
        if (this.livrosFiltrados.length === 0) {
            const termoBusca = document.getElementById('busca').value;
            const categoria = document.getElementById('filtro-categoria').value;
            
            let mensagem = 'Nenhum livro encontrado';
            if (termoBusca || categoria) {
                mensagem = `Nenhum livro encontrado para "${termoBusca}"${categoria ? ` na categoria ${categoria}` : ''}`;
            }
            
            container.innerHTML = `
                <div class="sem-resultados">
                    <h3>${mensagem}</h3>
                    <p>Tente ajustar os filtros de busca.</p>
                    ${termoBusca || categoria ? 
                      '<button onclick="LivrosApp.limparFiltros()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cor-primaria); color: white; border: none; border-radius: 4px; cursor: pointer;">Limpar Filtros</button>' 
                      : ''}
                </div>
            `;
            controlesPaginacao.style.display = 'none';
            return;
        }
        
        // Calcular índices para a página atual
        const indiceInicio = (this.paginaAtual - 1) * this.livrosPorPagina;
        const indiceFim = indiceInicio + this.livrosPorPagina;
        const livrosPagina = this.livrosFiltrados.slice(indiceInicio, indiceFim);
        
        container.innerHTML = '';
        
        livrosPagina.forEach((livro, index) => {
            const card = document.createElement('div');
            card.className = 'card-livro';
            card.setAttribute('data-livro', livro.titulo.toLowerCase().replace(/\s+/g, '-'));
            
            // Verificar se é favorito (se implementado)
            const isFavorito = FavoritosManager.isFavorito(livro.id || livro.titulo);
            
            card.innerHTML = `
                <img src="${livro.capa}" alt="Capa do livro ${livro.titulo}" class="card-capa"
                     onerror="this.src='https://via.placeholder.com/200x300?text=Imagem+Não+Encontrada'">
                <div class="card-corpo">
                    <h3 class="card-titulo">${livro.titulo}</h3>
                    <p class="card-autor">${livro.autor}</p>
                    ${livro.categoria ? `<span class="card-categoria">${livro.categoria}</span>` : ''}
                    <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                        <a href="${livro.link}" target="_blank" class="card-botao">📖 Ler Livro</a>
                        ${livro.id || livro.titulo ? 
                          `<button class="card-botao btn-favorito" data-id="${livro.id || livro.titulo}" style="padding: 0.8rem;">
                            ${isFavorito ? '★ Remover' : '☆ Favoritar'}
                          </button>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
        // Atualizar controles de paginação
        this.atualizarControlesPaginacao();
    },
    
    atualizarControlesPaginacao() {
        const controlesPaginacao = document.getElementById('controles-paginacao');
        const totalPaginas = Math.ceil(this.livrosFiltrados.length / this.livrosPorPagina);
        
        if (this.livrosFiltrados.length <= this.livrosPorPagina) {
            controlesPaginacao.style.display = 'none';
            return;
        }
        
        controlesPaginacao.style.display = 'flex';
        document.getElementById('pagina-atual').textContent = `Página ${this.paginaAtual} de ${totalPaginas}`;
        
        // Habilitar/desabilitar botões
        document.getElementById('pagina-anterior').disabled = (this.paginaAtual === 1);
        document.getElementById('proxima-pagina').disabled = (this.paginaAtual === totalPaginas);
    },
    
    paginaAnterior() {
        if (this.paginaAtual > 1) {
            this.paginaAtual--;
            this.exibirLivros();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },
    
    proximaPagina() {
        const totalPaginas = Math.ceil(this.livrosFiltrados.length / this.livrosPorPagina);
        if (this.paginaAtual < totalPaginas) {
            this.paginaAtual++;
            this.exibirLivros();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },
    
    alterarItensPorPagina(e) {
        this.livrosPorPagina = parseInt(e.target.value);
        this.paginaAtual = 1;
        localStorage.setItem('itensPorPagina', this.livrosPorPagina);
        this.exibirLivros();
    },
    
    filtrarLivrosComDebounce() {
        clearTimeout(this.timeoutBusca);
        this.timeoutBusca = setTimeout(() => this.filtrarLivros(), 300);
    },
    
    filtrarLivros() {
        const termoBusca = document.getElementById('busca').value.toLowerCase();
        const categoriaSelecionada = document.getElementById('filtro-categoria').value;
        const ordenacaoSelecionada = document.getElementById('ordenacao').value;
        
        // Resetar para a primeira página ao filtrar
        this.paginaAtual = 1;
        
        this.livrosFiltrados = this.todosLivros.filter(livro => {
            const correspondeBusca = !termoBusca || 
                (livro.titulo && livro.titulo.toLowerCase().includes(termoBusca)) || 
                (livro.autor && livro.autor.toLowerCase().includes(termoBusca));
            
            const correspondeCategoria = !categoriaSelecionada || 
                livro.categoria === categoriaSelecionada;
            
            return correspondeBusca && correspondeCategoria;
        });
        
        // Aplicar ordenação
        this.livrosFiltrados = this.ordenarLivros(this.livrosFiltrados, ordenacaoSelecionada);
        
        // Atualizar estatísticas
        this.atualizarEstatisticas();
        
        // Exibir livros filtrados
        this.exibirLivros();
    },
    
    ordenarLivros(livros, tipoOrdenacao) {
        const livrosOrdenados = [...livros];
        
        switch(tipoOrdenacao) {
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
                return this.aleatorizarArray(livrosOrdenados);
        }
    },
    
    aleatorizarArray(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        
        return array;
    },
    
    atualizarEstatisticas() {
        document.getElementById('total-livros').textContent = this.todosLivros.length;
        document.getElementById('livros-visiveis').textContent = this.livrosFiltrados.length;
        document.getElementById('total-categorias').textContent = this.categoriasUnicas.size;
    },
    
    verificarParametrosUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const livroParam = urlParams.get('livro');
        
        if (livroParam) {
            const livroEncontrado = this.todosLivros.find(livro => 
                livro.titulo && livro.titulo.toLowerCase().replace(/\s+/g, '-') === livroParam
            );
            
            if (livroEncontrado) {
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
    },
    
    limparFiltros() {
        document.getElementById('busca').value = '';
        document.getElementById('filtro-categoria').value = '';
        this.filtrarLivros();
    },
    
    forcarAtualizacao() {
        // Limpar cache e recarregar
        localStorage.removeItem('livrosCache');
        localStorage.removeItem('livrosCacheTimestamp');
        
        document.getElementById('livros-container').innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Atualizando dados...</p>
            </div>
        `;
        
        this.carregarLivrosDaPlanilha();
    },
    
    toggleVisualizacao() {
        this.visualizacao = this.visualizacao === 'grid' ? 'lista' : 'grid';
        document.getElementById('livros-container').className = `${this.visualizacao}-livros`;
        localStorage.setItem('visualizacaoLivros', this.visualizacao);
        
        const btn = document.getElementById('btn-visualizacao');
        btn.textContent = this.visualizacao === 'grid' ? '⛶ Visualização em Lista' : '⛶ Visualização em Grid';
    },
    
    toggleFavorito(livroId) {
        if (FavoritosManager.isFavorito(livroId)) {
            FavoritosManager.removerFavorito(livroId);
        } else {
            FavoritosManager.adicionarFavorito(livroId);
        }
        
        // Atualizar exibição
        this.exibirLivros();
    }
};

// Gerenciador de favoritos
const FavoritosManager = {
    chave: 'livrosFavoritos',
    
    obterFavoritos() {
        return JSON.parse(localStorage.getItem(this.chave)) || [];
    },
    
    adicionarFavorito(livroId) {
        const favoritos = this.obterFavoritos();
        if (!favoritos.includes(livroId)) {
            favoritos.push(livroId);
            localStorage.setItem(this.chave, JSON.stringify(favoritos));
        }
    },
    
    removerFavorito(livroId) {
        const favoritos = this.obterFavoritos().filter(id => id !== livroId);
        localStorage.setItem(this.chave, JSON.stringify(favoritos));
    },
    
    isFavorito(livroId) {
        return this.obterFavoritos().includes(livroId);
    }
};

// Utilitário para tratamento de erros
function handleError(error, context) {
    console.error(`Erro em ${context}:`, error);
    return error;
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => LivrosApp.init());
