/* =====================================================
   Página: início do beneficiário
   Depende de: api.js, formatters.js, request-card.js, ficha-pre-guia.js
===================================================== */

const welcomeTitle = document.getElementById("welcome-title");
const recentSection = document.getElementById("recent");
const recentCard = document.getElementById("recent-card");


async function carregarInicio() {
    const resultados = await Promise.all([
        buscarBeneficiario(),

        // Se a listagem falhar, a home continua funcionando sem o card
        listarMinhasPreGuias().catch(function (error) {
            console.error("Erro ao carregar solicitações:", error);
            return [];
        })
    ]);

    const beneficiario = resultados[0];
    const preGuias = resultados[1];

    mostrarSaudacao(beneficiario);
    mostrarSolicitacaoRecente(preGuias, beneficiario);
}


function mostrarSaudacao(beneficiario) {
    if (!beneficiario.nome) {
        return;
    }

    const primeiroNome = beneficiario.nome.trim().split(/\s+/)[0];

    welcomeTitle.textContent = `Olá, ${primeiroNome}!`;
}


function mostrarSolicitacaoRecente(preGuias, beneficiario) {
    if (preGuias.length === 0) {
        return;
    }

    const maisRecente = ordenarPorMaisRecente(preGuias)[0];

    const card = criarCardPreGuia(maisRecente, {
        limiteItens: 2,
        aoAbrir: function () {
            FichaPreGuia.abrir(
                fichaDePreGuiaApi(maisRecente, beneficiario),
                { modo: "visualizar" }
            );
        }
    });

    recentCard.innerHTML = "";
    recentCard.appendChild(card);

    recentSection.hidden = false;
}


document.addEventListener("DOMContentLoaded", function () {
    carregarInicio();
});
