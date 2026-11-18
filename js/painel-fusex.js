
/* =====================================================
   PAINEL DO COLABORADOR FUSEX

   Dependências:
   - api.js
   - formatters.js

   Funcionalidades:
   - Listagem de todas as pré-guias
   - Indicadores e filtros
   - Visualização de detalhes
   - Visualização de encaminhamentos
   - Aprovação de pré-guias
   - Recusa com justificativa obrigatória
   - Bloqueio de análise da própria solicitação
===================================================== */

const fusex = {
    total: document.getElementById("total-solicitacoes"),
    analise: document.getElementById("total-analise"),
    autorizadas: document.getElementById("total-autorizadas"),
    negadas: document.getElementById("total-negadas"),

    busca: document.getElementById("busca-solicitacao"),
    filtro: document.getElementById("filtro-status"),
    atualizar: document.getElementById("btn-atualizar"),
    lisura: document.getElementById("btn-lisura"),

    carregando: document.getElementById("lista-carregando"),
    erro: document.getElementById("lista-erro"),
    vazio: document.getElementById("lista-vazia"),
    contador: document.getElementById("contador-resultados"),

    tabelaContainer: document.getElementById("tabela-container"),
    tabela: document.getElementById("tabela-solicitacoes"),

    detalhes: document.getElementById("detalhes-solicitacao"),
    conteudoDetalhes: document.getElementById("conteudo-detalhes"),
    fecharDetalhes: document.getElementById("btn-fechar-detalhes")
};

let solicitacoes = [];

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function textoSeguro(valor) {
    return escapeHtml(valor ?? "—");
}

function nomesExames(itens = []) {
    return itens
        .map(item => item.nmExame)
        .filter(Boolean)
        .join(", ") || "Nenhum procedimento";
}

function nomesPrestadores(itens = []) {
    const nomes = [
        ...new Set(
            itens
                .map(item => item.nmPrestador)
                .filter(Boolean)
        )
    ];

    return nomes.join(", ") || "Não informado";
}

function situacaoClasse(status) {
    const classes = {
        EM_ANALISE: "em_analise",
        AUTORIZADA: "autorizada",
        NEGADA: "negada"
    };

    return classes[status] || "";
}

/* =====================================================
   INDICADORES
===================================================== */

function atualizarResumo() {
    fusex.total.textContent = solicitacoes.length;

    fusex.analise.textContent =
        solicitacoes.filter(s =>
            s.status === "EM_ANALISE"
        ).length;

    fusex.autorizadas.textContent =
        solicitacoes.filter(s =>
            s.status === "AUTORIZADA"
        ).length;

    fusex.negadas.textContent =
        solicitacoes.filter(s =>
            s.status === "NEGADA"
        ).length;
}

/* =====================================================
   FILTROS
===================================================== */

function obterResultadosFiltrados() {
    const termo = normalizarTexto(
        fusex.busca.value.trim()
    );

    const filtro = fusex.filtro.value;

    return solicitacoes.filter(s => {
        if (filtro && s.status !== filtro) {
            return false;
        }

        const dadosBusca = normalizarTexto([
            s.idPreGuia,
            codigoSolicitacao(s.idPreGuia),
            s.nomeBeneficiario,
            s.emailBeneficiario,
            nomesExames(s.itens || []),
            nomesPrestadores(s.itens || [])
        ].join(" "));

        return dadosBusca.includes(termo);
    });
}

/* =====================================================
   LISTAGEM DAS SOLICITAÇÕES
===================================================== */

