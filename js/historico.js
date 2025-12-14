function carregarHistorico() {
  const el = document.getElementById("historico");
  const hist = JSON.parse(localStorage.getItem("historico")) || [];

  if (hist.length === 0) {
    el.innerHTML = "<p>Nenhum jogo salvo.</p>";
    return;
  }

  el.innerHTML = hist.map(h => `
    <div class="sorteio">
      <b>${h.tipo}</b><br>
      ${h.numeros.join(" - ")}<br>
      <small>${h.data}</small>
    </div>
  `).join("");
}

function limparHistorico() {
  if (confirm("Deseja apagar todo o histórico?")) {
    localStorage.removeItem("historico");
    carregarHistorico();
  }
}

carregarHistorico();
