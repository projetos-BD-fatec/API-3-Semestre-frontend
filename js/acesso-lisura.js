
/* =====================================================
   ACESSOS EXTRAS NA TELA INICIAL
   Depende de api.js
===================================================== */

(function () {

    const perfis = perfisDoUsuario()
        .map(perfil => perfil.toUpperCase());

    // Painel do colaborador FUSEx
    const cardFusex = document.getElementById("card-fusex");

    if (cardFusex) {
        cardFusex.hidden = !perfis.some(perfil =>
            ["FUSEX", "ADMIN"].includes(perfil)
        );
    }

    // Acesso à Lisura
    const cardLisura = document.getElementById("card-lisura");

    if (cardLisura) {
        cardLisura.hidden = !temAcessoLisura();
    }

})();
