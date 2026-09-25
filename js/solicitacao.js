const API_URL = 'http://localhost:8080/solicitacoes';

const params = new URLSearchParams(window.location.search);
const requestId = params.get('id');

const examEl = document.getElementById('detail-exam');
const clinicEl = document.getElementById('detail-clinic');
const statusEl = document.getElementById('detail-status');
const dateEl = document.getElementById('detail-date');
const guiaSection = document.getElementById('guia-section');
const pendingSection = document.getElementById('pending-section');
const pendingMessage = document.getElementById('pending-message');
const btnDownload = document.getElementById('btn-download-guia');
const downloadError = document.getElementById('download-error');
const detailError = document.getElementById('detail-error');

const STATUS_LABELS = {
    EM_ANALISE: "Em análise",
    AUTORIZADA: "Autorizada",
    NEGADA: "Negada"
};

async function loadRequestDetail() {
    if (!requestId) {
        showError("Solicitação não encontrada.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${requestId}`);

        if (!response.ok) {
            throw new Error("Não foi possível carregar a solicitação.");
        }

        const request = await response.json();

        renderRequest(request);

    } catch (error) {
        console.error("Erro:", error);
        showError("Não foi possível carregar os dados da solicitação.");
    }
}

function renderRequest(request) {
    examEl.textContent = request.exam;
    clinicEl.textContent = `Clínica: ${request.clinic}`;
    dateEl.textContent = request.date;

    statusEl.textContent = STATUS_LABELS[request.status] || "Desconhecido";
    statusEl.classList.add(request.status.toLowerCase());

    if (request.status === "AUTORIZADA") {
        guiaSection.style.display = "block";
        pendingSection.style.display = "none";
    } else {
        guiaSection.style.display = "none";
        pendingSection.style.display = "block";

        if (request.status === "NEGADA") {
            pendingMessage.textContent =
                "Sua solicitação foi negada. Entre em contato com a clínica para mais informações.";
        }
    }
}

function showError(texto) {
    detailError.className = "form-feedback error";
    detailError.textContent = texto;
}

btnDownload.addEventListener("click", async function () {
    downloadError.textContent = "";
    btnDownload.disabled = true;
    btnDownload.textContent = "Baixando...";

    try {
        const response = await fetch(`${API_URL}/${requestId}/guia`);

        if (!response.ok) {
            throw new Error("Não foi possível baixar a guia.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `guia-${requestId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Erro no download:", error);
        downloadError.textContent = "Não foi possível baixar o arquivo. Tente novamente.";

    } finally {
        btnDownload.disabled = false;
        btnDownload.textContent = "Baixar guia (PDF)";
    }
});

document.addEventListener("DOMContentLoaded", loadRequestDetail);
