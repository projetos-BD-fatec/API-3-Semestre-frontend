/* =====================================================
   MENU (botão ☰) com "Início" e "Sair"
   Depende de: sessao.js (obterToken, encerrarSessao)
               api.js    (perfisDoUsuario)
   Carregar por ÚLTIMO, depois dos scripts da página.

   - Só aparece com usuário logado.
   - Usa o botão .menu-button que já existir no header; se não existir,
     cria um ao lado do botão "Voltar".
   - Nas telas da OCS que já têm o botão "Sair" (#btn-sair), não cria
     o menu: só garante que o "Sair" encerre a sessão inteira.
===================================================== */

(function () {

    /* Caminhos calculados a partir do próprio menu.js (js/menu.js),
       então funcionam em qualquer pasta de /pages */
    const script = document.currentScript;
    const RAIZ = new URL("../", script ? script.src : window.location.href);
    const URL_LOGIN = new URL("pages/auth/login.html", RAIZ).href;

    function urlInicio() {
        const perfis = (typeof perfisDoUsuario === "function" ? perfisDoUsuario() : [])
            .map(function (perfil) { return String(perfil).toUpperCase(); });

        const pagina = perfis.includes("PRESTADOR")
            ? "pages/ocs/painel-prestador.html"
            : "pages/beneficiario/inicio.html";

        return new URL(pagina, RAIZ).href;
    }

    function sair() {
        encerrarSessao();
        window.location.href = URL_LOGIN;
    }

    if (!obterToken()) {
        return;
    }

    const header = document.querySelector(".header-container");

    if (!header) {
        return;
    }

    /* Telas da OCS: já têm o botão "Sair" próprio */
    const botaoSairOcs = document.getElementById("btn-sair");

    if (botaoSairOcs) {
        botaoSairOcs.addEventListener("click", encerrarSessao);
        return;
    }

    /* Botão ☰: usa o que já existe ou cria um novo */
    let botaoMenu = header.querySelector(".menu-button");

    if (!botaoMenu) {
        botaoMenu = document.createElement("button");
        botaoMenu.className = "menu-button";
        botaoMenu.textContent = "☰";
        header.appendChild(botaoMenu);
    }

    /* Agrupa "Voltar" + ☰ à direita do header */
    const acoes = document.createElement("div");
    acoes.className = "header-acoes";

    const botaoVoltar = header.querySelector(".back-button");

    if (botaoVoltar) {
        acoes.appendChild(botaoVoltar);
    }

    header.appendChild(acoes);
    acoes.appendChild(botaoMenu);

    botaoMenu.setAttribute("type", "button");
    botaoMenu.setAttribute("aria-label", "Abrir menu");
    botaoMenu.setAttribute("aria-haspopup", "true");
    botaoMenu.setAttribute("aria-expanded", "false");

    /* Dropdown */
    const dropdown = document.createElement("div");
    dropdown.className = "menu-dropdown";
    dropdown.hidden = true;
    dropdown.innerHTML =
        '<a class="menu-dropdown-item" data-acao="inicio">Início</a>' +
        '<button type="button" class="menu-dropdown-item" data-acao="sair">Sair</button>';

    dropdown.querySelector('[data-acao="inicio"]').href = urlInicio();
    dropdown.querySelector('[data-acao="sair"]').addEventListener("click", sair);

    acoes.appendChild(dropdown);

    function abrirFechar(abrir) {
        dropdown.hidden = !abrir;
        botaoMenu.setAttribute("aria-expanded", String(abrir));
    }

    botaoMenu.addEventListener("click", function (event) {
        event.stopPropagation();
        abrirFechar(dropdown.hidden);
    });

    dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function () {
        abrirFechar(false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            abrirFechar(false);
        }
    });

})();
