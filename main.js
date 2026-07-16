import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase (Substitua pelos seus valores da Vercel)
const supabase = createClient('https://stcdfollezdgowguewes.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Y2Rmb2xsZXpkZ293Z3Vld2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTQ5NTcsImV4cCI6MjA5OTczMDk1N30.Tx-AUWbQp2GriJI8PfVVlMI1zPBcQ-16Qd7DIbf8a0M')
const SALA_ID = 'SALA-01'

// Identificação do jogador
let meuID = localStorage.getItem('jogador_id');
if (!meuID) {
    meuID = 'jogador_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('jogador_id', meuID);
}

const divStatus = document.getElementById('status'); // Certifique-se que existe no HTML

// 1. Inicializar Mão do Jogador
async function inicializarMao() {
    const { data: existente } = await supabase
        .from('jogadores')
        .select('*')
        .eq('jogador_id', meuID)
        .single();

    if (!existente) {
        const baralho = ["A ♠", "7 ♥", "Q ♦", "J ♣", "K ♠", "2 ♥"];
        const maoInicial = [baralho[0], baralho[1], baralho[2]];
        
        await supabase.from('jogadores').insert([
            { jogador_id: meuID, sala_id: SALA_ID, mao: maoInicial }
        ]);
        renderizarMinhaMao(maoInicial);
    } else {
        renderizarMinhaMao(existente.mao);
    }
}

// 2. Renderizar Mão na Tela
function renderizarMinhaMao(cartas) {
    const divMao = document.getElementById('minha-mao');
    divMao.innerHTML = '';
    cartas.forEach((carta, index) => {
        const btn = document.createElement('button');
        btn.innerText = carta;
        btn.onclick = () => jogarCarta(index, cartas);
        divMao.appendChild(btn);
    });
}

// 3. Função Principal: Jogar Carta
async function jogarCarta(index, maoAtual) {
    const cartaJogada = maoAtual[index];
    const novaMao = maoAtual.filter((_, i) => i !== index);
    
    // 1. Atualiza a mão no Supabase
    await supabase.from('jogadores').update({ mao: novaMao }).eq('jogador_id', meuID);
    
    // 2. Busca o estado atual da mesa para garantir que temos os dados mais recentes
    const { data: mesa } = await supabase.from('rodadas').select('cartas_na_mesa').eq('sala_id', SALA_ID).single();
    const cartasAtuais = mesa?.cartas_na_mesa || [];
    
    // 3. Adiciona a carta na mesa
    const novasCartasNaMesa = [...cartasAtuais, cartaJogada];
    await supabase.from('rodadas').update({ cartas_na_mesa: novasCartasNaMesa }).eq('sala_id', SALA_ID);
    
    // 4. ATUALIZAÇÃO IMEDIATA: Chama a função que desenha na mesa agora mesmo!
    renderizarMesa(novasCartasNaMesa); 
    renderizarMinhaMao(novaMao);
}

// 4. Conexão Realtime
function conectarNaMesa() {
    const canal = supabase.channel('mesa-truco');

    canal.on('postgres_changes', { event: '*', schema: 'public', table: 'rodadas', filter: `sala_id=eq.${SALA_ID}` }, 
        (payload) => {
            if (payload.new && payload.new.cartas_na_mesa) {
                // Aqui você chamaria sua função renderizarMesa existente
                console.log("Mesa atualizada:", payload.new.cartas_na_mesa);
            }
    }).subscribe();
}

// Inicialização
conectarNaMesa();
inicializarMao();