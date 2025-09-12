:root {
    --cor-primaria: #FF6D00;
    --cor-secundaria: #FF9100;
    --cor-terciaria: #FFAB40;
    --cor-fundo: #FFF3E0;
    --cor-texto: #333;
    --cor-texto-claro: #666;
    --sombra: 0 3px 10px rgba(0,0,0,0.1);
    --transicao: all 0.3s ease;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Roboto', sans-serif;
    background-color: var(--cor-fundo);
    color: var(--cor-texto);
    line-height: 1.6;
    padding: 0;
    margin: 0;
}

.header {
    background: linear-gradient(135deg, var(--cor-primaria), var(--cor-secundaria));
    color: white;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
}

.header h1 {
    font-weight: 500;
    font-size: 2.5rem;
}

.header p {
    font-weight: 300;
    margin-top: 0.5rem;
    opacity: 0.9;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
}

.info-box {
    background-color: #e8f5e9;
    border-left: 4px solid #4caf50;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border-radius: 4px;
}

.info-box h3 {
    color: #2e7d32;
    margin-bottom: 0.5rem;
}

.controles {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 10px;
    box-shadow: var(--sombra);
}

.controles input, .controles select {
    padding: 0.8rem 1.2rem;
    border-radius: 6px;
    border: 1px solid #ddd;
    background-color: white;
    font-family: 'Roboto', sans-serif;
    font-size: 1rem;
    min-width: 200px;
    transition: var(--transicao);
}

.controles input:focus, .controles select:focus {
    outline: none;
    border-color: var(--cor-primaria);
    box-shadow: 0 0 0 2px rgba(255, 109, 0, 0.2);
}

.estatisticas {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.estatistica-item {
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    text-align: center;
    box-shadow: var(--sombra);
    min-width: 150px;
}

.estatistica-valor {
    font-size: 1.8rem;
    font-weight: 500;
    color: var(--cor-primaria);
}

.estatistica-label {
    font-size: 0.9rem;
    color: var(--cor-texto-claro);
}

.grid-livros {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.card-livro {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--sombra);
    transition: var(--transicao);
    height: 100%;
    display: flex;
    flex-direction: column;
}

.card-livro:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.15);
}

.card-capa {
    width: 100%;
    height: 220px;
    object-fit: contain;
    background-color: #f9f9f9;
    padding: 1rem;
}

.card-corpo {
    padding: 1.5rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.card-titulo {
    font-weight: 500;
    margin: 0 0 0.5rem 0;
    color: var(--cor-primaria);
    font-size: 1.2rem;
    line-height: 1.3;
}

.card-autor {
    color: var(--cor-texto-claro);
    font-size: 0.95rem;
    margin: 0 0 1rem 0;
}

.card-categoria {
    display: inline-block;
    background-color: var(--cor-terciaria);
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 15px;
    font-size: 0.8rem;
    margin-bottom: 1.2rem;
    align-self: flex-start;
}

.card-botao {
    text-align: center;
    background-color: var(--cor-primaria);
    color: white;
    padding: 0.8rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: var(--transicao);
    margin-top: auto;
}

.card-botao:hover {
    background-color: var(--cor-secundaria);
}

.sem-resultados {
    text-align: center;
    padding: 3rem;
    grid-column: 1 / -1;
    background: white;
    border-radius: 10px;
    box-shadow: var(--sombra);
}

.loading {
    text-align: center;
    padding: 3rem;
    grid-column: 1 / -1;
}

.loading-spinner {
    display: inline-block;
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255, 109, 0, 0.2);
    border-radius: 50%;
    border-top-color: var(--cor-primaria);
    animation: spin 1s ease-in-out infinite;
}

.controles-paginacao {
    display: none;
    justify-content: center;
    align-items: center;
    margin-top: 30px;
    gap: 15px;
    flex-wrap: wrap;
}

.btn-paginacao {
    padding: 8px 16px;
    background-color: var(--cor-primaria);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: var(--transicao);
}

.btn-paginacao:hover:not(:disabled) {
    background-color: var(--cor-secundaria);
}

.btn-paginacao:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

.info-paginacao {
    font-weight: 500;
    margin: 0 10px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.footer {
    text-align: center;
    padding: 2rem;
    margin-top: 3rem;
    color: var(--cor-texto-claro);
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .header h1 {
        font-size: 2rem;
    }
    
    .controles {
        flex-direction: column;
    }
    
    .controles input, .controles select {
        min-width: auto;
        width: 100%;
    }
    
    .grid-livros {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
    
    .controles-paginacao {
        flex-direction: column;
        gap: 10px;
    }
}

@media (max-width: 480px) {
    .grid-livros {
        grid-template-columns: 1fr;
    }
    
    .estatisticas {
        flex-direction: column;
        align-items: center;
    }
    
    .estatistica-item {
        width: 100%;
        max-width: 250px;
    }
}
