/* =====================================================
   Acesso à API (compartilhado por todas as páginas logadas)
   Carregar ANTES dos scripts da página.
===================================================== */

const API_URL = "http://localhost:8080";

// Relativo à página em execução (pages/beneficiario/*.html, pages/ocs/*.html...)
const LOGIN_URL = "../auth/login.html";


async function fetchAutenticado(url, opcoes = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = LOGIN_URL;
        throw new Error("Sem token de autenticação.");
    }

    const headers = {
        ...(opcoes.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    const response = await fetch(url, { ...opcoes, headers });

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = LOGIN_URL;
        throw new Error("Sessão expirada.");
    }

    return response;
}


// ==============================
// BENEFICIÁRIO
// ==============================

/**
 * Normaliza os dados do beneficiário para { nome, precCp }.
 * Aceita tanto o JSON de GET /usuarios/me quanto uma PreGuiaResponse
 * (caso o backend passe a incluir os campos nela).
 *
 * >>> Se o backend usar outros nomes de campo, é só ajustar AQUI. <<<
 */
function lerBeneficiario(dados) {
    return {
        nome: (dados && (dados.nmBeneficiario ?? dados.nome)) || null,
        precCp: (dados && (dados.nrPrecCp ?? dados.precCp)) || null
    };
}

/**
 * GET /usuarios/me  (PENDENTE no backend)
 * Nunca rejeita: se o endpoint não existir ou falhar, devolve campos nulos
 * e as telas mostram "—".
 */
async function buscarBeneficiario() {
    try {
        const response = await fetchAutenticado(`${API_URL}/usuarios/me`);

        if (!response.ok) {
            return lerBeneficiario(null);
        }

        return lerBeneficiario(await response.json());

    } catch (error) {
        console.warn("Não foi possível carregar os dados do beneficiário:", error);
        return lerBeneficiario(null);
    }
}


// ==============================
// PRÉ-GUIAS
// ==============================

async function listarMinhasPreGuias() {
    const response = await fetchAutenticado(`${API_URL}/pre-guias/me`);

    if (!response.ok) {
        throw new Error("Erro ao buscar solicitações.");
    }

    return response.json();
}

/**
 * GET /pre-guias/{id}/arquivo  (PENDENTE no backend)
 * Baixa o anexo com o token e devolve uma URL temporária (blob)
 * que pode ser aberta em outra aba.
 */
async function obterUrlArquivoPreGuia(idPreGuia) {
    const response = await fetchAutenticado(`${API_URL}/pre-guias/${idPreGuia}/arquivo`);

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "Arquivo não encontrado."
                : "Não foi possível carregar o arquivo."
        );
    }

    return URL.createObjectURL(await response.blob());
}

// ==============================
// ESPELHO (OCS)
// ==============================

/**
 * Lê a mensagem de erro do corpo (campo "message" do Spring).
 * Se não houver, devolve a mensagem padrão informada.
 */
async function lerMensagemErro(response, padrao) {
    try {
        const dados = await response.json();

        if (dados && typeof dados.message === "string" && dados.message.trim()) {
            return dados.message;
        }
    } catch (error) {
        // corpo vazio ou não-JSON: usa a mensagem padrão
    }

    return padrao;
}

/** Faz a chamada e devolve o JSON; em erro, lança Error com a mensagem. */
async function requisitarEspelho(url, metodo, corpo, mensagemPadrao) {
    const opcoes = { method: metodo };

    if (corpo !== undefined) {
        opcoes.headers = { "Content-Type": "application/json" };
        opcoes.body = JSON.stringify(corpo);
    }

    const response = await fetchAutenticado(url, opcoes);

    if (!response.ok) {
        throw new Error(await lerMensagemErro(response, mensagemPadrao));
    }

    return response.json();
}

/** GET /catalogo-tuss?busca=texto (mínimo 2 caracteres, máx. 20 resultados) */
function buscarCatalogoTuss(busca) {
    return requisitarEspelho(
        `${API_URL}/catalogo-tuss?busca=${encodeURIComponent(busca)}`,
        "GET", undefined, "Não foi possível buscar no catálogo TUSS."
    );
}

/** POST /guias/{idGuia}/espelho — abre o espelho ou devolve o existente */
function abrirEspelho(idGuia) {
    return requisitarEspelho(
        `${API_URL}/guias/${idGuia}/espelho`,
        "POST", undefined, "Não foi possível abrir o espelho desta guia."
    );
}

/** GET /espelhos/{id} */
function buscarEspelho(idEspelho) {
    return requisitarEspelho(
        `${API_URL}/espelhos/${idEspelho}`,
        "GET", undefined, "Não foi possível carregar o espelho."
    );
}

/** POST /espelhos/{id}/itens — dados: { codTuss, dataRealizacao, quantidade, valorUnitario } */
function adicionarItemEspelho(idEspelho, dados) {
    return requisitarEspelho(
        `${API_URL}/espelhos/${idEspelho}/itens`,
        "POST", dados, "Não foi possível adicionar o procedimento."
    );
}

/** PUT /espelhos/{id}/itens/{idItem} */
function atualizarItemEspelho(idEspelho, idItem, dados) {
    return requisitarEspelho(
        `${API_URL}/espelhos/${idEspelho}/itens/${idItem}`,
        "PUT", dados, "Não foi possível salvar a alteração."
    );
}

/** DELETE /espelhos/{id}/itens/{idItem} */
function excluirItemEspelho(idEspelho, idItem) {
    return requisitarEspelho(
        `${API_URL}/espelhos/${idEspelho}/itens/${idItem}`,
        "DELETE", undefined, "Não foi possível excluir o procedimento."
    );
}

