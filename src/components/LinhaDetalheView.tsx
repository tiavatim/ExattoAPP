import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { FaixaModal } from '@/components/ConfiguracoesView';
import ModalIniciarSessao from '@/components/ModalIniciarSessao';
import { RastreabilidadeDetalheCard } from '@/components/RastreabilidadeView';
import ti400Service from '@/services/ti400Service';
import {
  FaixaPeso,
  OpData,
  PesagemItem,
  ProdutoItem,
  RastreabilidadeItem,
  RelatorioJobResponse,
  RESULTADO_COR,
  RESULTADO_LABEL,
  StatusSessao,
  WeighingSession,
  WeightReading,
} from '@/interfaces/ti400Interface';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'ativa' | 'consultar';
type FiltroResultado = 'todos' | 'verde' | 'amarela' | 'fora';
type DataPickerAlvo = 'inicial' | 'final';

const ITENS_POR_PAGINA_PADRAO = 10;
const TABELA_CONSULTA_MIN_WIDTH = 980;
const ITENS_POR_PAGINA_OPCOES = [10, 25, 50];
const RESULTADO_FILTRO_OPCOES: { id: FiltroResultado; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'verde', label: 'Verde' },
  { id: 'amarela', label: 'Amarela' },
  { id: 'fora', label: 'Fora' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function resultadoLabel(id: FiltroResultado) {
  return RESULTADO_FILTRO_OPCOES.find(opt => opt.id === id)?.label ?? 'Todos';
}
function formatBRDate(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
function hoje() { return formatBRDate(new Date()); }
function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return formatBRDate(d); }
function inicioMes() { const d = new Date(); return `01/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
function parseBR(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function toISO(s: string, fim = false): string | undefined {
  const d = parseBR(s); if (!d) return undefined;
  if (fim) d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function textoBuscaPesagem(p: PesagemItem) {
  return [
    p.lote,
    p.nrRastreabilidade,
    p.CD_PRODUTO,
    p.DS_PRODUTO,
    p.cdProduto,
    p.dsProduto,
  ]
    .filter(v => v !== undefined && v !== null)
    .map(v => String(v).toLowerCase())
    .join(' ');
}
function textoValor(v?: string | number | null) {
  const texto = v === undefined || v === null ? '' : String(v).trim();
  return texto || '-';
}
function primeiroTexto(...valores: Array<string | number | null | undefined>) {
  const encontrado = valores
    .map(v => v === undefined || v === null ? '' : String(v).trim())
    .find(Boolean);
  return encontrado || '-';
}
function codigoProdutoPesagem(p: PesagemItem) {
  return primeiroTexto(p.CD_PRODUTO, p.cdProduto);
}
function descricaoProdutoPesagem(p: PesagemItem) {
  return primeiroTexto(p.DS_PRODUTO, p.dsProduto);
}
function corResultadoResumo(resultado: number | null) {
  const r = resultado ?? 0;
  if (r === 1) return '#22c55e';
  if (r === 2 || r === 3) return '#f59e0b';
  if (r === 4 || r === 5) return '#ef4444';
  return '#6b7280';
}

const STATUS_BG: Record<StatusSessao, string> = {
  Aguardando: '#fff9e6', Imprimindo: '#e7f1ff',
  Concluido: '#e6f4ea', Erro: '#fde8e8', Cancelado: '#f0f0f0',
};
const STATUS_COR: Record<StatusSessao, string> = {
  Aguardando: '#f59e0b', Imprimindo: '#3b82f6',
  Concluido: '#22c55e', Erro: '#ef4444', Cancelado: '#9ca3af',
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  linhaId: string;
  linhaNome: string;
  onBack: () => void;
}

interface FaixaPendente {
  lote: number;
  idColaborador: number;
  produto: ProdutoItem;
  faixa: FaixaPeso;
}

export default function LinhaDetalheView({ linhaId, linhaNome, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('ativa');

  // ── Aba Ativa ─────────────────────────────────────────────────────────────
  const [sessaoAtiva, setSessaoAtiva]       = useState<WeighingSession | null>(null);
  const [pesagensAtivas, setPesagensAtivas] = useState<PesagemItem[]>([]);
  const [loadingSessao, setLoadingSessao]   = useState(true);
  const [loadingAcao, setLoadingAcao]       = useState(false);
  const [modalIniciar, setModalIniciar]     = useState(false);
  const [modalLoading, setModalLoading]     = useState(false);
  const [faixaPendente, setFaixaPendente]   = useState<FaixaPendente | null>(null);
  const pollAtivaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarAtiva = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingSessao(true);
    try {
      const [sessao, pesagens] = await Promise.all([
        ti400Service.getSessaoAtual(linhaId),
        ti400Service.getPesagensLinha(linhaId, 5),
      ]);
      setSessaoAtiva(sessao);
      setPesagensAtivas(pesagens);
    } catch (err: any) {
      if (!silencioso) Toast.show({ type: 'error', text1: 'Erro ao carregar sessão', text2: err.message });
    } finally {
      if (!silencioso) setLoadingSessao(false);
    }
  }, [linhaId]);

  useEffect(() => {
    if (tab !== 'ativa') {
      if (pollAtivaRef.current) { clearInterval(pollAtivaRef.current); pollAtivaRef.current = null; }
      return;
    }
    carregarAtiva();
    pollAtivaRef.current = setInterval(() => carregarAtiva(true), 3000);
    return () => { if (pollAtivaRef.current) { clearInterval(pollAtivaRef.current); pollAtivaRef.current = null; } };
  }, [tab, carregarAtiva]);

  const contadores = useMemo(() => {
    let verde = 0, amarela = 0, fora = 0;
    pesagensAtivas.forEach(p => {
      const r = p.nrResultadoComparacao ?? 0;
      if (r === 1) verde++; else if (r === 2 || r === 3) amarela++; else if (r === 4 || r === 5) fora++;
    });
    return { verde, amarela, fora, total: pesagensAtivas.length };
  }, [pesagensAtivas]);

  async function confirmarIniciar(lote: number, idColaborador: number) {
    setModalLoading(true);
    try {
      const op = await ti400Service.getOp(lote);
      const faixa = await ti400Service.getFaixaPorProduto(op.idProduto);
      if (!faixa) {
        const produto = produtoFromOp(op);
        setFaixaPendente({
          lote,
          idColaborador,
          produto,
          faixa: novaFaixa(produto.idProduto),
        });
        setModalIniciar(false);
        return;
      }

      await ti400Service.iniciarSessao(linhaId, { lote, idColaborador });
      Toast.show({ type: 'success', text1: 'Sessão iniciada' });
      setModalIniciar(false);
      await carregarAtiva(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao iniciar sessão', text2: err.response?.data?.error ?? err.message });
    } finally { setModalLoading(false); }
  }

  async function salvarFaixaPendente(faixa: FaixaPeso) {
    if (!faixaPendente) return;
    try {
      await ti400Service.upsertFaixa(faixa);
      await ti400Service.iniciarSessao(linhaId, {
        lote: faixaPendente.lote,
        idColaborador: faixaPendente.idColaborador,
      });
      Toast.show({ type: 'success', text1: 'Faixa cadastrada', text2: 'Sessão iniciada em seguida.' });
      setFaixaPendente(null);
      await carregarAtiva(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar faixa', text2: err.response?.data?.error ?? err.message });
    }
  }

  async function handleCancelar() {
    setLoadingAcao(true);
    try {
      await ti400Service.cancelarSessao(linhaId);
      Toast.show({ type: 'success', text1: 'Sessão cancelada' });
      await carregarAtiva(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao cancelar', text2: err.message });
    } finally { setLoadingAcao(false); }
  }

  async function handleRetry() {
    setLoadingAcao(true);
    try {
      await ti400Service.retrySessao(linhaId);
      Toast.show({ type: 'success', text1: 'Sessão retomada' });
      await carregarAtiva(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao fazer retry', text2: err.response?.data?.error ?? err.message });
    } finally { setLoadingAcao(false); }
  }

  // ── Aba Consultar ─────────────────────────────────────────────────────────
  const [dataInicial, setDataInicial]         = useState(hoje());
  const [dataFinal, setDataFinal]             = useState(hoje());
  const [datePickerAberto, setDatePickerAberto] = useState<DataPickerAlvo | null>(null);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [buscaConsulta, setBuscaConsulta]     = useState('');
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultado>('todos');
  const [resultadoPickerAberto, setResultadoPickerAberto] = useState(false);
  const [resultadoPickerFrame, setResultadoPickerFrame] = useState({ x: 0, y: 0, width: 132, height: 0 });
  const resultadoPickerRef = useRef<View>(null);

  const [pesagens, setPesagens]               = useState<PesagemItem[]>([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [temMais, setTemMais]                 = useState(false);
  const [paginaConsulta, setPaginaConsulta]   = useState(1);
  const [itensPorPagina, setItensPorPagina]   = useState(ITENS_POR_PAGINA_PADRAO);
  const [detalheRastreabilidade, setDetalheRastreabilidade] = useState<RastreabilidadeItem | null>(null);
  const [loadingDetalheRastreabilidade, setLoadingDetalheRastreabilidade] = useState<string | null>(null);
  const consultaIniciada = useRef(false);

  const [exportJob, setExportJob]   = useState<RelatorioJobResponse | null>(null);
  const [exportando, setExportando] = useState(false);
  const exportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (exportPollRef.current) clearInterval(exportPollRef.current); };
  }, []);

  useEffect(() => {
    if (tab === 'consultar' && !consultaIniciada.current) {
      consultaIniciada.current = true;
      executarBusca(true);
    }
  }, [tab]);

  function intervaloConsulta(dataInicialAtual = dataInicial, dataFinalAtual = dataFinal) {
    return { de: dataInicialAtual, ate: dataFinalAtual };
  }

  async function executarBusca(reset = true, filtros?: {
    dataInicial?: string;
    dataFinal?: string;
  }, paginaDestino?: number, quantidadeDestino = itensPorPagina) {
    const pagina = reset ? 1 : (paginaDestino ?? paginaConsulta);
    const off = (pagina - 1) * quantidadeDestino;
    setLoadingConsulta(true);
    if (reset) { setPesagens([]); setTemMais(false); setExportJob(null); }

    const intervalo = intervaloConsulta(
      filtros?.dataInicial ?? dataInicial,
      filtros?.dataFinal ?? dataFinal,
    );
    const from    = toISO(intervalo.de, false);
    const to      = toISO(intervalo.ate, true);

    try {
      const items = await ti400Service.getPesagensLinha(
        linhaId, quantidadeDestino, off, from, to,
      );
      setPesagens(items);
      setPaginaConsulta(pagina);
      setTemMais(items.length === quantidadeDestino);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro na consulta', text2: err.message });
    } finally {
      setLoadingConsulta(false);
    }
  }

  function irParaPaginaConsulta(pagina: number) {
    if (pagina < 1 || loadingConsulta) return;
    executarBusca(false, undefined, pagina);
  }

  function alterarItensPorPagina(quantidade: number) {
    if (quantidade === itensPorPagina || loadingConsulta) return;
    setItensPorPagina(quantidade);
    executarBusca(true, undefined, 1, quantidade);
  }

  function limparFiltrosConsulta() {
    const dataHoje = hoje();
    setDataInicial(dataHoje);
    setDataFinal(dataHoje);
    setBuscaConsulta('');
    setFiltroResultado('todos');
    setResultadoPickerAberto(false);
    setFiltrosVisiveis(false);
    executarBusca(true, { dataInicial: dataHoje, dataFinal: dataHoje });
  }

  function selecionarDataFiltro(alvo: DataPickerAlvo, data: string) {
    const dataEscolhida = parseBR(data);
    const inicioAtual = parseBR(dataInicial);
    const fimAtual = parseBR(dataFinal);

    if (alvo === 'inicial') {
      setDataInicial(data);
      if (dataEscolhida && fimAtual && dataEscolhida > fimAtual) setDataFinal(data);
    } else {
      setDataFinal(data);
      if (dataEscolhida && inicioAtual && dataEscolhida < inicioAtual) setDataInicial(data);
    }

    setDatePickerAberto(null);
  }

  function alternarResultadoPicker() {
    if (resultadoPickerAberto) {
      setResultadoPickerAberto(false);
      return;
    }

    resultadoPickerRef.current?.measureInWindow((x, y, width, height) => {
      setResultadoPickerFrame({ x, y, width, height });
      setResultadoPickerAberto(true);
    });
  }

  async function abrirDetalheRastreabilidade(pesagem: PesagemItem) {
    const nr = pesagem.nrRastreabilidade?.trim();
    if (!nr || loadingDetalheRastreabilidade) return;

    setLoadingDetalheRastreabilidade(pesagem.idPesagem);
    try {
      const item = await ti400Service.getRastreabilidade(nr);
      if (item) {
        setDetalheRastreabilidade(item);
      } else {
        Toast.show({ type: 'info', text1: 'Rastreabilidade não encontrada' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro na rastreabilidade', text2: err.response?.data?.error ?? err.message });
    } finally {
      setLoadingDetalheRastreabilidade(null);
    }
  }

  const pesagensFiltradas = useMemo(() => {
    let lista = pesagens;
    if (filtroResultado !== 'todos') {
      lista = lista.filter(p => {
        const r = p.nrResultadoComparacao ?? 0;
        if (filtroResultado === 'verde')   return r === 1;
        if (filtroResultado === 'amarela') return r === 2 || r === 3;
        if (filtroResultado === 'fora')    return r === 4 || r === 5;
        return true;
      });
    }
    if (buscaConsulta.trim()) {
      const q = buscaConsulta.trim().toLowerCase();
      lista = lista.filter(p => textoBuscaPesagem(p).includes(q));
    }
    return lista;
  }, [pesagens, filtroResultado, buscaConsulta]);

  const resumoFiltrado = useMemo(() => {
    let v = 0, a = 0, f = 0;
    pesagensFiltradas.forEach(p => {
      const r = p.nrResultadoComparacao ?? 0;
      if (r === 1) v++; else if (r === 2 || r === 3) a++; else if (r === 4 || r === 5) f++;
    });
    return { verde: v, amarela: a, fora: f };
  }, [pesagensFiltradas]);

  async function exportar() {
    if (exportPollRef.current) clearInterval(exportPollRef.current);
    setExportando(true); setExportJob(null);
    const intervalo = intervaloConsulta();
    try {
      const job = await ti400Service.criarRelatorio({
        tipo: 'RASTREABILIDADE',
        parametros: { linhaId, from: toISO(intervalo.de, false), to: toISO(intervalo.ate, true) },
      });
      setExportJob(job);
      if (job.status !== 'Concluido' && job.status !== 'Erro') {
        exportPollRef.current = setInterval(async () => {
          try {
            const atualizado = await ti400Service.getRelatorio(job.idJob);
            setExportJob(atualizado);
            if (atualizado.status === 'Concluido' || atualizado.status === 'Erro') {
              clearInterval(exportPollRef.current!); exportPollRef.current = null;
            }
          } catch { /* ignora */ }
        }, 2000);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao exportar', text2: err.message });
    } finally { setExportando(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-header + tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Feather name="arrow-left" size={22} color="#163029" />
          </Pressable>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
            {linhaNome}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#c4bfb0', borderRadius: 8, padding: 3 }}>
          {([
            { id: 'ativa',     label: 'Sessão Ativa' },
            { id: 'consultar', label: 'Consultar' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
                backgroundColor: tab === t.id ? '#163029' : 'transparent' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13,
                color: tab === t.id ? '#d1ccbd' : '#2F4B44' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Aba Ativa ── */}
      {tab === 'ativa' && (
        loadingSessao ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#163029" />
          </View>
        ) : (
          <FlatList
            data={pesagensAtivas}
            keyExtractor={(item) => item.idPesagem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListHeaderComponent={() => (
              <View style={{ marginBottom: 12 }}>
                {/* Card sessão */}
                <View style={{
                  backgroundColor: sessaoAtiva ? STATUS_BG[sessaoAtiva.status] : '#f5f5f0',
                  borderRadius: 10, padding: 16, marginBottom: 10,
                  borderWidth: 1, borderColor: sessaoAtiva?.status === 'Erro' ? '#ef4444' : '#e0ddd4',
                }}>
                  {sessaoAtiva ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>Sessão Ativa</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COR[sessaoAtiva.status] }} />
                          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: STATUS_COR[sessaoAtiva.status] }}>
                            {sessaoAtiva.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                        <InfoItem icon="tag"   valor={`OP ${sessaoAtiva.lote}`} />
                        <InfoItem icon="user"  valor={`#${sessaoAtiva.idColaborador}`} />
                        <InfoItem icon="clock" valor={formatHora(sessaoAtiva.iniciada)} />
                      </View>
                      {sessaoAtiva.ultimoErro && (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 8 }}>
                          <Feather name="alert-circle" size={13} color="#ef4444" style={{ marginTop: 1 }} />
                          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#ef4444', flex: 1 }}>
                            {sessaoAtiva.ultimoErro}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#9ca3af' }}>Nenhuma sessão ativa</Text>
                    </View>
                  )}
                </View>

                {/* Ações */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {(!sessaoAtiva || sessaoAtiva.status === 'Concluido' || sessaoAtiva.status === 'Cancelado') && (
                    <Pressable onPress={() => setModalIniciar(true)} disabled={loadingAcao}
                      style={{ flex: 1, backgroundColor: '#163029', paddingVertical: 12, borderRadius: 6,
                        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                      <Feather name="play" size={15} color="#d1ccbd" />
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
                        {sessaoAtiva ? 'Nova Sessão' : 'Iniciar Sessão'}
                      </Text>
                    </Pressable>
                  )}
                  {sessaoAtiva?.status === 'Erro' && (
                    <Pressable onPress={handleRetry} disabled={loadingAcao}
                      style={{ flex: 1, backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 6,
                        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                      {loadingAcao
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Feather name="refresh-cw" size={15} color="#fff" /><Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#fff' }}>Retry</Text></>}
                    </Pressable>
                  )}
                  {(sessaoAtiva?.status === 'Aguardando' || sessaoAtiva?.status === 'Imprimindo' || sessaoAtiva?.status === 'Erro') && (
                    <Pressable onPress={handleCancelar} disabled={loadingAcao}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6,
                        borderWidth: 1, borderColor: '#163029',
                        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                      {loadingAcao
                        ? <ActivityIndicator color="#163029" size="small" />
                        : <><Feather name="x" size={15} color="#163029" /><Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>Cancelar</Text></>}
                    </Pressable>
                  )}
                </View>

                {pesagensAtivas.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <ResumoChip cor="#22c55e" label="Verde"   valor={contadores.verde} />
                      <ResumoChip cor="#f59e0b" label="Amarela" valor={contadores.amarela} />
                      <ResumoChip cor="#ef4444" label="Fora"    valor={contadores.fora} />
                      <ResumoChip cor="#6b7280" label="Total"   valor={contadores.total} />
                    </View>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', marginBottom: 6 }}>
                      Pesagens recentes
                    </Text>
                  </>
                )}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Feather name="inbox" size={36} color="#9ca3af" />
                <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
                  Nenhuma pesagem registrada
                </Text>
              </View>
            )}
            renderItem={({ item }) => <PesagemRowAtiva item={item} />}
          />
        )
      )}

      {/* ── Aba Consultar ── */}
      {tab === 'consultar' && (
        <View style={{ flex: 1 }}>
          {/* Filtros */}
          <View
            style={{ flexShrink: 0, backgroundColor: '#c8c3b5', borderBottomWidth: 1, borderColor: '#b8b4a6',
              paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 6 }}
          >
            {filtrosVisiveis && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', zIndex: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fLabel}>Busca</Text>
                  <TextInput value={buscaConsulta} onChangeText={setBuscaConsulta}
                    placeholder="Lote, produto ou rastreabilidade" placeholderTextColor="#9ca3af"
                    autoCapitalize="none" autoCorrect={false} style={fInput} />
                </View>

                <View ref={resultadoPickerRef} style={{ width: 132, zIndex: 30 }}>
                  <Text style={fLabel}>Resultado</Text>
                  <Pressable onPress={alternarResultadoPicker}
                    style={{ ...fInput as any, paddingVertical: 9, flexDirection: 'row',
                      alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }} numberOfLines={1}>
                      {resultadoLabel(filtroResultado)}
                    </Text>
                    <Feather name={resultadoPickerAberto ? 'chevron-up' : 'chevron-down'} size={15} color="#2F4B44" />
                  </Pressable>
                </View>

                <View style={{ flex: 1.35 }}>
                  <Text style={fLabel}>Período</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable onPress={() => setDatePickerAberto('inicial')}
                      style={{ flex: 1, minHeight: 40, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 6,
                        borderWidth: 1, borderColor: '#b8b4a6', backgroundColor: '#d1ccbd',
                        alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: '#163029' }} numberOfLines={1}>
                        Data inicial
                      </Text>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: '#2F4B44' }} numberOfLines={1}>
                        {dataInicial}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setDatePickerAberto('final')}
                      style={{ flex: 1, minHeight: 40, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 6,
                        borderWidth: 1, borderColor: '#b8b4a6', backgroundColor: '#d1ccbd',
                        alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: '#163029' }} numberOfLines={1}>
                        Data final
                      </Text>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: '#2F4B44' }} numberOfLines={1}>
                        {dataFinal}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => filtrosVisiveis ? limparFiltrosConsulta() : setFiltrosVisiveis(true)}
                disabled={loadingConsulta || exportando}
                style={{ flex: 1, backgroundColor: '#d1ccbd', borderWidth: 1, borderColor: '#163029',
                  paddingVertical: 11, borderRadius: 8,
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
                  opacity: (loadingConsulta || exportando) ? 0.55 : 1 }}>
                <Feather name={filtrosVisiveis ? 'x-circle' : 'filter'} size={16} color="#163029" />
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                  {filtrosVisiveis ? 'Remover filtros' : 'Filtros'}
                </Text>
              </Pressable>
              <Pressable onPress={() => executarBusca(true)} disabled={loadingConsulta}
                style={{ flex: 1, backgroundColor: loadingConsulta ? '#9ca3af' : '#163029',
                  paddingVertical: 11, borderRadius: 8,
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {loadingConsulta
                  ? <ActivityIndicator color="#d1ccbd" size="small" />
                  : <Feather name="search" size={16} color="#d1ccbd" />}
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
                  {loadingConsulta ? 'Buscando...' : 'Buscar'}
                </Text>
              </Pressable>
              <Pressable onPress={exportar} disabled={exportando || loadingConsulta}
                style={{ flex: 1, backgroundColor: (exportando || loadingConsulta) ? '#9ca3af' : '#2F4B44',
                  paddingVertical: 11, borderRadius: 8,
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {exportando
                  ? <ActivityIndicator color="#d1ccbd" size="small" />
                  : <Feather name="download" size={16} color="#d1ccbd" />}
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
                  {exportando ? 'Gerando...' : 'Exportar XLSX'}
                </Text>
              </Pressable>
            </View>

            {exportJob && <ExportStatus job={exportJob} onDismiss={() => setExportJob(null)} />}
          </View>

          <ScrollView
            horizontal
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ flex: 1, minWidth: TABELA_CONSULTA_MIN_WIDTH }}>
              {/* Header da tabela */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
                backgroundColor: '#b8b4a4', borderBottomWidth: 1, borderColor: '#a8a49a' }}>
                <Text style={[thCell, { width: 72 }]}>OP</Text>
                <Text style={[thCell, { width: 98 }]}>PRODUTO</Text>
                <Text style={[thCell, { flex: 1.35 }]}>DESCRIÇÃO DO PRODUTO</Text>
                <Text style={[thCell, { flex: 1.1 }]}>RASTREABILIDADE</Text>
                <Text style={[thCell, { width: 76 }]}>HORA</Text>
                <Text style={[thCell, { width: 94 }]}>PESO</Text>
                <Text style={[thCell, { width: 88, textAlign: 'right' }]}>RESULTADO</Text>
                <Text style={[thCell, { width: 86, textAlign: 'center' }]}>AÇÕES</Text>
              </View>

          {/* Datatable */}
          {loadingConsulta && pesagens.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#163029" />
            </View>
          ) : (
            <FlatList
              data={pesagensFiltradas}
              keyExtractor={(item) => item.idPesagem}
              contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
              ListEmptyComponent={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
                  <Feather name="inbox" size={36} color="#9ca3af" />
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
                    {pesagens.length === 0
                      ? 'Faça uma busca para listar pesagens'
                      : 'Nenhuma pesagem com os filtros aplicados'}
                  </Text>
                </View>
              )}
              ListFooterComponent={() => {
                if (pesagens.length === 0 && paginaConsulta === 1) return null;
                return (
                  <View style={{ borderTopWidth: 1, borderColor: '#b8b4a6', backgroundColor: '#c8c3b5',
                    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row',
                    alignItems: 'center' }}>
                    <View style={{ flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029' }}
                        numberOfLines={1}>
                        Página {paginaConsulta} · {pesagensFiltradas.length} registro{pesagensFiltradas.length !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 12, flexShrink: 0 }}>
                      <Pressable
                        onPress={() => irParaPaginaConsulta(paginaConsulta - 1)}
                        disabled={paginaConsulta <= 1 || loadingConsulta}
                        style={{ minWidth: 94, borderRadius: 8, borderWidth: 1, borderColor: '#163029',
                          paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row',
                          alignItems: 'center', justifyContent: 'center', gap: 5,
                          opacity: (paginaConsulta <= 1 || loadingConsulta) ? 0.45 : 1 }}
                      >
                        <Feather name="chevron-left" size={15} color="#163029" />
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }}>
                          Anterior
                        </Text>
                      </Pressable>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#2F4B44' }}>
                          Itens/página
                        </Text>
                        {ITENS_POR_PAGINA_OPCOES.map(qtd => {
                          const selecionado = qtd === itensPorPagina;
                          return (
                            <Pressable key={qtd} onPress={() => alterarItensPorPagina(qtd)}
                              disabled={loadingConsulta}
                              style={{ minWidth: 32, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6,
                                alignItems: 'center', borderWidth: 1,
                                borderColor: selecionado ? '#163029' : '#b8b4a6',
                                backgroundColor: selecionado ? '#163029' : '#d1ccbd',
                                opacity: loadingConsulta ? 0.55 : 1 }}>
                              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11,
                                color: selecionado ? '#d1ccbd' : '#163029' }}>
                                {qtd}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Pressable
                        onPress={() => irParaPaginaConsulta(paginaConsulta + 1)}
                        disabled={!temMais || loadingConsulta}
                        style={{ minWidth: 94, borderRadius: 8, borderWidth: 1, borderColor: '#163029',
                          paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row',
                          alignItems: 'center', justifyContent: 'center', gap: 5,
                          opacity: (!temMais || loadingConsulta) ? 0.45 : 1 }}
                      >
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }}>
                          Próximo
                        </Text>
                        <Feather name="chevron-right" size={15} color="#163029" />
                      </Pressable>
                    </View>

                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
                      <RodapeContadorBadge label="Verde" valor={resumoFiltrado.verde} cor="#22c55e" />
                      <RodapeContadorBadge label="Amarelo" valor={resumoFiltrado.amarela} cor="#f59e0b" />
                      <RodapeContadorBadge label="Vermelho" valor={resumoFiltrado.fora} cor="#ef4444" />
                    </View>
                  </View>
                );
              }}
              renderItem={({ item, index }) => {
                const res = item.nrResultadoComparacao ?? 0;
                const cor = RESULTADO_COR[res];
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 12, paddingVertical: 9,
                    backgroundColor: index % 2 === 0 ? '#f0ead6' : '#e8e3d8',
                    borderBottomWidth: 1, borderColor: '#ddd8cc' }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029', width: 72 }}
                      numberOfLines={1}>
                      {textoValor(item.lote)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029', width: 98 }}
                      numberOfLines={1}>
                      {codigoProdutoPesagem(item)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029', flex: 1.35 }}
                      numberOfLines={2}>
                      {descricaoProdutoPesagem(item)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029', flex: 1.1 }}
                      numberOfLines={1}>
                      {textoValor(item.nrRastreabilidade)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44', width: 76 }}
                      numberOfLines={1}>
                      {formatHora(item.dtPesagem)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029', width: 94 }}
                      numberOfLines={1}>
                      {item.vlPesoBruto.toFixed(3)} {item.dsUnidade}
                    </Text>
                    <View style={{ width: 88, alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: cor + '22', paddingHorizontal: 6, paddingVertical: 3,
                        borderRadius: 5, borderWidth: 1, borderColor: cor + '66' }}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: cor }} numberOfLines={1}>
                          {RESULTADO_LABEL[res]}
                        </Text>
                      </View>
                    </View>
                    <View style={{ width: 86, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                      <ReprintButton idPesagem={item.idPesagem} />
                      <Pressable
                        onPress={() => abrirDetalheRastreabilidade(item)}
                        disabled={loadingDetalheRastreabilidade === item.idPesagem}
                        hitSlop={6}
                        style={{ width: 28, height: 28, borderRadius: 6,
                          alignItems: 'center', justifyContent: 'center', backgroundColor: '#c8d1c8',
                          opacity: loadingDetalheRastreabilidade === item.idPesagem ? 0.6 : 1 }}
                      >
                        {loadingDetalheRastreabilidade === item.idPesagem
                          ? <ActivityIndicator size="small" color="#2F4B44" />
                          : <Feather name="eye" size={15} color="#2F4B44" />}
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
            </View>
          </ScrollView>
        </View>
      )}

      <DataPickerModal
        visible={datePickerAberto !== null}
        titulo={datePickerAberto === 'final' ? 'Data final' : 'Data inicial'}
        dataSelecionada={datePickerAberto === 'final' ? dataFinal : dataInicial}
        onSelecionar={(data) => selecionarDataFiltro(datePickerAberto ?? 'inicial', data)}
        onFechar={() => setDatePickerAberto(null)}
      />

      <ResultadoPickerModal
        visible={resultadoPickerAberto}
        selecionado={filtroResultado}
        anchor={resultadoPickerFrame}
        onSelecionar={(resultado) => {
          setFiltroResultado(resultado);
          setResultadoPickerAberto(false);
        }}
        onFechar={() => setResultadoPickerAberto(false)}
      />

      <RastreabilidadeDetalheModal
        item={detalheRastreabilidade}
        onFechar={() => setDetalheRastreabilidade(null)}
      />

      <ModalIniciarSessao
        visible={modalIniciar}
        linhaNome={linhaNome}
        loading={modalLoading}
        onConfirmar={confirmarIniciar}
        onCancelar={() => setModalIniciar(false)}
      />

      {faixaPendente && (
        <FaixaModal
          titulo="Cadastrar Faixa da OP"
          faixa={faixaPendente.faixa}
          produtos={[faixaPendente.produto]}
          produtoBloqueado
          onSalvar={salvarFaixaPendente}
          onCancelar={() => setFaixaPendente(null)}
        />
      )}
    </View>
  );
}

function produtoFromOp(op: OpData): ProdutoItem {
  return {
    idProduto: op.idProduto,
    cdProduto: op.cdProduto,
    dsProduto: op.dsProduto,
  };
}

function novaFaixa(idProduto: number): FaixaPeso {
  return {
    id: 0,
    idProduto,
    pesoAlvo: 0,
    verdeMin: 0,
    verdeMax: 0,
    amarelaMin: 0,
    amarelaMax: 0,
  };
}

function RodapeContadorBadge({ label, valor, cor }: {
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <View style={{ minWidth: 62, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5,
      backgroundColor: cor + '18', borderWidth: 1, borderColor: cor + '44', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: '#000' }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#000' }} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function mesmoDia(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function nomeMesAno(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function DataPickerModal({ visible, titulo, dataSelecionada, onSelecionar, onFechar }: {
  visible: boolean;
  titulo: string;
  dataSelecionada: string;
  onSelecionar: (data: string) => void;
  onFechar: () => void;
}) {
  const selecionada = parseBR(dataSelecionada) ?? new Date();
  const [mesVisivel, setMesVisivel] = useState(new Date(selecionada.getFullYear(), selecionada.getMonth(), 1));

  useEffect(() => {
    if (visible) {
      const base = parseBR(dataSelecionada) ?? new Date();
      setMesVisivel(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [visible, dataSelecionada]);

  const dias = useMemo(() => {
    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    return [
      ...Array.from({ length: primeiroDiaSemana }, () => null),
      ...Array.from({ length: ultimoDia }, (_, i) => new Date(ano, mes, i + 1)),
    ];
  }, [mesVisivel]);

  function mudarMes(delta: number) {
    setMesVisivel(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 14, padding: 16, borderWidth: 1,
          borderColor: '#ddd8cc', width: '86%', maxWidth: 340, alignSelf: 'center' }}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029', marginBottom: 12 }}>
            {titulo}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Pressable onPress={() => mudarMes(-1)} hitSlop={8}>
              <Feather name="chevron-left" size={22} color="#163029" />
            </Pressable>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029', textTransform: 'capitalize' }}>
              {nomeMesAno(mesVisivel)}
            </Text>
            <Pressable onPress={() => mudarMes(1)} hitSlop={8}>
              <Feather name="chevron-right" size={22} color="#163029" />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, index) => (
              <Text key={`${dia}-${index}`} style={{ width: `${100 / 7}%`, textAlign: 'center',
                fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#2F4B44' }}>
                {dia}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {dias.map((dia, index) => {
              const selecionado = mesmoDia(dia, selecionada);
              const hojeSelecionavel = mesmoDia(dia, new Date());
              return (
                <View key={dia ? dia.toISOString() : `vazio-${index}`} style={{ width: `${100 / 7}%`, padding: 3 }}>
                  {dia ? (
                    <Pressable
                      onPress={() => onSelecionar(formatBRDate(dia))}
                      style={{ height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selecionado ? '#163029' : (hojeSelecionavel ? '#d1ccbd' : 'transparent'),
                        borderWidth: hojeSelecionavel && !selecionado ? 1 : 0,
                        borderColor: '#b8b4a6' }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13,
                        color: selecionado ? '#d1ccbd' : '#163029' }}>
                        {dia.getDate()}
                      </Text>
                    </Pressable>
                  ) : <View style={{ height: 34 }} />}
                </View>
              );
            })}
          </View>

          <Pressable onPress={onFechar}
            style={{ marginTop: 14, paddingVertical: 11, borderRadius: 8, borderWidth: 1,
              borderColor: '#163029', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Reimpressão ─────────────────────────────────────────────────────────────

function ResultadoPickerModal({ visible, selecionado, anchor, onSelecionar, onFechar }: {
  visible: boolean;
  selecionado: FiltroResultado;
  anchor: { x: number; y: number; width: number; height: number };
  onSelecionar: (resultado: FiltroResultado) => void;
  onFechar: () => void;
}) {
  const largura = Math.max(anchor.width, 132);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable onPress={onFechar}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ position: 'absolute', top: anchor.y + anchor.height + 4, left: anchor.x, width: largura,
            borderRadius: 8, borderWidth: 1, borderColor: '#b8b4a6',
            overflow: 'hidden', backgroundColor: '#f0ead6', elevation: 8 }}>
          {RESULTADO_FILTRO_OPCOES.map(opt => (
            <Pressable key={opt.id} onPress={() => onSelecionar(opt.id)}
              style={{ paddingVertical: 9, paddingHorizontal: 12,
                backgroundColor: selecionado === opt.id ? '#d1ccbd' : '#f0ead6',
                borderBottomWidth: opt.id === 'fora' ? 0 : 1, borderColor: '#e0dbd0' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RastreabilidadeDetalheModal({ item, onFechar }: {
  item: RastreabilidadeItem | null;
  onFechar: () => void;
}) {
  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#e8e3d8', borderRadius: 14, maxHeight: '88%',
          borderWidth: 1, borderColor: '#ddd8cc', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#d6d0c3' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029' }}>
              Detalhes da rastreabilidade
            </Text>
            <Pressable onPress={onFechar} hitSlop={8}>
              <Feather name="x" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {item ? <RastreabilidadeDetalheCard item={item} /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ReprintButton({ idPesagem }: { idPesagem: string }) {
  const [imprimindo, setImprimindo] = useState(false);

  async function reimprimir() {
    if (imprimindo) return;
    setImprimindo(true);
    try {
      const destino = await ti400Service.reimprimirPesagem(idPesagem);
      Toast.show({ type: 'success', text1: 'Etiqueta reimpressa', text2: `Enviada para ${destino}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao reimprimir', text2: err.response?.data?.error ?? err.message });
    } finally { setImprimindo(false); }
  }

  return (
    <Pressable onPress={reimprimir} disabled={imprimindo} hitSlop={6}
      style={{ width: 28, height: 28, borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#d8d0bd',
        opacity: imprimindo ? 0.6 : 1 }}>
      {imprimindo
        ? <ActivityIndicator size="small" color="#2F4B44" />
        : <Feather name="printer" size={15} color="#2F4B44" />}
    </Pressable>
  );
}

// ─── Modal Peso sob demanda ──────────────────────────────────────────────────

function PesoModal({ reading, onFechar }: { reading: WeightReading; onFechar: () => void }) {
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 }}>
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 14, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029' }}>
              Leitura de Peso
            </Text>
            <Pressable onPress={onFechar} hitSlop={8}>
              <Feather name="x" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 42, color: '#163029' }}>
              {reading.peso.toFixed(3)} {reading.unidade}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4,
                backgroundColor: reading.estavel ? '#22c55e' : '#f59e0b' }} />
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
                color: reading.estavel ? '#22c55e' : '#f59e0b' }}>
                {reading.estavel ? 'ESTÁVEL' : 'INSTÁVEL'}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: '#e8e3d8', borderRadius: 8, padding: 12, gap: 6 }}>
            <PesoInfoRow label="Peso bruto" valor={`${reading.pesoBruto.toFixed(3)} ${reading.unidade}`} />
            <PesoInfoRow label="Tara" valor={`${reading.tara.toFixed(3)} ${reading.unidade}`} />
            <PesoInfoRow label="Modo display" valor={reading.liquido ? 'Líquido' : 'Bruto'} />
            {reading.plataforma ? <PesoInfoRow label="Plataforma" valor={reading.plataforma} /> : null}
          </View>

          {reading.modoContinuo && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
              <Feather name="alert-triangle" size={14} color="#ef4444" style={{ marginTop: 1 }} />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#ef4444', flex: 1 }}>
                Terminal em transmissão contínua — a Impressão Automática não funciona nesse modo.
              </Text>
            </View>
          )}

          <Pressable onPress={onFechar}
            style={{ marginTop: 16, backgroundColor: '#163029', borderRadius: 8, paddingVertical: 12,
              alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#d1ccbd' }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PesoInfoRow({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44' }}>{label}</Text>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>{valor}</Text>
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function InfoItem({ icon, valor }: { icon: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Feather name={icon as any} size={12} color="#2F4B44" />
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44' }}>{valor}</Text>
    </View>
  );
}

function ResumoChip({ cor, label, valor }: { cor: string; label: string; valor: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: cor + '18',
      borderRadius: 8, paddingVertical: 7, borderWidth: 1, borderColor: cor + '44' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: '#000' }}>{valor}</Text>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#000' }}>{label}</Text>
    </View>
  );
}

function PesagemRowAtiva({ item }: { item: PesagemItem }) {
  const res = item.nrResultadoComparacao ?? 0;
  const cor = corResultadoResumo(res);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ddd8cc' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
          {item.nrRastreabilidade}
        </Text>
        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#6b7280' }}>
          {formatHora(item.dtPesagem)}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', marginRight: 10 }}>
        {item.vlPesoBruto.toFixed(3)} {item.dsUnidade}
      </Text>
      <View style={{ backgroundColor: cor + '18', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 6, borderWidth: 1, borderColor: cor + '44' }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#000' }}>
          {RESULTADO_LABEL[res]}
        </Text>
      </View>
    </View>
  );
}

function ExportStatus({ job, onDismiss }: { job: RelatorioJobResponse; onDismiss: () => void }) {
  const corMap: Record<string, string> = {
    Pendente: '#f59e0b', Processando: '#3b82f6', Concluido: '#22c55e', Erro: '#ef4444',
  };
  const cor = corMap[job.status] ?? '#9ca3af';

  async function baixar() {
    if (!job.downloadUrl) return;
    try { await Linking.openURL(job.downloadUrl); }
    catch { Toast.show({ type: 'error', text1: 'Não foi possível abrir o arquivo' }); }
  }

  return (
    <View style={{ backgroundColor: '#f0ead6', borderRadius: 8, padding: 12,
      borderWidth: 1, borderColor: cor + '44',
      flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {(job.status === 'Pendente' || job.status === 'Processando') && (
        <ActivityIndicator size="small" color={cor} />
      )}
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#163029', flex: 1 }}>
        {job.status === 'Concluido' ? 'Relatório pronto para download' :
         job.status === 'Erro'      ? (job.erro ?? 'Erro ao gerar') :
         'Gerando relatório...'}
      </Text>
      {job.status === 'Concluido' && job.downloadUrl && (
        <Pressable onPress={baixar}
          style={{ backgroundColor: '#163029', paddingHorizontal: 12, paddingVertical: 7,
            borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="download" size={14} color="#d1ccbd" />
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#d1ccbd' }}>Baixar</Text>
        </Pressable>
      )}
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Feather name="x" size={16} color="#6b7280" />
      </Pressable>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const fLabel = {
  fontFamily: 'Sina-Nova-Regular' as const,
  fontSize: 11, color: '#2F4B44', marginBottom: 5,
};

const fInput = {
  backgroundColor: '#d1ccbd', borderRadius: 6,
  paddingVertical: 8, paddingHorizontal: 10,
  fontSize: 14, fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029', borderWidth: 1, borderColor: '#b8b4a6',
};

const thCell = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 10, color: '#2F4B44', letterSpacing: 0.5,
};
