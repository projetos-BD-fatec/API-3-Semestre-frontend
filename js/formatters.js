/* =====================================================
   Formatadores e utilitários puros
   Compartilhado por todas as páginas.
===================================================== */

const STATUS_PRE_GUIA = {
    EM_ANALISE: { label: "Em análise", classe: "em_analise" },
    AUTORIZADA: { label: "Autorizada", classe: "autorizada" },
    NEGADA: { label: "Negada", classe: "negada" }
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});


/** Evita que texto vindo da API seja interpretado como HTML. */
function escapeHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function getStatusLabel(status) {
    return (STATUS_PRE_GUIA[status] || { label: "Desconhecido" }).label;
}

/** Classe CSS do selo de status: em_analise | autorizada | negada */
function getStatusClass(status) {
    return (STATUS_PRE_GUIA[status] || { classe: "" }).classe;
}


function formatDate(date) {
    if (!date) {
        return "—";
    }

    return new Date(date).toLocaleDateString("pt-BR");
}

function formatDateTime(date) {
    if (!date) {
        return "—";
    }

    const d = new Date(date);

    const dia = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return `${dia} às ${hora}`;
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const numero = Number(value);

    return Number.isNaN(numero) ? "—" : currencyFormatter.format(numero);
}


/** Código exibido ao usuário. Ex.: 12 -> "PG-000012" */
function codigoSolicitacao(idPreGuia) {
    return "PG-" + String(idPreGuia).padStart(6, "0");
}


/**
 * Linhas do endereço de uma clínica.
 * Funciona com item de pré-guia e com objeto de prestador
 * (mesmos nomes de campo: dsLogradouro, nrEndereco, ...).
 */
function buildAddressLines(local) {
    const rua = [local.dsLogradouro, local.nrEndereco]
        .filter(Boolean)
        .join(", ");

    const ruaCompleta = local.dsComplemento
        ? `${rua} - ${local.dsComplemento}`
        : rua;

    const cidadeUf = [local.nmCidade, local.sgUf]
        .filter(Boolean)
        .join(" - ");

    return [ruaCompleta, local.nmBairro, cidadeUf].filter(Boolean);
}


/** Mais recente primeiro (não depende da ordem que o backend devolve). */
function ordenarPorMaisRecente(preGuias) {
    return [...preGuias].sort(function (a, b) {
        return (new Date(b.criadoEm) - new Date(a.criadoEm))
            || (b.idPreGuia - a.idPreGuia);
    });
}
