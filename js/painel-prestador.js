
/* =====================================================
   FUSEx - PAINEL DO PRESTADOR
   Tela 12 - Listagem das guias oficiais
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarPainelPrestador);

/* =====================================================
   ELEMENTOS DA TELA
===================================================== */

const painel = {
    totalGuias: document.getElementById("total-guias"),
    guiasAtivas: document.getElementById("guias-ativas"),
    guiasUtilizadas: document.getElementById("guias-utilizadas"),
    procedimentosPendentes: document.getElementById("procedimentos-pendentes"),

    busca: document.getElementById("busca-guias"),
    filtroStatus: document.getElementById("filtro-status"),
    contador: document.getElementById("quantidade-resultados"),

    lista: document.getElementById("lista-guias"),
    loading: document.getElementById("prestador-loading"),
    erro: document.getElementById("prestador-erro"),
    erroTexto: document.getElementById("prestador-erro-texto"),
    vazio: document.getElementById("prestador-vazio"),
    vazioTitulo: document.getElementById("prestador-vazio-titulo"),
    vazioTexto: document.getElementById("prestador-vazio-texto"),

    btnAtualizar: document.getElementById("btn-atualizar"),
    btnTentarNovamente: document.getElementById("btn-tentar-novamente"),
    btnSair: document.getElementById("btn-sair")
};

/* =====================================================
   ESTADO
===================================================== */

let guiasCarregadas = [];
let buscandoGuias = false;
let sequenciaBusca = 0;
let temporizadorBusca = null;

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function iniciarPainelPrestador() {
    painel.btnAtualizar.addEventListener("click", () => {
        carregarGuias();
    });

    painel.btnTentarNovamente.addEventListener("click", () => {
        carregarGuias();
    });

    painel.busca.addEventListener("input", () => {
        clearTimeout(temporizadorBusca);

        temporizadorBusca = setTimeout(() => {
            carregarGuias();
        }, 350);
    });

    painel.filtroStatus.addEventListener("change", () => {
        aplicarFiltros();
    });

    painel.btnSair.addEventListener("click", sairDoPainel);

    carregarGuias();
}

/* =====================================================
   VISIBILIDADE DOS ESTADOS
===================================================== */

function mostrarElemento(elemento, mostrar, display = "block") {
    elemento.hidden = !mostrar;
    elemento.style.display = mostrar ? display : "none";
}

function mostrarEstado(estado) {
    mostrarElemento(painel.loading, estado === "loading");
    mostrarElemento(painel.erro, estado === "erro");
    mostrarElemento(painel.vazio, estado === "vazio");
    mostrarElemento(painel.lista, estado === "lista", "flex");
}

/* =====================================================
   CARREGAMENTO DAS GUIAS
===================================================== */

async function carregarGuias() {
    const numeroRequisicao = ++sequenciaBusca;
    const busca = painel.busca.value.trim();

    buscandoGuias = true;

    mostrarEstado("loading");
    painel.btnAtualizar.disabled = true;

    try {
        // GET /api/guias?busca=...
        const resposta = await listarGuiasPrestador(busca);

        // Ignora respostas antigas quando o usuário
        // faz outra pesquisa antes da primeira terminar.
        if (numeroRequisicao !== sequenciaBusca) {
            return;
        }

        if (Array.isArray(resposta)) {
            guiasCarregadas = resposta;
        } else if (Array.isArray(resposta?.content)) {
            guiasCarregadas = resposta.content;
        } else {
            throw new Error(
                "Formato de resposta inesperado ao carregar as guias."
            );
        }

        atualizarIndicadores(guiasCarregadas);
        aplicarFiltros();

    } catch (erro) {
        if (numeroRequisicao !== sequenciaBusca) {
            return;
        }

        console.error("Erro ao carregar guias:", erro);

        painel.erroTexto.textContent =
            erro.message || "Não foi possível carregar as guias.";

        painel.contador.textContent = "—";
        preencherIndicadoresVazios();

        mostrarEstado("erro");

    } finally {
        if (numeroRequisicao === sequenciaBusca) {
            buscandoGuias = false;
            painel.btnAtualizar.disabled = false;
        }
    }
}

