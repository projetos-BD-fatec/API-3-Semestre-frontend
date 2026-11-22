
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
let temporizadorAssinatura = null;


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
    validade: document.getElementById("detalhes-validade"),
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

    assinatura: document.getElementById("detalhes-assinatura"),
    assinaturaSelo: document.getElementById("assinatura-selo"),
    assinaturaSemCodigo: document.getElementById("assinatura-sem-codigo"),
    assinaturaComCodigo: document.getElementById("assinatura-com-codigo"),
    assinaturaAssinada: document.getElementById("assinatura-assinada"),
    assinaturaAssinadaEm: document.getElementById("assinatura-assinada-em"),
    assinaturaExpira: document.getElementById("assinatura-expira"),
    assinaturaCodigo: document.getElementById("assinatura-codigo"),
    assinaturaFeedback: document.getElementById("detalhes-assinatura-feedback"),
    btnSolicitarCodigo: document.getElementById("btn-solicitar-codigo"),
    btnNovoCodigo: document.getElementById("btn-novo-codigo"),
    btnConfirmarAssinatura: document.getElementById("btn-confirmar-assinatura"),

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

    detalhes.btnSolicitarCodigo.addEventListener("click", solicitarCodigoAssinatura);
    detalhes.btnNovoCodigo.addEventListener("click", solicitarCodigoAssinatura);
    detalhes.btnConfirmarAssinatura.addEventListener("click", confirmarAssinatura);

    // Só dígitos no campo do código; Enter confirma
    detalhes.assinaturaCodigo.addEventListener("input", () => {
        detalhes.assinaturaCodigo.value =
            detalhes.assinaturaCodigo.value.replace(/\D/g, "").slice(0, 6);
    });

    detalhes.assinaturaCodigo.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            confirmarAssinatura();
        }
    });


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
        encerrarSessao();

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

function guiaEstaAssinada() {
    return Boolean(guiaAtual?.dataAssinatura);
}

function atualizarBotoes() {

    const bloqueado = operacaoEmAndamento;

    detalhes.btnUtilizar.disabled = bloqueado;

    // O espelho só abre com a guia utilizada E assinada pelo beneficiário
    detalhes.btnEspelho.disabled =
        bloqueado || !guiaAtual || !guiaEstaUtilizada() || !guiaEstaAssinada();

    detalhes.btnSolicitarCodigo.disabled = bloqueado;
    detalhes.btnNovoCodigo.disabled = bloqueado;
    detalhes.btnConfirmarAssinatura.disabled = bloqueado;

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

    renderizarValidade();
    renderizarStatus();
    renderizarUtilizacao();
    renderizarAssinatura();
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
        CANCELADA: ["Cancelada", "is-cancelada"],
        LISURA_APROVADA: ["Lisura aprovada", "is-utilizada"],
        LISURA_RECUSADA: ["Lisura recusada", "is-cancelada"]
    };

    const [texto, classe] =
        configuracoes[status] ?? [status || "Desconhecida", ""];

    detalhes.status.className =
        "prestador-guia-status " + classe;

    detalhes.status.textContent = texto;
}

/* =====================================================
   VALIDADE DA GUIA
===================================================== */

function renderizarValidade() {

    const status = statusGuiaAtual();
    const data = formatarDataGuia(guiaAtual.dataValidade);

    let texto = "";

    if (guiaAtual.dataValidade) {
        if (status === "VENCIDA") {
            texto = `Venceu em ${data}`;
        } else if (status === "ATIVA") {
            texto = `Válida até ${data}`;
        }
    }

    detalhes.validade.textContent = texto || "\u00a0";
    detalhes.validade.classList.toggle("is-vencida", status === "VENCIDA");
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

    } else if (status === "VENCIDA") {

        detalhes.utilizacaoTitulo.textContent =
            "Guia vencida";

        detalhes.utilizacaoDescricao.textContent =
            "Esta guia venceu" +
            (guiaAtual.dataValidade
                ? ` em ${formatarDataGuia(guiaAtual.dataValidade)}`
                : "") +
            " e não pode mais ser utilizada. Oriente o beneficiário " +
            "a solicitar uma nova guia.";

    } else {

        detalhes.utilizacaoTitulo.textContent =
            "Guia indisponível para utilização";

        detalhes.utilizacaoDescricao.textContent =
            "A situação atual desta guia não permite registrar sua utilização.";
    }
}


/* =====================================================
   ASSINATURA DO BENEFICIÁRIO
   Fluxo: a OCS gera um código -> ele aparece só no app do
   beneficiário -> o beneficiário diz o código -> a OCS digita.
===================================================== */

