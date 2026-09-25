const API_URL = "http://localhost:8080";

// ==============================
// ELEMENTOS DO FORMULÁRIO
// ==============================

const inputFile = document.getElementById("encaminhamento");
const fileInfo = document.getElementById("file-info");
const fileError = document.getElementById("file-error");
const fileUpload = document.querySelector(".file-upload");

const form = document.getElementById("request-form");
const formError = document.getElementById("form-error");

const requestItems = document.getElementById("request-items");
const addItemButton = document.getElementById("add-item");

// Confirmação
const confirmation = document.getElementById("confirmation");
const confirmationFile = document.getElementById("confirmation-file");
const cancelConfirmation = document.getElementById("cancel-confirmation");
const confirmSubmit = document.getElementById("confirm-submit");
const success = document.getElementById("success");
const newRequest = document.getElementById("new-request");
const viewRequests = document.getElementById("view-requests");


// ==============================
// CONFIGURAÇÕES
// ==============================

const MAX_SIZE = 10 * 1024 * 1024;

const PERMITTED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png"
];


// ==============================
// DADOS
// ==============================

let exams = [];

let items = [];

let nextItemId = 1;


// ==============================
// ITENS
// ==============================

function addItem() {

    const item = {
        id: nextItemId++,

        exameId: null,
        exameNome: "",

        prestadorId: null,
        prestadorNome: "",

        clinics: []
    };

    items.push(item);

    renderItems();
}


function removeItem(itemId) {

    items = items.filter(function (item) {
        return item.id !== itemId;
});

    renderItems();
}


function getItem(itemId) {

    return items.find(function (item) {
        return item.id === itemId;
    });
}


function getItemIdFromElement(element) {

    const select =
        element.closest(".search-select");

    return Number(select.dataset.itemId);
}


// ==============================
// RENDERIZAÇÃO DOS ITENS
// ==============================

function renderItems() {

    requestItems.innerHTML = "";

    items.forEach(function (item, index) {

        const itemElement =
            document.createElement("div");

        itemElement.classList.add(
            "request-form-item"
        );

        itemElement.innerHTML = `
            <div class="request-form-item-header">

                <h3>
                    Exame ${index + 1}
                </h3>

                ${items.length > 1
                ? `
                            <button
                                type="button"
                                class="remove-item-button"
                                data-item-id="${item.id}"
                                title="Remover exame"
                            >
                                ×
                            </button>
                        `
                : ""
            }

            </div>


            <div class="form-field">

                <label>
                    Exame
                </label>

                <div
                    class="search-select"
                    data-type="exam"
                    data-item-id="${item.id}"
                >

                    <input
                        type="text"
                        class="exam-search"
                        placeholder="Pesquise por nome ou código TUSS"
                        autocomplete="off"
                        value="${item.exameNome}"
                    >

                    <input
                        type="hidden"
                        class="exam-input"
                        value="${item.exameId || ""}"
                    >

                    <div
                        class="search-options exam-options"
                    ></div>

                </div>

            </div>


            <div class="form-field">

                <label>
                    Clínica
                </label>

                <div
                    class="search-select ${item.exameId
                ? ""
                : "disabled"
            }"
                    data-type="clinic"
                    data-item-id="${item.id}"
                >

                    <input
                        type="text"
                        class="clinic-search"
                        placeholder="${item.exameId
                ? "Pesquise por nome ou localização"
                : "Selecione primeiro um exame"
            }"
                        autocomplete="off"
                        ${item.exameId
                ? ""
                : "disabled"
            }
                        value="${item.prestadorNome}"
                    >

                    <input
                        type="hidden"
                        class="clinic-input"
                        value="${item.prestadorId || ""
            }"
                    >

                    <div
                        class="search-options clinic-options"
                    ></div>

                </div>

            </div>
        `;

        requestItems.appendChild(itemElement);
    });

    bindItemEvents();
}


// ==============================
// EVENTOS DOS ITENS
// ==============================

