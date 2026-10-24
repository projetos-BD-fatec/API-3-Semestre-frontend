/* =====================================================
   Página: conferência do espelho (Lisura)

   Recebe a guia pela URL:  conferencia-espelho.html?idGuia=123
   Mostra, na mesma linha, o valor cobrado pela OCS e o valor
   contratual, pintando a linha quando houver diferença:
     - vermelho: cobrado ACIMA do contrato
     - amarelo:  cobrado ABAIXO do contrato ou SEM valor contratual

   Em cada item divergente o analista pode acatar o valor contratual,
   manter o cobrado ou informar um valor ajustado (PUT /lisura/{guiaId}/revisao).

   No rodapé, "Confirmar Lisura" e "Recusar" registram a decisão final
   (PATCH /lisura/{guiaId}/decisao) e voltam para a fila. Depois da
   decisão a tela fica só para consulta.

   Depende de: api.js (buscarConferenciaLisura, salvarRevisaoLisura, decidirLisura)
   e formatters.js (escapeHtml, formatCurrency).
===================================================== */

const SITUACAO_ITEM = {
    CONFORME: { label: "Conforme", classe: "is-conforme" },
    ACIMA: { label: "Acima do contrato", classe: "is-acima" },
    ABAIXO: { label: "Abaixo do contrato", classe: "is-abaixo" },
    SEM_CONTRATO: { label: "Sem valor contratual", classe: "is-sem-contrato" }
};

const PROCEDIMENTO_NA_GUIA = {
    NAO_CONFIRMADO: "Realização não confirmada pela OCS",
    FORA_DA_GUIA: "Procedimento fora da guia"
};

const DECISAO_LISURA = {
    ACATAR_CONTRATUAL: { opcao: "Acatar contratual", label: "Contratual acatado" },
    MANTER_COBRADO: { opcao: "Manter cobrado", label: "Cobrado mantido" },
    VALOR_AJUSTADO: { opcao: "Valor ajustado", label: "Valor ajustado" }
};

// Status da guia depois da decisão final do analista
const STATUS_DECIDIDO = {
    LISURA_APROVADA: { selo: "Lisura aprovada", texto: "Lisura aprovada para pagamento.", classe: "is-aprovada" },
    LISURA_RECUSADA: { selo: "Lisura recusada", texto: "Lisura recusada (glosada).", classe: "is-recusada" }
};

const ACAO_DECISAO = {
    APROVAR: {
        titulo: "Confirmar a Lisura?",
        texto: "A guia será aprovada para pagamento com o valor final revisado e sairá da fila.",
        botao: "Confirmar Lisura",
        enviando: "Confirmando..."
    },
    RECUSAR: {
        titulo: "Recusar a Lisura?",
        texto: "A guia será marcada como recusada (glosada) e sairá da fila.",
        botao: "Recusar",
        enviando: "Recusando..."
    }
};

const FILA_LISURA_URL = "index.html";

const idGuia = new URLSearchParams(window.location.search).get("idGuia");

let conferencia = null;          // último LisuraEspelhoResponse
const rascunhos = new Map();     // idItem -> { decisao, valor } ainda não salvos
const editando = new Set();      // itens já revisados que o analista reabriu
const salvandoItens = new Set(); // itens com PUT em andamento
const errosItem = new Map();     // idItem -> mensagem de erro
let acaoPendente = null;         // APROVAR | RECUSAR aguardando confirmação no diálogo

