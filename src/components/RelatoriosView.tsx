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
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import { RastreabilidadeDetalheCard } from '@/components/RastreabilidadeView';
import ti400Service from '@/services/ti400Service';
import {
  CriarRelatorioRequest,
  LineSettings,
  PesagemItem,
  ProdutoItem,
  RastreabilidadeItem,
  RelatorioJobResponse,
  RESULTADO_COR,
  RESULTADO_LABEL,
  TipoRelatorio,
} from '@/interfaces/ti400Interface';

// ─── Helpers de data ────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatBRDate(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
function hoje(): string { return formatBRDate(new Date()); }

function parseBR(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

function toISO(s: string, fim = false): string | undefined {
  const d = parseBR(s);
  if (!d) return undefined;
  if (fim) { d.setHours(23, 59, 59, 999); }
  return d.toISOString();
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
function ordenarPesagensRecentes(a: PesagemItem, b: PesagemItem) {
  return new Date(b.dtPesagem).getTime() - new Date(a.dtPesagem).getTime();
}

// ─── Constantes ─────────────────────────────────────────────────────────────

type DataPickerAlvo = 'inicio' | 'fim';

const ITENS_POR_PAGINA_PADRAO = 10;
const ITENS_POR_PAGINA_OPCOES = [10, 25, 50];
const TABELA_RELATORIO_MIN_WIDTH = 980;

interface TipoInfo {
  label: string;
  descricao: string;
  icon: string;
}

const TIPOS: Record<TipoRelatorio, TipoInfo> = {
  PRODUCAO_DIARIA: {
    label: 'Produção Diária',
    descricao: 'Pesagens por linha, OP e dia — contagens por resultado',
    icon: 'bar-chart-2',
  },
  QUALIDADE: {
    label: 'Qualidade',
    descricao: '% verde, amarela e fora por produto/OP',
    icon: 'check-circle',
  },
  RASTREABILIDADE: {
    label: 'Rastreabilidade',
    descricao: 'Pesagens individuais com todos os campos (food safety)',
    icon: 'shield',
  },
  OPERADOR: {
    label: 'Por Operador',
    descricao: 'Total, aprovados e reprovados por colaborador',
    icon: 'users',
  },
};

const TIPO_ITEMS = ([
  'PRODUCAO_DIARIA',
  'QUALIDADE',
  'RASTREABILIDADE',
  'OPERADOR',
] as TipoRelatorio[]).map(id => ({ label: TIPOS[id].label, value: id }));

// ─── Componente ─────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function RelatoriosView({ onBack }: Props) {
  const [tipo, setTipo]             = useState<TipoRelatorio | null>(null);
  const [dataInicio, setDataInicio] = useState(hoje());
  const [dataFim, setDataFim]       = useState(hoje());
  const [datePickerAberto, setDatePickerAberto] = useState<DataPickerAlvo | null>(null);
  const [tipoOpen, setTipoOpen]     = useState(false);

  const [linhas, setLinhas]         = useState<LineSettings[]>([]);
  const [produtos, setProdutos]     = useState<ProdutoItem[]>([]);
  const [linhaOpen, setLinhaOpen]   = useState(false);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [linhaId, setLinhaId]       = useState<string | null>(null);
  const [produtoId, setProdutoId]   = useState<number | null>(null);
  const [colaborador, setColaborador] = useState('');

  const [gerando, setGerando]       = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pesagensTabela, setPesagensTabela] = useState<PesagemItem[]>([]);
  const [loadingTabela, setLoadingTabela] = useState(false);
  const [paginaTabela, setPaginaTabela] = useState(1);
  const [itensPorPaginaTabela, setItensPorPaginaTabela] = useState(ITENS_POR_PAGINA_PADRAO);
  const [temMaisTabela, setTemMaisTabela] = useState(false);
  const [detalheRastreabilidade, setDetalheRastreabilidade] = useState<RastreabilidadeItem | null>(null);
  const [loadingDetalheRastreabilidade, setLoadingDetalheRastreabilidade] = useState<string | null>(null);

  useEffect(() => {
    ti400Service.getLinhas()
      .then(setLinhas)
      .catch(() => {});
    ti400Service.getProdutos()
      .then(setProdutos)
      .catch(() => {});
  }, []);

  // Poll do job enquanto pendente/processando
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const atualizado = await ti400Service.getRelatorio(jobId);
      if (atualizado.status === 'Concluido' || atualizado.status === 'Erro') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        await finalizarJob(atualizado);
      }
    } catch { /* ignora erros de poll */ }
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    setPaginaTabela(1);
  }, [linhaId, dataInicio, dataFim, produtoId, colaborador, itensPorPaginaTabela]);

  useEffect(() => {
    let ativo = true;

    async function carregarTabela() {
      const from = toISO(dataInicio, false);
      const to = toISO(dataFim, true);

      if (!from || !to) {
        setPesagensTabela([]);
        setTemMaisTabela(false);
        return;
      }

      setLoadingTabela(true);
      try {
        const pagina = paginaTabela;
        const quantidade = itensPorPaginaTabela;
        const offset = (pagina - 1) * quantidade;
        let itens: PesagemItem[] = [];
        let temMais = false;

        if (linhaId) {
          const resposta = await ti400Service.getPesagensLinha(linhaId, quantidade + 1, offset, from, to);
          itens = resposta.slice(0, quantidade);
          temMais = resposta.length > quantidade;
        } else if (linhas.length > 0) {
          const limitePorLinha = pagina * quantidade + 1;
          const resultados = await Promise.all(
            linhas.map(linha =>
              ti400Service
                .getPesagensLinha(linha.id, limitePorLinha, 0, from, to)
                .catch(() => [] as PesagemItem[]),
            ),
          );
          const todas = resultados.flat().sort(ordenarPesagensRecentes);
          const inicio = offset;
          const fim = inicio + quantidade;
          itens = todas.slice(inicio, fim);
          temMais = todas.length > fim;
        }

        if (!ativo) return;
        setPesagensTabela(itens);
        setTemMaisTabela(temMais);
      } catch (err: any) {
        if (!ativo) return;
        setPesagensTabela([]);
        setTemMaisTabela(false);
        Toast.show({ type: 'error', text1: 'Erro ao carregar pesagens', text2: err.response?.data?.error ?? err.message });
      } finally {
        if (ativo) setLoadingTabela(false);
      }
    }

    carregarTabela();
    return () => { ativo = false; };
  }, [linhas, linhaId, dataInicio, dataFim, paginaTabela, itensPorPaginaTabela]);

  async function gerar() {
    if (!tipo) {
      Toast.show({ type: 'error', text1: 'Selecione o tipo de relatório' });
      return;
    }

    const from = toISO(dataInicio, false);
    const to   = toISO(dataFim, true);
    const colaboradorFiltro = colaborador.trim();
    const idColaborador = colaboradorFiltro ? Number.parseInt(colaboradorFiltro, 10) : undefined;

    if (!from || !to) {
      Toast.show({ type: 'error', text1: 'Datas inválidas', text2: 'Use o formato dd/MM/aaaa' });
      return;
    }
    if (colaboradorFiltro && !/^\d+$/.test(colaboradorFiltro)) {
      Toast.show({ type: 'error', text1: 'Matrícula inválida', text2: 'Informe apenas números no colaborador' });
      return;
    }

    const req: CriarRelatorioRequest = {
      tipo,
      parametros: {
        from,
        to,
        linhaId: linhaId ?? undefined,
        idProduto: produtoId ?? undefined,
        idColaborador,
        formato: 'xlsx',
      },
    };

    setGerando(true);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    try {
      const novoJob = await ti400Service.criarRelatorio(req);

      const finalizado = await finalizarJob(novoJob);
      if (!finalizado) {
        pollRef.current = setInterval(() => pollJob(novoJob.idJob), 2000);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
      Toast.show({ type: 'error', text1: 'Erro ao gerar relatório', text2: msg });
      setGerando(false);
    }
  }

  async function finalizarJob(jobAtual: RelatorioJobResponse) {
    if (jobAtual.status === 'Concluido') {
      await baixar(jobAtual.downloadUrl);
      setGerando(false);
      return true;
    }

    if (jobAtual.status === 'Erro') {
      Toast.show({ type: 'error', text1: 'Erro ao gerar relatório', text2: jobAtual.erro ?? 'Tente novamente' });
      setGerando(false);
      return true;
    }

    return false;
  }

  async function baixar(downloadUrl: string | null) {
    if (!downloadUrl) {
      Toast.show({ type: 'error', text1: 'Relatório concluído sem arquivo', text2: 'A API não retornou o link de download' });
      return;
    }
    try {
      await Linking.openURL(downloadUrl);
    } catch {
      Toast.show({ type: 'error', text1: 'Não foi possível abrir o arquivo' });
    }
  }

  function selecionarDataFiltro(alvo: DataPickerAlvo, data: string) {
    const dataEscolhida = parseBR(data);
    const inicioAtual = parseBR(dataInicio);
    const fimAtual = parseBR(dataFim);

    if (alvo === 'inicio') {
      setDataInicio(data);
      if (dataEscolhida && fimAtual && dataEscolhida > fimAtual) setDataFim(data);
    } else {
      setDataFim(data);
      if (dataEscolhida && inicioAtual && dataEscolhida < inicioAtual) setDataInicio(data);
    }

    setDatePickerAberto(null);
  }

  function alterarItensPorPaginaTabela(quantidade: number) {
    if (quantidade === itensPorPaginaTabela || loadingTabela) return;
    setItensPorPaginaTabela(quantidade);
  }

  async function abrirDetalheRastreabilidade(pesagem: PesagemItem) {
    if (!pesagem.nrRastreabilidade) return;
    setLoadingDetalheRastreabilidade(pesagem.idPesagem);
    try {
      const detalhe = await ti400Service.getRastreabilidade(pesagem.nrRastreabilidade);
      if (!detalhe) {
        Toast.show({ type: 'info', text1: 'Rastreabilidade não encontrada' });
        return;
      }
      setDetalheRastreabilidade(detalhe);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao buscar rastreabilidade', text2: err.response?.data?.error ?? err.message });
    } finally {
      setLoadingDetalheRastreabilidade(null);
    }
  }

  const produtoSelecionado = useMemo(
    () => produtos.find(produto => produto.idProduto === produtoId) ?? null,
    [produtos, produtoId],
  );

  const pesagensTabelaFiltradas = useMemo(() => {
    let lista = pesagensTabela;

    if (produtoSelecionado) {
      const cdProduto = String(produtoSelecionado.cdProduto).trim().toLowerCase();
      const dsProduto = String(produtoSelecionado.dsProduto).trim().toLowerCase();
      lista = lista.filter(pesagem => {
        const codigo = codigoProdutoPesagem(pesagem).toLowerCase();
        const descricao = descricaoProdutoPesagem(pesagem).toLowerCase();
        return codigo === cdProduto || descricao === dsProduto;
      });
    }

    const colaboradorFiltro = colaborador.trim();
    if (colaboradorFiltro) {
      const idColaborador = Number.parseInt(colaboradorFiltro, 10);
      lista = lista.filter(pesagem =>
        pesagem.idOperador === idColaborador ||
        String(pesagem.dsOperador ?? '').toLowerCase().includes(colaboradorFiltro.toLowerCase()),
      );
    }

    return lista;
  }, [pesagensTabela, produtoSelecionado, colaborador]);

  const resumoTabela = useMemo(() => {
    let verde = 0, amarela = 0, fora = 0;
    pesagensTabelaFiltradas.forEach(pesagem => {
      const resultado = pesagem.nrResultadoComparacao ?? 0;
      if (resultado === 1) verde++;
      else if (resultado === 2 || resultado === 3) amarela++;
      else if (resultado === 4 || resultado === 5) fora++;
    });
    return { verde, amarela, fora };
  }, [pesagensTabelaFiltradas]);

  const podeGerar = !!tipo && !!parseBR(dataInicio) && !!parseBR(dataFim) && !gerando;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {/* Sub-header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#163029" />
        </Pressable>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
          Relatórios
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 20 }}>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', zIndex: tipoOpen ? 3000 : 2000 }}>
          <View style={{ flex: 1, zIndex: tipoOpen ? 3000 : 1, elevation: tipoOpen ? 12 : 1 }}>
            <Text style={secTitle}>Tipo de relatório</Text>
            <DropDownPicker
              open={tipoOpen}
              setOpen={setTipoOpen}
              onOpen={() => { setLinhaOpen(false); setProdutoOpen(false); }}
              value={tipo}
              setValue={setTipo}
              items={TIPO_ITEMS}
              placeholder="Selecione"
              style={comboStyle}
              textStyle={comboTextStyle}
              dropDownContainerStyle={comboDropStyle}
              listMode="SCROLLVIEW"
              dropDownDirection="BOTTOM"
              zIndex={3000}
              zIndexInverse={1000}
              closeAfterSelecting
            />
          </View>

          <View style={{ flex: 1.25 }}>
            <Text style={secTitle}>Período</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setDatePickerAberto('inicio')}
                style={{ flex: 1, minHeight: 48, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8,
                  borderWidth: 1, borderColor: '#c8c4ba', backgroundColor: '#f0ead6',
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#163029' }} numberOfLines={1}>
                  Data inicial
                </Text>
                <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#2F4B44' }} numberOfLines={1}>
                  {dataInicio}
                </Text>
              </Pressable>
              <Pressable onPress={() => setDatePickerAberto('fim')}
                style={{ flex: 1, minHeight: 48, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8,
                  borderWidth: 1, borderColor: '#c8c4ba', backgroundColor: '#f0ead6',
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#163029' }} numberOfLines={1}>
                  Data final
                </Text>
                <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#2F4B44' }} numberOfLines={1}>
                  {dataFim}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ zIndex: linhaOpen || produtoOpen ? 2000 : 1000 }}>
          <Text style={secTitle}>Filtros opcionais</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, zIndex: linhaOpen ? 2500 : 1, elevation: linhaOpen ? 12 : 1 }}>
              <Text style={fieldLabel}>Linha</Text>
              <DropDownPicker
                open={linhaOpen}
                setOpen={setLinhaOpen}
                onOpen={() => { setTipoOpen(false); setProdutoOpen(false); }}
                value={linhaId}
                setValue={setLinhaId}
                items={[
                  { label: 'Todas as linhas', value: null },
                  ...linhas.map(l => ({ label: l.nome, value: l.id })),
                ]}
                placeholder="Todas as linhas"
                style={comboStyle}
                textStyle={comboTextStyle}
                dropDownContainerStyle={comboDropStyle}
                listMode="SCROLLVIEW"
                dropDownDirection="BOTTOM"
                zIndex={2500}
                zIndexInverse={900}
                closeAfterSelecting
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Produto</Text>
              <DropDownPicker
                open={produtoOpen}
                setOpen={setProdutoOpen}
                onOpen={() => { setTipoOpen(false); setLinhaOpen(false); }}
                value={produtoId}
                setValue={setProdutoId}
                items={[
                  { label: 'Todos os produtos', value: null },
                  ...produtos.map(p => ({ label: `${p.cdProduto} - ${p.dsProduto}`, value: p.idProduto })),
                ]}
                placeholder="Todos os produtos"
                style={comboStyle}
                textStyle={comboTextStyle}
                dropDownContainerStyle={comboDropStyle}
                listMode="MODAL"
                modalTitle="Produto"
                modalProps={{ animationType: 'slide' }}
                closeAfterSelecting
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Colaborador</Text>
              <TextInput
                value={colaborador}
                onChangeText={(texto) => setColaborador(texto.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="Matrícula do colaborador"
                placeholderTextColor="#9ca3af"
                style={dateInput}
              />
            </View>

            <View style={{ flex: 0.9 }}>
              <Text style={fieldLabel}>Relatório</Text>
              <Pressable
                onPress={gerar}
                disabled={!podeGerar}
                style={{
                  backgroundColor: podeGerar ? '#163029' : '#9ca3af',
                  minHeight: 48,
                  borderRadius: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  gap: 8,
                }}
              >
                {gerando
                  ? <ActivityIndicator color="#d1ccbd" size="small" />
                  : <Feather name="download" size={16} color="#d1ccbd" />
                }
                <Text
                  style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#d1ccbd', textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {gerando ? 'Gerando relatório' : 'Gerar relatório'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <PesagensRelatorioTabela
          loading={loadingTabela}
          pesagens={pesagensTabela}
          pesagensFiltradas={pesagensTabelaFiltradas}
          pagina={paginaTabela}
          itensPorPagina={itensPorPaginaTabela}
          temMais={temMaisTabela}
          resumo={resumoTabela}
          loadingDetalheId={loadingDetalheRastreabilidade}
          onPagina={setPaginaTabela}
          onItensPorPagina={alterarItensPorPaginaTabela}
          onDetalhe={abrirDetalheRastreabilidade}
        />
      </View>

      <DataPickerModal
        visible={datePickerAberto !== null}
        titulo={datePickerAberto === 'fim' ? 'Data final' : 'Data inicial'}
        dataSelecionada={datePickerAberto === 'fim' ? dataFim : dataInicio}
        onSelecionar={(data) => selecionarDataFiltro(datePickerAberto ?? 'inicio', data)}
        onFechar={() => setDatePickerAberto(null)}
      />

      <RastreabilidadeDetalheModal
        item={detalheRastreabilidade}
        onFechar={() => setDetalheRastreabilidade(null)}
      />
    </ScrollView>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFechar}>
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

function PesagensRelatorioTabela({ loading, pesagens, pesagensFiltradas, pagina, itensPorPagina, temMais,
  resumo, loadingDetalheId, onPagina, onItensPorPagina, onDetalhe }: {
  loading: boolean;
  pesagens: PesagemItem[];
  pesagensFiltradas: PesagemItem[];
  pagina: number;
  itensPorPagina: number;
  temMais: boolean;
  resumo: { verde: number; amarela: number; fora: number };
  loadingDetalheId: string | null;
  onPagina: (pagina: number) => void;
  onItensPorPagina: (quantidade: number) => void;
  onDetalhe: (pesagem: PesagemItem) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ borderWidth: 1, borderColor: '#b8b4a6', borderRadius: 8, overflow: 'hidden' }}
    >
      <View style={{ flex: 1, minWidth: TABELA_RELATORIO_MIN_WIDTH }}>
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

        {loading && pesagens.length === 0 ? (
          <View style={{ minHeight: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0ead6' }}>
            <ActivityIndicator size="large" color="#163029" />
          </View>
        ) : (
          <FlatList
            data={pesagensFiltradas}
            keyExtractor={(item) => item.idPesagem}
            scrollEnabled={false}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={() => (
              <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0ead6' }}>
                <Feather name="inbox" size={36} color="#9ca3af" />
                <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
                  {pesagens.length === 0
                    ? 'Nenhuma pesagem no período'
                    : 'Nenhuma pesagem com os filtros aplicados'}
                </Text>
              </View>
            )}
            ListFooterComponent={() => {
              if (pesagens.length === 0 && pagina === 1) return null;
              return (
                <View style={{ borderTopWidth: 1, borderColor: '#b8b4a6', backgroundColor: '#c8c3b5',
                  paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row',
                  alignItems: 'center' }}>
                  <View style={{ flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029' }}
                      numberOfLines={1}>
                      Página {pagina} · {pesagensFiltradas.length} registro{pesagensFiltradas.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 12, flexShrink: 0 }}>
                    <Pressable
                      onPress={() => onPagina(pagina - 1)}
                      disabled={pagina <= 1 || loading}
                      style={{ minWidth: 94, borderRadius: 8, borderWidth: 1, borderColor: '#163029',
                        paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                        opacity: (pagina <= 1 || loading) ? 0.45 : 1 }}
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
                          <Pressable key={qtd} onPress={() => onItensPorPagina(qtd)}
                            disabled={loading}
                            style={{ minWidth: 32, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6,
                              alignItems: 'center', borderWidth: 1,
                              borderColor: selecionado ? '#163029' : '#b8b4a6',
                              backgroundColor: selecionado ? '#163029' : '#d1ccbd',
                              opacity: loading ? 0.55 : 1 }}>
                            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11,
                              color: selecionado ? '#d1ccbd' : '#163029' }}>
                              {qtd}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      onPress={() => onPagina(pagina + 1)}
                      disabled={!temMais || loading}
                      style={{ minWidth: 94, borderRadius: 8, borderWidth: 1, borderColor: '#163029',
                        paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                        opacity: (!temMais || loading) ? 0.45 : 1 }}
                    >
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: '#163029' }}>
                        Próximo
                      </Text>
                      <Feather name="chevron-right" size={15} color="#163029" />
                    </Pressable>
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
                    <RodapeContadorBadge label="Verde" valor={resumo.verde} cor="#22c55e" />
                    <RodapeContadorBadge label="Amarelo" valor={resumo.amarela} cor="#f59e0b" />
                    <RodapeContadorBadge label="Vermelho" valor={resumo.fora} cor="#ef4444" />
                  </View>
                </View>
              );
            }}
            renderItem={({ item, index }) => {
              const res = item.nrResultadoComparacao ?? 0;
              const cor = RESULTADO_COR[res] ?? corResultadoResumo(res);
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
                        {RESULTADO_LABEL[res] ?? RESULTADO_LABEL[0]}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 86, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <ReprintButton idPesagem={item.idPesagem} />
                    <Pressable
                      onPress={() => onDetalhe(item)}
                      disabled={loadingDetalheId === item.idPesagem}
                      hitSlop={6}
                      style={{ width: 28, height: 28, borderRadius: 6,
                        alignItems: 'center', justifyContent: 'center', backgroundColor: '#c8d1c8',
                        opacity: loadingDetalheId === item.idPesagem ? 0.6 : 1 }}
                    >
                      {loadingDetalheId === item.idPesagem
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
  );
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
    } finally {
      setImprimindo(false);
    }
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

// ─── Estilos locais ──────────────────────────────────────────────────────────

const secTitle = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 15,
  color: '#163029',
  marginBottom: 10,
};

const fieldLabel = {
  fontFamily: 'Sina-Nova-Regular' as const,
  fontSize: 13,
  color: '#2F4B44',
  marginBottom: 6,
};

const comboStyle = {
  borderColor: '#c8c4ba',
  backgroundColor: '#f0ead6',
  minHeight: 48,
};

const comboTextStyle = {
  fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029',
};

const comboDropStyle = {
  borderColor: '#c8c4ba',
  backgroundColor: '#f0ead6',
};

const thCell = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 11,
  color: '#163029',
};

const dateInput = {
  backgroundColor: '#f0ead6',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 12,
  fontSize: 15,
  fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029',
  borderWidth: 1,
  borderColor: '#c8c4ba',
};