/* =====================================================
   NORMALIZAÇÃO DOS DADOS
===================================================== */

function statusDaGuia(guia) {
    // O backend utiliza statusGuia. Mantemos fallback
    // para simplificar uma possível adaptação futura.
    const status = guia.statusGuia ?? guia.status ?? "";

    return String(status).trim().toUpperCase();
}

function guiaFoiUtilizada(guia) {
    return guia.guiaUtilizada === true ||
        statusDaGuia(guia) === "UTILIZADA";
}

function totalProcedimentosDaGuia(guia) {
    const valor = Number(guia.totalProcedimentos ?? 0);

    return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

function realizadosDaGuia(guia) {
    const valor = Number(guia.procedimentosRealizados ?? 0);
    const total = totalProcedimentosDaGuia(guia);

    if (!Number.isFinite(valor)) {
        return 0;
    }

    return Math.min(Math.max(0, valor), total);
}

function pendentesDaGuia(guia) {
    return totalProcedimentosDaGuia(guia) - realizadosDaGuia(guia);
}

function codigoDaGuia(guia) {
    return guia.codigoGuia ?? "Código não informado";
}

function nomePacienteDaGuia(guia) {
    return guia.nomePaciente ??
        guia.nomeBeneficiario ??
        guia.nmBeneficiario ??
        "Paciente não informado";
}

function idDaGuia(guia) {
    return guia.idGuiaOficial ?? guia.idGuia ?? guia.id ?? null;
}

/* =====================================================
   INDICADORES
===================================================== */

function preencherIndicadoresVazios() {
    painel.totalGuias.textContent = "—";
    painel.guiasAtivas.textContent = "—";
    painel.guiasUtilizadas.textContent = "—";
    painel.procedimentosPendentes.textContent = "—";
}

function atualizarIndicadores(guias) {
    const total = guias.length;

    const utilizadas = guias.filter(guiaFoiUtilizada).length;

    const ativas = guias.filter(guia => {
        const status = statusDaGuia(guia);

        return !guiaFoiUtilizada(guia) &&
            status !== "CANCELADA" &&
            status !== "VENCIDA";
    }).length;

    const pendentes = guias.reduce((soma, guia) => {
        return soma + pendentesDaGuia(guia);
    }, 0);

    painel.totalGuias.textContent = total;
    painel.guiasAtivas.textContent = ativas;
    painel.guiasUtilizadas.textContent = utilizadas;
    painel.procedimentosPendentes.textContent = pendentes;
}

/* =====================================================
   FILTRAGEM
===================================================== */

function aplicarFiltros() {
    if (buscandoGuias) {
        return;
    }

    const filtro = painel.filtroStatus.value;

    const resultado = guiasCarregadas.filter(guia => {
        if (filtro === "TODAS") {
            return true;
        }

        if (filtro === "UTILIZADA") {
            return guiaFoiUtilizada(guia);
        }

        if (filtro === "ATIVA") {
            const status = statusDaGuia(guia);

            return !guiaFoiUtilizada(guia) &&
                status !== "CANCELADA" &&
                status !== "VENCIDA";
        }

        return statusDaGuia(guia) === filtro;
    });

    renderizarGuias(resultado);
}

/* =====================================================
   STATUS VISUAL
===================================================== */

function informacoesStatus(guia) {
    if (guiaFoiUtilizada(guia)) {
        return {
            texto: "Utilizada",
            classe: "is-utilizada"
        };
    }

    const status = statusDaGuia(guia);

    switch (status) {
        case "ATIVA":
        case "EMITIDA":
        case "PENDENTE":
            return {
                texto: "Ativa",
                classe: "is-ativa"
            };

        case "VENCIDA":
            return {
                texto: "Vencida",
                classe: "is-vencida"
            };

        case "CANCELADA":
            return {
                texto: "Cancelada",
                classe: "is-cancelada"
            };

        default:
            return {
                texto: status
                    ? status.replaceAll("_", " ")
                    : "Situação não informada",
                classe: "is-ativa"
            };
    }
}

/* =====================================================
   RENDERIZAÇÃO DA LISTA
===================================================== */

function renderizarGuias(guias) {
    painel.contador.textContent =
        `${guias.length} ${guias.length === 1 ? "guia" : "guias"}`;

    painel.lista.replaceChildren();

    if (guias.length === 0) {
        const existeBusca = painel.busca.value.trim() !== "";
        const existeFiltro = painel.filtroStatus.value !== "TODAS";

        painel.vazioTitulo.textContent =
            existeBusca || existeFiltro
                ? "Nenhuma guia encontrada"
                : "Nenhuma guia disponível";

        painel.vazioTexto.textContent =
            existeBusca || existeFiltro
                ? "Tente alterar sua pesquisa ou o filtro selecionado."
                : "As guias oficiais destinadas ao prestador aparecerão aqui.";

        mostrarEstado("vazio");
        return;
    }

    const fragmento = document.createDocumentFragment();

    guias.forEach(guia => {
        fragmento.appendChild(criarCardGuia(guia));
    });

    painel.lista.appendChild(fragmento);
    mostrarEstado("lista");
}

/* =====================================================
   CARD DE GUIA
===================================================== */

function criarCardGuia(guia) {
    const id = idDaGuia(guia);

    const codigo = codigoDaGuia(guia);
    const paciente = nomePacienteDaGuia(guia);

    const total = totalProcedimentosDaGuia(guia);
    const realizados = realizadosDaGuia(guia);

    const percentual = total > 0
        ? Math.round((realizados / total) * 100)
        : 0;

    const status = informacoesStatus(guia);

    const artigo = document.createElement("article");
    artigo.className = "prestador-guia-card";

    // escapeHtml vem de js/formatters.js e impede
    // que dados recebidos da API virem HTML executável.
    artigo.innerHTML = `
        <div class="prestador-guia-topo">
            <div>
                <span class="prestador-guia-codigo">
                    ${escapeHtml(codigo)}
                </span>

                <h3 class="prestador-guia-paciente">
                    ${escapeHtml(paciente)}
                </h3>
            </div>

            <span class="prestador-guia-status ${status.classe}">
                ${escapeHtml(status.texto)}
            </span>
        </div>

        <div class="prestador-guia-info">
            <span>
                <strong>Procedimentos:</strong>
                ${total}
            </span>

            <span>
                <strong>Pendentes:</strong>
                ${total - realizados}
            </span>
        </div>

        <div class="prestador-guia-progresso">
            <div class="prestador-guia-progresso-topo">

                <span class="prestador-guia-progresso-label">
                    Procedimentos realizados
                </span>

                <span class="prestador-guia-progresso-valor">
                    ${realizados} de ${total} (${percentual}%)
                </span>

            </div>

            <div class="prestador-guia-barra"
                 role="progressbar"
                 aria-label="Procedimentos realizados"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-valuenow="${percentual}">

                <div class="prestador-guia-barra-preenchimento"
                     style="width: ${percentual}%">
                </div>
            </div>
        </div>

        <div class="prestador-guia-rodape">
            <span class="prestador-guia-data">
                Guia oficial FUSEx
            </span>

            ${
                id !== null
                    ? `
                        <a class="prestador-guia-abrir"
                           href="detalhes-guia.html?idGuia=${encodeURIComponent(id)}">
                            Ver detalhes →
                        </a>
                    `
                    : `
                        <span class="prestador-guia-data">
                            Identificador indisponível
                        </span>
                    `
            }
        </div>
    `;

    return artigo;
}

/* =====================================================
   ENCERRAR SESSÃO
===================================================== */

function sairDoPainel() {
    localStorage.removeItem("token");

    window.location.href = "../auth/login.html";
}
