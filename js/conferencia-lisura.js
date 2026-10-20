/* =====================================================
   Página: conferência do espelho (Lisura)

   Recebe a guia pela URL:  conferencia-espelho.html?idGuia=123
   Mostra, na mesma linha, o valor cobrado pela OCS e o valor
   contratual, pintando a linha quando houver diferença:
     - vermelho: cobrado ACIMA do contrato
     - amarelo:  cobrado ABAIXO do contrato ou SEM valor contratual

   Depende de: api.js (buscarConferenciaLisura) e formatters.js
   (escapeHtml, formatCurrency).
===================================================== */

const SITUACAO_ITEM = {
    CONFORME: { label: "Conforme", classe: "is-conforme" },
    ACIMA: { label: "Acima do contrato", classe: "is-acima" },
    ABAIXO: { label: "Abaixo do contrato", classe: "is-abaixo" },
    SEM_CONTRATO: { label: "Sem valor contratual", classe: "is-sem-contrato" }
};

const idGuia = new URLSearchParams(window.location.search).get("idGuia");

let conferencia = null;  // último LisuraEspelhoResponse

const el = {
    carregando: document.getElementById("lisura-carregando"),
    erroPagina: document.getElementById("lisura-erro-pagina"),
    conteudo: document.getElementById("lisura-conteudo"),

    beneficiario: document.getElementById("beneficiario-nome"),
    codigoGuia: document.getElementById("codigo-guia"),
    prestador: document.getElementById("prestador-nome"),
    enviadoEm: document.getElementById("enviado-em"),
    situacaoGeral: document.getElementById("situacao-geral"),

    resumoCobrado: document.getElementById("resumo-cobrado"),
    resumoContratual: document.getElementById("resumo-contratual"),
    resumoDiferenca: document.getElementById("resumo-diferenca"),
    resumoDiferencaCard: document.getElementById("resumo-diferenca-card"),
    resumoDivergentes: document.getElementById("resumo-divergentes"),

    filtro: document.getElementById("filtro-divergentes"),
    tabelaWrap: document.getElementById("tabela-wrap"),
    tabela: document.getElementById("tabela-itens"),
    listaVazia: document.getElementById("lista-vazia")
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

    el.beneficiario.textContent = conferencia.nomeBeneficiario || "—";
    el.codigoGuia.textContent = conferencia.codigoGuia ?? "—";
    el.prestador.textContent = conferencia.nomePrestador || "—";

    const quando = formatarDataHora(conferencia.enviadoEm);
    mostrarMensagem(el.enviadoEm, quando ? `Espelho enviado pela OCS em ${quando}` : "");

    el.situacaoGeral.textContent = divergentes > 0
        ? `${divergentes} divergência(s)`
        : "Sem divergências";
    el.situacaoGeral.className = "lisura-selo " + (divergentes > 0 ? "is-divergente" : "is-conforme");
}

function renderizarResumo() {
    const diferenca = Number(conferencia.diferencaTotal || 0);

    el.resumoCobrado.textContent = formatCurrency(conferencia.totalCobrado || 0);
    el.resumoContratual.textContent = formatCurrency(conferencia.totalContratual || 0);
    el.resumoDiferenca.textContent = formatarDiferenca(diferenca);
    el.resumoDivergentes.textContent = String(conferencia.itensDivergentes || 0);

    el.resumoDiferencaCard.classList.toggle("is-acima", diferenca > 0);
    el.resumoDiferencaCard.classList.toggle("is-abaixo", diferenca < 0);
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
                <td data-rotulo="Descrição">${escapeHtml(item.descricao || "—")}</td>
                <td data-rotulo="Código TUSS" class="espelho-mono">${escapeHtml(String(item.codTuss))}</td>
                <td data-rotulo="Data">${formatarData(item.dataRealizacao)}</td>
                <td data-rotulo="Qtd." class="num">${item.quantidade}</td>
                <td data-rotulo="Valor Cobrado (OCS)" class="num espelho-mono lisura-cobrado">${escapeHtml(formatCurrency(item.valorCobradoUnitario))}</td>
                <td data-rotulo="Valor Contratual" class="num espelho-mono">${escapeHtml(formatCurrency(item.valorContratualUnitario))}</td>
                <td data-rotulo="Diferença" class="num espelho-mono">${escapeHtml(formatarDiferenca(item.diferenca))}</td>
                <td data-rotulo="Situação"><span class="lisura-tag ${situacao.classe}">${situacao.label}</span></td>
            </tr>
        `;
    }).join("");
}

function renderizar() {
    renderizarCabecalho();
    renderizarResumo();
    renderizarTabela();
}

el.filtro.addEventListener("change", renderizarTabela);


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
