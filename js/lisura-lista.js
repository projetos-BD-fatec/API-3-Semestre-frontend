/* =====================================================
   Página: Lisura — lista de espelhos enviados pelas OCS

   Entrada da Lisura para quem é do FUSEX (perfis FUSEX,
   LISURA ou ADMIN). Cada linha abre a conferência:
   conferencia-espelho.html?idGuia=ID

   Depende de: api.js (listarEspelhosLisura, temAcessoLisura)
   e formatters.js (escapeHtml, formatCurrency).
===================================================== */

let espelhos = [];

const el = {
    carregando: document.getElementById("lista-carregando"),
    erro: document.getElementById("lista-erro"),
    conteudo: document.getElementById("lista-conteudo"),
    seloPendentes: document.getElementById("selo-pendentes"),

    busca: document.getElementById("busca-espelho"),
    filtroPendentes: document.getElementById("filtro-pendentes"),
    tabelaWrap: document.getElementById("tabela-wrap"),
    tabela: document.getElementById("tabela-espelhos"),
    vazia: document.getElementById("lista-vazia")
};


/* ===============================
   UTILITÁRIOS
================================ */

function mostrarMensagem(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = !texto;
}

function formatarDataHora(iso) {
    if (!iso) {
        return "—";
    }

    const data = new Date(iso);
    return Number.isNaN(data.getTime())
        ? "—"
        : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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

/** Selo de situação do espelho na lista. */
function situacaoDoEspelho(e) {
    if (e.itensPendentes > 0) {
        return { texto: `${e.itensPendentes} a revisar`, classe: "is-acima" };
    }

    if (e.itensDivergentes > 0) {
        return { texto: "Revisão concluída", classe: "is-conforme" };
    }

    return { texto: "Sem divergências", classe: "is-conforme" };
}


/* ===============================
   RENDERIZAÇÃO
================================ */

function renderizar() {
    const termo = normalizar(el.busca.value.trim());
    const soPendentes = el.filtroPendentes.checked;

    const visiveis = espelhos.filter(function (e) {
        if (soPendentes && !(e.itensPendentes > 0)) {
            return false;
        }

        if (!termo) {
            return true;
        }

        return [e.codigoGuia, e.idGuia, e.nomeBeneficiario, e.nomePrestador]
            .some(function (campo) {
                return normalizar(campo).includes(termo);
            });
    });

    if (espelhos.length === 0) {
        mostrarMensagem(el.vazia, "Nenhum espelho aguardando a Lisura.");
    } else if (visiveis.length === 0) {
        mostrarMensagem(el.vazia, "Nenhum espelho encontrado com esses filtros.");
    } else {
        mostrarMensagem(el.vazia, "");
    }

    el.tabelaWrap.hidden = visiveis.length === 0;

    el.tabela.innerHTML = visiveis.map(function (e) {
        const situacao = situacaoDoEspelho(e);
        const codigo = e.codigoGuia || `#${e.idGuia}`;
        const alerta = e.itensNaoConfirmados > 0
            ? `<em class="lisura-alerta-guia">${e.itensNaoConfirmados} sem confirmação de realização</em>`
            : "";

        return `
            <tr>
                <td data-rotulo="Guia" class="lisura-procedimento">
                    <span class="espelho-mono">${escapeHtml(codigo)}</span>
                    <small>Enviado em ${escapeHtml(formatarDataHora(e.enviadoEm))}</small>
                </td>
                <td data-rotulo="Beneficiário">${escapeHtml(e.nomeBeneficiario || "—")}</td>
                <td data-rotulo="OCS">${escapeHtml(e.nomePrestador || "—")}</td>
                <td data-rotulo="Itens" class="num">${e.totalItens}</td>
                <td data-rotulo="Total cobrado" class="num espelho-mono">${escapeHtml(formatCurrency(e.totalCobrado))}</td>
                <td data-rotulo="Situação">
                    <div class="lisura-situacao">
                        <span class="lisura-tag ${situacao.classe}">${escapeHtml(situacao.texto)}</span>
                        ${alerta}
                    </div>
                </td>
                <td class="col-acoes">
                    <a class="lisura-botao-salvar lisura-botao-link"
                       href="conferencia-espelho.html?idGuia=${encodeURIComponent(e.idGuia)}">Conferir</a>
                </td>
            </tr>
        `;
    }).join("");

    const pendentes = espelhos.filter(function (e) {
        return e.itensPendentes > 0;
    }).length;

    el.seloPendentes.hidden = espelhos.length === 0;
    el.seloPendentes.textContent = pendentes > 0
        ? `${pendentes} espelho(s) com revisão pendente`
        : "Nenhuma revisão pendente";
    el.seloPendentes.className = "lisura-selo " + (pendentes > 0 ? "is-divergente" : "is-conforme");
}

el.busca.addEventListener("input", renderizar);
el.filtroPendentes.addEventListener("change", renderizar);


/* ===============================
   INICIALIZAÇÃO
================================ */

async function iniciar() {
    if (!temAcessoLisura()) {
        el.carregando.hidden = true;
        mostrarMensagem(el.erro, "Acesso restrito ao FUSEX (perfis FUSEX, LISURA ou ADMIN).");
        return;
    }

    try {
        espelhos = await listarEspelhosLisura();

        renderizar();

        el.carregando.hidden = true;
        el.conteudo.hidden = false;

    } catch (error) {
        console.error("Erro ao carregar espelhos:", error);

        el.carregando.hidden = true;
        mostrarMensagem(el.erro, tratarErro(error, "Não foi possível carregar os espelhos enviados."));
    }
}

iniciar();
