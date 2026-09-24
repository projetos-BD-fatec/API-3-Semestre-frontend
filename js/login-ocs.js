const formLogin = document.getElementById("formLoginOcs");

const campoCnpj = document.getElementById("cnpj");
const campoSenha = document.getElementById("senha");

const toggleSenha = document.getElementById("toggleSenha");
const loginError = document.getElementById("loginError");

const botaoEntrar = document.querySelector(".login-submit");


/*
 * IMPORTANTE:
 * Ajustar esta URL de acordo com a rota criada no backend.
 *
 * Exemplo:
 * http://localhost:8080/auth/login
 * http://localhost:8080/ocs/login
 */
const LOGIN_URL = "http://localhost:8080/auth/login";


/* ===============================
   MÁSCARA DE CNPJ
================================ */

campoCnpj.addEventListener("input", function () {

    let valor = campoCnpj.value.replace(/\D/g, "");

    valor = valor.substring(0, 14);

    valor = valor.replace(
        /^(\d{2})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /^(\d{2})\.(\d{3})(\d)/,
        "$1.$2.$3"
    );

    valor = valor.replace(
        /\.(\d{3})(\d)/,
        ".$1/$2"
    );

    valor = valor.replace(
        /(\d{4})(\d)/,
        "$1-$2"
    );

    campoCnpj.value = valor;
});


/* ===============================
   MOSTRAR / OCULTAR SENHA
================================ */

toggleSenha.addEventListener("click", function () {

    if (campoSenha.type === "password") {

        campoSenha.type = "text";
        toggleSenha.textContent = "Ocultar";

    } else {

        campoSenha.type = "password";
        toggleSenha.textContent = "Mostrar";
    }
});


/* ===============================
   LOGIN
================================ */

formLogin.addEventListener("submit", async function (event) {

    event.preventDefault();

    limparErro();


    const cnpj =
        campoCnpj.value.replace(/\D/g, "");

    const senha =
        campoSenha.value;


    if (cnpj.length !== 14) {

        mostrarErro(
            "Informe um CNPJ válido."
        );

        return;
    }


    if (!senha) {

        mostrarErro(
            "Informe sua senha."
        );

        return;
    }


    const dadosLogin = {
        cnpj: cnpj,
        senha: senha
    };


    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";


    try {

        const response = await fetch(
            LOGIN_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dadosLogin)
            }
        );


        /*
         * Credenciais incorretas
         */
        if (response.status === 401 ||
            response.status === 403) {

            throw new Error(
                "Usuário ou senha inválidos."
            );
        }


        /*
         * Dados inválidos
         */
        if (response.status === 400) {

            throw new Error(
                "Verifique os dados informados."
            );
        }


        /*
         * Outros erros
         */
        if (!response.ok) {

            throw new Error(
                "Não foi possível realizar o login."
            );
        }


        /*
         * Tenta ler a resposta do backend.
         *
         * Pode ser:
         * {
         *   token: "...",
         *   nome: "...",
         *   perfil: "OCS"
         * }
         */
        let dadosResposta = {};

        const contentType =
            response.headers.get("content-type");


        if (
            contentType &&
            contentType.includes("application/json")
        ) {

            dadosResposta =
                await response.json();
        }


        salvarSessao(
            cnpj,
            dadosResposta
        );


        window.location.href =
            "painel-ocs.html";


    } catch (erro) {

        console.error(
            "Erro ao realizar login:",
            erro
        );


        if (
            erro instanceof TypeError
        ) {

            mostrarErro(
                "Não foi possível conectar ao servidor."
            );

        } else {

            mostrarErro(
                erro.message
            );
        }


    } finally {

        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }

});


/* ===============================
   SESSÃO
================================ */

function salvarSessao(
    cnpj,
    dadosResposta
) {

    const sessao = {

        cnpj: cnpj,

        ...dadosResposta
    };


    localStorage.setItem(
        "sessaoOcs",
        JSON.stringify(sessao)
    );


    /*
     * Caso o backend devolva JWT:
     */
    if (dadosResposta.token) {

        localStorage.setItem(
            "token",
            dadosResposta.token
        );
    }
}


/* ===============================
   MENSAGEM DE ERRO
================================ */

function mostrarErro(texto) {

    loginError.textContent = texto;

    loginError.className =
        "form-feedback error";
}


function limparErro() {

    loginError.textContent = "";

    loginError.className =
        "form-feedback";
}