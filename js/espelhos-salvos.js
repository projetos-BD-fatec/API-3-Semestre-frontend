/* =====================================================
   Página: espelhos salvos da OCS (envio em lote ao FUSEx)

   A OCS salva os espelhos um a um (ficam com ela) e, quando
   quiser, seleciona quais enviar ao FUSEx de uma só vez.

   Depende de: api.js (listarEspelhosSalvos, enviarEspelhosEmLote)
   e formatters.js (escapeHtml, formatCurrency, formatDate).
===================================================== */

const el = {
    sucesso: document.getElementById("salvos-sucesso"),
    loading: document.getElementById("salvos-loading"),
    erro: document.getElementById("salvos-erro"),
    erroTexto: document.getElementById("salvos-erro-texto"),
    vazio: document.getElementById("salvos-vazio"),
    conteudo: document.getElementById("salvos-conteudo"),

    checkTodos: document.getElementById("check-todos"),
    contador: document.getElementById("salvos-contador"),
    tabela: document.getElementById("tabela-salvos"),
    feedback: document.getElementById("salvos-feedback"),
    resumo: document.getElementById("salvos-resumo"),
    btnEnviar: document.getElementById("btn-enviar-fusex"),

    btnAtualizar: document.getElementById("btn-atualizar"),
    btnTentarNovamente: document.getElementById("btn-tentar-novamente"),
    btnSair: document.getElementById("btn-sair"),

    dlg: document.getElementById("dlg-enviar-lote"),
    dlgResumo: document.getElementById("dlg-lote-resumo"),
    dlgErro: document.getElementById("dlg-lote-erro"),
    dlgVoltar: document.getElementById("dlg-lote-voltar"),
    dlgConfirmar: document.getElementById("dlg-lote-confirmar")
};

let espelhosSalvos = [];          // lista vinda do backend
const selecionados = new Set();   // idEspelho marcados
let carregando = false;
let enviando = false;


/* ===============================
   UTILITÁRIOS
================================ */

function mostrarMensagem(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = !texto;
}

/** Erro de rede (TypeError do fetch) vira mensagem amigável. */
function tratarErro(error, padrao) {
    if (error instanceof TypeError) {
        return "Não foi possível conectar ao servidor.";
    }

    return error.message || padrao;
}

function mostrarEstado(estado) {
    el.loading.hidden = estado !== "loading";
    el.erro.hidden = estado !== "erro";
    el.vazio.hidden = estado !== "vazio";
    el.conteudo.hidden = estado !== "lista";
}

function selecionadosComoLista() {
    return espelhosSalvos.filter(function (e) {
        return selecionados.has(e.idEspelho);
    });
}


/* ===============================
   RENDERIZAÇÃO
================================ */

function renderizar() {
    el.tabela.innerHTML = espelhosSalvos.map(function (e) {
        const marcado = selecionados.has(e.idEspelho);
        const nome = e.nomeBeneficiario || "Beneficiário não informado";

        return `
            <tr class="${marcado ? "is-selecionado" : ""}" data-id="${e.idEspelho}">
                <td class="col-check">
                    <input type="checkbox" data-id="${e.idEspelho}"
                           aria-label="Selecionar o espelho de ${escapeHtml(nome)}"
                           ${marcado ? "checked" : ""}>
                </td>
                <td data-rotulo="Beneficiário">
                    <a class="salvos-link"
                       href="espelho.html?idGuia=${encodeURIComponent(e.idGuia)}"
                       title="Abrir o espelho para conferir ou alterar">${escapeHtml(nome)}</a>
                </td>
                <td data-rotulo="PRECCP" class="espelho-mono">${escapeHtml(e.precCp || "—")}</td>
                <td data-rotulo="Salvo em">${escapeHtml(formatDate(e.salvoEm))}</td>
            </tr>
        `;
    }).join("");

    atualizarSelecao();
}

/** Atualiza contador, "selecionar todos", resumo e botão (sem redesenhar a tabela). */
function atualizarSelecao() {
    const total = espelhosSalvos.length;
    const marcados = selecionadosComoLista();

    el.checkTodos.checked = total > 0 && marcados.length === total;
    el.checkTodos.indeterminate = marcados.length > 0 && marcados.length < total;

    el.contador.textContent = `${marcados.length} de ${total} selecionado(s)`;

    if (marcados.length === 0) {
        el.resumo.textContent = "Nenhum espelho selecionado.";
    } else {
        const valor = marcados.reduce(function (soma, e) {
            return soma + Number(e.valorTotal || 0);
        }, 0);

        el.resumo.textContent =
            `${marcados.length} espelho(s) selecionado(s) · total ${formatCurrency(valor)}`;
    }

    el.btnEnviar.disabled = marcados.length === 0 || enviando;
}


