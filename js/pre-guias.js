/* =====================================================
   Página: Minhas solicitações
   Depende de: api.js, formatters.js, request-card.js, ficha-pre-guia.js
===================================================== */

const requestList = document.getElementById("request-list");
const emptyState = document.getElementById("empty-state");


async function loadRequests() {
    try {
        const resultados = await Promise.all([
            listarMinhasPreGuias(),
            buscarBeneficiario()
        ]);

        const requests = resultados[0];
        const beneficiario = resultados[1];

        renderRequests(ordenarPorMaisRecente(requests), beneficiario);

    } catch (error) {
        console.error("Erro ao carregar solicitações:", error);

        requestList.innerHTML = `
            <p class="form-error">
                Não foi possível carregar suas solicitações. Tente novamente mais tarde.
            </p>
        `;
    }
}


function renderRequests(requests, beneficiario) {
    requestList.innerHTML = "";

    if (requests.length === 0) {
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";

    requests.forEach(function (request) {
        const card = criarCardPreGuia(request, {
            aoAbrir: function () {
                FichaPreGuia.abrir(
                    fichaDePreGuiaApi(request, beneficiario),
                    { modo: "visualizar" }
                );
            }
        });

        requestList.appendChild(card);
    });
}


document.addEventListener("DOMContentLoaded", function () {
    loadRequests();
});
