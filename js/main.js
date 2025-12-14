function formatCurrency(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
  
  function resultadoTexto(acumulou) {
    return acumulou ? 'Não houve ganhadores' : 'Houve ganhadores';
  }
  
  function renderSorteio(titulo, data, containerId) {
    document.getElementById(containerId).innerHTML = `
      <h2>${titulo}</h2>
      <p><b>Concurso:</b> ${data.concurso}</p>
      <p><b>Data:</b> ${data.data}</p>
      <p><b>Prêmio:</b> ${formatCurrency(data.valorEstimadoProximoConcurso)}</p>
      <p>${resultadoTexto(data.acumulou)}</p>
      <div class="numeros">${data.dezenas.join(" - ")}</div>
    `;
  }
  
  async function carregar() {
    renderSorteio("Mega-Sena", await fetchMegaSena(), "mega");
    renderSorteio("Lotofácil", await fetchLotofacil(), "loto");
  }
  
  carregar();
  