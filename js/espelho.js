/* =====================================================
   Página: espelho da guia (OCS)

   Recebe o código da guia pela URL:  espelho.html?idGuia=123
   Depende de: api.js (funções do espelho) e formatters.js
   (escapeHtml, formatCurrency).
===================================================== */

const BUSCA_MIN_CARACTERES = 2;
const BUSCA_DEBOUNCE_MS = 350;

const idGuia = new URLSearchParams(window.location.search).get("idGuia");

let espelho = null;          // último EspelhoResponse
let tussSelecionado = null;  // { codTuss, descricao }
let itemEmEdicao = null;     // item sendo editado, ou null
let salvando = false;
let timerBusca = null;
let contadorBusca = 0;       // descarta respostas antigas da busca

const el = {
    carregando: document.getElementById("espelho-carregando"),
    erroPagina: document.getElementById("espelho-erro-pagina"),
    conteudo: document.getElementById("espelho-conteudo"),

    beneficiario: document.getElementById("beneficiario-nome"),
    codigoGuia: document.getElementById("codigo-guia"),
    status: document.getElementById("status-espelho"),
    avisoEnviado: document.getElementById("aviso-enviado"),

    cardAdicionar: document.getElementById("card-adicionar"),
    tituloForm: document.getElementById("titulo-form-item"),
    areaBusca: document.getElementById("area-busca"),
    busca: document.getElementById("busca-tuss"),
    buscaDica: document.getElementById("busca-dica"),
    resultados: document.getElementById("resultados-tuss"),
    selecionado: document.getElementById("tuss-selecionado"),
    selCodigo: document.getElementById("tuss-sel-codigo"),
    selDescricao: document.getElementById("tuss-sel-descricao"),
    btnTrocar: document.getElementById("btn-trocar-tuss"),

    form: document.getElementById("form-item"),
    data: document.getElementById("campo-data"),
    quantidade: document.getElementById("campo-quantidade"),
    valor: document.getElementById("campo-valor"),
    btnSalvar: document.getElementById("btn-salvar-item"),
    btnCancelar: document.getElementById("btn-cancelar-edicao"),
    feedbackItem: document.getElementById("feedback-item"),

    tabelaWrap: document.getElementById("tabela-wrap"),
    tabela: document.getElementById("tabela-itens"),
    listaVazia: document.getElementById("lista-vazia"),
    total: document.getElementById("total-geral"),

    feedbackGeral: document.getElementById("feedback-geral"),
    rodape: document.getElementById("rodape-enviar"),
    btnEnviar: document.getElementById("btn-enviar"),

    dlg: document.getElementById("dlg-enviar"),
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

/** Data de hoje (horário local) em yyyy-MM-dd */
function hojeIso() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
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

function somenteLeitura() {
    return espelho !== null && espelho.status === "ENVIADO";
}


/* ===============================
   RENDERIZAÇÃO
================================ */

function renderizar() {
    const enviado = somenteLeitura();
    const itens = espelho.itens || [];

    el.beneficiario.textContent = espelho.nomeBeneficiario || "—";
    el.codigoGuia.textContent = espelho.codigoGuia;

    el.status.textContent = enviado ? "Enviado" : "Rascunho";
    el.status.className = "espelho-status " + (enviado ? "is-enviado" : "is-rascunho");

    if (enviado) {
        const quando = formatarDataHora(espelho.enviadoEm);
        el.avisoEnviado.textContent =
            "Este espelho foi enviado ao FUSEx" +
            (quando ? ` em ${quando}` : "") +
            " e não pode mais ser alterado.";
        el.avisoEnviado.hidden = false;
    } else {
        el.avisoEnviado.hidden = true;
    }

    el.cardAdicionar.hidden = enviado;
    el.rodape.hidden = enviado;

    // Tabela
    el.listaVazia.hidden = itens.length > 0;
    el.listaVazia.textContent = enviado
        ? "Este espelho foi enviado sem procedimentos."
        : "Nenhum procedimento adicionado. Busque um código TUSS acima para começar.";
    el.tabelaWrap.hidden = itens.length === 0;

    el.tabela.innerHTML = itens.map(function (item) {
        const acoes = enviado
            ? ""
            : `<button type="button" class="espelho-link" data-acao="editar" data-id="${item.idItem}">Editar</button>
               <button type="button" class="espelho-link is-perigo" data-acao="excluir" data-id="${item.idItem}">Excluir</button>`;

        return `
            <tr>
                <td data-rotulo="Descrição">${escapeHtml(item.descricao || "—")}</td>
                <td data-rotulo="Código TUSS" class="espelho-mono">${escapeHtml(String(item.codTuss))}</td>
                <td data-rotulo="Data">${formatarData(item.dataRealizacao)}</td>
                <td data-rotulo="Qtd." class="num">${item.quantidade}</td>
                <td data-rotulo="Valor unit." class="num espelho-mono">${escapeHtml(formatCurrency(item.valorUnitario))}</td>
                <td data-rotulo="Valor total" class="num espelho-mono">${escapeHtml(formatCurrency(item.valorTotal))}</td>
                <td class="col-acoes">${acoes}</td>
            </tr>
        `;
    }).join("");

    // Esconde a coluna de ações quando só leitura
    el.tabelaWrap.classList.toggle("sem-acoes", enviado);

    el.total.textContent = formatCurrency(espelho.valorTotal || 0);

    el.btnEnviar.disabled = itens.length === 0;
    el.btnEnviar.title = itens.length === 0
        ? "Adicione ao menos um procedimento para enviar."
        : "";
}


/* ===============================
   BUSCA TUSS (com debounce)
================================ */

el.busca.addEventListener("input", function () {
    clearTimeout(timerBusca);

    const texto = el.busca.value.trim();

    if (texto.length < BUSCA_MIN_CARACTERES) {
        contadorBusca++;
        limparResultados();
        el.buscaDica.textContent = "Digite ao menos 2 caracteres.";
        return;
    }

    el.buscaDica.textContent = "Buscando...";
    timerBusca = setTimeout(function () {
        executarBusca(texto);
    }, BUSCA_DEBOUNCE_MS);
});

async function executarBusca(texto) {
    const minhaBusca = ++contadorBusca;

    try {
        const lista = await buscarCatalogoTuss(texto);

        if (minhaBusca !== contadorBusca) {
            return; // chegou uma busca mais nova
        }

        renderizarResultados(lista);

    } catch (error) {
        if (minhaBusca !== contadorBusca) {
            return;
        }

        limparResultados();
        el.buscaDica.textContent = error.message || "Não foi possível buscar no catálogo TUSS.";
    }
}

function renderizarResultados(lista) {
    if (!lista || lista.length === 0) {
        limparResultados();
        el.buscaDica.textContent = "Nenhum procedimento encontrado para essa busca.";
        return;
    }

    el.buscaDica.textContent = lista.length === 20
        ? "Mostrando os 20 primeiros. Refine a busca para ver outros."
        : `${lista.length} resultado(s).`;

    el.resultados.innerHTML = lista.map(function (tuss, indice) {
        return `
            <li>
                <button type="button" data-indice="${indice}">
                    <span class="espelho-mono">${escapeHtml(String(tuss.codTuss))}</span>
                    <span>${escapeHtml(tuss.descricao || "")}</span>
                </button>
            </li>
        `;
    }).join("");

    el.resultados.hidden = false;
    el.resultados._lista = lista;
}

function limparResultados() {
    el.resultados.innerHTML = "";
    el.resultados.hidden = true;
    el.resultados._lista = null;
}

el.resultados.addEventListener("click", function (event) {
    const botao = event.target.closest("button[data-indice]");

    if (!botao || !el.resultados._lista) {
        return;
    }

    const tuss = el.resultados._lista[Number(botao.dataset.indice)];
    selecionarTuss({ codTuss: String(tuss.codTuss), descricao: tuss.descricao });
});

function selecionarTuss(tuss) {
    tussSelecionado = tuss;

    el.selCodigo.textContent = tuss.codTuss;
    el.selDescricao.textContent = tuss.descricao || "";

    el.selecionado.hidden = false;
    el.areaBusca.hidden = true;
    limparResultados();

    mostrarMensagem(el.feedbackItem, "");
    el.data.focus();
}

el.btnTrocar.addEventListener("click", function () {
    tussSelecionado = null;
    el.selecionado.hidden = true;
    el.areaBusca.hidden = false;
    el.busca.value = "";
    el.buscaDica.textContent = "Digite ao menos 2 caracteres.";
    el.busca.focus();
});


/* ===============================
   FORMULÁRIO (adicionar / editar)
================================ */

function resetarFormulario() {
    tussSelecionado = null;
    itemEmEdicao = null;

    el.form.reset();
    el.data.value = hojeIso();
    el.quantidade.value = "1";

    el.busca.value = "";
    el.buscaDica.textContent = "Digite ao menos 2 caracteres.";
    limparResultados();

    el.areaBusca.hidden = false;
    el.selecionado.hidden = true;

    el.tituloForm.textContent = "Adicionar procedimento";
    el.btnSalvar.textContent = "Adicionar";
    el.btnCancelar.hidden = true;

    mostrarMensagem(el.feedbackItem, "");
}

function iniciarEdicao(item) {
    itemEmEdicao = item;
    selecionarTuss({ codTuss: String(item.codTuss), descricao: item.descricao });

    el.data.value = item.dataRealizacao;
    el.quantidade.value = item.quantidade;
    el.valor.value = item.valorUnitario;

    el.tituloForm.textContent = "Editar procedimento";
    el.btnSalvar.textContent = "Salvar alteração";
    el.btnCancelar.hidden = false;

    el.cardAdicionar.scrollIntoView({ behavior: "smooth", block: "start" });
}

el.btnCancelar.addEventListener("click", resetarFormulario);

/** Valida os campos; devolve o corpo da requisição ou lança Error. */
function lerFormulario() {
    if (!tussSelecionado) {
        throw new Error("Selecione um procedimento do catálogo TUSS.");
    }

    if (!el.data.value) {
        throw new Error("Informe a data de realização.");
    }

    const quantidade = Number(el.quantidade.value);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        throw new Error("A quantidade deve ser um número inteiro maior que zero.");
    }

    if (el.valor.value === "") {
        throw new Error("Informe o valor unitário.");
    }

    const valorUnitario = Number(el.valor.value);

    if (Number.isNaN(valorUnitario) || valorUnitario < 0) {
        throw new Error("O valor unitário não pode ser negativo.");
    }

    return {
        codTuss: tussSelecionado.codTuss,
        dataRealizacao: el.data.value,
        quantidade: quantidade,
        valorUnitario: valorUnitario
    };
}

