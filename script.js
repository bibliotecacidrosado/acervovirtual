// Variáveis globais
let todosLivros = [];
let livrosFiltrados = [];
let categoriasUnicas = new Set();
let paginaAtual = 1;
const livrosPorPagina = 10;

// Carregar dados quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    carregarLivrosDaPlanilha();
});

// Função para carregar dados do arquivo dados.json no GitHub
async function carregarLivrosDaPlanilha() {
    try {
        // URL do arquivo dados.json no GitHub (substitua pelo seu caminho real)
        const url = 'https://raw.githubusercontent.com/bibliotecacidrosado/acervovirtual/refs/heads/main/dados.json';
        
        // Adicionar timestamp para evitar cache
        const response = await fetch(url + '?t=' + new Date().getTime());
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do arquivo JSON');
        }
        
        const livros = await response.json();
        processarLivros(livros);
        
    } catch (error) {
        console.error('Erro detalhado:', error);
        mostrarErro(error);
        
        // Tentar carregar dados de fallback se disponível
        setTimeout(() => {
            console.log('Tentando carregar dados de fallback...');
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
        console.error('Também falhou ao carregar fallback:', error);
    }
}
                   
// Processar livros recebidos
function processarLivros(livros) {
    console.log('Livros recebidos:', livros); // Debug
    
    if (!Array.isArray(livros)) {
        throw new Error('Dados não são um array');
    }
    
    todosLivros = livros;
    livrosFiltrados = [...livros];
    
    // Coletar categorias únicas
    categoriasUnicas.clear();
    livros.forEach(livro => {
        if (livro.categoria) {
            categoriasUnicas.add(livro.categoria);
        }
    });
    
    // Atualizar estatísticas
    atualizarEstatisticas();
    
    // Preencher dropdown de categorias
    preencherDropdownCategorias();
    
    // Exibir livros
    exibirLivros();
    
    // Verificar parâmetros na URL após carregar os livros
    verificarParametrosUrl();
}

// Mostrar erro
function mostrarErro(error) {
    console.error('Erro:', error);
    document.getElementById('livros-container').innerHTML = `
        <div class="sem-resultados">
            <h3>Erro ao carregar os dados</h3>
            <p>${error.message || error}</p>
            <p>Verifique se a planilha está pública</p>
            <button onclick="carregarLivrosDaPlanilha()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--cor-primaria); color: white; border: none; border-radius: 4px; cursor: pointer;">Tentar Novamente</button>
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

// Exibir livros na tela com paginação
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
    
    container.innerHTML = '';
    
    livrosPagina.forEach((livro, index) => {
        const card = document.createElement('div');
        card.className = 'card-livro';
        card.setAttribute('data-livro', livro.titulo.toLowerCase().replace(/\s+/g, '-'));
        
        card.innerHTML = `
            <img src="${livro.capa}" alt="Capa do livro ${livro.titulo}" class="card-capa"
                onerror="this.src='https://via.placeholder.com/200x300?text=Imagem+Não+Encontrada'">
            
            <div class="card-corpo">
                <h3 class="card-titulo">${livro.titulo}</h3>
                <p class="card-autor">${livro.autor}</p>
                ${livro.categoria ? `<span class="card-categoria">${livro.categoria}</span>` : ''}
                <a href="${livro.link}" target="_blank" class="card-botao">📖 Ler Livro</a>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Atualizar controles de paginação
    atualizarControlesPaginacao();
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
    document.getElementById('pagina-atual').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    
    // Habilitar/desabilitar botões
    document.getElementById('pagina-anterior').disabled = (paginaAtual === 1);
    document.getElementById('proxima-pagina').disabled = (paginaAtual === totalPaginas);
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

// Função para ordenar os livros conforme a seleção
function ordenarLivros(livros, tipoOrdenacao) {
    // Criar uma cópia para não modificar o array original
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
                // Primeiro ordena por categoria, depois por título
                const catCompare = (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR');
                return catCompare !== 0 ? catCompare : 
                    a.titulo.localeCompare(b.titulo, 'pt-BR');
            });
            
        case 'aleatoria':
        default:
            return aleatorizarArray(livrosOrdenados);
    }
}

// Função para aleatorizar (já existente, mas atualizada)
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

function filtrarLivros() {
    const termoBusca = document.getElementById('busca').value.toLowerCase();
    const categoriaSelecionada = document.getElementById('filtro-categoria').value;
    const ordenacaoSelecionada = document.getElementById('ordenacao').value;
    
    // Resetar para a primeira página ao filtrar
    paginaAtual = 1;
    
    livrosFiltrados = todosLivros.filter(livro => {
        const correspondeBusca = !termoBusca || 
            livro.titulo.toLowerCase().includes(termoBusca) || 
            livro.autor.toLowerCase().includes(termoBusca);
        
        const correspondeCategoria = !categoriaSelecionada || 
            livro.categoria === categoriaSelecionada;
        
        return correspondeBusca && correspondeCategoria;
    });
    
    // Aplicar ordenação
    livrosFiltrados = ordenarLivros(livrosFiltrados, ordenacaoSelecionada);
    
    // Atualizar estatísticas
    atualizarEstatisticas();
    
    // Exibir livros filtrados
    exibirLivros();
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
            <p>Atualizando dados...</p>
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