function bindItemEvents() {

    // --------------------------
    // Remover item
    // --------------------------

    document
        .querySelectorAll(".remove-item-button")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const itemId =
                        Number(this.dataset.itemId);

                    removeItem(itemId);
                }
            );
        });


    // --------------------------
    // Busca de exame
    // --------------------------

    document
        .querySelectorAll(".exam-search")
        .forEach(function (input) {

            input.addEventListener(
                "focus",
                function () {

                    const itemId =
                        getItemIdFromElement(this);

                    renderExamsForItem(
                        itemId,
                        this.value
                    );

                    const select =
                        this.closest(".search-select");

                    select.classList.add("open");
                }
            );


            input.addEventListener(
                "input",
                function () {

                    const itemId =
                        getItemIdFromElement(this);

                    const item =
                        getItem(itemId);

                    if (!item) {
                        return;
                    }

                    item.exameId = null;
                    item.exameNome = "";

                    item.prestadorId = null;
                    item.prestadorNome = "";

                    item.clinics = [];

                    renderExamsForItem(
                        itemId,
                        this.value
                    );

                    const select =
                        this.closest(".search-select");

                    select.classList.add("open");
                }
            );
        });


    // --------------------------
    // Busca de clínica
    // --------------------------

    document
        .querySelectorAll(".clinic-search")
        .forEach(function (input) {

            input.addEventListener(
                "focus",
                function () {

                    if (this.disabled) {
                        return;
                    }

                    const itemId =
                        getItemIdFromElement(this);

                    renderClinicsForItem(
                        itemId,
                        this.value
                    );

                    const select =
                        this.closest(".search-select");

                    select.classList.add("open");
                }
            );


            input.addEventListener(
                "input",
                function () {

                    if (this.disabled) {
                        return;
                    }

                    const itemId =
                        getItemIdFromElement(this);

                    const item =
                        getItem(itemId);

                    if (!item) {
                        return;
                    }

                    item.prestadorId = null;
                    item.prestadorNome = "";

                    renderClinicsForItem(
                        itemId,
                        this.value
                    );

                    const select =
                        this.closest(".search-select");

                    select.classList.add("open");
                }
            );
        });
}


// ==============================
// EXAMES
// ==============================

async function loadExams() {

    try {

        const response =
            await fetch(`${API_URL}/exames`);

        if (!response.ok) {

            throw new Error(
                "Erro ao buscar exames."
            );
        }

        exams = await response.json();

    } catch (error) {

        console.error(
            "Erro ao carregar exames:",
            error
        );
    }
}


function renderExamsForItem(
    itemId,
    searchTerm = ""
) {

    const item =
        getItem(itemId);

    if (!item) {
        return;
    }

    const select =
        document.querySelector(
            `.search-select[data-type="exam"][data-item-id="${itemId}"]`
        );

    if (!select) {
        return;
    }

    const options =
        select.querySelector(".exam-options");

    const term =
        searchTerm
            .toLowerCase()
            .trim();


    const filteredExams =
        exams.filter(function (exam) {

            return (
                exam.descExame
                    .toLowerCase()
                    .includes(term)

                ||

                exam.codTuss
                    .toLowerCase()
                    .includes(term)
            );
        });


    options.innerHTML = "";


    if (filteredExams.length === 0) {

        options.innerHTML = `
            <div class="search-option-empty">
                Nenhum exame encontrado.
            </div>
        `;

        return;
    }


    filteredExams.forEach(
        function (exam) {

            const option =
                document.createElement("div");

            option.classList.add(
                "search-option"
            );

            option.innerHTML = `
                <span class="search-option-main">
                    ${exam.descExame}
                </span>

                <span class="search-option-secondary">
                    TUSS ${exam.codTuss}
                </span>
            `;


            option.addEventListener(
                "click",
                function () {

                    selectExamForItem(
                        itemId,
                        exam
                    );
                }
            );


            options.appendChild(option);
        }
    );
}


function selectExamForItem(itemId, exam) {

    const item = getItem(itemId);

    if (!item) {
        return;
    }


    item.exameId = exam.idExame;
    item.exameNome = exam.descExame;

    item.prestadorId = null;
    item.prestadorNome = "";

    item.clinics = [];


    loadClinics(
        itemId,
        exam.idExame
    );


    renderItems();
}


// ==============================
// CLÍNICAS
// ==============================