el.form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (salvando) {
        return;
    }

    mostrarMensagem(el.feedbackItem, "");
    mostrarMensagem(el.feedbackGeral, "");

    let dados;

    try {
        dados = lerFormulario();
    } catch (error) {
        mostrarMensagem(el.feedbackItem, error.message);
        return;
    }

    salvando = true;
    const textoOriginal = el.btnSalvar.textContent;
    el.btnSalvar.disabled = true;
    el.btnSalvar.textContent = "Salvando...";

    try {
        espelho = itemEmEdicao
            ? await atualizarItemEspelho(espelho.idEspelho, itemEmEdicao.idItem, dados)
            : await adicionarItemEspelho(espelho.idEspelho, dados);

        resetarFormulario();
        renderizar();
        el.busca.focus();

    } catch (error) {
        console.error("Erro ao salvar item do espelho:", error);
        mostrarMensagem(el.feedbackItem, tratarErro(error, "Não foi possível salvar o procedimento."));
        el.btnSalvar.textContent = textoOriginal;

    } finally {
        salvando = false;
        el.btnSalvar.disabled = false;
    }
});

/** Erro de rede (TypeError do fetch) vira mensagem amigável. */
function tratarErro(error, padrao) {
    if (error instanceof TypeError) {
        return "Não foi possível conectar ao servidor.";
    }

    return error.message || padrao;
}


