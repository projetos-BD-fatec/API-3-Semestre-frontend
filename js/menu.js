/* ===============================
   MENU (botão ☰) + SAIR
================================ */

(function () {

    const botaoMenu = document.querySelector(".menu-button");

    if (!botaoMenu) {
        return;
    }

    /* index.html está na raiz; as demais páginas estão em /pages */
    const estaEmPages = window.location.pathname.includes("/pages/");
    const URL_LOGIN = estaEmPages ? "login-ocs.html" : "pages/login-ocs.html";

    botaoMenu.setAttribute("type", "button");
    botaoMenu.setAttribute("aria-haspopup", "true");
    botaoMenu.setAttribute("aria-expanded", "false");

    /* Cria o dropdown */
    const dropdown = document.createElement("div");
    dropdown.className = "menu-dropdown";
    dropdown.hidden = true;
    dropdown.innerHTML =
        '<button type="button" class="menu-dropdown-item" id="btnSair">Sair</button>';

    botaoMenu.parentElement.style.position = "relative";
    botaoMenu.insertAdjacentElement("afterend", dropdown);

    function abrirFechar(abrir) {
        dropdown.hidden = !abrir;
        botaoMenu.setAttribute("aria-expanded", String(abrir));
    }

    botaoMenu.addEventListener("click", function (event) {
        event.stopPropagation();
        abrirFechar(dropdown.hidden);
    });

    document.addEventListener("click", function () {
        abrirFechar(false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            abrirFechar(false);
        }
    });

    dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    /* Sair: limpa sessão e volta para o login */
    document.getElementById("btnSair").addEventListener("click", function () {
        localStorage.removeItem("sessaoOcs");
        localStorage.removeItem("token");
        sessionStorage.clear();
        window.location.href = URL_LOGIN;
    });

})();
