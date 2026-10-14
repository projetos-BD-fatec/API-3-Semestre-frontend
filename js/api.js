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