const el = {
    carregando: document.getElementById("lisura-carregando"),
    erroPagina: document.getElementById("lisura-erro-pagina"),
    conteudo: document.getElementById("lisura-conteudo"),

    beneficiario: document.getElementById("beneficiario-nome"),
    codigoGuia: document.getElementById("codigo-guia"),
    prestador: document.getElementById("prestador-nome"),
    enviadoEm: document.getElementById("enviado-em"),
    situacaoGeral: document.getElementById("situacao-geral"),
    avisoConfirmacao: document.getElementById("aviso-confirmacao"),

    resumoCobrado: document.getElementById("resumo-cobrado"),
    resumoContratual: document.getElementById("resumo-contratual"),
    resumoDiferenca: document.getElementById("resumo-diferenca"),
    resumoDiferencaCard: document.getElementById("resumo-diferenca-card"),
    resumoFinal: document.getElementById("resumo-final"),
    resumoFinalCard: document.getElementById("resumo-final-card"),
    resumoPendentes: document.getElementById("resumo-pendentes"),

    filtro: document.getElementById("filtro-divergentes"),
    tabelaWrap: document.getElementById("tabela-wrap"),
    tabela: document.getElementById("tabela-itens"),
    listaVazia: document.getElementById("lista-vazia"),
    feedbackGeral: document.getElementById("feedback-geral"),

    decisaoFinal: document.getElementById("decisao-final"),
    rodapeDecisao: document.getElementById("rodape-decisao"),
    btnConfirmar: document.getElementById("btn-confirmar"),
    btnRecusar: document.getElementById("btn-recusar"),

    dlg: document.getElementById("dlg-decisao"),
    dlgTitulo: document.getElementById("dlg-titulo"),
    dlgTexto: document.getElementById("dlg-texto"),
    dlgResumo: document.getElementById("dlg-resumo"),
    dlgErro: document.getElementById("dlg-erro"),
    dlgVoltar: document.getElementById("dlg-voltar"),
    dlgConfirmar: document.getElementById("dlg-confirmar")
};


/* ===============================
   UTILITÁRIOS
================================ */

function mostrarMensagem(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = !texto;
}

