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
import ti400Service from '@/services/ti400Service';
import {
  FaixaPeso,
  OpData,
  PesagemItem,
  ProdutoItem,
  RelatorioJobResponse,
  RESULTADO_COR,
  RESULTADO_LABEL,
  SessaoHistoricoItem,
  StatusSessao,
  WeighingSession,
  WeightReading,
} from '@/interfaces/ti400Interface';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'ativa' | 'sessoes' | 'consultar';
type Periodo = 'hoje' | '7dias' | 'mes' | 'personalizado';
type FiltroResultado = 'todos' | 'verde' | 'amarela' | 'fora';

const TAKE = 50;

function pad(n: number) { return String(n).padStart(2, '0'); }
function hoje() { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
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
        ti400Service.getPesagensLinha(linhaId, 100),
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

  // ── Peso sob demanda ──────────────────────────────────────────────────────
  const [lendoPeso, setLendoPeso] = useState(false);
  const [pesoLido, setPesoLido]   = useState<WeightReading | null>(null);

  async function lerPeso() {
    setLendoPeso(true);
    try {
      setPesoLido(await ti400Service.getPeso(linhaId));
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao ler peso', text2: err.response?.data?.error ?? err.message });
    } finally { setLendoPeso(false); }
  }

  // ── Aba Consultar ─────────────────────────────────────────────────────────
  const [periodo, setPeriodo]                 = useState<Periodo>('hoje');
  const [dataDe, setDataDe]                   = useState(hoje());
  const [dataAte, setDataAte]                 = useState(hoje());
  const [opFilter, setOpFilter]               = useState('');
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultado>('todos');
  const [busca, setBusca]                     = useState('');

  const [pesagens, setPesagens]               = useState<PesagemItem[]>([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [carregandoMais, setCarregandoMais]   = useState(false);
  const [temMais, setTemMais]                 = useState(false);
  const [offsetConsulta, setOffsetConsulta]   = useState(0);
  const consultaIniciada = useRef(false);

  const [exportJob, setExportJob]   = useState<RelatorioJobResponse | null>(null);
  const [exportando, setExportando] = useState(false);
  const exportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (exportPollRef.current) clearInterval(exportPollRef.current); };
  }, []);

  useEffect(() => {
    if (periodo === 'hoje')  { setDataDe(hoje());       setDataAte(hoje()); }
    if (periodo === '7dias') { setDataDe(diasAtras(6)); setDataAte(hoje()); }
    if (periodo === 'mes')   { setDataDe(inicioMes());  setDataAte(hoje()); }
  }, [periodo]);

  useEffect(() => {
    if (tab === 'consultar' && !consultaIniciada.current) {
      consultaIniciada.current = true;
      executarBusca(true);
    }
  }, [tab]);

  async function executarBusca(reset = true) {
    const off = reset ? 0 : offsetConsulta;
    if (reset) { setLoadingConsulta(true); setPesagens([]); setOffsetConsulta(0); setTemMais(false); setExportJob(null); }
    else setCarregandoMais(true);

    const from    = toISO(dataDe, false);
    const to      = toISO(dataAte, true);
    const loteNum = opFilter ? parseInt(opFilter, 10) || undefined : undefined;

    try {
      const items = await ti400Service.getPesagensLinha(
        linhaId, TAKE, off, from, to, loteNum,
      );
      setPesagens(prev => reset ? items : [...prev, ...items]);
      const novoOffset = off + items.length;
      setOffsetConsulta(novoOffset);
      setTemMais(items.length === TAKE);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro na consulta', text2: err.message });
    } finally {
      setLoadingConsulta(false);
      setCarregandoMais(false);
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
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(p => p.nrRastreabilidade.toLowerCase().includes(q));
    }
    return lista;
  }, [pesagens, filtroResultado, busca]);

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
    try {
      const job = await ti400Service.criarRelatorio({
        tipo: 'RASTREABILIDADE',
        parametros: { linhaId, from: toISO(dataDe, false), to: toISO(dataAte, true) },
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
            { id: 'sessoes',   label: 'Sessões' },
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
                  <Pressable onPress={lerPeso} disabled={lendoPeso}
                    style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6,
                      borderWidth: 1, borderColor: '#2F4B44',
                      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                    {lendoPeso
                      ? <ActivityIndicator color="#2F4B44" size="small" />
                      : <><Feather name="crosshair" size={15} color="#2F4B44" /><Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#2F4B44' }}>Ler Peso</Text></>}
                  </Pressable>
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

      {/* ── Aba Sessões ── */}
      {tab === 'sessoes' && <SessoesTab linhaId={linhaId} />}

      {/* ── Aba Consultar ── */}
      {tab === 'consultar' && (
        <View style={{ flex: 1 }}>
          {/* Filtros */}
          <ScrollView
            style={{ flexShrink: 0, backgroundColor: '#c8c3b5', borderBottomWidth: 1, borderColor: '#b8b4a6' }}
            contentContainerStyle={{ padding: 14, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* Período */}
            <View>
              <Text style={fLabel}>Período</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {([
                  { id: 'hoje', label: 'Hoje' }, { id: '7dias', label: '7 dias' },
                  { id: 'mes', label: 'Mês' }, { id: 'personalizado', label: 'Personalizado' },
                ] as { id: Periodo; label: string }[]).map(p => (
                  <TouchableOpacity key={p.id} onPress={() => setPeriodo(p.id)}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
                      backgroundColor: periodo === p.id ? '#163029' : '#d1ccbd',
                      borderWidth: 1, borderColor: periodo === p.id ? '#163029' : '#b8b4a6' }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
                      color: periodo === p.id ? '#d1ccbd' : '#163029' }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Datas */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>De</Text>
                <TextInput value={dataDe} onChangeText={setDataDe} onFocus={() => setPeriodo('personalizado')}
                  placeholder="dd/MM/aaaa" placeholderTextColor="#9ca3af" keyboardType="numeric" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Até</Text>
                <TextInput value={dataAte} onChangeText={setDataAte} onFocus={() => setPeriodo('personalizado')}
                  placeholder="dd/MM/aaaa" placeholderTextColor="#9ca3af" keyboardType="numeric" style={fInput} />
              </View>
            </View>

            {/* OP / Lote */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ width: 100 }}>
                <Text style={fLabel}>OP / Lote</Text>
                <TextInput value={opFilter} onChangeText={setOpFilter}
                  placeholder="Ex: 42" placeholderTextColor="#9ca3af" keyboardType="numeric" style={fInput} />
              </View>
            </View>

            {/* Resultado */}
            <View>
              <Text style={fLabel}>Resultado</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {([
                  { id: 'todos',   label: 'Todos',   cor: '#6b7280' },
                  { id: 'verde',   label: 'Verde',   cor: '#22c55e' },
                  { id: 'amarela', label: 'Amarela', cor: '#f59e0b' },
                  { id: 'fora',    label: 'Fora',    cor: '#ef4444' },
                ] as { id: FiltroResultado; label: string; cor: string }[]).map(r => (
                  <TouchableOpacity key={r.id} onPress={() => setFiltroResultado(r.id)}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                      backgroundColor: filtroResultado === r.id ? r.cor : '#d1ccbd',
                      borderWidth: 1, borderColor: filtroResultado === r.id ? r.cor : '#b8b4a6' }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
                      color: filtroResultado === r.id ? '#fff' : '#163029' }}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Busca textual */}
            <View>
              <Text style={fLabel}>Busca por rastreabilidade</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput value={busca} onChangeText={setBusca}
                  placeholder="Ex: a1b2c3..." placeholderTextColor="#9ca3af"
                  autoCapitalize="none" autoCorrect={false}
                  style={[fInput, { flex: 1 }]} />
                {busca.length > 0 && (
                  <Pressable onPress={() => setBusca('')} hitSlop={8}>
                    <Feather name="x" size={16} color="#6b7280" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
          </ScrollView>

          {/* Header da tabela */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: '#b8b4a4', borderBottomWidth: 1, borderColor: '#a8a49a' }}>
            <Text style={[thCell, { flex: 2 }]}>RASTREABILIDADE</Text>
            <Text style={[thCell, { width: 76 }]}>HORA</Text>
            <Text style={[thCell, { width: 88 }]}>PESO</Text>
            <Text style={[thCell, { width: 76 }]}>RESULT.</Text>
            <Text style={[thCell, { width: 34 }]} />
          </View>

          {/* Resumo */}
          {pesagens.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6,
              backgroundColor: '#c8c3b5', borderBottomWidth: 1, borderColor: '#b8b4a6',
              flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029', flex: 1 }}>
                {pesagensFiltradas.length} registro{pesagensFiltradas.length !== 1 ? 's' : ''}
                {pesagensFiltradas.length !== pesagens.length ? ` (filtrado de ${pesagens.length})` : ''}
                {temMais ? ' · há mais' : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#22c55e' }}>
                  ✓ {resumoFiltrado.verde}
                </Text>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#f59e0b' }}>
                  ~ {resumoFiltrado.amarela}
                </Text>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#ef4444' }}>
                  ✕ {resumoFiltrado.fora}
                </Text>
              </View>
            </View>
          )}

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
              ListFooterComponent={() => temMais ? (
                <Pressable onPress={() => executarBusca(false)} disabled={carregandoMais}
                  style={{ alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderColor: '#ddd8cc' }}>
                  {carregandoMais
                    ? <ActivityIndicator color="#163029" />
                    : <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                        Carregar mais
                      </Text>}
                </Pressable>
              ) : null}
              renderItem={({ item, index }) => {
                const res = item.nrResultadoComparacao ?? 0;
                const cor = RESULTADO_COR[res];
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 9,
                    backgroundColor: index % 2 === 0 ? '#f0ead6' : '#e8e3d8',
                    borderBottomWidth: 1, borderColor: '#ddd8cc' }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }}>
                        {item.nrRastreabilidade}
                      </Text>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: '#6b7280' }}>
                        OP {item.lote}
                        {item.dsOperador ? ` · ${item.dsOperador}` : item.idOperador ? ` · Col. #${item.idOperador}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44', width: 76 }}>
                      {formatHora(item.dtPesagem)}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029', width: 88 }}>
                      {item.vlPesoBruto.toFixed(3)} {item.dsUnidade}
                    </Text>
                    <View style={{ width: 76, alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: cor + '22', paddingHorizontal: 6, paddingVertical: 3,
                        borderRadius: 5, borderWidth: 1, borderColor: cor + '66' }}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: cor }}>
                          {RESULTADO_LABEL[res]}
                        </Text>
                      </View>
                    </View>
                    <View style={{ width: 34, alignItems: 'flex-end' }}>
                      <ReprintButton idPesagem={item.idPesagem} />
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

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

      {pesoLido && <PesoModal reading={pesoLido} onFechar={() => setPesoLido(null)} />}
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

// ─── Aba Sessões ─────────────────────────────────────────────────────────────

const TAKE_SESSOES = 20;

function SessoesTab({ linhaId }: { linhaId: string }) {
  const [sessoes, setSessoes]             = useState<SessaoHistoricoItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais]             = useState(false);
  const [offset, setOffset]               = useState(0);
  const [expandida, setExpandida]         = useState<string | null>(null);
  const [pesagensSessao, setPesagensSessao] = useState<Record<string, PesagemItem[]>>({});
  const [loadingPesagens, setLoadingPesagens] = useState<string | null>(null);

  const carregar = useCallback(async (reset = true) => {
    const off = reset ? 0 : offset;
    if (reset) setLoading(true); else setCarregandoMais(true);
    try {
      const items = await ti400Service.getSessoesLinha(linhaId, TAKE_SESSOES, off);
      setSessoes(prev => reset ? items : [...prev, ...items]);
      setOffset(off + items.length);
      setTemMais(items.length === TAKE_SESSOES);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar sessões', text2: err.message });
    } finally {
      setLoading(false);
      setCarregandoMais(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhaId, offset]);

  useEffect(() => { carregar(true); }, [linhaId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarExpandir(sessao: SessaoHistoricoItem) {
    if (expandida === sessao.idSessao) { setExpandida(null); return; }
    setExpandida(sessao.idSessao);
    if (!pesagensSessao[sessao.idSessao]) {
      setLoadingPesagens(sessao.idSessao);
      try {
        const itens = await ti400Service.getPesagensSessao(sessao.idSessao);
        setPesagensSessao(prev => ({ ...prev, [sessao.idSessao]: itens }));
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Erro ao carregar pesagens', text2: err.message });
      } finally { setLoadingPesagens(null); }
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#163029" />
      </View>
    );
  }

  return (
    <FlatList
      data={sessoes}
      keyExtractor={item => item.idSessao}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
      ListEmptyComponent={() => (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Feather name="layers" size={36} color="#9ca3af" />
          <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
            Nenhuma sessão registrada
          </Text>
        </View>
      )}
      ListFooterComponent={() => temMais ? (
        <Pressable onPress={() => carregar(false)} disabled={carregandoMais}
          style={{ alignItems: 'center', paddingVertical: 14 }}>
          {carregandoMais
            ? <ActivityIndicator color="#163029" />
            : <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                Carregar mais
              </Text>}
        </Pressable>
      ) : null}
      renderItem={({ item }) => (
        <SessaoCard
          sessao={item}
          expandida={expandida === item.idSessao}
          pesagens={pesagensSessao[item.idSessao]}
          loadingPesagens={loadingPesagens === item.idSessao}
          onToggle={() => alternarExpandir(item)}
        />
      )}
    />
  );
}

function SessaoCard({ sessao, expandida, pesagens, loadingPesagens, onToggle }: {
  sessao: SessaoHistoricoItem;
  expandida: boolean;
  pesagens?: PesagemItem[];
  loadingPesagens: boolean;
  onToggle: () => void;
}) {
  const statusCor = (STATUS_COR as Record<string, string>)[sessao.status] ?? '#9ca3af';

  function formatDataHora(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={{ backgroundColor: '#f0ead6', borderRadius: 10,
      borderWidth: 1, borderColor: '#ddd8cc', overflow: 'hidden' }}>
      <Pressable onPress={onToggle} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', flex: 1 }}>
            OP {sessao.lote} · {sessao.dsProduto || sessao.cdProduto}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusCor }} />
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: statusCor }}>
              {sessao.status.toUpperCase()}
            </Text>
            <Feather name={expandida ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </View>
        </View>
        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44', marginBottom: 8 }}>
          {formatDataHora(sessao.iniciada)}
          {sessao.concluida ? ` → ${formatDataHora(sessao.concluida)}` : ' (em andamento)'}
          {sessao.dsColaborador ? ` · ${sessao.dsColaborador}` : ` · Col. #${sessao.idColaborador}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniChip cor="#22c55e" valor={sessao.verde} />
          <MiniChip cor="#f59e0b" valor={sessao.amarela} />
          <MiniChip cor="#ef4444" valor={sessao.fora} />
          <MiniChip cor="#6b7280" valor={sessao.total} label="total" />
        </View>
      </Pressable>

      {expandida && (
        <View style={{ borderTopWidth: 1, borderColor: '#ddd8cc', paddingHorizontal: 14, paddingBottom: 8 }}>
          {loadingPesagens ? (
            <ActivityIndicator color="#163029" style={{ paddingVertical: 16 }} />
          ) : !pesagens || pesagens.length === 0 ? (
            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#6b7280',
              textAlign: 'center', paddingVertical: 14 }}>
              Nenhuma pesagem nesta sessão
            </Text>
          ) : (
            pesagens.map(p => {
              const res = p.nrResultadoComparacao ?? 0;
              const cor = RESULTADO_COR[res];
              return (
                <View key={p.idPesagem} style={{ flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e5e0d4' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }}>
                      {p.nrRastreabilidade}
                    </Text>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#6b7280' }}>
                      {formatHora(p.dtPesagem)}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029', marginRight: 8 }}>
                    {p.vlPesoBruto.toFixed(3)} {p.dsUnidade}
                  </Text>
                  <View style={{ backgroundColor: cor + '22', paddingHorizontal: 6, paddingVertical: 3,
                    borderRadius: 5, borderWidth: 1, borderColor: cor + '66', marginRight: 8 }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: cor }}>
                      {RESULTADO_LABEL[res]}
                    </Text>
                  </View>
                  <ReprintButton idPesagem={p.idPesagem} />
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

function MiniChip({ cor, valor, label }: { cor: string; valor: number; label?: string }) {
  return (
    <View style={{ backgroundColor: cor + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: cor + '44', flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: cor }}>{valor}</Text>
      {label ? <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: cor }}>{label}</Text> : null}
    </View>
  );
}

// ─── Reimpressão ─────────────────────────────────────────────────────────────

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
    <Pressable onPress={reimprimir} disabled={imprimindo} hitSlop={8}>
      {imprimindo
        ? <ActivityIndicator size="small" color="#2F4B44" />
        : <Feather name="printer" size={17} color="#2F4B44" />}
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
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: cor }}>{valor}</Text>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: cor }}>{label}</Text>
    </View>
  );
}

function PesagemRowAtiva({ item }: { item: PesagemItem }) {
  const res = item.nrResultadoComparacao ?? 0;
  const cor = RESULTADO_COR[res];
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
      <View style={{ backgroundColor: cor + '22', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 6, borderWidth: 1, borderColor: cor + '66' }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: cor }}>
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
