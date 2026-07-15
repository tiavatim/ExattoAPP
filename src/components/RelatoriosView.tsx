import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import ti400Service from '@/services/ti400Service';
import {
  CriarRelatorioRequest,
  LineSettings,
  RelatorioJobResponse,
  StatusRelatorio,
  TipoRelatorio,
} from '@/interfaces/ti400Interface';

// ─── Helpers de data ────────────────────────────────────────────────────────

function hoje(): string {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function inicioMes(): string {
  const d = new Date();
  return `01/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

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

// ─── Constantes ─────────────────────────────────────────────────────────────

type Periodo = 'hoje' | '7dias' | 'mes' | 'personalizado';

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'hoje',         label: 'Hoje' },
  { id: '7dias',        label: '7 dias' },
  { id: 'mes',          label: 'Esse mês' },
  { id: 'personalizado', label: 'Personalizado' },
];

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

const STATUS_COR: Record<StatusRelatorio, string> = {
  Pendente:    '#f59e0b',
  Processando: '#3b82f6',
  Concluido:   '#22c55e',
  Erro:        '#ef4444',
};

const STATUS_LABEL: Record<StatusRelatorio, string> = {
  Pendente:    'AGUARDANDO',
  Processando: 'PROCESSANDO',
  Concluido:   'CONCLUÍDO',
  Erro:        'ERRO',
};

// ─── Componente ─────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function RelatoriosView({ onBack }: Props) {
  const [tipo, setTipo]             = useState<TipoRelatorio | null>(null);
  const [periodo, setPeriodo]       = useState<Periodo>('hoje');
  const [dataInicio, setDataInicio] = useState(hoje());
  const [dataFim, setDataFim]       = useState(hoje());

  const [linhas, setLinhas]         = useState<LineSettings[]>([]);
  const [dropOpen, setDropOpen]     = useState(false);
  const [linhaId, setLinhaId]       = useState<string | null>(null);
  const [colaborador, setColaborador] = useState('');

  const [gerando, setGerando]       = useState(false);
  const [job, setJob]               = useState<RelatorioJobResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ti400Service.getLinhas()
      .then(setLinhas)
      .catch(() => {});
  }, []);

  // Sincroniza campos de data quando muda o período predefinido
  useEffect(() => {
    if (periodo === 'hoje')  { setDataInicio(hoje());      setDataFim(hoje()); }
    if (periodo === '7dias') { setDataInicio(diasAtras(6)); setDataFim(hoje()); }
    if (periodo === 'mes')   { setDataInicio(inicioMes());  setDataFim(hoje()); }
  }, [periodo]);

  // Poll do job enquanto pendente/processando
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const atualizado = await ti400Service.getRelatorio(jobId);
      setJob(atualizado);
      if (atualizado.status === 'Concluido' || atualizado.status === 'Erro') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch { /* ignora erros de poll */ }
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function gerar() {
    if (!tipo) {
      Toast.show({ type: 'error', text1: 'Selecione o tipo de relatório' });
      return;
    }

    const from = toISO(dataInicio, false);
    const to   = toISO(dataFim, true);

    if (!from || !to) {
      Toast.show({ type: 'error', text1: 'Datas inválidas', text2: 'Use o formato dd/MM/aaaa' });
      return;
    }

    const req: CriarRelatorioRequest = {
      tipo,
      parametros: {
        from,
        to,
        linhaId: linhaId ?? undefined,
        idColaborador: colaborador ? parseInt(colaborador, 10) || undefined : undefined,
      },
    };

    setGerando(true);
    setJob(null);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const novoJob = await ti400Service.criarRelatorio(req);
      setJob(novoJob);

      if (novoJob.status === 'Pendente' || novoJob.status === 'Processando') {
        pollRef.current = setInterval(() => pollJob(novoJob.idJob), 2000);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
      Toast.show({ type: 'error', text1: 'Erro ao gerar relatório', text2: msg });
    } finally {
      setGerando(false);
    }
  }

  async function baixar() {
    if (!job?.downloadUrl) return;
    try {
      await Linking.openURL(job.downloadUrl);
    } catch {
      Toast.show({ type: 'error', text1: 'Não foi possível abrir o arquivo' });
    }
  }

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

        {/* Tipo de relatório */}
        <View>
          <Text style={secTitle}>Tipo de relatório</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(Object.entries(TIPOS) as [TipoRelatorio, TipoInfo][]).map(([id, info]) => {
              const ativo = tipo === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTipo(id)}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: ativo ? '#163029' : '#f0ead6',
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1.5,
                    borderColor: ativo ? '#163029' : '#d4d0c8',
                    gap: 6,
                  }}
                >
                  <Feather name={info.icon as any} size={20} color={ativo ? '#d1ccbd' : '#2F4B44'} />
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: ativo ? '#d1ccbd' : '#163029' }}>
                    {info.label}
                  </Text>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: ativo ? '#a8b8b4' : '#6b7280', lineHeight: 16 }}>
                    {info.descricao}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Período */}
        <View>
          <Text style={secTitle}>Período</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {PERIODOS.map((p) => {
              const ativo = periodo === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPeriodo(p.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: ativo ? '#163029' : '#f0ead6',
                    borderWidth: 1,
                    borderColor: ativo ? '#163029' : '#c8c4ba',
                  }}
                >
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: ativo ? '#d1ccbd' : '#163029' }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Campos de data personalizado */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>De</Text>
              <TextInput
                value={dataInicio}
                onChangeText={setDataInicio}
                onFocus={() => setPeriodo('personalizado')}
                placeholder="dd/MM/aaaa"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                style={dateInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Até</Text>
              <TextInput
                value={dataFim}
                onChangeText={setDataFim}
                onFocus={() => setPeriodo('personalizado')}
                placeholder="dd/MM/aaaa"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                style={dateInput}
              />
            </View>
          </View>
        </View>

        {/* Filtros opcionais */}
        <View style={{ zIndex: 1000 }}>
          <Text style={secTitle}>Filtros opcionais</Text>

          <Text style={fieldLabel}>Linha</Text>
          <DropDownPicker
            open={dropOpen}
            setOpen={setDropOpen}
            value={linhaId}
            setValue={setLinhaId}
            items={[
              { label: 'Todas as linhas', value: null },
              ...linhas.map(l => ({ label: l.nome, value: l.id })),
            ]}
            placeholder="Todas as linhas"
            style={{ borderColor: '#c8c4ba', backgroundColor: '#f0ead6', marginBottom: 12 }}
            textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
            dropDownContainerStyle={{ borderColor: '#c8c4ba', backgroundColor: '#f0ead6' }}
            listMode="MODAL"
            modalProps={{ animationType: 'slide' }}
            closeAfterSelecting
          />

          <Text style={fieldLabel}>Matrícula do colaborador</Text>
          <TextInput
            value={colaborador}
            onChangeText={setColaborador}
            keyboardType="numeric"
            placeholder="Opcional (ex: 1234)"
            placeholderTextColor="#9ca3af"
            style={dateInput}
          />
        </View>

        {/* Botão gerar */}
        <Pressable
          onPress={gerar}
          disabled={!podeGerar}
          style={{
            backgroundColor: podeGerar ? '#163029' : '#9ca3af',
            paddingVertical: 14,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {gerando
            ? <ActivityIndicator color="#d1ccbd" size="small" />
            : <Feather name="download" size={18} color="#d1ccbd" />
          }
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#d1ccbd' }}>
            {gerando ? 'Gerando...' : 'Gerar Relatório'}
          </Text>
        </Pressable>

        {/* Status do job */}
        {job && (
          <View style={{
            backgroundColor: '#f0ead6',
            borderRadius: 10,
            padding: 16,
            borderWidth: 1,
            borderColor: STATUS_COR[job.status] + '44',
            gap: 8,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>
                {TIPOS[job.tipo as TipoRelatorio]?.label ?? job.tipo}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {(job.status === 'Pendente' || job.status === 'Processando') && (
                  <ActivityIndicator size="small" color={STATUS_COR[job.status]} />
                )}
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: STATUS_COR[job.status] }}>
                  {STATUS_LABEL[job.status]}
                </Text>
              </View>
            </View>

            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#6b7280' }}>
              Solicitado: {new Date(job.dtSolicitado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>

            {job.erro && (
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#ef4444' }}>
                {job.erro}
              </Text>
            )}

            {job.status === 'Concluido' && job.downloadUrl && (
              <Pressable
                onPress={baixar}
                style={{
                  marginTop: 4,
                  backgroundColor: '#163029',
                  paddingVertical: 10,
                  borderRadius: 6,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Feather name="download" size={16} color="#d1ccbd" />
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
                  Baixar Excel
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
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