/** "yyyy-MM-dd" -> "dd/MM/yyyy" (sem new Date, para não mudar o dia por fuso) */
function formatarData(iso) {
    if (!iso) {
        return "—";
    }

    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(iso) {
    if (!iso) {
        return "";
    }

    const data = new Date(iso);
    return Number.isNaN(data.getTime())
        ? ""
        : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Diferença com sinal: +R$ 10,00 / −R$ 5,00 / R$ 0,00 */
function formatarDiferenca(valor) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    const numero = Number(valor);

    if (numero > 0) {
        return "+" + formatCurrency(numero);
    }

    if (numero < 0) {
        return "−" + formatCurrency(Math.abs(numero));
    }

    return formatCurrency(0);
}

function situacaoDoItem(item) {
    return SITUACAO_ITEM[item.situacao] || SITUACAO_ITEM.SEM_CONTRATO;
}

function temDivergencia(item) {
    return item.situacao !== "CONFORME";
}

function temContrato(item) {
    return item.valorContratualUnitario !== null && item.valorContratualUnitario !== undefined;
}

/** Decisão final já registrada (aprovada ou recusada): tela só para consulta. */
function statusDecidido() {
    return STATUS_DECIDIDO[conferencia.statusGuia] || null;
}

function buscarItem(idItem) {
    return (conferencia.itens || []).find(function (i) {
        return i.idItem === idItem;
    });
}

/** Erro de rede (TypeError do fetch) vira mensagem amigável. */
function tratarErro(error, padrao) {
    if (error instanceof TypeError) {
        return "Não foi possível conectar ao servidor.";
    }

    return error.message || padrao;
}


/* ===============================
   RENDERIZAÇÃO
================================ */

function renderizarCabecalho() {
    const divergentes = conferencia.itensDivergentes || 0;
    const pendentes = conferencia.itensPendentes || 0;

    el.beneficiario.textContent = conferencia.nomeBeneficiario || "—";
    el.codigoGuia.textContent = conferencia.codigoGuia || (conferencia.idGuia ? `#${conferencia.idGuia}` : "—");
    el.prestador.textContent = conferencia.nomePrestador || "—";

    const quando = formatarDataHora(conferencia.enviadoEm);
    mostrarMensagem(el.enviadoEm, quando ? `Espelho enviado pela OCS em ${quando}` : "");

    let texto = "Sem divergências";
    let classe = "is-conforme";
    const decidido = statusDecidido();

    if (decidido) {
        texto = decidido.selo;
        classe = decidido.classe;
    } else if (pendentes > 0) {
        texto = `${pendentes} de ${divergentes} divergência(s) a revisar`;
        classe = "is-divergente";
    } else if (divergentes > 0) {
        texto = "Revisão concluída";
    }

    el.situacaoGeral.textContent = texto;
    el.situacaoGeral.className = "lisura-selo " + classe;

    const naoConfirmados = conferencia.itensNaoConfirmados || 0;
    mostrarMensagem(
        el.avisoConfirmacao,
        naoConfirmados > 0
            ? `${naoConfirmados} procedimento(s) cobrado(s) sem confirmação de realização na guia. ` +
              "Confira antes de definir o valor final."
            : ""
    );
}

function renderizarResumo() {
    const diferenca = Number(conferencia.diferencaTotal || 0);
    const pendentes = conferencia.itensPendentes || 0;

    el.resumoCobrado.textContent = formatCurrency(conferencia.totalCobrado || 0);
    el.resumoContratual.textContent = formatCurrency(conferencia.totalContratual || 0);
    el.resumoDiferenca.textContent = formatarDiferenca(diferenca);
    el.resumoFinal.textContent = formatCurrency(conferencia.totalFinal || 0);

    el.resumoPendentes.textContent = pendentes > 0
        ? `Parcial: ${pendentes} item(ns) pendente(s)`
        : "Todos os itens definidos";

    el.resumoDiferencaCard.classList.toggle("is-acima", diferenca > 0);
    el.resumoDiferencaCard.classList.toggle("is-abaixo", diferenca < 0);
    el.resumoFinalCard.classList.toggle("is-concluido", pendentes === 0);
}

/** Célula "Valor final": conforme, já revisado ou formulário de revisão. */
function celulaRevisao(item) {
    if (!temDivergencia(item)) {
        return `<span class="lisura-final-auto espelho-mono">${escapeHtml(formatCurrency(item.valorCobradoUnitario))}</span>`;
    }

    const somenteLeitura = statusDecidido() !== null;

    if (item.decisao && (somenteLeitura || !editando.has(item.idItem))) {
        const decisao = DECISAO_LISURA[item.decisao] || { label: item.decisao };
        const quando = formatarDataHora(item.revisadoEm);
        const autor = [item.revisadoPor, quando].filter(Boolean).join(" · ");

        return `
            <div class="lisura-revisado">
                <strong class="espelho-mono">${escapeHtml(formatCurrency(item.valorFinalUnitario))}</strong>
                <span class="lisura-decisao">${escapeHtml(decisao.label)}</span>
                ${autor ? `<small>${escapeHtml(autor)}</small>` : ""}
                ${somenteLeitura
                    ? ""
                    : `<button type="button" class="espelho-link" data-acao="alterar" data-id="${item.idItem}">Alterar</button>`}
            </div>
        `;
    }

    if (somenteLeitura) {
        return `<span class="lisura-decisao">Não revisado</span>`;
    }

    return formularioRevisao(item);
}

function formularioRevisao(item) {
    const contrato = temContrato(item);
    const rascunho = rascunhos.get(item.idItem) || {
        decisao: item.decisao || (contrato ? "ACATAR_CONTRATUAL" : "VALOR_AJUSTADO"),
        valor: item.decisao === "VALOR_AJUSTADO" ? String(item.valorFinalUnitario) : ""
    };
    rascunhos.set(item.idItem, rascunho);

    const salvando = salvandoItens.has(item.idItem);
    const erro = errosItem.get(item.idItem) || "";

    const opcoes = Object.keys(DECISAO_LISURA).map(function (chave) {
        const indisponivel = chave === "ACATAR_CONTRATUAL" && !contrato;
        return `<option value="${chave}"
                    ${rascunho.decisao === chave ? "selected" : ""}
                    ${indisponivel ? "disabled" : ""}>${DECISAO_LISURA[chave].opcao}</option>`;
    }).join("");

    return `
        <div class="lisura-revisao" data-id="${item.idItem}">
            <label class="sr-only" for="decisao-${item.idItem}">Decisão</label>
            <select id="decisao-${item.idItem}" data-campo="decisao" ${salvando ? "disabled" : ""}>
                ${opcoes}
            </select>

            <label class="sr-only" for="valor-${item.idItem}">Valor ajustado (R$)</label>
            <input type="number" id="valor-${item.idItem}" data-campo="valor"
                   min="0" step="0.01" placeholder="Valor unit. (R$)"
                   value="${escapeHtml(rascunho.valor)}"
                   ${rascunho.decisao === "VALOR_AJUSTADO" ? "" : "hidden"}
                   ${salvando ? "disabled" : ""}>

            <div class="lisura-revisao-acoes">
                ${editando.has(item.idItem)
                    ? `<button type="button" class="espelho-link" data-acao="cancelar" data-id="${item.idItem}">Cancelar</button>`
                    : ""}
                <button type="button" class="lisura-botao-salvar" data-acao="salvar" data-id="${item.idItem}"
                        ${salvando ? "disabled" : ""}>${salvando ? "Salvando..." : "Salvar"}</button>
            </div>

            <p class="lisura-erro-item" role="alert" ${erro ? "" : "hidden"}>${escapeHtml(erro)}</p>
        </div>
    `;
}

function renderizarTabela() {
    const todos = conferencia.itens || [];
    const itens = el.filtro.checked ? todos.filter(temDivergencia) : todos;

    if (todos.length === 0) {
        mostrarMensagem(el.listaVazia, "Este espelho foi enviado sem procedimentos.");
    } else if (itens.length === 0) {
        mostrarMensagem(el.listaVazia, "Nenhuma divergência encontrada: todos os valores conferem com o contrato.");
    } else {
        mostrarMensagem(el.listaVazia, "");
    }

    el.tabelaWrap.hidden = itens.length === 0;

    el.tabela.innerHTML = itens.map(function (item) {
        const situacao = situacaoDoItem(item);

        return `
            <tr class="lisura-linha ${situacao.classe}">
                <td data-rotulo="Procedimento" class="lisura-procedimento">
                    <span>${escapeHtml(item.descricao || "—")}</span>
                    <small><span class="espelho-mono">${escapeHtml(String(item.codTuss))}</span> · ${formatarData(item.dataRealizacao)}</small>
                    ${PROCEDIMENTO_NA_GUIA[item.procedimentoNaGuia]
                        ? `<em class="lisura-alerta-guia">${PROCEDIMENTO_NA_GUIA[item.procedimentoNaGuia]}</em>`
                        : ""}
                </td>
                <td data-rotulo="Qtd." class="num">${item.quantidade}</td>
                <td data-rotulo="Valor Cobrado (OCS)" class="num espelho-mono lisura-cobrado">${escapeHtml(formatCurrency(item.valorCobradoUnitario))}</td>
                <td data-rotulo="Valor Contratual" class="num espelho-mono">${escapeHtml(formatCurrency(item.valorContratualUnitario))}</td>
                <td data-rotulo="Diferença" class="num espelho-mono">${escapeHtml(formatarDiferenca(item.diferenca))}</td>
                <td data-rotulo="Situação"><span class="lisura-tag ${situacao.classe}">${situacao.label}</span></td>
                <td data-rotulo="Valor final" class="col-revisao">${celulaRevisao(item)}</td>
            </tr>
        `;
    }).join("");
}

/** Rodapé com Confirmar/Recusar, ou a decisão já registrada. */
function renderizarDecisao() {
    const decidido = statusDecidido();

    el.rodapeDecisao.hidden = decidido !== null;
    el.decisaoFinal.className = "lisura-decisao-final " + (decidido ? decidido.classe : "");
    mostrarMensagem(el.decisaoFinal, decidido ? decidido.texto : "");

    if (decidido) {
        return;
    }

    // Só confirma com todas as divergências revisadas (o backend valida também)
    const pendentes = conferencia.itensPendentes || 0;
    el.btnConfirmar.disabled = pendentes > 0;
    el.btnConfirmar.title = pendentes > 0
        ? `Revise os ${pendentes} item(ns) divergente(s) antes de confirmar.`
        : "";
}

function renderizar() {
    renderizarCabecalho();
    renderizarResumo();
    renderizarTabela();
    renderizarDecisao();
}

el.filtro.addEventListener("change", renderizarTabela);


/* ===============================
   REVISÃO (acatar / manter / ajustar)
================================ */

// Guarda o que o analista escolheu sem redesenhar a tabela (não perde o foco)
el.tabela.addEventListener("change", function (event) {
    const campo = event.target.dataset.campo;
    const bloco = event.target.closest(".lisura-revisao");

    if (!campo || !bloco) {
        return;
    }

    const idItem = Number(bloco.dataset.id);
    const rascunho = rascunhos.get(idItem) || { decisao: "", valor: "" };

    if (campo === "decisao") {
        rascunho.decisao = event.target.value;

        const inputValor = bloco.querySelector('[data-campo="valor"]');
        inputValor.hidden = rascunho.decisao !== "VALOR_AJUSTADO";

        if (!inputValor.hidden) {
            inputValor.focus();
        }
    }

    rascunhos.set(idItem, rascunho);
});

el.tabela.addEventListener("input", function (event) {
    if (event.target.dataset.campo !== "valor") {
        return;
    }

    const idItem = Number(event.target.closest(".lisura-revisao").dataset.id);
    const rascunho = rascunhos.get(idItem) || { decisao: "VALOR_AJUSTADO", valor: "" };

    rascunho.valor = event.target.value;
    rascunhos.set(idItem, rascunho);
});

// Enter no campo de valor salva o item
el.tabela.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.target.dataset.campo !== "valor") {
        return;
    }

    event.preventDefault();
    salvarItem(Number(event.target.closest(".lisura-revisao").dataset.id));
});

