import { createClient } from '@supabase/supabase-js';

// Pegando as variáveis de ambiente que você vai configurar na Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Definindo a sala onde o jogo acontece
const SALA_ID = 'SALA-01';

// Elementos da tela
const divMesa = document.getElementById('mesa-cartas');
const btnJogar = document.getElementById('btn-jogar');
const btnTruco = document.getElementById('btn-truco');
const divStatus = document.getElementById('status');

// Função para desenhar as cartas na mesa visualmente
function renderizarMesa(cartas) {
    divMesa.innerHTML = ''; 
    if (!cartas) return;

    cartas.forEach(cartaStr => {
        const divCarta = document.createElement('div');
        divCarta.className = 'carta';
        
        // Colore os naipes vermelhos ou pretos
        if (cartaStr.includes('♥') || cartaStr.includes('♦')) {
            divCarta.classList.add('vermelha');
        } else {
            divCarta.classList.add('preta');
        }
        
        divCarta.innerText = cartaStr;
        divMesa.appendChild(divCarta);
    });
}

// 1. Conectar no Realtime do Supabase e ficar escutando
function conectarNaMesa() {
    divStatus.innerText = "Conectado. Observando a mesa...";
    
    supabase
        .channel('mesa-truco')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rodadas', filter: `sala_id=eq.${SALA_ID}` },
            (payload) => {
                const estado = payload.new;
                
                if (estado.estado_truco === 'pedido') {
                    alert("ALGUÉM PEDIU TRUCO!");
                }
                
                // Desenha a carta na mesa assim que ela chega do banco de dados
                if (estado.cartas_na_mesa) {
                    renderizarMesa(estado.cartas_na_mesa);
                }
            }
        )
        .subscribe();
}

// 2. Ação de jogar uma carta
btnJogar.addEventListener('click', async () => {
    // Pega as cartas que já estão na mesa no banco de dados
    const { data: rodada } = await supabase
        .from('rodadas')
        .select('cartas_na_mesa')
        .eq('sala_id', SALA_ID)
        .single();
        
    const cartasAtuais = rodada?.cartas_na_mesa || [];
    
    // Sorteia uma carta apenas para testar a comunicação
    const cartasSimuladas = ['A ♠', '7 ♥', '3 ♣', 'Q ♦'];
    const cartaJogada = cartasSimuladas[Math.floor(Math.random() * cartasSimuladas.length)];
    
    const novasCartas = [...cartasAtuais, cartaJogada];

    // Salva a nova carta no Supabase. O Realtime vai avisar todos na sala instantaneamente!
    await supabase
        .from('rodadas')
        .update({ cartas_na_mesa: novasCartas })
        .eq('sala_id', SALA_ID);
});

// 3. Ação do botão de Truco
btnTruco.addEventListener('click', async () => {
    await supabase
        .from('rodadas')
        .update({ estado_truco: 'pedido' })
        .eq('sala_id', SALA_ID);
});

// Dá o start quando a página carrega
conectarNaMesa();

// Adicione isso no final do seu main.js
async function carregarEstadoInicial() {
    const { data, error } = await supabase
        .from('rodadas')
        .select('cartas_na_mesa')
        .eq('sala_id', 'SALA-01')
        .single();
    
    if (data && data.cartas_na_mesa) {
        renderizarMesa(data.cartas_na_mesa);
    }
}

// Chame essa função logo após a conexão
conectarNaMesa();
carregarEstadoInicial();
