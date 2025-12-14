/* =========================
   HISTÓRICO LOCAL
========================= */
function salvarHistorico(tipo, numeros) {
  const hist = JSON.parse(localStorage.getItem("historico")) || [];
  hist.unshift({
    tipo,
    numeros,
    data: new Date().toLocaleString()
  });
  localStorage.setItem("historico", JSON.stringify(hist.slice(0, 50)));
}

/* =========================
   BUSCAR HISTÓRICO API
========================= */
async function fetchHistoricoAPI(tipo) {
  try {
    const endpoint = tipo.toLowerCase() === "mega-sena" ? "megasena" : "lotofacil";
    const res = await fetch(`https://loteriascaixa-api.herokuapp.com/api/${endpoint}`);
    if (!res.ok) throw new Error("Erro ao buscar API");
    const data = await res.json();
    return data.map(item => item.dezenas.map(n => parseInt(n)));
  } catch (err) {
    console.warn("Falha ao buscar histórico da API, usando histórico local:", err);
    const local = JSON.parse(localStorage.getItem("historico")) || [];
    return local.filter(h => h.tipo === tipo).map(h => h.numeros);
  }
}

/* =========================
   CALCULAR FREQUÊNCIA E CO-OCORRÊNCIA
========================= */
function calcularFrequencias(historico, max) {
  const freq = Array(max).fill(0);
  historico.forEach(sorteio => sorteio.forEach(n => freq[n - 1]++));
  return freq;
}

function calcularCoocorrencia(historico, max) {
  const co = Array.from({ length: max }, () => Array(max).fill(0));
  historico.forEach(sorteio => {
    for (let i = 0; i < sorteio.length; i++) {
      for (let j = 0; j < sorteio.length; j++) {
        if (i !== j) co[sorteio[i]-1][sorteio[j]-1]++;
      }
    }
  });
  return co;
}

/* =========================
   GERAÇÃO INTELIGENTE COM CO-OCORRÊNCIA
========================= */
function gerarNumerosInteligente(historico, qtd, max) {
  const freq = calcularFrequencias(historico, max);
  const co = calcularCoocorrencia(historico, max);

  const selecionados = [];

  while (selecionados.length < qtd) {
    const pesos = freq.map((f, i) => {
      if (selecionados.includes(i+1)) return 0;

      // aumenta peso se já houver números selecionados que co-ocorrem com i
      let bonus = 0;
      selecionados.forEach(sel => bonus += co[sel-1][i]);
      return f + 1 + bonus; // +1 para evitar zero
    });

    const total = pesos.reduce((a,b) => a+b, 0);
    let r = Math.random() * total;

    for (let i=0; i<pesos.length; i++) {
      r -= pesos[i];
      if (r <= 0) {
        selecionados.push(i+1);
        break;
      }
    }
  }

  return selecionados.sort((a,b)=>a-b);
}

/* =========================
   FUNÇÕES DE GERAÇÃO MEGA E LOTOFÁCIL
========================= */
async function gerarMega() {
  const historico = await fetchHistoricoAPI("Mega-Sena");
  const numeros = gerarNumerosInteligente(historico, 6, 60);

  document.getElementById("megaResultado").innerText = numeros.join(" - ");
  salvarHistorico("Mega-Sena", numeros);
}

async function gerarLoto() {
  const historico = await fetchHistoricoAPI("Lotofácil");
  const numeros = gerarNumerosInteligente(historico, 15, 25);

  document.getElementById("lotoResultado").innerText = numeros.join(" - ");
  salvarHistorico("Lotofácil", numeros);
}

/* =========================
   SALVAR JOGO APOSTADO
========================= */
function salvarJogo(tipo) {
  const resultadoEl =
    tipo === "Mega-Sena"
      ? document.getElementById("megaResultado")
      : document.getElementById("lotoResultado");

  if (!resultadoEl || resultadoEl.innerText.trim() === "") {
    alert("Gere os números antes!");
    return;
  }

  const numeros = resultadoEl.innerText
    .replace(/\n/g, " ")
    .split(/[\s-]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  const jogos = JSON.parse(localStorage.getItem("jogos_apostados")) || [];
  jogos.unshift({
    tipo,
    dezenas: numeros,
    data: new Date().toLocaleString(),
    concurso: null
  });

  localStorage.setItem("jogos_apostados", JSON.stringify(jogos));
  alert("✅ Jogo salvo para conferência!");
}