async function loadClinics(
    itemId,
    examId
) {

    const item =
        getItem(itemId);

    if (!item) {
        return;
    }


    item.clinics = [];


    try {

        const response =
            await fetch(
                `${API_URL}/prestadores?exameId=${examId}`
            );


        if (!response.ok) {

            throw new Error(
                "Erro ao buscar clínicas."
            );
        }


        item.clinics =
            await response.json();


    } catch (error) {

        console.error(
            "Erro ao carregar clínicas:",
            error
        );
    }
}


function renderClinicsForItem(
    itemId,
    searchTerm = ""
) {

    const item =
        getItem(itemId);

    if (!item || !item.exameId) {
        return;
    }


    const select =
        document.querySelector(
            `.search-select[data-type="clinic"][data-item-id="${itemId}"]`
        );


    if (!select) {
        return;
    }


    const options =
        select.querySelector(
            ".clinic-options"
        );


    const term =
        searchTerm
            .toLowerCase()
            .trim();


    const filteredClinics =
        item.clinics.filter(
            function (clinic) {

                const searchableText = [

                    clinic.nmPrestador,
                    clinic.nmFantasia,
                    clinic.dsLogradouro,
                    clinic.nrEndereco,
                    clinic.nmBairro,
                    clinic.nmCidade,
                    clinic.sgUf

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return searchableText.includes(
                    term
                );
            }
        );


    options.innerHTML = "";


    if (filteredClinics.length === 0) {

        options.innerHTML = `
            <div class="search-option-empty">
                Nenhuma clínica encontrada.
            </div>
        `;

        return;
    }


    filteredClinics.forEach(
        function (clinic) {

            const option = document.createElement("div");
            option.classList.add("search-option");

            const name = clinic.nmFantasia || clinic.nmPrestador;
            const address = `${clinic.dsLogradouro}, ${clinic.nrEndereco} - ` + `${clinic.nmBairro}, ${clinic.nmCidade} - ${clinic.sgUf}`;

            option.innerHTML = `
                <span class="search-option-main">
                    ${name}
                </span>

                <span class="search-option-secondary">
                    ${address}
                </span>
            `;

            option.addEventListener(
                "click",
                function () {
                    selectClinicForItem(
                        itemId,
                        clinic
                    );
                }
            );

            options.appendChild(option);
        }
    );
}


function selectClinicForItem(itemId, clinic) {

    const item = getItem(itemId);

    if (!item) {
        return;
    }


    item.prestadorId = clinic.idPrestador;

    item.prestadorNome = clinic.nmFantasia || clinic.nmPrestador;


    renderItems();
}


// ==============================
// FECHAR LISTAS
// ==============================

document.addEventListener(
    "click",
    function (event) {

        document
            .querySelectorAll(
                ".search-select"
            )
            .forEach(
                function (select) {

                    if (
                        !select.contains(
                            event.target
                        )
                    ) {

                        select.classList.remove(
                            "open"
                        );
                    }
                }
            );
    }
);


// ==============================
// UPLOAD
// ==============================

inputFile.addEventListener(
    "change",
    function () {

        fileInfo.textContent = "";
        fileError.textContent = "";

        fileUpload.classList.remove(
            "has-error"
        );


        const file =
            inputFile.files[0];


        if (!file) {
            return;
        }


        if (
            !PERMITTED_TYPES.includes(
                file.type
            )
        ) {

            fileError.textContent =
                "Tipo de arquivo inválido!";

            fileUpload.classList.add(
                "has-error"
            );

            inputFile.value = "";

            return;
        }


        if (file.size > MAX_SIZE) {

            fileError.textContent =
                "O arquivo deve ter no máximo 10MB.";

            fileUpload.classList.add(
                "has-error"
            );

            inputFile.value = "";

            return;
        }


        const sizeMB =
            (
                file.size /
                (1024 * 1024)
            ).toFixed(2);


        fileInfo.textContent =
            `${file.name} - ${sizeMB} MB`;
    }
);


// ==============================
// VALIDAÇÃO
// ==============================

form.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        formError.textContent = "";

        let validForm = true;


        // --------------------------
        // Arquivo
        // --------------------------

        if (!inputFile.files[0]) {

            validForm = false;

            fileError.textContent = "Anexe o encaminhamento.";

            fileUpload.classList.add("has-error");

        } else {

            fileUpload.classList.remove("has-error");
        }


        // --------------------------
        // Itens
        // --------------------------

        if (items.length === 0) {
            validForm = false;
        }


        items.forEach(
            function (item) {

                const examSelect = document.querySelector(
                        `.search-select[data-type="exam"][data-item-id="${item.id}"]`
                    );


                const clinicSelect = document.querySelector(
                        `.search-select[data-type="clinic"][data-item-id="${item.id}"]`
                    );


                if (!item.exameId) {

                    validForm = false;

                    examSelect.classList.add(
                        "has-error"
                    );

                } else {

                    examSelect.classList.remove(
                        "has-error"
                    );
                }


                if (!item.prestadorId) {

                    validForm = false;

                    clinicSelect.classList.add(
                        "has-error"
                    );

                } else {

                    clinicSelect.classList.remove(
                        "has-error"
                    );
                }
            }
        );


        if (!validForm) {
            formError.textContent =
                "Corrija os campos destacados antes de continuar.";

            return;
        }


        // --------------------------
        // Confirmação
        // --------------------------

        confirmationFile.textContent = inputFile.files[0].name;
        renderConfirmation();
        confirmation.classList.add("show");
    }
);