/* ===============================
   TABELA: editar / excluir
================================ */

el.tabela.addEventListener("click", async function (event) {
    const botao = event.target.closest("button[data-acao]");

    if (!botao || somenteLeitura()) {
        return;
    }

    const idItem = Number(botao.dataset.id);
    const item = espelho.itens.find(function (i) {
        return i.idItem === idItem;
    });

    if (!item) {
        return;
    }

    if (botao.dataset.acao === "editar") {
        iniciarEdicao(item);
        return;
    }

    if (botao.dataset.acao === "excluir") {
        const ok = window.confirm(`Excluir "${item.descricao || item.codTuss}" do espelho?`);

        if (!ok) {
            return;
        }

        mostrarMensagem(el.feedbackGeral, "");
        botao.disabled = true;

        try {
            espelho = await excluirItemEspelho(espelho.idEspelho, idItem);

            // Se estava editando o item excluído, limpa o formulário
            if (itemEmEdicao && itemEmEdicao.idItem === idItem) {
                resetarFormulario();
            }

            renderizar();

        } catch (error) {
            console.error("Erro ao excluir item:", error);
            botao.disabled = false;
            mostrarMensagem(el.feedbackGeral, tratarErro(error, "Não foi possível excluir o procedimento."));
        }
    }
});


/* ===============================
   ENVIAR (com confirmação)
================================ */