el.tabela.addEventListener("click", function (event) {
    const botao = event.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    const idItem = Number(botao.dataset.id);

    if (botao.dataset.acao === "alterar") {
        editando.add(idItem);
        rascunhos.delete(idItem);
        errosItem.delete(idItem);
        renderizarTabela();
        return;
    }

    if (botao.dataset.acao === "cancelar") {
        editando.delete(idItem);
        rascunhos.delete(idItem);
        errosItem.delete(idItem);
        renderizarTabela();
        return;
    }

    if (botao.dataset.acao === "salvar") {
        salvarItem(idItem);
    }
});

/** Valida o rascunho do item; devolve o corpo do PUT ou lança Error. */
function lerRevisao(idItem) {
    const item = buscarItem(idItem);
    const rascunho = rascunhos.get(idItem);

    if (!item || !rascunho || !rascunho.decisao) {
        throw new Error("Escolha uma decisão para o item.");
    }

    if (rascunho.decisao === "ACATAR_CONTRATUAL" && !temContrato(item)) {
        throw new Error("Este procedimento não tem valor contratual. Informe o valor ajustado.");
    }

    const revisao = { idItem: idItem, decisao: rascunho.decisao };

    if (rascunho.decisao === "VALOR_AJUSTADO") {
        if (rascunho.valor === "" || rascunho.valor === null || rascunho.valor === undefined) {
            throw new Error("Informe o valor ajustado.");
        }

        const valor = Number(rascunho.valor);

        if (Number.isNaN(valor) || valor < 0) {
            throw new Error("O valor ajustado não pode ser negativo.");
        }

        revisao.valorAjustado = valor;
    }

    return revisao;
}

