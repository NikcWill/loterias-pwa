function salvarHistorico(tipo, numeros) {
    const hist = JSON.parse(localStorage.getItem("historico")) || [];
    hist.unshift({
      tipo,
      numeros,
      data: new Date().toLocaleString()
    });
    localStorage.setItem("historico", JSON.stringify(hist));
  }
  
  function gerarNumeros(qtd, max) {
    const nums = [];
    while (nums.length < qtd) {
      const n = Math.floor(Math.random() * max) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
  }
  
  function gerarMega() {
    const nums = gerarNumeros(6, 60);
    document.getElementById("megaResultado").innerText = nums.join("-");
    salvarHistorico("Mega-Sena", nums);
  }
  
  function gerarLoto() {
    const nums = gerarNumeros(15, 25);
    document.getElementById("lotoResultado").innerText = nums.join("-");
    salvarHistorico("Lotofácil", nums);
  }
  