let todos=[], filtrados=[], categorias=new Set(), pagina=1, livrosPorPagina=10;

document.addEventListener('DOMContentLoaded',()=>carregarLivros());

async function carregarLivros(){
    try{
        const res=await fetch('https://raw.githubusercontent.com/bibliotecacidrosado/acervovirtual/refs/heads/main/dados.json?t='+Date.now());
        if(!res.ok)throw new Error('Falha ao carregar dados');
        processarLivros(await res.json());
    }catch(e){
        console.error(e); mostrarErro(e);
        setTimeout(()=>fetch('dados.json').then(r=>r.json()).then(processarLivros).catch(console.error),2000);
    }
}

function processarLivros(livros){
    if(!Array.isArray(livros))throw new Error('Dados inválidos');
    todos=livros; filtrados=[...livros]; categorias.clear();
    livros.forEach(l=>l.categoria&&categorias.add(l.categoria));
    atualizarEstatisticas(); preencherDropdown(); exibirLivros(); verificarUrl();
}

function mostrarErro(e){
    document.getElementById('livros-container').innerHTML=`
    <div class="sem-resultados">
        <h3>Erro ao carregar os dados</h3>
        <p>${e.message||e}</p>
        <p>Verifique se a planilha está pública</p>
        <button onclick="carregarLivros()" style="margin-top:1rem;padding:.5rem 1.5rem;background:var(--primaria);color:#fff;border:none;border-radius:4px;cursor:pointer;">Tentar Novamente</button>
    </div>`;
}

function preencherDropdown(){
    const select=document.getElementById('filtro-categoria');
    select.innerHTML='<option value="">Todas as categorias</option>';
    Array.from(categorias).sort().forEach(c=>select.appendChild(Object.assign(document.createElement('option'),{value:c,textContent:c})));
}

function exibirLivros(){
    const container=document.getElementById('livros-container'), cp=document.getElementById('controles-paginacao');
    if(filtrados.length===0){container.innerHTML=`<div class="sem-resultados"><h3>Nenhum livro encontrado</h3><p>Tente ajustar os filtros.</p></div>`; cp.style.display='none'; return;}
    const ini=(pagina-1)*livrosPorPagina, fim=ini+livrosPorPagina;
    container.innerHTML='';
    filtrados.slice(ini,fim).forEach(l=>{
        const card=document.createElement('div'); card.className='card-livro';
        card.setAttribute('data-livro',l.titulo.toLowerCase().replace(/\s+/g,'-'));
        card.innerHTML=`<img src="${l.capa}" alt="Capa ${l.titulo}" class="card-capa" onerror="this.src='https://via.placeholder.com/200x300?text=Imagem+Não+Encontrada'">
            <div class="card-corpo">
                <h3 class="card-titulo">${l.titulo}</h3>
                <p class="card-autor">${l.autor}</p>
                ${l.categoria?`<span class="card-categoria">${l.categoria}</span>`:''}
                <a href="${l.link}" target="_blank" class="card-botao">📖 Ler Livro</a>
            </div>`;
        container.appendChild(card);
    });
    atualizarPaginacao();
}

function atualizarPaginacao(){
    const cp=document.getElementById('controles-paginacao'), total=Math.ceil(filtrados.length/livrosPorPagina);
    if(filtrados.length<=livrosPorPagina){cp.style.display='none'; return;}
    cp.style.display='flex';
    document.getElementById('pagina-atual').textContent=`Página ${pagina} de ${total}`;
    document.getElementById('pagina-anterior').disabled=(pagina===1);
    document.getElementById('proxima-pagina').disabled=(pagina===total);
}

function paginaAnterior(){if(pagina>1){pagina--; exibirLivros(); window.scrollTo({top:0,behavior:'smooth'});}}
function proximaPagina(){const total=Math.ceil(filtrados.length/livrosPorPagina); if(pagina<total){pagina++; exibirLivros(); window.scrollTo({top:0,behavior:'smooth'});}}

function ordenarLivros(arr,tipo){
    const a=[...arr];
    switch(tipo){
        case'titulo-az': return a.sort((x,y)=>x.titulo.localeCompare(y.titulo,'pt-BR',{sensitivity:'base'}));
        case'titulo-za': return a.sort((x,y)=>y.titulo.localeCompare(x.titulo,'pt-BR',{sensitivity:'base'}));
        case'autor-az': return a.sort((x,y)=>x.autor.localeCompare(y.autor,'pt-BR',{sensitivity:'base'}));
        case'categoria': return a.sort((x,y)=>{const c=(x.categoria||'').localeCompare(y.categoria||'','pt-BR'); return c!==0?c:x.titulo.localeCompare(y.titulo,'pt-BR')});
        default: return a.sort(()=>Math.random()-0.5);
    }
}

function filtrarLivros(){
    const termo=document.getElementById('busca').value.toLowerCase(),
          cat=document.getElementById('filtro-categoria').value,
          ord=document.getElementById('ordenacao').value;
    pagina=1;
    filtrados=todos.filter(l=>(!termo||l.titulo.toLowerCase().includes(termo)||l.autor.toLowerCase().includes(termo))&&(!cat||l.categoria===cat));
    filtrados=ordenarLivros(filtrados,ord);
    atualizarEstatisticas(); exibirLivros();
}

function atualizarEstatisticas(){
    document.getElementById('total-livros').textContent=todos.length;
    document.getElementById('livros-visiveis').textContent=filtrados.length;
    document.getElementById('total-categorias').textContent=categorias.size;
}

function verificarUrl(){
    const p=new URLSearchParams(window.location.search).get('livro');
    if(p){
        const card=document.querySelector(`[data-livro="${p}"]`);
        if(card)setTimeout(()=>{card.scrollIntoView({behavior:'smooth',block:'center'});card.style.boxShadow='0 0 0 3px var(--primaria)'; setTimeout(()=>card.style.boxShadow='',3000);},1000);
    }
}