function clearForm() {
    inputFile.value = "";
    fileInfo.textContent = "";
    fileError.textContent = "";

    fileUpload.classList.remove(
        "has-error"
    );

    formError.textContent = "";

    items = [];

    nextItemId = 1;

    addItem();
}

// ==============================
// CONFIRMAÇÃO
// ==============================

cancelConfirmation.addEventListener(
    "click",
    function () {

        confirmation.classList.remove(
            "show"
        );
    }
);


confirmSubmit.addEventListener(
    "click",
    async function () {

        try {
            confirmSubmit.disabled = true;
            confirmSubmit.textContent = "Enviando...";
            const arquivo = inputFile.files[0];
            const dados = {
                itens: items.map(
                    function (item) {

                        return {
                            idExame: item.exameId,
                            idPrestador: item.prestadorId
                        };

                    }
                )

            };

            const formData = new FormData();

            // --------------------------
            // Arquivo
            // --------------------------

            formData.append("encaminhamento", arquivo);

            // --------------------------
            // Dados
            // --------------------------

            formData.append(
                "dados",
                new Blob(
                    [
                        JSON.stringify(dados)
                    ],
                    {
                        type: "application/json"
                    }
                )
            );


            // --------------------------
            // Envio
            // --------------------------

            const response =
                await fetch(
                    `${API_URL}/pre-guias`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            if (!response.ok) {
                const errorText = await response.text();
                console.error("Erro da API:", errorText);

                throw new Error(
                    "Não foi possível enviar a solicitação."
                );
            }

            const preGuia = await response.json();

            console.log("Pré-guia criada:",preGuia);

            // --------------------------
            // Limpa o formulário
            // --------------------------

            clearForm();

            // --------------------------
            // Fecha confirmação
            // --------------------------

            confirmation.classList.remove("show");

            // --------------------------
            // Mostra sucesso
            // --------------------------

            success.classList.add("show");

        } catch (error) {
            console.error("Erro ao enviar solicitação:", error);
            alert("Ocorreu um erro ao enviar a solicitação. Tente novamente.");

        } finally {
            confirmSubmit.disabled = false;
            confirmSubmit.textContent = "Confirmar envio";
        }

    }
);

newRequest.addEventListener("click", function () {
        success.classList.remove("show");
    }
);

viewRequests.addEventListener("click",function () {
        window.location.href = "../index.html";
    }
);

function renderConfirmation() {
    const confirmationItems = document.getElementById("confirmation-items");

    confirmationItems.innerHTML = "";

    items.forEach(function (item, index) {
        const confirmationItem = document.createElement("div");
        confirmationItem.classList.add("confirmation-request-item");

        confirmationItem.innerHTML = `
            <div class="confirmation-item-number">
                Exame ${index + 1}
            </div>

            <div class="confirmation-item-exam">
                ${item.exameNome}
            </div>

            <div class="confirmation-item-clinic">
                ${item.prestadorNome}
            </div>
        `;

        confirmationItems.appendChild(confirmationItem);
    });
}

// ==============================
// BOTÃO ADICIONAR
// ==============================

addItemButton.addEventListener("click", function () {

        addItem();
    }
);


// ==============================
// INICIALIZAÇÃO
// ==============================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadExams();

        addItem();
    }
);