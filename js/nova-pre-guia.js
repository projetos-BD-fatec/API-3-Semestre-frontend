/* =====================================================
   Página: nova solicitação de pré-guia
   Depende de: api.js, formatters.js, ficha-pre-guia.js
===================================================== */

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

// Tela de sucesso
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

// Dados do beneficiário (nome / PREC-CP) para a ficha de confirmação.
// Começa a carregar assim que a página abre.
const beneficiarioPromise = buscarBeneficiario();


// ==============================
// ITENS
// ==============================

function addItem() {

    const item = {
        id: nextItemId++,

        // Objetos completos escolhidos (usados na ficha de confirmação)
        exame: null,
        prestador: null,

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
                        value="${escapeHtml(item.exameNome)}"
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
                    class="search-select ${item.exameId ? "" : "disabled"}"
                    data-type="clinic"
                    data-item-id="${item.id}"
                >

                    <input
                        type="text"
                        class="clinic-search"
                        placeholder="${item.exameId
                            ? "Pesquise por nome ou localização"
                            : "Selecione primeiro um exame"}"
                        autocomplete="off"
                        ${item.exameId ? "" : "disabled"}
                        value="${escapeHtml(item.prestadorNome)}"
                    >

                    <input
                        type="hidden"
                        class="clinic-input"
                        value="${item.prestadorId || ""}"
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

                    item.exame = null;
                    item.exameId = null;
                    item.exameNome = "";

                    item.prestador = null;
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

                    item.prestador = null;
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

        const response = await fetchAutenticado(`${API_URL}/exames`);

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
                    ${escapeHtml(exam.descExame)}
                </span>

                <span class="search-option-secondary">
                    TUSS ${escapeHtml(exam.codTuss)}
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


    item.exame = exam;
    item.exameId = exam.idExame;
    item.exameNome = exam.descExame;

    item.prestador = null;
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

        const response = await fetchAutenticado(`${API_URL}/prestadores?exameId=${examId}`);


        if (!response.ok) {

            throw new Error(
                "Erro ao buscar clínicas."
            );
        }


        const clinics = await response.json();

        // Se o usuário trocou de exame enquanto a busca rodava,
        // descarta o resultado antigo
        if (item.exameId !== examId) {
            return;
        }

        item.clinics = clinics;


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
                    ${escapeHtml(name)}
                </span>

                <span class="search-option-secondary">
                    ${escapeHtml(address)}
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


    item.prestador = clinic;
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


        abrirConfirmacao();
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
// CONFIRMAÇÃO (ficha completa)
// ==============================

/**
 * Monta a ficha a partir do que o usuário escolheu na tela.
 * Valor contratual só aparece se /prestadores devolver esse campo
 * (senão a ficha mostra "—" até o backend incluir).
 */
function fichaDeRascunho(beneficiario, arquivo) {

    return {
        codigo: null,
        dataSolicitacao: null,
        status: null,

        beneficiario: beneficiario,

        arquivo: {
            nome: arquivo.name,
            obterUrl: async function () {
                return URL.createObjectURL(arquivo);
            }
        },

        itens: items.map(function (item) {

            return {
                codTuss: item.exame.codTuss,
                nome: item.exame.descExame,
                prestador: item.prestadorNome,
                enderecoLinhas: buildAddressLines(item.prestador),
                valor: item.prestador.valorContratual ?? item.prestador.valor ?? null,
                status: null
            };
        })
    };
}


async function abrirConfirmacao() {

    const beneficiario = await beneficiarioPromise;
    const arquivo = inputFile.files[0];

    FichaPreGuia.abrir(
        fichaDeRascunho(beneficiario, arquivo),
        {
            modo: "confirmar",
            aoConfirmar: enviarSolicitacao
        }
    );
}


/**
 * Envia a pré-guia. Se lançar erro, a ficha continua aberta
 * e mostra a mensagem; se terminar bem, a ficha fecha sozinha.
 */
async function enviarSolicitacao() {

    const arquivo = inputFile.files[0];

    const dados = {
        itens: items.map(function (item) {

            return {
                idExame: item.exameId,
                idPrestador: item.prestadorId
            };
        })
    };

    const formData = new FormData();

    formData.append("encaminhamento", arquivo);

    formData.append(
        "dados",
        new Blob(
            [JSON.stringify(dados)],
            { type: "application/json" }
        )
    );

    const response = await fetchAutenticado(
        `${API_URL}/pre-guias`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        console.error("Erro da API:", await response.text());

        throw new Error(
            "Não foi possível enviar a solicitação. Tente novamente."
        );
    }

    const preGuia = await response.json();

    console.log("Pré-guia criada:", preGuia);

    clearForm();

    success.classList.add("show");

    return preGuia;
}


// ==============================
// TELA DE SUCESSO
// ==============================

newRequest.addEventListener("click", function () {
    success.classList.remove("show");
});


viewRequests.addEventListener("click", function () {
    window.location.href = "pre-guias.html";
});


// ==============================
// BOTÃO ADICIONAR
// ==============================

addItemButton.addEventListener("click", function () {

    addItem();
});


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
