const formLogin = document.getElementById("formLoginOcs");
//const campoCnpj = document.getElementById("cnpj");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");
const loginError = document.getElementById("loginError");
const botaoEntrar = document.querySelector(".login-submit");

const LOGIN_URL = "http://localhost:8080/auth/login";

/* Máscara de CNPJ
campoCnpj.addEventListener("input", function () {
    let valor = campoCnpj.value.replace(/\D/g, "");
    valor = valor.substring(0, 14);
    valor = valor.replace(/^(\d{2})(\d)/, "$1.$2");
    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2");
    valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
    campoCnpj.value = valor;
}); */

// Mostrar / ocultar senha
toggleSenha.addEventListener("click", function () {
    if (campoSenha.type === "password") {
        campoSenha.type = "text";
        toggleSenha.textContent = "Ocultar";
    } else {
        campoSenha.type = "password";
        toggleSenha.textContent = "Mostrar";
    }
}); 

// Login
formLogin.addEventListener("submit", async function (event) {
    event.preventDefault();
    limparErro();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    if (!email) {
        mostrarErro("Informe seu e-mail.");
        return;
    }

    if (!senha) {
        mostrarErro("Informe sua senha.");
        return;
    }

    const dadosLogin = {
        login: email,
        senha: senha
    };

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    try {
        const response = await fetch(LOGIN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosLogin)
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error("CNPJ ou senha inválidos.");
        }

        if (response.status === 400) {
            throw new Error("Verifique os dados informados.");
        }

        if (!response.ok) {
            throw new Error("Não foi possível realizar o login.");
        }

        const dadosResposta = await response.json();

        console.log("Resposta do login:", dadosResposta);

        if (!dadosResposta.token) {
            throw new Error("O servidor não retornou o token de autenticação.");
        }

        salvarSessao(dadosResposta);

        window.location.href = "../index.html";
    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        if (erro instanceof TypeError) {
            mostrarErro("Não foi possível conectar ao servidor.");
        } else {
            mostrarErro(erro.message);
        }
    } finally {
        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }
});

// Salvar sessão
function salvarSessao(dadosResposta) {
    const sessao = {
        token: dadosResposta.token,
        tipo: dadosResposta.tipo,
        idUsuario: dadosResposta.idUsuario,
        nomeUsuario: dadosResposta.nomeUsuario
    };

    localStorage.setItem("sessaoOcs", JSON.stringify(sessao));
}

// Mensagem de erro
function mostrarErro(texto) {
    loginError.textContent = texto;
    loginError.className = "form-feedback error";
}

function limparErro() {
    loginError.textContent = "";
    loginError.className = "form-feedback";
}