// Variáveis globais
let todosLivros = [];
let livrosFiltrados = [];
let categoriasUnicas = new Set();
let paginaAtual = 1;
const livrosPorPagina = 10;
let livroParaCompartilhar = null;

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
    console.log('Livros recebidos:', livros);
    
    if (!Array.isArray(livros)) {
        throw new Error('Dados não são um array');
    }
    
    // Adicionar um índice baseado na ordem de entrada (últimos adicionados ficam no final do array)
    todosLivros = livros.map((livro, index) => {
        return {
            ...livro,
            indice_entrada: index // Quanto maior o índice, mais recente
        };
    });
    
    // Ordenar por índice de entrada (mais recentes primeiro)
    livrosFiltrados = ordenarLivros(todosLivros, 'recentes');
    
    // Definir a opção selecionada no dropdown como "Mais Recentes"
    document.getElementById('ordenacao').value = 'recentes';
    
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
            <div class="capa-container">
                <img src="${livro.capa}" alt="Capa do livro ${livro.titulo}" class="card-capa"
                     onerror="this.src='https://via.placeholder.com/200x300?text=Imagem+Não+Encontrada'">
                <button class="icone-compartilhar" onclick="compartilharLivro('${livro.titulo.replace(/'/g, "\\'")}', '${livro.autor.replace(/'/g, "\\'")}', '${livro.link}')">↗</button>
            </div>
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
        paginacaoNumeros.appendChild(btn);
    }
    
    // Habilitar/desabilitar botões de navegação
    document.getElementById('pagina-anterior').disabled = (paginaAtual === 1);
    document.getElementById('proxima-pagina').disabled = (paginaAtual === totalPaginas);
    
    // Atualizar campo de pular para página
    document.getElementById('pular-para-pagina').value = paginaAtual;
    document.getElementById('pular-para-pagina').max = totalPaginas;
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

// Função para aleatorizar
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

// FUNÇÕES DE COMPARTILHAMENTO

// Função para abrir o modal de compartilhamento
function compartilharLivro(titulo, autor, link) {
    livroParaCompartilhar = { titulo, autor, link };
    document.getElementById('modalTituloLivro').textContent = titulo;
    document.getElementById('modalCompartilhar').classList.add('ativo');
}

// Função para fechar o modal
function fecharModal() {
    document.getElementById('modalCompartilhar').classList.remove('ativo');
}

// Compartilhar via WhatsApp
function compartilharWhatsApp() {
    const texto = `Confira o livro "${livroParaCompartilhar.titulo}" de ${livroParaCompartilhar.autor} na Biblioteca Virtual: ${livroParaCompartilhar.link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
    fecharModal();
}

// Copiar link para a área de transferência
function copiarLink() {
    navigator.clipboard.writeText(livroParaCompartilhar.link)
        .then(() => {
            alert('Link copiado para a área de transferência!');
            fecharModal();
        })
        .catch(err => {
            console.error('Erro ao copiar link: ', err);
            alert('Não foi possível copiar o link. Tente novamente.');
        });
}

// Compartilhar via email
function compartilharEmail() {
    const assunto = `Recomendação de livro: ${livroParaCompartilhar.titulo}`;
    const corpo = `Olá,\n\nRecomendo que você confira o livro "${livroParaCompartilhar.titulo}" de ${livroParaCompartilhar.autor}.\n\nAcesse em: ${livroParaCompartilhar.link}`;
    const url = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = url;
    fecharModal();
}

// Fechar modal ao clicar fora dele
document.addEventListener('click', function(event) {
    const modal = document.getElementById('modalCompartilhar');
    if (event.target === modal) {
        fecharModal();
    }
});