async function salvarItem(idItem) {
    if (salvandoItens.has(idItem)) {
        return;
    }

    mostrarMensagem(el.feedbackGeral, "");
    errosItem.delete(idItem);

    let revisao;

    try {
        revisao = lerRevisao(idItem);
    } catch (error) {
        errosItem.set(idItem, error.message);
        renderizarTabela();
        return;
    }

    salvandoItens.add(idItem);
    renderizarTabela();

    try {
        conferencia = await salvarRevisaoLisura(idGuia, [revisao]);

        editando.delete(idItem);
        rascunhos.delete(idItem);
        salvandoItens.delete(idItem);
        renderizar();

    } catch (error) {
        console.error("Erro ao salvar revisão:", error);
        salvandoItens.delete(idItem);
        errosItem.set(idItem, tratarErro(error, "Não foi possível salvar a revisão."));
        renderizarTabela();
    }
}


/* ===============================
   DECISÃO FINAL (confirmar / recusar)
================================ */

function abrirDialogoDecisao(acao) {
    const config = ACAO_DECISAO[acao];
    acaoPendente = acao;

    el.dlgTitulo.textContent = config.titulo;
    el.dlgTexto.textContent = config.texto;
    // Na recusa o valor final pode estar parcial: mostra só a guia
    const guia = `Guia ${conferencia.codigoGuia || "#" + conferencia.idGuia}`;
    el.dlgResumo.textContent = acao === "APROVAR"
        ? `${guia} · Valor final: ${formatCurrency(conferencia.totalFinal || 0)}`
        : guia;
    el.dlgConfirmar.textContent = config.botao;
    el.dlgConfirmar.classList.toggle("lisura-botao-recusar", acao === "RECUSAR");
    mostrarMensagem(el.dlgErro, "");

    el.dlg.showModal();
}

