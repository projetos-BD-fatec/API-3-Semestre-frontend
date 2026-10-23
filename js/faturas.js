document.addEventListener("DOMContentLoaded", () => {
    const botoesFiltro = document.querySelectorAll('.btn-filtro');

    // Dados falsos (Mock) provisórios até o back-end (Task 1) estar pronto
    const faturasMock = [
        { id: 1, descricao: 'Consulta Médica - Clínico Geral', valor: 'R$ 45,00', status: 'pendentes' },
        { id: 2, descricao: 'Exame de Sangue', valor: 'R$ 12,50', status: 'pendentes' },
        { id: 3, descricao: 'Raio-X Tórax', valor: 'R$ 25,00', status: 'utilizadas' }
    ];

    const containerLista = document.getElementById('listaFaturas');

    // Função que desenha as faturas na tela com base no filtro
    function renderizarFaturas(statusFiltro) {
        containerLista.innerHTML = '';
        const filtradas = faturasMock.filter(f => f.status === statusFiltro);

        if (filtradas.length === 0) {
            containerLista.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Nenhuma fatura encontrada.</p>';
            return;
        }

        filtradas.forEach(fatura => {
            const div = document.createElement('div');
            div.className = 'item-fatura';
            div.innerHTML = `
                <div>
                    <strong style="color: #1a1a1a;">${fatura.descricao}</strong>
                    <br><small style="color: #666;">Cod: #000${fatura.id}</small>
                </div>
                <div style="font-weight: bold; color: #105a45;">
                    ${fatura.valor}
                </div>
            `;
            containerLista.appendChild(div);
        });
    }

    // Lógica de clique nos botões
    botoesFiltro.forEach(botao => {
        botao.addEventListener('click', (e) => {
            // Remove a cor verde de todos os botões
            botoesFiltro.forEach(b => b.classList.remove('ativo'));
            // Adiciona a cor verde apenas ao botão clicado
            e.target.classList.add('ativo');

            // Puxa o valor do data-status ("pendentes" ou "utilizadas") e filtra a lista
            const statusSelecionado = e.target.getAttribute('data-status');
            renderizarFaturas(statusSelecionado);
        });
    });

    // Ao abrir a página, mostra as pendentes por defeito
    renderizarFaturas('pendentes');
});