/** POST /espelhos/{id}/enviar */
function enviarEspelho(idEspelho) {
    return requisitarEspelho(
        `${API_URL}/espelhos/${idEspelho}/enviar`,
        "POST", undefined, "Não foi possível enviar o espelho."
    );
}


/* =====================================================
   PRESTADOR — GUIAS OFICIAIS
   Endpoints: /api/guias
===================================================== */

/**
 * Executa requisições autenticadas às guias oficiais.
 * Reutiliza o JWT e o tratamento de sessão do api.js.
 */
async function requisitarGuiaPrestador(
    caminho,
    metodo = "GET",
    mensagemPadrao = "Não foi possível realizar a operação."
) {
    const response = await fetchAutenticado(
        `${API_URL}/api/guias${caminho}`,
        { method: metodo }
    );

    if (!response.ok) {
        const mensagem = await lerMensagemErro(
            response,
            mensagemPadrao
        );

        const erro = new Error(mensagem);
        erro.status = response.status;

        throw erro;
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

/**
 * GET /api/guias
 *
 * Lista as guias oficiais do prestador autenticado.
 *
 * O parâmetro busca é opcional e permite pesquisar
 * por nome do paciente ou código da guia.
 */
async function listarGuiasPrestador(busca = "") {
    const termo = String(busca).trim();

    const parametros = new URLSearchParams();

    if (termo) {
        parametros.set("busca", termo);
    }

    const query = parametros.toString();

    return requisitarGuiaPrestador(
        query ? `?${query}` : "",
        "GET",
        "Não foi possível carregar as guias oficiais."
    );
}

/**
 * GET /api/guias/{id}
 *
 * Retorna os detalhes da guia oficial,
 * incluindo seus procedimentos.
 */
async function buscarDetalhesGuiaPrestador(idGuia) {
    return requisitarGuiaPrestador(
        `/${encodeURIComponent(idGuia)}`,
        "GET",
        "Não foi possível carregar os detalhes da guia."
    );
}

/**
 * PUT /api/guias/{id}/finalizar
 *
 * Marca a guia oficial como UTILIZADA.
 *
 * ATENÇÃO:
 * Essa operação não marca os procedimentos como
 * realizados. A confirmação de cada procedimento
 * é independente.
 */
async function marcarGuiaComoUtilizada(idGuia) {
    return requisitarGuiaPrestador(
        `/${encodeURIComponent(idGuia)}/finalizar`,
        "PUT",
        "Não foi possível marcar a guia como utilizada."
    );
}

/**
 * PUT /api/guias/{idGuia}/procedimentos/{idItem}/finalizar
 *
 * Confirma a realização de um procedimento específico.
 * O backend registra FL_REALIZADO = 'S'
 * e a data/hora da confirmação.
 */
async function marcarProcedimentoComoRealizado(
    idGuia,
    idItem
) {
    return requisitarGuiaPrestador(
        `/${encodeURIComponent(idGuia)}` +
        `/procedimentos/${encodeURIComponent(idItem)}` +
        "/finalizar",
        "PUT",
        "Não foi possível confirmar a realização do procedimento."
    );
}


// ==============================
// LISURA
// ==============================

/**
 * GET /lisura/{guiaId}
 * Itens do espelho enviado com o valor cobrado (OCS) e o valor contratual.
 * situacao de cada item: CONFORME | ACIMA | ABAIXO | SEM_CONTRATO
 */
function buscarConferenciaLisura(idGuia) {
    return requisitarEspelho(
        `${API_URL}/lisura/${idGuia}`,
        "GET", undefined, "Não foi possível carregar a conferência do espelho."
    );
}

/**
 * PUT /lisura/{guiaId}/revisao
 * itens: [{ idItem, decisao, valorAjustado }]
 * decisao: ACATAR_CONTRATUAL | MANTER_COBRADO | VALOR_AJUSTADO
 * Devolve a conferência atualizada (mesmo formato do GET).
 */
function salvarRevisaoLisura(idGuia, itens) {
    return requisitarEspelho(
        `${API_URL}/lisura/${idGuia}/revisao`,
        "PUT", { itens: itens }, "Não foi possível salvar a revisão."
    );
}

/** GET /lisura — espelhos já enviados pelas OCS (mais recentes primeiro) */
function listarEspelhosLisura() {
    return requisitarEspelho(
        `${API_URL}/lisura`,
        "GET", undefined, "Não foi possível carregar os espelhos enviados."
    );
}


// ==============================
// PERFIS DO USUÁRIO LOGADO
// ==============================

/** Perfis que podem acessar a Lisura (mesma regra do backend). */
const PERFIS_LISURA = ["FUSEX", "LISURA", "ADMIN"];

/**
 * Lê os perfis gravados no token do login (claim "perfis" do JWT).
 * Serve só para mostrar/esconder botões: quem garante o acesso é o backend.
 */
function perfisDoUsuario() {
    const token = localStorage.getItem("token");

    if (!token || token.split(".").length !== 3) {
        return [];
    }

    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(base64).split("").map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            }).join("")
        );
        const perfis = JSON.parse(json).perfis;

        return Array.isArray(perfis) ? perfis.map(String) : [];

    } catch (error) {
        return [];
    }
}

function temAcessoLisura() {
    return perfisDoUsuario().some(function (perfil) {
        return PERFIS_LISURA.includes(perfil.toUpperCase());
    });
}
