
/* =====================================================
   FUSEX — EMISSAO DE GUIA OFICIAL

   Dependências:
   - api.js
   - formatters.js
===================================================== */

const emissao = {
    carregando: document.getElementById("emissao-carregando"),
    erro: document.getElementById("emissao-erro"),
    dados: document.getElementById("emissao-dados"),
    upload: document.getElementById("emissao-upload"),
    sucesso: document.getElementById("emissao-sucesso"),

    formulario: document.getElementById("form-emitir-guia"),
    arquivo: document.getElementById("arquivo-guia"),
    nomeArquivo: document.getElementById("nome-arquivo"),
    erroUpload: document.getElementById("erro-upload"),
    emitir: document.getElementById("btn-emitir"),

    codigoGuia: document.getElementById("codigo-guia-emitida"),
    statusGuia: document.getElementById("status-guia-emitida"),
    acompanhar: document.getElementById("btn-acompanhar-guias")
};

const MAX_PDF_SIZE = 10 * 1024 * 1024;

// Preencher com o caminho da tela desenvolvida pelo colega.
const URL_ACOMPANHAMENTO_GUIAS = "";

let solicitacaoAtual = null;

/* =====================================================
   FUNCOES AUXILIARES
===================================================== */

function mostrarErro(mensagem) {

    emissao.erro.textContent = mensagem;
    emissao.erro.hidden = false;
}

function mostrarErroUpload(mensagem) {

    emissao.erroUpload.textContent = mensagem;
    emissao.erroUpload.hidden = false;
}

function validarArquivo(arquivo) {

    if (!arquivo) {
        return "Selecione o PDF da guia oficial.";
    }

    if (arquivo.size === 0) {
        return "O arquivo está vazio.";
    }

    if (arquivo.type !== "application/pdf") {
        return "O arquivo precisa estar no formato PDF.";
    }

    if (arquivo.size > MAX_PDF_SIZE) {
        return "O arquivo deve ter no máximo 10 MB.";
    }

    return null;
}

/* =====================================================
   RENDERIZAR DADOS DA SOLICITACAO
===================================================== */

function renderizarDados(solicitacao) {

    const itens = solicitacao.itens || [];

    const prestadores = [
        ...new Set(
            itens
                .map(item => item.nmPrestador)
                .filter(Boolean)
        )
    ];

    const total = itens.reduce(
        (soma, item) => soma + (Number(item.valor) || 0),
        0
    );

    const listaProcedimentos = itens.map(item => `
        <div class="emissao-procedimento">

            <strong>
                ${escapeHtml(item.nmExame)}
            </strong>

            <small>
                Código TUSS: ${escapeHtml(item.codTuss)}
            </small>

            <small>
                OCS: ${escapeHtml(item.nmPrestador)}
            </small>

            <small>
                Valor contratual:
                ${escapeHtml(formatCurrency(item.valor))}
            </small>

            <small>
                Situação:
                ${escapeHtml(getStatusLabel(item.status))}
            </small>

        </div>
    `).join("");

    emissao.dados.innerHTML = `

        <div class="emissao-card-topo">

            <h2>
                Solicitação
                ${escapeHtml(
                    codigoSolicitacao(solicitacao.idPreGuia)
                )}
            </h2>

            <span class="fusex-etiqueta autorizada">
                Autorizada
            </span>

        </div>

        <div class="emissao-dados-grid">

            <div class="emissao-campo">
                <small>Beneficiário</small>
                <strong>
                    ${escapeHtml(solicitacao.nomeBeneficiario)}
                </strong>
            </div>

            <div class="emissao-campo">
                <small>E-mail</small>
                <strong>
                    ${escapeHtml(solicitacao.emailBeneficiario)}
                </strong>
            </div>

            <div class="emissao-campo">
                <small>Data da solicitação</small>
                <strong>
                    ${escapeHtml(
                        formatDateTime(solicitacao.criadoEm)
                    )}
                </strong>
            </div>

            <div class="emissao-campo">
                <small>Data da autorização</small>
                <strong>
                    ${escapeHtml(
                        formatDateTime(solicitacao.dataAnalise)
                    )}
                </strong>
            </div>

        </div>

        <h3>Organização Civil de Saúde — OCS</h3>

        <div class="emissao-procedimento">
            <strong>
                ${escapeHtml(
                    prestadores.join(", ") || "Não informada"
                )}
            </strong>
        </div>

        <h3>Procedimentos autorizados</h3>

        ${listaProcedimentos}

        <div class="emissao-total">

            <span>Total dos procedimentos</span>

            <strong>
                ${escapeHtml(formatCurrency(total))}
            </strong>

        </div>
    `;

    emissao.dados.hidden = false;
}

/* =====================================================
   CONFIRMACAO DA GUIA EMITIDA
===================================================== */