el.btnConfirmar.addEventListener("click", function () {
    abrirDialogoDecisao("APROVAR");
});

el.btnRecusar.addEventListener("click", function () {
    abrirDialogoDecisao("RECUSAR");
});

el.dlgVoltar.addEventListener("click", function () {
    el.dlg.close();
});

el.dlgConfirmar.addEventListener("click", async function () {
    const config = ACAO_DECISAO[acaoPendente];

    mostrarMensagem(el.dlgErro, "");
    el.dlgConfirmar.disabled = true;
    el.dlgVoltar.disabled = true;
    el.dlgConfirmar.textContent = config.enviando;

    try {
        await decidirLisura(idGuia, acaoPendente);

        // Guia decidida sai da fila: volta para a lista de espelhos enviados
        window.location.href = FILA_LISURA_URL;

    } catch (error) {
        console.error("Erro ao registrar decisão da Lisura:", error);
        mostrarMensagem(el.dlgErro, tratarErro(error, "Não foi possível registrar a decisão da Lisura."));

        el.dlgConfirmar.disabled = false;
        el.dlgVoltar.disabled = false;
        el.dlgConfirmar.textContent = config.botao;
    }
});


/* ===============================
   INICIALIZAÇÃO
================================ */

async function iniciar() {
    if (!idGuia || !/^\d+$/.test(idGuia)) {
        el.carregando.hidden = true;
        mostrarMensagem(
            el.erroPagina,
            "Guia não informada. Abra a conferência a partir da lista de guias (conferencia-espelho.html?idGuia=...)."
        );
        return;
    }

    try {
        conferencia = await buscarConferenciaLisura(idGuia);

        renderizar();

        el.carregando.hidden = true;
        el.conteudo.hidden = false;

    } catch (error) {
        console.error("Erro ao carregar conferência:", error);

        el.carregando.hidden = true;
        mostrarMensagem(el.erroPagina, tratarErro(error, "Não foi possível carregar a conferência desta guia."));
    }
}

iniciar();
