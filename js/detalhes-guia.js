
/* =====================================================
   FUSEx - DETALHES DA GUIA
   Tela 13 - Prestador
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarDetalhesGuia);

/* =====================================================
   IDENTIFICAÇÃO DA GUIA
===================================================== */

const parametros = new URLSearchParams(window.location.search);
const idGuia = parametros.get("idGuia");

let guiaAtual = null;
let operacaoEmAndamento = false;
let urlArquivoGuia = null;
let arquivoGuiaAtual = null;


/* =====================================================
   ELEMENTOS DA TELA
===================================================== */

const detalhes = {
    loading: document.getElementById("detalhes-loading"),
    erro: document.getElementById("detalhes-erro"),
    erroTexto: document.getElementById("detalhes-erro-texto"),
    conteudo: document.getElementById("detalhes-conteudo"),

    codigo: document.getElementById("detalhes-codigo-guia"),
    paciente: document.getElementById("detalhes-paciente"),
    preGuia: document.getElementById("detalhes-pre-guia"),
    dataUpload: document.getElementById("detalhes-data-upload"),
    status: document.getElementById("detalhes-status"),

    utilizacaoTitulo: document.getElementById("detalhes-utilizacao-titulo"),
    utilizacaoDescricao: document.getElementById("detalhes-utilizacao-descricao"),
    utilizacaoFeedback: document.getElementById("detalhes-utilizacao-feedback"),
    btnUtilizar: document.getElementById("btn-marcar-utilizada"),
    documentoPreview: document.getElementById("detalhes-documento-preview"),
    btnVisualizarGuia: document.getElementById("btn-visualizar-guia"),
    btnBaixarGuia: document.getElementById("btn-baixar-guia"),

    progressoContador: document.getElementById("detalhes-progresso-contador"),
    progressoBarra: document.getElementById("detalhes-progresso-barra"),
    progressoPreenchimento: document.getElementById("detalhes-progresso-preenchimento"),
    progressoPercentual: document.getElementById("detalhes-progresso-percentual"),

    totalProcedimentos: document.getElementById("detalhes-total-procedimentos"),
    listaProcedimentos: document.getElementById("detalhes-lista-procedimentos"),
    procedimentosVazio: document.getElementById("detalhes-procedimentos-vazio"),

    btnEspelho: document.getElementById("btn-abrir-espelho"),
    espelhoFeedback: document.getElementById("detalhes-espelho-feedback"),

    btnTentarNovamente: document.getElementById("btn-tentar-novamente"),
    btnSair: document.getElementById("btn-sair"),

    modal: document.getElementById("detalhes-modal-confirmacao"),
    modalTitulo: document.getElementById("detalhes-modal-titulo"),
    modalDescricao: document.getElementById("detalhes-modal-descricao"),
    modalCancelar: document.getElementById("detalhes-modal-cancelar"),
    modalConfirmar: document.getElementById("detalhes-modal-confirmar")
};

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function iniciarDetalhesGuia() {

    detalhes.btnTentarNovamente.addEventListener(
        "click",
        carregarDetalhesGuia
    );

    detalhes.btnUtilizar.addEventListener(
        "click",
        solicitarUtilizacaoGuia
    );

    detalhes.btnEspelho.addEventListener(
        "click",
        abrirTelaEspelho
    );


/* Visualizar o PDF em outra aba */
detalhes.btnVisualizarGuia.addEventListener("click", () => {
    if (!urlArquivoGuia) return;

    window.open(urlArquivoGuia, "_blank", "noopener");
});

/* Baixar o PDF */
detalhes.btnBaixarGuia.addEventListener("click", () => {
    if (!urlArquivoGuia) return;

    const link = document.createElement("a");

    link.href = urlArquivoGuia;
    link.download = `guia-oficial-${idGuia}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
});

/* Liberar a URL temporária ao sair da página */
window.addEventListener("pagehide", () => {
    if (urlArquivoGuia) {
        URL.revokeObjectURL(urlArquivoGuia);
        urlArquivoGuia = null;
    }
});


    detalhes.btnSair.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("sessaoOcs");

        window.location.href = "../auth/login.html";
    });

    detalhes.modalCancelar.addEventListener("click", () => {
        detalhes.modal.close();
    });

    // Permite cancelar utilizando ESC.
    detalhes.modal.addEventListener("cancel", event => {
        if (operacaoEmAndamento) {
            event.preventDefault();
        }
    });

    if (!idGuia || !/^\d+$/.test(idGuia) || Number(idGuia) <= 0) {
        mostrarErroPagina("Identificador da guia inválido.");
        return;
    }

    carregarDetalhesGuia();
}

/* =====================================================
   UTILITÁRIOS
===================================================== */

function mostrar(elemento, visivel) {
    elemento.hidden = !visivel;
}

function mostrarErroPagina(mensagem) {
    detalhes.erroTexto.textContent = mensagem;

    mostrar(detalhes.loading, false);
    mostrar(detalhes.conteudo, false);
    mostrar(detalhes.erro, true);
}

function mostrarFeedback(elemento, mensagem, erro = false) {
    elemento.textContent = mensagem;
    elemento.classList.toggle("is-error", erro);
    mostrar(elemento, Boolean(mensagem));
}

function formatarDataGuia(data) {
    if (!data) {
        return "—";
    }

    const partes = String(data).slice(0, 10).split("-");

    if (partes.length !== 3) {
        return "—";
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataHoraGuia(data) {
    if (!data) {
        return "—";
    }

    const dataFormatada = formatarDataGuia(data);
    const horario = String(data).slice(11, 16);

    return horario.length === 5
        ? `${dataFormatada} às ${horario}`
        : dataFormatada;
}

function formatarValorGuia(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(valor) || 0);
}

function statusGuiaAtual() {
    return String(guiaAtual?.statusGuia ?? "").toUpperCase();
}

function guiaEstaUtilizada() {
    return statusGuiaAtual() === "UTILIZADA";
}

function atualizarBotoes() {

    const bloqueado = operacaoEmAndamento;

    detalhes.btnUtilizar.disabled = bloqueado;
    detalhes.btnEspelho.disabled =
        bloqueado || !guiaAtual || !guiaEstaUtilizada();

    detalhes.listaProcedimentos
        .querySelectorAll("[data-confirmar-procedimento]")
        .forEach(botao => {
            botao.disabled = bloqueado;
        });
}

/* =====================================================
   CONSULTAR GUIA NO BACKEND
===================================================== */

async function carregarDetalhesGuia() {

    mostrar(detalhes.loading, true);
    mostrar(detalhes.erro, false);
    mostrar(detalhes.conteudo, false);

    try {

        // GET /api/guias/{id}
        const resposta = await buscarDetalhesGuiaPrestador(idGuia);

        if (!resposta || !Array.isArray(resposta.procedimentos)) {
            throw new Error(
                "O servidor retornou dados incompletos da guia."
            );
        }

        guiaAtual = resposta;

        renderizarDetalhes();

        mostrar(detalhes.loading, false);
        mostrar(detalhes.conteudo, true);

        carregarDocumentoOficial();

    } catch (erro) {

        console.error("Erro ao carregar guia:", erro);

        mostrarErroPagina(
            erro.message || "Não foi possível consultar a guia."
        );
    }
}

/* =====================================================
   RENDERIZAÇÃO DA GUIA
===================================================== */

function renderizarDetalhes() {

    detalhes.codigo.textContent =
        guiaAtual.codigoGuia ?? "Código não informado";

    detalhes.paciente.textContent =
        guiaAtual.nomePaciente ?? "Não informado";

    detalhes.preGuia.textContent =
        guiaAtual.idPreGuia ?? "—";

    detalhes.dataUpload.textContent =
        formatarDataGuia(guiaAtual.dataUpload);

    renderizarStatus();
    renderizarUtilizacao();
    renderizarProgresso();
    renderizarProcedimentos();

    atualizarBotoes();
}

/* =====================================================
   STATUS
===================================================== */

function renderizarStatus() {

    const status = statusGuiaAtual();

    const configuracoes = {
        ATIVA: ["Ativa", "is-ativa"],
        UTILIZADA: ["Utilizada", "is-utilizada"],
        VENCIDA: ["Vencida", "is-vencida"],
        CANCELADA: ["Cancelada", "is-cancelada"]
    };

    const [texto, classe] =
        configuracoes[status] ?? [status || "Desconhecida", ""];

    detalhes.status.className =
        "prestador-guia-status " + classe;

    detalhes.status.textContent = texto;
}

/* =====================================================
   UTILIZAÇÃO DA GUIA
===================================================== */

function renderizarUtilizacao() {

    const status = statusGuiaAtual();

    mostrar(detalhes.btnUtilizar, status === "ATIVA");

    if (status === "UTILIZADA") {

        detalhes.utilizacaoTitulo.textContent =
            "Guia utilizada";

        detalhes.utilizacaoDescricao.textContent =
            "A utilização desta guia já foi registrada. " +
            "Os procedimentos podem ser confirmados individualmente.";

    } else if (status === "ATIVA") {

        detalhes.utilizacaoTitulo.textContent =
            "Guia aguardando utilização";

        detalhes.utilizacaoDescricao.textContent =
            "Confirme a utilização quando o atendimento for iniciado.";

    } else {

        detalhes.utilizacaoTitulo.textContent =
            "Guia indisponível para utilização";

        detalhes.utilizacaoDescricao.textContent =
            "A situação atual desta guia não permite registrar sua utilização.";
    }
}


/* =====================================================
   DOCUMENTO OFICIAL DA GUIA
===================================================== */

async function carregarDocumentoOficial() {

    const preview = detalhes.documentoPreview;

    detalhes.btnVisualizarGuia.disabled = true;
    detalhes.btnBaixarGuia.disabled = true;

    // Libera o arquivo anterior, caso exista.
    if (urlArquivoGuia) {
        URL.revokeObjectURL(urlArquivoGuia);
        urlArquivoGuia = null;
    }

    arquivoGuiaAtual = null;

    const mensagem = document.createElement("p");
    mensagem.textContent = "Carregando documento oficial...";
    preview.replaceChildren(mensagem);

    try {
        const arquivo = await buscarArquivoGuiaOficial(idGuia);

        if (!arquivo.type.toLowerCase().startsWith("application/pdf")) {
            throw new Error("O servidor não retornou um PDF válido.");
        }

        arquivoGuiaAtual = arquivo;
        urlArquivoGuia = URL.createObjectURL(arquivo);

        const visualizador = document.createElement("iframe");
        visualizador.src = urlArquivoGuia;
        visualizador.title = "Documento oficial da guia";
        visualizador.setAttribute("loading", "lazy");

        preview.replaceChildren(visualizador);

        detalhes.btnVisualizarGuia.disabled = false;
        detalhes.btnBaixarGuia.disabled = false;

    } catch (erro) {
        console.error("Erro ao carregar documento oficial:", erro);

        mensagem.textContent =
            erro.message || "Não foi possível carregar o documento.";

        preview.replaceChildren(mensagem);
    }
}


/* =====================================================
   PROGRESSO DOS PROCEDIMENTOS
===================================================== */

function renderizarProgresso() {

    const total = guiaAtual.procedimentos.length;

    const realizados = guiaAtual.procedimentos.filter(
        procedimento => procedimento.realizado === true
    ).length;

    const percentual = total > 0
        ? Math.round((realizados / total) * 100)
        : 0;

    detalhes.progressoContador.textContent =
        `${realizados} de ${total}`;

    detalhes.progressoPercentual.textContent =
        `${percentual}% dos procedimentos realizados`;

    detalhes.progressoPreenchimento.style.width =
        `${percentual}%`;

    detalhes.progressoBarra.setAttribute(
        "aria-valuenow",
        String(percentual)
    );
}

/* =====================================================
   LISTAGEM DE PROCEDIMENTOS
===================================================== */

function renderizarProcedimentos() {

    const procedimentos = guiaAtual.procedimentos;

    detalhes.totalProcedimentos.textContent =
        `${procedimentos.length} ` +
        (procedimentos.length === 1
            ? "procedimento"
            : "procedimentos");

    detalhes.listaProcedimentos.replaceChildren();

    mostrar(
        detalhes.procedimentosVazio,
        procedimentos.length === 0
    );

    const fragmento = document.createDocumentFragment();

    procedimentos.forEach(procedimento => {
        fragmento.appendChild(criarCardProcedimento(procedimento));
    });

    detalhes.listaProcedimentos.appendChild(fragmento);
}

/* =====================================================
   CARD DE PROCEDIMENTO
===================================================== */

function criarCardProcedimento(procedimento) {

    const realizado = procedimento.realizado === true;
    const podeConfirmar = guiaEstaUtilizada() && !realizado;

    const card = document.createElement("article");

    card.className =
        "detalhes-procedimento-card" +
        (realizado ? " is-realizado" : "");

    const statusTexto = realizado ? "Realizado" : "Pendente";
    const statusClasse = realizado ? "is-realizado" : "is-pendente";

    card.innerHTML = `
        <div class="detalhes-procedimento-topo">

            <div>
                <span class="detalhes-procedimento-codigo">
                    TUSS ${escapeHtml(procedimento.codigoTuss)}
                </span>

                <h3 class="detalhes-procedimento-nome">
                    ${escapeHtml(procedimento.nomeProcedimento)}
                </h3>
            </div>

            <span class="detalhes-procedimento-status ${statusClasse}">
                ${statusTexto}
            </span>
        </div>

        <div class="detalhes-procedimento-info">
            <span>
                <strong>Valor:</strong>
                ${formatarValorGuia(procedimento.valor)}
            </span>

            <span>
                <strong>Realização:</strong>
                ${
                    realizado
                        ? formatarDataHoraGuia(procedimento.dataRealizacao)
                        : "Ainda não realizada"
                }
            </span>
        </div>

        <div class="detalhes-procedimento-acoes"></div>
    `;

    if (podeConfirmar) {

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "detalhes-btn-primario";
        botao.textContent = "Confirmar realização";

        botao.dataset.confirmarProcedimento = procedimento.idItem;

        botao.addEventListener("click", () => {
            solicitarConfirmacaoProcedimento(procedimento);
        });

        card.querySelector(".detalhes-procedimento-acoes")
            .appendChild(botao);
    }

    return card;
}

/* =====================================================
   MODAL DE CONFIRMAÇÃO
===================================================== */

function solicitarConfirmacao(titulo, descricao, acao) {

    if (operacaoEmAndamento || detalhes.modal.open) {
        return;
    }

    detalhes.modalTitulo.textContent = titulo;
    detalhes.modalDescricao.textContent = descricao;

    // Evita acumular listeners de confirmações anteriores.
    const botaoAntigo = detalhes.modalConfirmar;
    const novoBotao = botaoAntigo.cloneNode(true);

    botaoAntigo.replaceWith(novoBotao);
    detalhes.modalConfirmar = novoBotao;

    novoBotao.addEventListener("click", async () => {

        if (operacaoEmAndamento) {
            return;
        }

        operacaoEmAndamento = true;
        novoBotao.disabled = true;
        detalhes.modalCancelar.disabled = true;
        novoBotao.textContent = "Processando...";

        atualizarBotoes();

        try {

            await acao();
            detalhes.modal.close();

        } catch (erro) {

            console.error("Erro na operação:", erro);

            detalhes.modalDescricao.textContent =
                erro.message || "Não foi possível realizar a operação.";

        } finally {

            operacaoEmAndamento = false;
            novoBotao.disabled = false;
            detalhes.modalCancelar.disabled = false;
            novoBotao.textContent = "Confirmar";

            atualizarBotoes();
        }
    });

    detalhes.modal.showModal();
}

/* =====================================================
   MARCAR GUIA COMO UTILIZADA
===================================================== */

function solicitarUtilizacaoGuia() {

    if (!guiaAtual || statusGuiaAtual() !== "ATIVA") {
        return;
    }

    solicitarConfirmacao(
        "Confirmar utilização da guia",
        "Deseja registrar esta guia como utilizada? " +
        "Essa operação não confirma automaticamente os exames.",
        async () => {

            await marcarGuiaComoUtilizada(idGuia);

            mostrarFeedback(
                detalhes.utilizacaoFeedback,
                "Guia marcada como utilizada com sucesso."
            );

            await carregarDetalhesGuia();
        }
    );
}

/* =====================================================
   CONFIRMAR REALIZAÇÃO DE PROCEDIMENTO
===================================================== */

function solicitarConfirmacaoProcedimento(procedimento) {

    if (!guiaEstaUtilizada() || procedimento.realizado) {
        return;
    }

    solicitarConfirmacao(
        "Confirmar realização do procedimento",
        `Confirma que "${procedimento.nomeProcedimento}" ` +
        "foi efetivamente realizado? Esta operação não poderá " +
        "ser repetida.",
        async () => {

            await marcarProcedimentoComoRealizado(
                idGuia,
                procedimento.idItem
            );

            await carregarDetalhesGuia();
        }
    );
}

/* =====================================================
   ABRIR O ESPELHO DA OCS
===================================================== */


async function abrirTelaEspelho() {

    mostrarFeedback(detalhes.espelhoFeedback, "");

    if (!guiaAtual || !guiaEstaUtilizada() || operacaoEmAndamento) {
        return;
    }

    operacaoEmAndamento = true;

    atualizarBotoes();

    try {
        const resposta = await abrirEspelho(idGuia);

        if (!resposta?.idEspelho) {
            throw new Error(
                "O servidor não retornou o identificador do espelho."
            );
        }

        window.location.href =
            `espelho.html?idGuia=${encodeURIComponent(idGuia)}`;

    } catch (erro) {

        console.error("Erro ao abrir espelho:", erro);

        mostrarFeedback(
            detalhes.espelhoFeedback,
            erro.message || "Não foi possível abrir o espelho.",
            true
        );

    } finally {
        operacaoEmAndamento = false;
        atualizarBotoes();
    }
}