el.btnEnviar.addEventListener("click", function () {
    mostrarMensagem(el.feedbackGeral, "");
    mostrarMensagem(el.dlgErro, "");

    const qtd = espelho.itens.length;
    el.dlgResumo.textContent =
        `${qtd} procedimento(s) · total ${formatCurrency(espelho.valorTotal || 0)}`;

    el.dlg.showModal();
});

el.dlgVoltar.addEventListener("click", function () {
    el.dlg.close();
});

el.dlgConfirmar.addEventListener("click", async function () {
    mostrarMensagem(el.dlgErro, "");

    el.dlgConfirmar.disabled = true;
    el.dlgVoltar.disabled = true;
    el.dlgConfirmar.textContent = "Enviando...";

    try {
        espelho = await enviarEspelho(espelho.idEspelho);

        resetarFormulario();
        el.dlg.close();
        renderizar();
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        console.error("Erro ao enviar espelho:", error);
        mostrarMensagem(el.dlgErro, tratarErro(error, "Não foi possível enviar o espelho."));

    } finally {
        el.dlgConfirmar.disabled = false;
        el.dlgVoltar.disabled = false;
        el.dlgConfirmar.textContent = "Confirmar envio";
    }
});


/* ===============================
   INICIALIZAÇÃO
================================ */

async function iniciar() {
    const botaoVoltarDetalhes = document.getElementById(
        "btn-voltar-detalhes"
    );

    if (botaoVoltarDetalhes && idGuia && /^\d+$/.test(idGuia)) {
        botaoVoltarDetalhes.href =
            `detalhes-guia.html?idGuia=${encodeURIComponent(idGuia)}`;
    }

    if (!idGuia || !/^\d+$/.test(idGuia)) {
        el.carregando.hidden = true;
        mostrarMensagem(
            el.erroPagina,
            "Guia não informada. Abra o espelho a partir da lista de guias (espelho.html?idGuia=...)."
        );
        return;
    }

    try {
        espelho = await abrirEspelho(idGuia);

        resetarFormulario();
        renderizar();

        el.carregando.hidden = true;
        el.conteudo.hidden = false;

    } catch (error) {
        console.error("Erro ao abrir espelho:", error);

        el.carregando.hidden = true;
        mostrarMensagem(el.erroPagina, tratarErro(error, "Não foi possível abrir o espelho desta guia."));
    }
}

iniciar();