/* ===============================
   SELEÇÃO
================================ */

el.tabela.addEventListener("change", function (event) {
    const caixa = event.target.closest("input[type='checkbox'][data-id]");

    if (!caixa) {
        return;
    }

    const id = Number(caixa.dataset.id);

    if (caixa.checked) {
        selecionados.add(id);
    } else {
        selecionados.delete(id);
    }

    caixa.closest("tr").classList.toggle("is-selecionado", caixa.checked);
    mostrarMensagem(el.feedback, "");
    atualizarSelecao();
});

// Clicar na linha (fora do link e da caixa) também marca/desmarca
el.tabela.addEventListener("click", function (event) {
    if (event.target.closest("a, input")) {
        return;
    }

    const linha = event.target.closest("tr[data-id]");

    if (linha) {
        linha.querySelector("input[type='checkbox']").click();
    }
});

el.checkTodos.addEventListener("change", function () {
    if (el.checkTodos.checked) {
        espelhosSalvos.forEach(function (e) {
            selecionados.add(e.idEspelho);
        });
    } else {
        selecionados.clear();
    }

    mostrarMensagem(el.feedback, "");
    renderizar();
});


/* ===============================
   CARREGAR LISTA
================================ */

async function carregar() {
    if (carregando) {
        return;
    }

    carregando = true;
    el.btnAtualizar.disabled = true;
    mostrarEstado("loading");

    try {
        const lista = await listarEspelhosSalvos();
        espelhosSalvos = Array.isArray(lista) ? lista : [];

        // Descarta seleções de espelhos que não estão mais na lista
        const idsAtuais = new Set(espelhosSalvos.map(function (e) {
            return e.idEspelho;
        }));

        Array.from(selecionados).forEach(function (id) {
            if (!idsAtuais.has(id)) {
                selecionados.delete(id);
            }
        });

        if (espelhosSalvos.length === 0) {
            mostrarEstado("vazio");
        } else {
            renderizar();
            mostrarEstado("lista");
        }

    } catch (error) {
        console.error("Erro ao carregar espelhos salvos:", error);
        el.erroTexto.textContent = tratarErro(error, "Não foi possível carregar os espelhos salvos.");
        mostrarEstado("erro");

    } finally {
        carregando = false;
        el.btnAtualizar.disabled = false;
    }
}

el.btnAtualizar.addEventListener("click", function () {
    mostrarMensagem(el.sucesso, "");
    carregar();
});

el.btnTentarNovamente.addEventListener("click", carregar);


/* ===============================
   ENVIAR PARA O FUSEX (com confirmação)
================================ */

el.btnEnviar.addEventListener("click", function () {
    const marcados = selecionadosComoLista();

    if (marcados.length === 0) {
        return;
    }

    const valor = marcados.reduce(function (soma, e) {
        return soma + Number(e.valorTotal || 0);
    }, 0);

    mostrarMensagem(el.feedback, "");
    mostrarMensagem(el.dlgErro, "");

    el.dlgResumo.textContent =
        `${marcados.length} espelho(s) · total ${formatCurrency(valor)}`;

    el.dlg.showModal();
});

el.dlgVoltar.addEventListener("click", function () {
    el.dlg.close();
});

el.dlgConfirmar.addEventListener("click", async function () {
    if (enviando) {
        return;
    }

    const ids = selecionadosComoLista().map(function (e) {
        return e.idEspelho;
    });

    if (ids.length === 0) {
        el.dlg.close();
        return;
    }

    enviando = true;
    mostrarMensagem(el.dlgErro, "");

    el.dlgConfirmar.disabled = true;
    el.dlgVoltar.disabled = true;
    el.dlgConfirmar.textContent = "Enviando...";

    try {
        const resultado = await enviarEspelhosEmLote(ids);

        el.dlg.close();

        mostrarMensagem(
            el.sucesso,
            `${resultado.totalEnviados} espelho(s) enviado(s) ao FUSEx ` +
            `(total ${formatCurrency(resultado.valorTotal)}).`
        );

        selecionados.clear();
        enviando = false;
        await carregar();
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        console.error("Erro ao enviar espelhos em lote:", error);
        mostrarMensagem(el.dlgErro, tratarErro(error, "Não foi possível enviar os espelhos."));

    } finally {
        enviando = false;
        el.dlgConfirmar.disabled = false;
        el.dlgVoltar.disabled = false;
        el.dlgConfirmar.textContent = "Confirmar envio";
        atualizarSelecao();
    }
});


/* ===============================
   SAIR / INICIALIZAÇÃO
================================ */

el.btnSair.addEventListener("click", function () {
    localStorage.removeItem("token");
    window.location.href = "../auth/login.html";
});

carregar();