function mostrarSucesso(codigo, status) {

    emissao.codigoGuia.textContent = codigo;

    const statusLegivel = status === "ATIVA"
        ? "Situação da guia: Ativa"
        : `Situação da guia: ${status || "Registrada"}`;

    emissao.statusGuia.textContent = statusLegivel;

    emissao.upload.hidden = true;
    emissao.sucesso.hidden = false;

    if (URL_ACOMPANHAMENTO_GUIAS) {

        emissao.acompanhar.href = URL_ACOMPANHAMENTO_GUIAS;
        emissao.acompanhar.hidden = false;
    }

    emissao.sucesso.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =====================================================
   CARREGAR A PRE-GUIA
===================================================== */

async function carregarPreGuia() {

    emissao.carregando.hidden = false;

    try {

        const perfis = perfisDoUsuario()
            .map(perfil => perfil.toUpperCase());

        const autorizado = perfis.some(
            perfil => ["FUSEX", "ADMIN"].includes(perfil)
        );

        if (!autorizado) {
            throw new Error(
                "Acesso restrito aos colaboradores autorizados."
            );
        }

        const parametros = new URLSearchParams(
            window.location.search
        );

        const idPreGuia = Number(
            parametros.get("idPreGuia")
        );

        if (!Number.isSafeInteger(idPreGuia)
                || idPreGuia <= 0) {

            throw new Error(
                "Nenhuma solicitação válida foi selecionada."
            );
        }

        // Reaproveita a listagem existente do painel FUSEx
        const solicitacoes = await listarPreGuiasFusex();

        solicitacaoAtual = solicitacoes.find(
            s => Number(s.idPreGuia) === idPreGuia
        );

        if (!solicitacaoAtual) {

            throw new Error(
                "Solicitação não encontrada."
            );
        }

        if (solicitacaoAtual.solicitacaoPropria !== false) {

            throw new Error(
                "Você não pode emitir esta guia."
            );
        }

        if (solicitacaoAtual.status !== "AUTORIZADA") {

            throw new Error(
                "A pré-guia precisa estar autorizada."
            );
        }

        const itens = solicitacaoAtual.itens || [];

        if (itens.length === 0) {

            throw new Error(
                "A solicitação não possui procedimentos."
            );
        }

        if (itens.some(item => item.status !== "AUTORIZADA")) {

            throw new Error(
                "Existem procedimentos não autorizados."
            );
        }

        renderizarDados(solicitacaoAtual);

        // Caso a guia já exista, não permite outro upload.
        if (solicitacaoAtual.idGuiaOficial != null) {

            mostrarSucesso(
                solicitacaoAtual.codigoGuia,
                solicitacaoAtual.statusGuiaOficial
            );

            return;
        }

        emissao.upload.hidden = false;

    } catch (erro) {

        console.error(
            "Erro ao carregar solicitação:",
            erro
        );

        mostrarErro(erro.message);

    } finally {

        emissao.carregando.hidden = true;
    }
}

/* =====================================================
   SELECIONAR ARQUIVO
===================================================== */

emissao.arquivo.addEventListener("change", () => {

    emissao.erroUpload.hidden = true;
    emissao.nomeArquivo.textContent = "";

    const arquivo = emissao.arquivo.files[0];

    if (!arquivo) return;

    const erro = validarArquivo(arquivo);

    if (erro) {

        mostrarErroUpload(erro);
        emissao.arquivo.value = "";
        return;
    }

    const tamanho = (
        arquivo.size / (1024 * 1024)
    ).toFixed(2);

    emissao.nomeArquivo.textContent =
        `${arquivo.name} — ${tamanho} MB`;
});

/* =====================================================
   EMITIR GUIA OFICIAL
===================================================== */

emissao.formulario.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        emissao.erroUpload.hidden = true;

        if (!solicitacaoAtual) return;

        const arquivo = emissao.arquivo.files[0];

        const erro = validarArquivo(arquivo);

        if (erro) {

            mostrarErroUpload(erro);
            return;
        }

        const confirmado = confirm(
            "Confirma o registro da guia oficial para esta solicitação?"
        );

        if (!confirmado) return;

        emissao.emitir.disabled = true;
        emissao.arquivo.disabled = true;
        emissao.emitir.textContent = "Emitindo guia...";

        try {

            const guia = await emitirGuiaOficial(
                solicitacaoAtual.idPreGuia,
                arquivo
            );

            solicitacaoAtual.idGuiaOficial = guia.id;
            solicitacaoAtual.codigoGuia = guia.codigoGuia;
            solicitacaoAtual.statusGuiaOficial = guia.status;

            mostrarSucesso(
                guia.codigoGuia,
                guia.status
            );

        } catch (erro) {

            console.error(
                "Erro ao emitir guia:",
                erro
            );

            mostrarErroUpload(erro.message);

        } finally {

            emissao.emitir.disabled = false;
            emissao.arquivo.disabled = false;
            emissao.emitir.textContent = "Emitir guia oficial";
        }
    }
);

/* =====================================================
   INICIALIZACAO
===================================================== */

carregarPreGuia();