function renderizarTabela() {
    const resultados = obterResultadosFiltrados();

    fusex.contador.textContent =
        `${resultados.length} de ${solicitacoes.length}`;

    fusex.tabela.innerHTML = resultados.map(s => {
        const itens = s.itens || [];
        const status = situacaoClasse(s.status);

        return `
            <tr>
                <td>
                    <strong class="fusex-codigo">
                        ${textoSeguro(
                            codigoSolicitacao(s.idPreGuia)
                        )}
                    </strong>

                    <span class="fusex-secundario">
                        ${textoSeguro(
                            formatDateTime(s.criadoEm)
                        )}
                    </span>
                </td>

                <td>
                    <strong class="fusex-destaque">
                        ${textoSeguro(s.nomeBeneficiario)}
                    </strong>

                    <span class="fusex-secundario">
                        ${textoSeguro(s.emailBeneficiario)}
                    </span>

                    ${s.solicitacaoPropria === true ? `
                        <span class="fusex-etiqueta propria">
                            Minha solicitação
                        </span>
                    ` : ""}
                </td>

                <td>
                    <span class="fusex-destaque">
                        ${textoSeguro(nomesExames(itens))}
                    </span>

                    <span class="fusex-secundario">
                        OCS: ${textoSeguro(
                            nomesPrestadores(itens)
                        )}
                    </span>
                </td>

                <td>
                    <span class="fusex-etiqueta ${status}">
                        ${textoSeguro(
                            getStatusLabel(s.status)
                        )}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="fusex-botao-linha"
                        data-id="${s.idPreGuia}">
                        Ver detalhes
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    fusex.vazio.hidden = resultados.length !== 0;
    fusex.tabelaContainer.hidden = resultados.length === 0;
}

/* =====================================================
   DETALHES DA SOLICITAÇÃO
===================================================== */

function renderizarDetalhes(idPreGuia) {

    const solicitacao = solicitacoes.find(s =>
        s.idPreGuia === idPreGuia
    );

    if (!solicitacao) return;

    const itens = solicitacao.itens || [];

    // Procedimentos da pré-guia
    const listaItens = itens.map(item => `
        <li>
            <strong class="fusex-destaque">
                ${textoSeguro(item.nmExame)}
            </strong>

            <span class="fusex-secundario">
                Código TUSS:
                ${textoSeguro(item.codTuss)}
            </span>

            <span class="fusex-secundario">
                OCS:
                ${textoSeguro(item.nmPrestador)}
            </span>

            <span class="fusex-secundario">
                Valor:
                ${textoSeguro(
                    formatCurrency(item.valor)
                )}
            </span>

            <span class="fusex-secundario">
                Situação:
                ${textoSeguro(
                    getStatusLabel(item.status)
                )}
            </span>
        </li>
    `).join("");

    /* -----------------------------------------
       VERIFICAÇÃO DE PERMISSÃO
    ----------------------------------------- */

    // Somente uma solicitação em análise pode receber decisão.
    // O bloqueio definitivo da própria solicitação
    // também deve ser validado pelo backend.

    const podeAnalisar =
        solicitacao.status === "EM_ANALISE"
        && solicitacao.solicitacaoPropria === false
        && itens.length > 0;

    /* -----------------------------------------
       AVISOS
    ----------------------------------------- */

    let aviso = "";

    if (solicitacao.solicitacaoPropria === true) {

        aviso = `
            <div class="fusex-aviso propria">
                <strong>
                    Esta é uma solicitação sua
                </strong>

                <p>
                    Você pode consultar e acompanhar
                    esta pré-guia, mas não pode
                    aprová-la nem recusá-la.

                    A decisão deverá ser realizada
                    por outro colaborador autorizado.
                </p>
            </div>
        `;

    } else if (solicitacao.solicitacaoPropria !== false) {

        aviso = `
            <div class="fusex-aviso">
                Não foi possível confirmar quem é
                o titular desta solicitação.

                A análise está indisponível
                até a confirmação pelo sistema.
            </div>
        `;

    } else if (solicitacao.status !== "EM_ANALISE") {

        aviso = `
            <div class="fusex-aviso">
                Esta solicitação já recebeu uma decisão
                e não pode ser analisada novamente.
            </div>
        `;

    } else if (itens.length === 0) {

        aviso = `
            <div class="fusex-aviso">
                Esta pré-guia não possui procedimentos
                cadastrados e não pode ser analisada.
            </div>
        `;
    }

    /* -----------------------------------------
       ÁREA DE APROVAÇÃO E RECUSA
    ----------------------------------------- */

    const areaDecisao = podeAnalisar
        ? `
            <section class="fusex-area-decisao">
                <div class="fusex-area-decisao-topo">
                    <h3>Análise da pré-guia</h3>

                    <p>
                        Confira os procedimentos, a OCS e o
                        encaminhamento antes de registrar sua decisão.
                    </p>
                </div>

                <div class="fusex-botoes-decisao">
                    <button type="button"
                            id="btn-autorizar"
                            class="fusex-botao fusex-botao-principal">
                        Autorizar pré-guia
                    </button>

                    <button type="button"
                            id="btn-negar"
                            class="fusex-botao fusex-botao-negar">
                        Negar pré-guia
                    </button>
                </div>

                <div id="form-recusa"
                     class="fusex-form-recusa"
                     hidden>

                    <label for="motivo-recusa" class="fusex-label-recusa">
                        Motivo da recusa
                    </label>

                    <textarea id="motivo-recusa"
                              class="fusex-textarea-recusa"
                              rows="5"
                              maxlength="1000"
                              placeholder="Explique o que precisa ser corrigido pelo beneficiário."></textarea>

                    <div class="fusex-form-recusa-acoes">
                        <button type="button"
                                id="btn-confirmar-recusa"
                                class="fusex-botao fusex-botao-negar">
                            Confirmar recusa
                        </button>
                    </div>
                </div>

                <p id="mensagem-decisao"
                   class="fusex-mensagem-decisao"
                   role="alert"
                   hidden></p>
            </section>
        `
        : "";

    /* -----------------------------------------
       HISTÓRICO DA DECISÃO
    ----------------------------------------- */

    let historicoDecisao = "";

    if (
        solicitacao.status === "AUTORIZADA"
        || solicitacao.status === "NEGADA"
    ) {

        historicoDecisao = `
            <div class="fusex-aviso">
                <strong>Decisão registrada</strong>

                <p>
                    Situação:
                    ${textoSeguro(
                        getStatusLabel(solicitacao.status)
                    )}
                </p>

                ${solicitacao.dataAnalise ? `
                    <p>
                        Data da análise:
                        ${textoSeguro(
                            formatDateTime(
                                solicitacao.dataAnalise
                            )
                        )}
                    </p>
                ` : ""}

                ${
                    solicitacao.status === "NEGADA"
                    && solicitacao.motivoRecusa
                    ? `
                        <p>
                            <strong>Motivo da recusa:</strong>
                            ${textoSeguro(
                                solicitacao.motivoRecusa
                            )}
                        </p>
                    `
                    : ""
                }
            </div>
        `;
    }

    /* -----------------------------------------
       MONTAGEM DO HTML COMPLETO
    ----------------------------------------- */

    fusex.conteudoDetalhes.innerHTML = `

        <div class="fusex-detalhe-topo">

            <div>
                <p class="fusex-sobretitulo">
                    DETALHES DA SOLICITAÇÃO
                </p>

                <h2>
                    ${textoSeguro(
                        codigoSolicitacao(
                            solicitacao.idPreGuia
                        )
                    )}
                </h2>
            </div>

            <span class="fusex-etiqueta ${situacaoClasse(
                solicitacao.status
            )}">
                ${textoSeguro(
                    getStatusLabel(solicitacao.status)
                )}
            </span>

        </div>

        <div class="fusex-detalhe-grid">

            <div class="fusex-campo">
                <small>Beneficiário</small>

                <strong>
                    ${textoSeguro(
                        solicitacao.nomeBeneficiario
                    )}
                </strong>
            </div>

            <div class="fusex-campo">
                <small>E-mail</small>

                <strong>
                    ${textoSeguro(
                        solicitacao.emailBeneficiario
                    )}
                </strong>
            </div>

            <div class="fusex-campo">
                <small>Data da solicitação</small>

                <strong>
                    ${textoSeguro(
                        formatDateTime(
                            solicitacao.criadoEm
                        )
                    )}
                </strong>
            </div>

            <div class="fusex-campo">
                <small>Procedimentos solicitados</small>

                <strong>
                    ${itens.length}
                </strong>
            </div>

        </div>

        <h3>Procedimentos e prestadores</h3>

        <ul class="fusex-itens">
            ${
                listaItens
                || "<li>Nenhum procedimento cadastrado.</li>"
            }
        </ul>

        <!-- Encaminhamento -->
        <div class="fusex-encaminhamento-box">
            <div class="fusex-encaminhamento-texto">
                <h3>Encaminhamento médico</h3>

                <p class="fusex-secundario">
                    ${solicitacao.possuiEncaminhamento
                        ? "Abra o arquivo anexado para conferir o documento enviado pelo beneficiário."
                        : "Nenhum encaminhamento anexado."}
                </p>
            </div>

            ${solicitacao.possuiEncaminhamento ? `
                <button type="button"
                        class="fusex-botao"
                        id="btn-ver-encaminhamento">
                    Visualizar encaminhamento
                </button>
            ` : ""}
        </div>

        <p id="erro-encaminhamento"
           class="fusex-erro"
           role="alert"
           hidden></p>

        <!-- NOVO: Aprovação e recusa -->
        ${areaDecisao}

        <!-- Avisos de permissão -->
        ${aviso}

        <!-- Histórico -->
        ${historicoDecisao}

    `;

    fusex.detalhes.hidden = false;

    /* -----------------------------------------
       EVENTO DO ENCAMINHAMENTO
    ----------------------------------------- */

    const botaoArquivo = document.getElementById(
        "btn-ver-encaminhamento"
    );

    if (botaoArquivo) {

        botaoArquivo.addEventListener("click", () => {
            visualizarEncaminhamento(
                solicitacao.idPreGuia
            );
        });
    }

    /* -----------------------------------------
       EVENTO: AUTORIZAR
    ----------------------------------------- */

    const btnAutorizar = document.getElementById(
        "btn-autorizar"
    );

    if (btnAutorizar) {

        btnAutorizar.addEventListener("click", async () => {

            const confirmado = confirm(
                "Deseja autorizar esta pré-guia?"
            );

            if (!confirmado) return;

            await registrarDecisaoNaTela(
                solicitacao.idPreGuia,
                "AUTORIZADA"
            );
        });
    }

    /* -----------------------------------------
       EVENTO: MOSTRAR FORMULÁRIO DE RECUSA
    ----------------------------------------- */

    const btnNegar = document.getElementById(
        "btn-negar"
    );

    if (btnNegar) {

        btnNegar.addEventListener("click", () => {

            const formulario = document.getElementById(
                "form-recusa"
            );

            formulario.hidden = false;

            document.getElementById(
                "motivo-recusa"
            ).focus();
        });
    }

    /* -----------------------------------------
       EVENTO: CONFIRMAR RECUSA
    ----------------------------------------- */

    const btnConfirmarRecusa = document.getElementById(
        "btn-confirmar-recusa"
    );

    if (btnConfirmarRecusa) {

        btnConfirmarRecusa.addEventListener(
            "click",
            async () => {

                const motivo = document.getElementById(
                    "motivo-recusa"
                ).value.trim();

                const mensagem = document.getElementById(
                    "mensagem-decisao"
                );

                if (!motivo) {
                    mensagem.textContent =
                        "Informe o motivo da recusa.";

                    mensagem.hidden = false;
                    return;
                }

                const confirmado = confirm(
                    "Deseja negar esta pré-guia com a justificativa informada?"
                );

                if (!confirmado) return;

                await registrarDecisaoNaTela(
                    solicitacao.idPreGuia,
                    "NEGADA",
                    motivo
                );
            }
        );
    }

    fusex.detalhes.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =====================================================
   REGISTRAR DECISÃO NO BACKEND
===================================================== */

async function registrarDecisaoNaTela(
    idPreGuia,
    decisao,
    motivoRecusa = ""
) {

    const mensagem = document.getElementById(
        "mensagem-decisao"
    );

    const botoes = [
        "btn-autorizar",
        "btn-negar",
        "btn-confirmar-recusa"
    ]
        .map(id => document.getElementById(id))
        .filter(Boolean);

    // Evita cliques repetidos durante a requisição
    botoes.forEach(botao => {
        botao.disabled = true;
    });

    mensagem.hidden = false;
    mensagem.textContent = "Registrando decisão...";

    try {

        await decidirPreGuia(
            idPreGuia,
            decisao,
            motivoRecusa
        );

        // Atualiza a lista e os indicadores
        await carregarSolicitacoes();

        const resultado = decisao === "AUTORIZADA"
            ? "Pré-guia autorizada com sucesso."
            : "Pré-guia negada. Justificativa registrada.";

        alert(resultado);

    } catch (erro) {

        console.error(
            "Erro ao registrar decisão:",
            erro
        );

        mensagem.textContent =
            erro.message
            || "Não foi possível registrar a decisão.";

        botoes.forEach(botao => {
            botao.disabled = false;
        });
    }
}

/* =====================================================
   VISUALIZAR ENCAMINHAMENTO
===================================================== */

async function visualizarEncaminhamento(idPreGuia) {

    const erro = document.getElementById(
        "erro-encaminhamento"
    );

    const botao = document.getElementById(
        "btn-ver-encaminhamento"
    );

    erro.hidden = true;
    botao.disabled = true;

    try {

        const url = await obterArquivoPreGuiaFusex(
            idPreGuia
        );

        const link = document.createElement("a");

        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 60000);

    } catch (error) {

        console.error(
            "Erro ao abrir encaminhamento:",
            error
        );

        erro.textContent =
            error.message
            || "Não foi possível abrir o arquivo.";

        erro.hidden = false;

    } finally {

        botao.disabled = false;
    }
}

/* =====================================================
   CARREGAR SOLICITAÇÕES
===================================================== */

async function carregarSolicitacoes() {

    fusex.carregando.hidden = false;
    fusex.erro.hidden = true;
    fusex.vazio.hidden = true;

    fusex.tabelaContainer.hidden = true;
    fusex.detalhes.hidden = true;

    fusex.atualizar.disabled = true;

    try {

        solicitacoes = await listarPreGuiasFusex();

        atualizarResumo();
        renderizarTabela();

    } catch (error) {

        console.error(
            "Erro ao consultar solicitações:",
            error
        );

        fusex.erro.textContent =
            error.message
            || "Não foi possível consultar as pré-guias.";

        fusex.erro.hidden = false;

    } finally {

        fusex.carregando.hidden = true;
        fusex.atualizar.disabled = false;
    }
}

/* =====================================================
   EVENTOS DA PÁGINA
===================================================== */

// Pesquisa
fusex.busca.addEventListener(
    "input",
    renderizarTabela
);

// Filtro de situação
fusex.filtro.addEventListener(
    "change",
    renderizarTabela
);

// Atualização manual
fusex.atualizar.addEventListener(
    "click",
    carregarSolicitacoes
);

// Fechar detalhes
fusex.fecharDetalhes.addEventListener("click", () => {

    fusex.detalhes.hidden = true;

    document.querySelector(".fusex-card")
        .scrollIntoView({
            behavior: "smooth"
        });
});

// Abrir detalhes de uma solicitação
fusex.tabela.addEventListener("click", event => {

    const botao = event.target.closest(
        "button[data-id]"
    );

    if (!botao) return;

    renderizarDetalhes(
        Number(botao.dataset.id)
    );
});

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function iniciarPainelFusex() {

    const perfis = perfisDoUsuario()
        .map(perfil => perfil.toUpperCase());

    const autorizado = perfis.some(perfil =>
        ["FUSEX", "ADMIN"].includes(perfil)
    );

    if (!autorizado) {

        fusex.carregando.hidden = true;

        fusex.erro.textContent =
            "Acesso restrito aos colaboradores autorizados.";

        fusex.erro.hidden = false;

        return;
    }

    // Lisura possui permissão separada
    fusex.lisura.hidden = !temAcessoLisura();

    carregarSolicitacoes();
}

iniciarPainelFusex();
