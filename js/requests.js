const requests = [
    {
        id: 1,
        exam: "Ressonância Magnética",
        clinic: "Clínica A",
        date: "12/09/2026",
        status: "EM_ANALISE"
    },
    {
        id: 2,
        exam: "Ultrassonografia",
        clinic: "Clínica B",
        date: "08/09/2026",
        status: "AUTORIZADA"
    },
    {
        id: 3,
        exam: "Tomografia",
        clinic: "Clínica C",
        date: "01/09/2026",
        status: "NEGADA"
    }
];

const requestList = document.getElementById("request-list");
const emptyState = document.getElementById("empty-state");

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

function renderRequests() {
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

renderRequests();