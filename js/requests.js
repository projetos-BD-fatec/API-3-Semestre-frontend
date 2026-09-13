const API_URL = 'http://localhost:8080/solicitacoes';
const requestList = document.getElementById("request-list");
const emptyState = document.getElementById("empty-state");

async function loadRequests() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Erro ao buscar solicitações.');
        }

        const requests = await response.json();

        renderRequests(requests);

    } catch (error) {
        console.error('Erro:', error);
    }
}

function createRequestCard(request) {
    const card = document.createElement("a");

    card.classList.add("request-card");
    card.href = `solicitacao.html?id=${request.id}`;

    card.innerHTML = `
        <div class="request-card-header">
            <h2>${request.exam}</h2>
            <span class="request-status ${request.status.toLowerCase()}">
                ${getStatusLabel(request.status)}
            </span>
        </div>

        <div class="request-card-info">
            <span>Clínica</span>
            <strong>${request.clinic}</strong>
        </div>

        <div class="request-card-info">
            <span>Data da solicitação</span>
            <strong>${request.date}</strong>
        </div>
    `;

    return card;
}

function getStatusLabel(status) {
    const statusLabels = {
        EM_ANALISE: "Em análise",
        AUTORIZADA: "Autorizada",
        NEGADA: "Negada"
    };

    return statusLabels[status] || "Desconhecido";
}

function renderRequests(requests) {
    requestList.innerHTML = "";

    if (requests.length === 0) {
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";

    requests.forEach(function (request) {
        const card = createRequestCard(request);
        requestList.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', loadRequests);