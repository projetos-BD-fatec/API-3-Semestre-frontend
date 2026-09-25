async function fetchAutenticado(url, opcoes = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        throw new Error("Sem token de autenticação.");
    }

    const headers = {
        ...(opcoes.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    const response = await fetch(url, { ...opcoes, headers });

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
        throw new Error("Sessão expirada.");
    }

    return response;
}