/* =====================================================
   Botão de acesso ao Acompanhamento do fluxo (US17).
   Aparece só para quem tem perfil FUSEX ou ADMIN — a mesma
   regra que o AcompanhamentoService aplica no backend.
   Depende de: api.js (perfisDoUsuario)
===================================================== */

/** Perfis que podem acompanhar o fluxo (mesma regra do backend). */
const PERFIS_ACOMPANHAMENTO = ["FUSEX", "ADMIN"];

function temAcessoAcompanhamento() {
    return perfisDoUsuario().some(function (perfil) {
        return PERFIS_ACOMPANHAMENTO.includes(perfil.toUpperCase());
    });
}

(function () {
    const card = document.getElementById("card-acompanhamento");

    if (card && temAcessoAcompanhamento()) {
        card.hidden = false;
    }

    // A seção interna só existe se alguma ferramenta dela estiver liberada.
    // Este script roda depois do acesso-lisura.js, então já enxerga o
    // resultado dos dois.
    const secao = document.getElementById("area-interna");

    if (secao && secao.querySelector(".action-card:not([hidden])")) {
        secao.hidden = false;
    }
})();
