const API_URL = 'http://localhost:8080';

const requestList = document.getElementById("request-list");
const emptyState = document.getElementById("empty-state");

async function loadRequests() {
    try {
        const response = await fetch(`${API_URL}/pre-guias`);

        if (!response.ok) {
            throw new Error('Erro ao buscar solicitações.');
        }

        const requests = await response.json();
        
        renderRequests(requests);

    } catch (error) {
        console.error('Erro ao carregar solicitações. Erro:', error);
    }
}


function createRequestCard(request) {
    console.log("REQUEST:", request);
    console.log("ITENS:", request.itens);

    const card = document.createElement("article");

    card.classList.add("request-card");
    
    card.innerHTML = `
        <div class="request-card-header">
            <div>
                <h3>Solicitação #${request.idPreGuia}</h3>
                <p>${formatDate(request.criadoEm)}</p>
            </div>
            <span class="status">${getStatusLabel(request.status)}</span>
        </div>
        <div class="request-card-items">
            <div class="request-card-items-title">
                Exames
            </div>
            ${createItemsHtml(request.itens)}
        </div>
    `;

    return card;
}

function createItemsHtml(items) {
    return items.map(function (item) {
        const address = buildAddress(item);
        
        return  `
            <div class="request-item">
                <div class="request-item-exam">
                    ${item.nmExame}
                </div>
                <div class="request-item-provider">
                    ${item.nmPrestador}
                </div>
                <div class="request-item-address">
                    ${address}
                </div>
                <div class="request-item-value">
                    ${formatCurrency(item.valor)}
                </div>
            </div>    
        `;   
    }).join("");
}

function buildAddress(item) {
    const street = `${item.dsLogradouro}, ${item.nrEndereco}`;
    const complement = item.dsComplemento
        ?` - ${item.dsComplemento}`
        :"";
    const neighborhood = item.nmBairro;
    const cityState = `${item.nmCidade} - ${item.sgUf}`;

    return `
        ${street}${complement}<br>
        ${neighborhood}<br>
        ${cityState}
        `;  
    }

function getStatusLabel(status) {
    const statusLabels = {
        EM_ANALISE: "Em análise",
        AUTORIZADA: "Autorizada",
        NEGADA: "Negada"
    };

    return statusLabels[status] || "Desconhecido";
}

function formatDate(date) {
    return new Date(date).toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
    return Number(value).toFixed(2).replace(".", ",");
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

document.addEventListener('DOMContentLoaded', function () {
    loadRequests();
});