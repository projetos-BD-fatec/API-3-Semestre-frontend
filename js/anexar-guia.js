const API_URL = "http://localhost:8080";

// ==============================
// ELEMENTOS
// ==============================

const preGuiaSelect = document.getElementById("preGuiaSelect");
const selectError = document.getElementById("select-error");

const inputFile = document.getElementById("guiaArquivo");
const fileInfo = document.getElementById("file-info");
const fileError = document.getElementById("file-error");
const fileUpload = document.querySelector(".file-upload");

const form = document.getElementById("guia-form");
const formError = document.getElementById("form-error");

const confirmation = document.getElementById("confirmation");
const confirmationPedido = document.getElementById("confirmation-pedido");
const confirmationFile = document.getElementById("confirmation-file");
const cancelConfirmation = document.getElementById("cancel-confirmation");
const confirmSubmit = document.getElementById("confirm-submit");

const success = document.getElementById("success");
const newUpload = document.getElementById("new-upload");
const viewRequests = document.getElementById("view-requests");


// ==============================
// CONFIGURAÇÕES
// ==============================

const MAX_SIZE = 10 * 1024 * 1024;


// ==============================
// PRÉ-GUIAS AUTORIZADAS
// ==============================

async function loadPreGuiasAutorizadas() {

    try {

        const response = await fetch(`${API_URL}/pre-guias`);

        if (!response.ok) {
            throw new Error("Erro ao buscar pré-guias.");
        }

        const preGuias = await response.json();

        const autorizadas = preGuias.filter(function (preGuia) {
            return preGuia.status === "AUTORIZADA";
        });

        renderPreGuiaOptions(autorizadas);

    } catch (error) {
        console.error("Erro ao carregar pré-guias autorizadas:", error);
        selectError.textContent = "Não foi possível carregar os pedidos aprovados.";
    }
}


function renderPreGuiaOptions(preGuias) {

    preGuiaSelect.innerHTML = '<option value="">Selecione um pedido</option>';

    if (preGuias.length === 0) {
        selectError.textContent = "Nenhum pedido aprovado encontrado no momento.";
        return;
    }

    preGuias.forEach(function (preGuia) {

        const option = document.createElement("option");

        option.value = preGuia.idPreGuia;

        const data = new Date(preGuia.criadoEm).toLocaleDateString("pt-BR");

        option.textContent = `Pedido #${preGuia.idPreGuia} - ${data}`;

        preGuiaSelect.appendChild(option);
    });
}


// ==============================
// UPLOAD DO ARQUIVO
// ==============================

inputFile.addEventListener("change", function () {

    fileInfo.textContent = "";
    fileError.textContent = "";
    fileUpload.classList.remove("has-error");

    const file = inputFile.files[0];

    if (!file) {
        return;
    }

    if (file.type !== "application/pdf") {
        fileError.textContent = "O arquivo deve ser um PDF.";
        fileUpload.classList.add("has-error");
        inputFile.value = "";
        return;
    }

    if (file.size > MAX_SIZE) {
        fileError.textContent = "O arquivo deve ter no máximo 10MB.";
        fileUpload.classList.add("has-error");
        inputFile.value = "";
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    fileInfo.textContent = `${file.name} - ${sizeMB} MB`;
});


// ==============================
// VALIDAÇÃO E CONFIRMAÇÃO
// ==============================

form.addEventListener("submit", function (event) {

    event.preventDefault();

    formError.textContent = "";

    let validForm = true;

    if (!preGuiaSelect.value) {
        validForm = false;
        selectError.textContent = "Selecione um pedido aprovado.";
    } else {
        selectError.textContent = "";
    }

    if (!inputFile.files[0]) {
        validForm = false;
        fileError.textContent = "Anexe o PDF da guia.";
        fileUpload.classList.add("has-error");
    } else {
        fileUpload.classList.remove("has-error");
    }

    if (!validForm) {
        formError.textContent = "Corrija os campos destacados antes de continuar.";
        return;
    }

    const pedidoTexto = preGuiaSelect.options[preGuiaSelect.selectedIndex].textContent;

    confirmationPedido.textContent = pedidoTexto;
    confirmationFile.textContent = inputFile.files[0].name;

    confirmation.classList.add("show");
});


// ==============================
// ENVIO
// ==============================

cancelConfirmation.addEventListener("click", function () {
    confirmation.classList.remove("show");
});


confirmSubmit.addEventListener("click", async function () {

    try {
        confirmSubmit.disabled = true;
        confirmSubmit.textContent = "Enviando...";

        const formData = new FormData();

        formData.append("file", inputFile.files[0]);
        formData.append("solicitacaoId", preGuiaSelect.value);

        const response = await fetch(`${API_URL}/api/guias/upload`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erro da API:", errorText);
            throw new Error("Não foi possível enviar a guia.");
        }

        const guia = await response.json();

        console.log("Guia enviada:", guia);

        clearForm();

        confirmation.classList.remove("show");

        success.classList.add("show");

    } catch (error) {
        console.error("Erro ao enviar guia:", error);
        alert("Ocorreu um erro ao enviar a guia. Tente novamente.");

    } finally {
        confirmSubmit.disabled = false;
        confirmSubmit.textContent = "Confirmar envio";
    }
});


function clearForm() {

    inputFile.value = "";
    fileInfo.textContent = "";
    fileError.textContent = "";
    fileUpload.classList.remove("has-error");

    preGuiaSelect.value = "";
    selectError.textContent = "";

    formError.textContent = "";
}


newUpload.addEventListener("click", function () {
    success.classList.remove("show");
    loadPreGuiasAutorizadas();
});


viewRequests.addEventListener("click", function () {
    window.location.href = "../index.html";
});


// ==============================
// INICIALIZAÇÃO
// ==============================

document.addEventListener("DOMContentLoaded", function () {
    loadPreGuiasAutorizadas();
});