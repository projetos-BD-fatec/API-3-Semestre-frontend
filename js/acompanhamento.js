/* =====================================================
   Página: Acompanhamento do fluxo (US17 / SCRUM-66)

   Visão do responsável pelo FUSEx. A lista mostra em que
   etapa cada guia está e pode ser filtrada por etapa; ao
   escolher uma guia, a linha do tempo abre ao lado com as
   etapas já concluídas e a data de cada uma.

   Depende de: api.js (listarAcompanhamento,
   buscarAcompanhamentoGuia, liquidarGuia, ETAPAS_FLUXO)
   e formatters.js (escapeHtml, formatDateTime).
===================================================== */

let guias = [];
let guiaSelecionada = null;

const el = {
    carregando: document.getElementById("lista-carregando"),
    erro: document.getElementById("lista-erro"),
    conteudo: document.getElementById("lista-conteudo"),

    filtroEtapa: document.getElementById("filtro-etapa"),
    busca: document.getElementById("busca-guia"),
    tabela: document.getElementById("tabela-guias"),
    vazia: document.getElementById("lista-vazia"),

    painel: document.getElementById("painel-fluxo"),
    painelVazio: document.getElementById("painel-vazio"),
    painelTitulo: document.getElementById("painel-titulo"),
    painelSubtitulo: document.getElementById("painel-subtitulo"),
    painelErro: document.getElementById("painel-erro"),
    timeline: document.getElementById("timeline"),
    blocoLiquidacao: document.getElementById("bloco-liquidacao"),

    modalRevisao: document.getElementById("modal-revisao"),
    revisaoCorpo: document.getElementById("revisao-corpo"),
    revisaoErro: document.getElementById("revisao-erro"),
    revisaoCancelar: document.getElementById("revisao-cancelar"),
    revisaoConfirmar: document.getElementById("revisao-confirmar")
};


/* ===============================
   UTILITÁRIOS
================================ */

function mostrarMensagem(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = !texto;
}

