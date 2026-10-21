/* =====================================================
   Botão de acesso à Lisura na tela inicial.
   Aparece só para quem tem perfil FUSEX, LISURA ou ADMIN
   (lido do token do login). Depende de: api.js
===================================================== */

(function () {
    const card = document.getElementById("card-lisura");

    if (card && temAcessoLisura()) {
        card.hidden = false;
    }
})();
