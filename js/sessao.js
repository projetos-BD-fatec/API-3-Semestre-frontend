/* =====================================================
   Sessão do usuário (token JWT e dados do login)
   Carregar ANTES de api.js, login.js e menu.js.

   "Manter conectado" marcado  -> localStorage: a sessão continua
                                  depois de fechar o navegador
                                  (até o token expirar).
   "Manter conectado" desmarcado -> sessionStorage: a sessão acaba
                                  quando o navegador é fechado.
===================================================== */

const CHAVES_SESSAO = ["token", "sessaoUsuario", "sessaoOcs"];

/** Token da sessão atual, esteja ele no sessionStorage ou no localStorage. */
function obterToken() {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
}

/**
 * Grava a sessão depois do login.
 * chave: "sessaoUsuario" ou "sessaoOcs"
 * manterConectado: valor do checkbox "Manter conectado"
 */
function salvarSessao(chave, dados, manterConectado) {
    // Começa sempre limpo, para não sobrar sessão antiga no outro armazenamento
    encerrarSessao();

    const armazenamento = manterConectado ? localStorage : sessionStorage;

    armazenamento.setItem(chave, JSON.stringify(dados));

    if (dados && dados.token) {
        armazenamento.setItem("token", dados.token);
    }
}

/** Apaga a sessão dos dois armazenamentos (logout ou token expirado). */
function encerrarSessao() {
    CHAVES_SESSAO.forEach(function (chave) {
        localStorage.removeItem(chave);
        sessionStorage.removeItem(chave);
    });
}