/** Sem acento e minúsculo, para a busca. */
function normalizar(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

/** Erro de rede (TypeError do fetch) vira mensagem amigável. */
function tratarErro(error, padrao) {
    if (error instanceof TypeError) {
        return "Não foi possível conectar ao servidor.";
    }

    return error.message || padrao;
}

/**
 * A carga inicial do histórico estimou a data de algumas etapas antigas
 * (a observação gravada no banco diz isso). A tela marca essas datas em
 * vez de apresentá-las como exatas.
 */
function dataEstimada(observacao) {
    return normalizar(observacao).includes("estimada");
}

/** Etapa concluída com resultado negativo pinta de vermelho na timeline. */
function etapaRecusada(etapa) {
    return normalizar(etapa.status).includes("recusada")
        || normalizar(etapa.status).includes("negada");
}


/* ===============================
   LINHA DO TEMPO (SCRUM-66)
================================ */

/** Monta uma etapa da linha do tempo. */
function montarEtapa(etapa) {
    const classes = ["timeline-etapa"];

    if (etapa.concluida) {
        classes.push("is-concluida");
    }

    if (etapa.atual) {
        classes.push("is-atual");
    }

    if (etapa.concluida && etapaRecusada(etapa)) {
        classes.push("is-recusada");
    }

    const seloAtual = etapa.atual
        ? '<span class="timeline-selo-atual">Etapa atual</span>'
        : "";

    const corpo = etapa.concluida
        ? `
            <p class="timeline-data">
                ${escapeHtml(formatDateTime(etapa.ocorridaEm))}
                ${dataEstimada(etapa.observacao)
                    ? '<span class="timeline-estimada" title="Data estimada na carga inicial do histórico">estimada</span>'
                    : ""}
            </p>
            ${etapa.observacao
                ? `<p class="timeline-detalhe">${escapeHtml(etapa.observacao)}</p>`
                : ""}
            ${etapa.responsavel
                ? `<p class="timeline-responsavel">Por ${escapeHtml(etapa.responsavel)}</p>`
                : ""}
        `
        : `<p class="timeline-pendente">${escapeHtml(etapa.descricao)}</p>`;

    return `
        <li class="${classes.join(" ")}">
            <span class="timeline-marcador" aria-hidden="true">${etapa.ordem}</span>
            <div class="timeline-conteudo">
                <h3 class="timeline-titulo">
                    ${escapeHtml(etapa.rotulo)}
                    ${seloAtual}
                </h3>
                ${corpo}
            </div>
        </li>
    `;
}

/** Desenha a linha do tempo inteira de uma guia. */
function desenharTimeline(acompanhamento) {
    const etapas = acompanhamento.etapas || [];

    el.timeline.innerHTML = etapas.map(montarEtapa).join("");

    el.painelTitulo.textContent =
        acompanhamento.codigoGuia || `Guia ${acompanhamento.idGuia}`;

    el.painelSubtitulo.textContent = [
        acompanhamento.nomeBeneficiario,
        acompanhamento.rotuloEtapaAtual
            ? `em ${acompanhamento.rotuloEtapaAtual}`
            : null
    ].filter(Boolean).join(" · ");

    el.painelVazio.hidden = true;
    el.painel.hidden = false;
}


/* ===============================
   REVISÃO DA LIQUIDAÇÃO (SCRUM-64)
================================ */

let resumoAtual = null;

/**
 * A guia só tem valores a revisar depois que a Lisura decide. Antes disso
 * não existe espelho conferido, e pedir o resumo daria 404.
 */
function temValoresParaRevisar(acompanhamento) {
    return acompanhamento.statusGuia === "LISURA_APROVADA"
        || acompanhamento.concluido;
}

/** Linha do item: o que foi cobrado, o que foi aprovado e por quê. */
function montarLinhaItem(item) {
    const glosa = Number(item.diferenca) > 0;

    return `
        <tr>
            <td>
                <span class="revisao-cod">${escapeHtml(item.codTuss)}</span>
                <span class="revisao-desc">${escapeHtml(item.descricao)}</span>
                <span class="revisao-data">Realizado em ${escapeHtml(formatDate(item.dataRealizacao))}</span>
            </td>
            <td class="num">${item.quantidade}</td>
            <td class="num">${escapeHtml(formatCurrency(item.totalCobrado))}</td>
            <td class="num">
                ${escapeHtml(formatCurrency(item.totalAprovado))}
                ${item.rotuloDecisao
                    ? `<span class="revisao-decisao">${escapeHtml(item.rotuloDecisao)}</span>`
                    : '<span class="revisao-decisao revisao-conforme">Conforme</span>'}
            </td>
            <td class="num ${glosa ? "revisao-glosa" : ""}">
                ${glosa ? "-" + escapeHtml(formatCurrency(item.diferenca)) : "—"}
            </td>
        </tr>
    `;
}

/** Corpo do modal: contexto, procedência, tabela e totais. */
function montarCorpoRevisao(resumo) {
    const glosou = Number(resumo.totalDiferenca) > 0;

    return `
        <dl class="revisao-contexto">
            <div><dt>Guia</dt><dd>${escapeHtml(resumo.codigoGuia || "—")}</dd></div>
            <div><dt>Beneficiário</dt><dd>${escapeHtml(resumo.nomeBeneficiario || "—")}</dd></div>
            <div><dt>OCS</dt><dd>${escapeHtml(resumo.nomePrestador || "—")}</dd></div>
            <div><dt>Espelho enviado</dt><dd>${escapeHtml(formatDateTime(resumo.espelhoEnviadoEm))}</dd></div>
        </dl>

        <p class="revisao-procedencia">
            ${resumo.itensRevisados} de ${resumo.totalItens} procedimento(s) revisado(s) pela Lisura${
                resumo.revisadoPor
                    ? ", por " + escapeHtml(resumo.revisadoPor)
                      + " em " + escapeHtml(formatDateTime(resumo.revisadoEm))
                    : ""
            }. Os demais estavam conformes e valem o valor cobrado.
        </p>

        <div class="espelho-tabela-wrap">
            <table class="espelho-tabela revisao-tabela">
                <thead>
                    <tr>
                        <th>Procedimento</th>
                        <th class="num">Qtd</th>
                        <th class="num">Cobrado</th>
                        <th class="num">Aprovado</th>
                        <th class="num">Glosa</th>
                    </tr>
                </thead>
                <tbody>${(resumo.itens || []).map(montarLinhaItem).join("")}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="2">Total</td>
                        <td class="num">${escapeHtml(formatCurrency(resumo.totalCobrado))}</td>
                        <td class="num revisao-total">${escapeHtml(formatCurrency(resumo.totalAprovado))}</td>
                        <td class="num ${glosou ? "revisao-glosa" : ""}">
                            ${glosou ? "-" + escapeHtml(formatCurrency(resumo.totalDiferenca)) : "—"}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function abrirRevisao() {
    if (!resumoAtual) {
        return;
    }

    el.revisaoCorpo.innerHTML = montarCorpoRevisao(resumoAtual);
    el.revisaoConfirmar.textContent =
        "Liquidar " + formatCurrency(resumoAtual.totalAprovado);
    el.revisaoConfirmar.disabled = false;
    mostrarMensagem(el.revisaoErro, "");
    el.modalRevisao.classList.add("show");
}

function fecharRevisao() {
    el.modalRevisao.classList.remove("show");
}

/** Bloco do painel: resumo curto que leva à revisão, ou o comprovante. */
function desenharLiquidacao(resumo) {
    resumoAtual = resumo;

    if (resumo.liquidada) {
        el.blocoLiquidacao.innerHTML = `
            <h3 class="liquidacao-titulo">Liquidada</h3>
            <p class="liquidacao-comprovante">
                ${escapeHtml(formatCurrency(resumo.valorLiquidado))}
                em ${escapeHtml(formatDateTime(resumo.liquidadoEm))}
                ${resumo.liquidadoPor ? "por " + escapeHtml(resumo.liquidadoPor) : ""}
            </p>
            <button type="button" id="acao-revisar" class="secondary-button">
                Ver os valores
            </button>
        `;
        el.blocoLiquidacao.hidden = false;
        return;
    }

    if (!resumo.podeLiquidar) {
        el.blocoLiquidacao.innerHTML = `
            <h3 class="liquidacao-titulo">Liquidação</h3>
            <p class="liquidacao-impedimento">${escapeHtml(resumo.impedimento || "")}</p>
        `;
        el.blocoLiquidacao.hidden = false;
        return;
    }

    el.blocoLiquidacao.innerHTML = `
        <h3 class="liquidacao-titulo">Pronta para liquidar</h3>
        <p class="liquidacao-intro">
            ${escapeHtml(formatCurrency(resumo.totalAprovado))} aprovados
            em ${resumo.totalItens} procedimento(s).
        </p>
        <button type="button" id="acao-revisar" class="primary-button">
            Revisar e liquidar
        </button>
    `;
    el.blocoLiquidacao.hidden = false;
}

/** Busca o resumo e desenha. Falha aqui não derruba a linha do tempo. */
async function carregarLiquidacao(acompanhamento) {
    resumoAtual = null;
    el.blocoLiquidacao.hidden = true;
    el.blocoLiquidacao.innerHTML = "";

    if (!temValoresParaRevisar(acompanhamento)) {
        return;
    }

    try {
        desenharLiquidacao(await buscarResumoLiquidacao(acompanhamento.idGuia));
    } catch (error) {
        el.blocoLiquidacao.innerHTML = `
            <h3 class="liquidacao-titulo">Liquidação</h3>
            <p class="liquidacao-impedimento">
                ${escapeHtml(tratarErro(error, "Não foi possível carregar os valores."))}
            </p>
        `;
        el.blocoLiquidacao.hidden = false;
    }
}


/* ===============================
   LISTA
================================ */

function montarLinha(guia) {
    const selecionada = guiaSelecionada === guia.idGuia;

    return `
        <tr class="${selecionada ? "is-selecionada" : ""}">
            <td>${escapeHtml(guia.codigoGuia || "—")}</td>
            <td>${escapeHtml(guia.nomeBeneficiario || "—")}</td>
            <td>
                <span class="etapa-selo">
                    ${guia.ordemEtapaAtual}. ${escapeHtml(guia.rotuloEtapaAtual)}
                </span>
            </td>
            <td>${escapeHtml(formatDateTime(guia.atualizadoEm))}</td>
            <td class="col-acoes">
                <button type="button" class="btn-link" data-guia="${guia.idGuia}">
                    Ver fluxo
                </button>
            </td>
        </tr>
    `;
}

/** Aplica a busca por texto sobre o que veio do servidor. */
function guiasVisiveis() {
    const termo = normalizar(el.busca.value).trim();

    if (!termo) {
        return guias;
    }

    return guias.filter(function (g) {
        return normalizar(g.codigoGuia).includes(termo)
            || normalizar(g.nomeBeneficiario).includes(termo);
    });
}

function desenharLista() {
    const visiveis = guiasVisiveis();

    el.tabela.innerHTML = visiveis.map(montarLinha).join("");

    mostrarMensagem(
        el.vazia,
        visiveis.length ? "" : "Nenhuma guia nesta etapa."
    );
}


/* ===============================
   AÇÕES
================================ */

async function abrirFluxo(idGuia) {
    guiaSelecionada = idGuia;
    desenharLista();

    mostrarMensagem(el.painelErro, "");

    try {
        const acompanhamento = await buscarAcompanhamentoGuia(idGuia);

        desenharTimeline(acompanhamento);
        await carregarLiquidacao(acompanhamento);

    } catch (error) {
        el.painel.hidden = true;
        el.painelVazio.hidden = true;
        mostrarMensagem(
            el.painelErro,
            tratarErro(error, "Não foi possível carregar o fluxo desta guia.")
        );
    }
}

async function liquidar() {
    if (guiaSelecionada === null) {
        return;
    }

    el.revisaoConfirmar.disabled = true;
    el.revisaoConfirmar.textContent = "Liquidando...";
    mostrarMensagem(el.revisaoErro, "");

    try {
        const resumo = await liquidarGuia(guiaSelecionada);

        fecharRevisao();
        desenharLiquidacao(resumo);

        // A guia andou para a última etapa: timeline e lista precisam
        // refletir isso.
        desenharTimeline(await buscarAcompanhamentoGuia(guiaSelecionada));
        await carregarLista();

    } catch (error) {
        el.revisaoConfirmar.disabled = false;
        el.revisaoConfirmar.textContent = "Tentar de novo";
        mostrarMensagem(
            el.revisaoErro,
            tratarErro(error, "Não foi possível registrar a liquidação.")
        );
    }
}

async function carregarLista() {
    mostrarMensagem(el.erro, "");
    el.carregando.hidden = false;

    try {
        guias = await listarAcompanhamento(el.filtroEtapa.value);
        el.conteudo.hidden = false;
        desenharLista();

    } catch (error) {
        el.conteudo.hidden = true;
        mostrarMensagem(
            el.erro,
            tratarErro(error, "Não foi possível carregar o acompanhamento.")
        );

    } finally {
        el.carregando.hidden = true;
    }
}


/* ===============================
   INÍCIO
================================ */

function montarFiltroEtapas() {
    el.filtroEtapa.innerHTML =
        '<option value="">Todas as etapas</option>'
        + ETAPAS_FLUXO.map(function (etapa) {
            return `<option value="${etapa.valor}">${etapa.rotulo}</option>`;
        }).join("");
}

function registrarEventos() {
    el.filtroEtapa.addEventListener("change", carregarLista);
    el.busca.addEventListener("input", desenharLista);
    // O botão é recriado a cada desenho do bloco, então o listener fica
    // no container, que é fixo.
    el.blocoLiquidacao.addEventListener("click", function (evento) {
        if (evento.target.closest("#acao-revisar")) {
            abrirRevisao();
        }
    });

    el.revisaoCancelar.addEventListener("click", fecharRevisao);
    el.revisaoConfirmar.addEventListener("click", liquidar);

    // Clicar fora da caixa fecha, como nos outros modais do projeto.
    el.modalRevisao.addEventListener("click", function (evento) {
        if (evento.target === el.modalRevisao) {
            fecharRevisao();
        }
    });

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") {
            fecharRevisao();
        }
    });

    // Um listener na tabela em vez de um por linha: a lista é redesenhada
    // a cada busca e os botões antigos deixam de existir.
    el.tabela.addEventListener("click", function (evento) {
        const botao = evento.target.closest("button[data-guia]");

        if (botao) {
            abrirFluxo(Number(botao.dataset.guia));
        }
    });
}

montarFiltroEtapas();
registrarEventos();
carregarLista();
