/* =====================================================
   Card de resumo da pré-guia
   Usado na home (solicitação recente) e na lista.

   Depende de: formatters.js
===================================================== */

/**
 * @param {object} preGuia  PreGuiaResponse
 * @param {object} opcoes
 *   - aoAbrir(): se informado, o card fica clicável (clique, Enter ou Espaço)
 *   - limiteItens: quantos exames listar (o resto vira "+ N exames")
 */
function criarCardPreGuia(preGuia, opcoes = {}) {
    const { aoAbrir, limiteItens = Infinity } = opcoes;

    const codigo = codigoSolicitacao(preGuia.idPreGuia);
    const itens = preGuia.itens || [];
    const visiveis = itens.slice(0, limiteItens);
    const ocultos = itens.length - visiveis.length;

    const card = document.createElement("article");
    card.classList.add("request-card");

    card.innerHTML = `
        <div class="request-card-header">
            <div>
                <h3>Solicitação ${escapeHtml(codigo)}</h3>
                <p>${escapeHtml(formatDate(preGuia.criadoEm))}</p>
            </div>
            <span class="status ${getStatusClass(preGuia.status)}">
                ${escapeHtml(getStatusLabel(preGuia.status))}
            </span>
        </div>

        <div class="request-card-items">
            <div class="request-card-items-title">
                Exames
            </div>
            ${visiveis.map(criarItemHtml).join("")}
            ${ocultos > 0
                ? `<div class="request-card-mais">
                       + ${ocultos} ${ocultos === 1 ? "exame" : "exames"}
                   </div>`
                : ""}
        </div>

        ${aoAbrir ? `<span class="request-card-cta">Ver ficha completa</span>` : ""}
    `;

    if (aoAbrir) {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `Abrir ficha completa da solicitação ${codigo}`);

        card.addEventListener("click", aoAbrir);

        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                aoAbrir();
            }
        });
    }

    return card;
}


function criarItemHtml(item) {
    const endereco = buildAddressLines(item)
        .map(escapeHtml)
        .join("<br>");

    return `
        <div class="request-item">
            <div class="request-item-exam">${escapeHtml(item.nmExame)}</div>
            <div class="request-item-provider">${escapeHtml(item.nmPrestador)}</div>
            <div class="request-item-address">${endereco}</div>
            <div class="request-item-value">${escapeHtml(formatCurrency(item.valor))}</div>
        </div>
    `;
}