function renderizarAssinatura() {

    pararTemporizadorAssinatura();

    const assinada = guiaEstaAssinada();

    // Só faz sentido depois que a guia foi utilizada
    const visivel = assinada || guiaEstaUtilizada();

    mostrar(detalhes.assinatura, visivel);

    if (!visivel) {
        return;
    }

    const segundos = guiaAtual.assinaturaCodigoSegundosRestantes;
    const temCodigo = !assinada && Number.isFinite(segundos) && segundos > 0;

    mostrar(detalhes.assinaturaSemCodigo, !assinada && !temCodigo);
    mostrar(detalhes.assinaturaComCodigo, temCodigo);
    mostrar(detalhes.assinaturaAssinada, assinada);

    detalhes.assinaturaSelo.textContent = assinada ? "Assinada" : "Pendente";
    detalhes.assinaturaSelo.className =
        "prestador-guia-status " + (assinada ? "is-utilizada" : "is-ativa");

    if (assinada) {
        detalhes.assinaturaAssinadaEm.textContent =
            `Assinada em ${formatarDataHoraGuia(guiaAtual.dataAssinatura)}. ` +
            "O espelho já pode ser aberto.";
    }

    if (temCodigo) {
        iniciarTemporizadorAssinatura(segundos);
    }

    // Lembrete junto do botão do espelho
    mostrarFeedback(
        detalhes.espelhoFeedback,
        guiaEstaUtilizada() && !assinada
            ? "Colete a assinatura do beneficiário para liberar o espelho."
            : ""
    );
}

function pararTemporizadorAssinatura() {
    if (temporizadorAssinatura) {
        clearInterval(temporizadorAssinatura);
        temporizadorAssinatura = null;
    }
}

function iniciarTemporizadorAssinatura(segundosIniciais) {

    let restante = segundosIniciais;

    const atualizar = () => {

        if (restante <= 0) {
            guiaAtual.assinaturaCodigoSegundosRestantes = null;
            renderizarAssinatura();

            mostrarFeedback(
                detalhes.assinaturaFeedback,
                "O código expirou. Gere um novo código.",
                true
            );
            return;
        }

        const minutos = Math.floor(restante / 60);
        const segundos = String(restante % 60).padStart(2, "0");

        detalhes.assinaturaExpira.textContent =
            `O código expira em ${minutos}:${segundos}.`;

        restante--;
    };

    atualizar();

    // atualizar() pode ter encerrado o ciclo (código já expirado)
    if (restante >= 0 && guiaAtual.assinaturaCodigoSegundosRestantes) {
        temporizadorAssinatura = setInterval(atualizar, 1000);
    }
}

async function solicitarCodigoAssinatura() {

    if (!guiaAtual || operacaoEmAndamento) {
        return;
    }

    mostrarFeedback(detalhes.assinaturaFeedback, "");

    operacaoEmAndamento = true;
    atualizarBotoes();

    try {
        const resposta = await solicitarAssinaturaGuia(idGuia);

        guiaAtual.assinaturaCodigoSegundosRestantes =
            Number(resposta.validadeMinutos) * 60;

        renderizarAssinatura();

        mostrarFeedback(
            detalhes.assinaturaFeedback,
            "Código gerado. Ele já aparece no aplicativo do beneficiário, " +
            "na opção Assinar guia."
        );

        detalhes.assinaturaCodigo.value = "";
        detalhes.assinaturaCodigo.focus();

    } catch (erro) {

        console.error("Erro ao gerar código de assinatura:", erro);

        mostrarFeedback(
            detalhes.assinaturaFeedback,
            erro.message || "Não foi possível gerar o código.",
            true
        );

    } finally {
        operacaoEmAndamento = false;
        atualizarBotoes();
    }
}

async function confirmarAssinatura() {

    if (!guiaAtual || operacaoEmAndamento) {
        return;
    }

    const codigo = detalhes.assinaturaCodigo.value.replace(/\D/g, "");

    if (codigo.length !== 6) {
        mostrarFeedback(
            detalhes.assinaturaFeedback,
            "Digite os 6 dígitos do código mostrado no aplicativo do beneficiário.",
            true
        );
        detalhes.assinaturaCodigo.focus();
        return;
    }

    mostrarFeedback(detalhes.assinaturaFeedback, "");

    operacaoEmAndamento = true;
    atualizarBotoes();

    try {
        await confirmarAssinaturaGuia(idGuia, codigo);

        operacaoEmAndamento = false;

        await carregarDetalhesGuia();

        mostrarFeedback(
            detalhes.assinaturaFeedback,
            "Assinatura confirmada. O espelho já pode ser aberto."
        );

    } catch (erro) {

        console.error("Erro ao confirmar assinatura:", erro);

        operacaoEmAndamento = false;

        // 400 = código errado (pode tentar de novo); 409 = código expirou,
        // foi bloqueado ou a guia já foi assinada: recarrega a situação.
        if (erro.status === 409) {
            await carregarDetalhesGuia();
        }

        mostrarFeedback(
            detalhes.assinaturaFeedback,
            erro.message || "Não foi possível confirmar a assinatura.",
            true
        );

        detalhes.assinaturaCodigo.value = "";
        detalhes.assinaturaCodigo.focus();

    } finally {
        operacaoEmAndamento = false;
        atualizarBotoes();
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

            // Já gera o código para o beneficiário assinar. Se falhar,
            // a OCS pode gerar manualmente pelo botão da seção de assinatura.
            try {
                await solicitarAssinaturaGuia(idGuia);
            } catch (erro) {
                console.error("Erro ao gerar código de assinatura:", erro);
            }

            await carregarDetalhesGuia();

            detalhes.assinatura.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
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
