import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import ti400Service from '@/services/ti400Service';
import {
  ConfigAtual,
  ConfigEntry,
  FaixaPeso,
  ProdutoItem,
} from '@/interfaces/ti400Interface';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ConfigTab = 'faixas' | 'geral';

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function ConfiguracoesView({ onBack }: Props) {
  const [tab, setTab] = useState<ConfigTab>('faixas');

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Feather name="arrow-left" size={22} color="#163029" />
          </Pressable>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
            Configurações
          </Text>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: '#c4bfb0', borderRadius: 8, padding: 3 }}>
          {([
            { id: 'faixas', label: 'Faixas de Peso' },
            { id: 'geral',  label: 'Geral' },
          ] as { id: ConfigTab; label: string }[]).map((t) => (
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

      {tab === 'faixas' && <FaixasTab />}
      {tab === 'geral'  && <GeralTab />}
    </View>
  );
}

// ─── Aba Faixas de Peso ───────────────────────────────────────────────────────

function FaixasTab() {
  const [faixas, setFaixas]     = useState<FaixaPeso[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalFaixa, setModalFaixa] = useState<FaixaPeso | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [f, p] = await Promise.all([ti400Service.getFaixas(), ti400Service.getProdutos()]);
      setFaixas(f);
      setProdutos(p);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar faixas', text2: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function nomeProduto(idProduto: number) {
    const p = produtos.find(x => x.idProduto === idProduto);
    return p ? `${p.cdProduto} — ${p.dsProduto}` : `Produto #${idProduto}`;
  }

  function confirmarDelete(faixa: FaixaPeso) {
    Alert.alert(
      'Remover faixa',
      `Remover faixa de "${nomeProduto(faixa.idProduto)}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await ti400Service.deleteFaixa(faixa.id);
            setFaixas(prev => prev.filter(f => f.id !== faixa.id));
            Toast.show({ type: 'success', text1: 'Faixa removida' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao remover', text2: err.message });
          }
        }},
      ],
    );
  }

  async function salvarFaixa(faixa: FaixaPeso) {
    try {
      const salva = await ti400Service.upsertFaixa(faixa);
      setFaixas(prev => {
        const idx = prev.findIndex(f => f.id === salva.id);
        return idx >= 0 ? prev.map((f, i) => i === idx ? salva : f) : [...prev, salva];
      });
      setModalFaixa(null);
      Toast.show({ type: 'success', text1: faixa.id === 0 ? 'Faixa criada' : 'Faixa atualizada' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar', text2: err.response?.data?.error ?? err.message });
    }
  }

  if (loading) return <CenterLoader />;

  return (
    <>
      <FlatList
        data={faixas}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Feather name="sliders" size={36} color="#9ca3af" />
            <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
              Nenhuma faixa cadastrada
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#f0ead6', borderRadius: 10, padding: 14,
            borderWidth: 1, borderColor: '#ddd8cc' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', flex: 1 }}>
                {nomeProduto(item.idProduto)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setModalFaixa(item)} hitSlop={8}>
                  <Feather name="edit-2" size={17} color="#2F4B44" />
                </Pressable>
                <Pressable onPress={() => confirmarDelete(item)} hitSlop={8}>
                  <Feather name="trash-2" size={17} color="#ef4444" />
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <PesoChip label="Alvo"   valor={item.pesoAlvo}   cor="#163029" />
              <PesoChip label="Verde ↓" valor={item.verdeMin}  cor="#22c55e" />
              <PesoChip label="Verde ↑" valor={item.verdeMax}  cor="#22c55e" />
              <PesoChip label="Amar. ↓" valor={item.amarelaMin} cor="#f59e0b" />
              <PesoChip label="Amar. ↑" valor={item.amarelaMax} cor="#f59e0b" />
            </View>
          </View>
        )}
      />

      <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <Pressable
          onPress={() => setModalFaixa({ id: 0, idProduto: 0, pesoAlvo: 0, verdeMin: 0, verdeMax: 0, amarelaMin: 0, amarelaMax: 0 })}
          style={{ backgroundColor: '#163029', width: 52, height: 52, borderRadius: 26,
            justifyContent: 'center', alignItems: 'center', elevation: 4 }}>
          <Feather name="plus" size={24} color="#d1ccbd" />
        </Pressable>
      </View>

      {modalFaixa && (
        <FaixaModal
          faixa={modalFaixa}
          produtos={produtos}
          onSalvar={salvarFaixa}
          onCancelar={() => setModalFaixa(null)}
        />
      )}
    </>
  );
}

function PesoChip({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <View style={{ backgroundColor: cor + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: cor + '44' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: cor }}>{label}</Text>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: cor }}>{valor.toFixed(3)} kg</Text>
    </View>
  );
}

// ─── Modal Faixa ─────────────────────────────────────────────────────────────

interface FaixaModalProps {
  faixa: FaixaPeso;
  produtos: ProdutoItem[];
  onSalvar: (f: FaixaPeso) => Promise<void>;
  onCancelar: () => void;
}

function FaixaModal({ faixa, produtos, onSalvar, onCancelar }: FaixaModalProps) {
  const [idProduto, setIdProduto]   = useState(faixa.idProduto);
  const [pesoAlvo, setPesoAlvo]     = useState(faixa.pesoAlvo ? String(faixa.pesoAlvo) : '');
  const [verdeMin, setVerdeMin]     = useState(faixa.verdeMin  ? String(faixa.verdeMin) : '');
  const [verdeMax, setVerdeMax]     = useState(faixa.verdeMax  ? String(faixa.verdeMax) : '');
  const [amarelaMin, setAmarelaMin] = useState(faixa.amarelaMin ? String(faixa.amarelaMin) : '');
  const [amarelaMax, setAmarelaMax] = useState(faixa.amarelaMax ? String(faixa.amarelaMax) : '');
  const [saving, setSaving]         = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [pickerAberto, setPickerAberto] = useState(idProduto === 0);

  const produtoSelecionado = produtos.find(p => p.idProduto === idProduto);
  const produtosFiltrados  = produtos.filter(p => {
    const q = buscaProduto.toLowerCase();
    return !q || p.cdProduto.toLowerCase().includes(q) || p.dsProduto.toLowerCase().includes(q);
  });

  function validar(): string | null {
    if (!idProduto) return 'Selecione um produto.';
    const n = (s: string) => parseFloat(s.replace(',', '.'));
    const alvo = n(pesoAlvo), vMin = n(verdeMin), vMax = n(verdeMax), aMin = n(amarelaMin), aMax = n(amarelaMax);
    if ([alvo, vMin, vMax, aMin, aMax].some(v => isNaN(v) || v <= 0))
      return 'Todos os pesos devem ser maiores que zero.';
    if (aMin > vMin) return 'Amarela Mín deve ser ≤ Verde Mín.';
    if (vMin > vMax) return 'Verde Mín deve ser ≤ Verde Máx.';
    if (vMax > aMax) return 'Verde Máx deve ser ≤ Amarela Máx.';
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setSaving(true);
    const n = (s: string) => parseFloat(s.replace(',', '.'));
    await onSalvar({ id: faixa.id, idProduto, pesoAlvo: n(pesoAlvo),
      verdeMin: n(verdeMin), verdeMax: n(verdeMax),
      amarelaMin: n(amarelaMin), amarelaMax: n(amarelaMax) });
    setSaving(false);
  }

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 14, maxHeight: '90%', overflow: 'hidden' }}>
          {/* Cabeçalho */}
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: '#ddd8cc',
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029' }}>
              {faixa.id === 0 ? 'Nova Faixa de Peso' : 'Editar Faixa de Peso'}
            </Text>
            <Pressable onPress={onCancelar} hitSlop={8}>
              <Feather name="x" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Produto */}
            <View>
              <Text style={fLabel}>Produto</Text>
              {!pickerAberto ? (
                <Pressable onPress={() => setPickerAberto(true)}
                  style={{ ...fInput as any, flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 11 }}>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#163029', flex: 1 }}>
                    {produtoSelecionado
                      ? `${produtoSelecionado.cdProduto} — ${produtoSelecionado.dsProduto}`
                      : 'Selecionar produto...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#6b7280" />
                </Pressable>
              ) : (
                <View style={{ borderWidth: 1, borderColor: '#b8b4a6', borderRadius: 8, overflow: 'hidden' }}>
                  <TextInput
                    value={buscaProduto}
                    onChangeText={setBuscaProduto}
                    placeholder="Buscar por código ou descrição..."
                    placeholderTextColor="#9ca3af"
                    style={{ ...fInput as any, borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderColor: '#b8b4a6' }}
                    autoFocus
                  />
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled keyboardShouldPersistTaps="always">
                    {produtosFiltrados.length === 0 ? (
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#9ca3af',
                        padding: 12, textAlign: 'center' }}>
                        Nenhum produto encontrado
                      </Text>
                    ) : produtosFiltrados.map(p => (
                      <Pressable key={p.idProduto} onPress={() => {
                          setIdProduto(p.idProduto);
                          setPickerAberto(false);
                          setBuscaProduto('');
                        }}
                        style={({ pressed }) => ({
                          paddingVertical: 10, paddingHorizontal: 12,
                          backgroundColor: pressed ? '#e0dbd0' : (p.idProduto === idProduto ? '#d1ccbd' : '#f0ead6'),
                          borderBottomWidth: 1, borderColor: '#e0dbd0',
                        })}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                          {p.cdProduto}
                        </Text>
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44' }}>
                          {p.dsProduto}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Peso Alvo */}
            <View>
              <Text style={fLabel}>Peso Alvo (kg)</Text>
              <TextInput value={pesoAlvo} onChangeText={setPesoAlvo}
                placeholder="Ex: 0.500" placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad" style={fInput} />
            </View>

            {/* Faixa Verde */}
            <View>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#22c55e', marginBottom: 8 }}>
                Faixa Verde (kg)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fLabel}>Mínimo</Text>
                  <TextInput value={verdeMin} onChangeText={setVerdeMin}
                    placeholder="Ex: 0.470" placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad" style={fInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fLabel}>Máximo</Text>
                  <TextInput value={verdeMax} onChangeText={setVerdeMax}
                    placeholder="Ex: 0.530" placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad" style={fInput} />
                </View>
              </View>
            </View>

            {/* Faixa Amarela */}
            <View>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#f59e0b', marginBottom: 8 }}>
                Faixa Amarela (kg)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fLabel}>Mínimo</Text>
                  <TextInput value={amarelaMin} onChangeText={setAmarelaMin}
                    placeholder="Ex: 0.440" placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad" style={fInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fLabel}>Máximo</Text>
                  <TextInput value={amarelaMax} onChangeText={setAmarelaMax}
                    placeholder="Ex: 0.560" placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad" style={fInput} />
                </View>
              </View>
            </View>

            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
              Ordem: Amarela Mín ≤ Verde Mín ≤ Alvo ≤ Verde Máx ≤ Amarela Máx
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={onCancelar} disabled={saving}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
                  borderWidth: 1, borderColor: '#163029', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvar} disabled={saving}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
                  backgroundColor: saving ? '#9ca3af' : '#163029',
                  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                {saving
                  ? <ActivityIndicator color="#d1ccbd" size="small" />
                  : <Feather name="check" size={16} color="#d1ccbd" />}
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#d1ccbd' }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Aba Geral ────────────────────────────────────────────────────────────────

function GeralTab() {
  const [config, setConfig]           = useState<ConfigAtual | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [syncingPull, setSyncingPull] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);

  // Form state (tudo string para facilitar inputs)
  const [pullModo, setPullModo]             = useState<'horarios' | 'intervalo'>('horarios');
  const [pullHorarios, setPullHorarios]     = useState('07:00');
  const [pullIntervalo, setPullIntervalo]   = useState('0');
  const [pushModo, setPushModo]             = useState<'horarios' | 'intervalo'>('horarios');
  const [pushHorarios, setPushHorarios]     = useState('12:00,19:00');
  const [pushIntervalo, setPushIntervalo]   = useState('0');
  const [compAtiva, setCompAtiva]           = useState(true);
  const [compModo, setCompModo]             = useState('todos');
  const [retryDelay, setRetryDelay]         = useState('30');
  const [retryMax, setRetryMax]             = useState('3');
  const [retentEnabled, setRetentEnabled]   = useState(true);
  const [retentDays, setRetentDays]         = useState('30');

  const carregarConfig = useCallback(async () => {
    try {
      const c = await ti400Service.getConfig();
      setConfig(c);
      preencherForm(c);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar configurações', text2: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregarConfig(); }, [carregarConfig]);

  function preencherForm(c: ConfigAtual) {
    const formatarTimes = (times: string[]) =>
      times.map(t => t.substring(0, 5)).join(', ');

    if (c.syncPullIntervalHoras > 0) {
      setPullModo('intervalo');
      setPullIntervalo(String(c.syncPullIntervalHoras));
    } else {
      setPullModo('horarios');
      setPullHorarios(formatarTimes(c.syncPullTimes));
    }

    if (c.syncPushIntervalHoras > 0) {
      setPushModo('intervalo');
      setPushIntervalo(String(c.syncPushIntervalHoras));
    } else {
      setPushModo('horarios');
      setPushHorarios(formatarTimes(c.syncPushTimes));
    }

    setCompAtiva(c.comparacaoAtiva);
    setCompModo(c.comparacaoModoImpressao);
    setRetryDelay(String(c.retryDelaySeconds));
    setRetryMax(String(c.retryMaxAttempts));
    setRetentEnabled(c.retentionEnabled);
    setRetentDays(String(c.retentionDays));
  }

  async function salvar() {
    const entries: ConfigEntry[] = [];

    if (pullModo === 'horarios') {
      entries.push({ chave: 'Sync.PullTimes',         valor: pullHorarios.replace(/\s/g, '') });
      entries.push({ chave: 'Sync.PullIntervalHoras', valor: '0' });
    } else {
      entries.push({ chave: 'Sync.PullIntervalHoras', valor: pullIntervalo });
    }

    if (pushModo === 'horarios') {
      entries.push({ chave: 'Sync.PushTimes',         valor: pushHorarios.replace(/\s/g, '') });
      entries.push({ chave: 'Sync.PushIntervalHoras', valor: '0' });
    } else {
      entries.push({ chave: 'Sync.PushIntervalHoras', valor: pushIntervalo });
    }

    entries.push({ chave: 'Comparacao.Ativa',          valor: compAtiva ? 'true' : 'false' });
    entries.push({ chave: 'Comparacao.ModoImpressao',  valor: compModo });
    entries.push({ chave: 'Retry.DelaySeconds',        valor: retryDelay });
    entries.push({ chave: 'Retry.MaxAttempts',         valor: retryMax });
    entries.push({ chave: 'Retention.Enabled',         valor: retentEnabled ? 'true' : 'false' });
    entries.push({ chave: 'Retention.Days',            valor: retentDays });

    setSaving(true);
    try {
      const atualizado = await ti400Service.updateConfig(entries);
      setConfig(atualizado);
      preencherForm(atualizado);
      Toast.show({ type: 'success', text1: 'Configurações salvas' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar', text2: err.response?.data?.error ?? err.message });
    } finally { setSaving(false); }
  }

  async function forcePull() {
    setSyncingPull(true);
    try {
      await ti400Service.syncPull();
      const atualizado = await ti400Service.getConfig();
      setConfig(atualizado);
      preencherForm(atualizado);
      Toast.show({ type: 'success', text1: 'Pull concluído', text2: 'Dados sincronizados do remoto' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Pull falhou', text2: err.message });
    } finally { setSyncingPull(false); }
  }

  async function forcePush() {
    setSyncingPush(true);
    try {
      await ti400Service.syncPush();
      Toast.show({ type: 'success', text1: 'Push concluído', text2: 'Dados enviados ao remoto' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Push falhou', text2: err.message });
    } finally { setSyncingPush(false); }
  }

  if (loading) return <CenterLoader />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled">

      {/* Sincronização Pull */}
      <Section titulo="Sincronização — Pull (remoto → local)"
        descricao="Quando importar impressoras, linhas, OPs e operadores do ERP">
        <ModoSyncRow
          modo={pullModo} onModo={setPullModo}
          horarios={pullHorarios} onHorarios={setPullHorarios}
          intervalo={pullIntervalo} onIntervalo={setPullIntervalo}
        />
      </Section>

      {/* Sincronização Push */}
      <Section titulo="Sincronização — Push (local → remoto)"
        descricao="Quando enviar sessões e pesagens ao ERP">
        <ModoSyncRow
          modo={pushModo} onModo={setPushModo}
          horarios={pushHorarios} onHorarios={setPushHorarios}
          intervalo={pushIntervalo} onIntervalo={setPushIntervalo}
        />
      </Section>

      {/* Comparação */}
      <Section titulo="Comparação de Peso">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={fLabel}>Comparação ativa</Text>
          <Switch value={compAtiva} onValueChange={setCompAtiva}
            trackColor={{ false: '#9ca3af', true: '#163029' }} thumbColor="#fff" />
        </View>
        <Text style={fLabel}>Modo de impressão</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { id: 'todos',          label: 'Todos' },
            { id: 'aprovados',      label: 'Só Verde' },
            { id: 'nao_reprovados', label: 'Verde + Amarela' },
          ].map(opt => (
            <TouchableOpacity key={opt.id} onPress={() => setCompModo(opt.id)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                backgroundColor: compModo === opt.id ? '#163029' : '#d1ccbd',
                borderWidth: 1, borderColor: compModo === opt.id ? '#163029' : '#b8b4a6' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
                color: compModo === opt.id ? '#d1ccbd' : '#163029' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Retry */}
      <Section titulo="Retry de Sessão com Erro">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={fLabel}>Delay (segundos)</Text>
            <TextInput value={retryDelay} onChangeText={setRetryDelay}
              keyboardType="numeric" style={fInput} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fLabel}>Máx. tentativas</Text>
            <TextInput value={retryMax} onChangeText={setRetryMax}
              keyboardType="numeric" style={fInput} />
          </View>
        </View>
      </Section>

      {/* Retenção */}
      <Section titulo="Retenção de Arquivos">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={fLabel}>Limpeza automática habilitada</Text>
          <Switch value={retentEnabled} onValueChange={setRetentEnabled}
            trackColor={{ false: '#9ca3af', true: '#163029' }} thumbColor="#fff" />
        </View>
        {retentEnabled && (
          <View>
            <Text style={fLabel}>Dias de retenção</Text>
            <TextInput value={retentDays} onChangeText={setRetentDays}
              keyboardType="numeric" style={[fInput, { width: 100 }]} />
          </View>
        )}
      </Section>

      {/* Botão Salvar */}
      <Pressable onPress={salvar} disabled={saving}
        style={{ backgroundColor: saving ? '#9ca3af' : '#163029', borderRadius: 10,
          paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        {saving
          ? <ActivityIndicator color="#d1ccbd" size="small" />
          : <Feather name="save" size={18} color="#d1ccbd" />}
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#d1ccbd' }}>
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Text>
      </Pressable>

      {/* Sync manual */}
      <Section titulo="Sincronização Manual"
        descricao="Força a sincronização imediatamente, fora do horário agendado">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={forcePull} disabled={syncingPull || syncingPush}
            style={{ flex: 1, backgroundColor: (syncingPull || syncingPush) ? '#9ca3af' : '#2F4B44',
              borderRadius: 8, paddingVertical: 12,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            {syncingPull
              ? <ActivityIndicator color="#d1ccbd" size="small" />
              : <Feather name="download-cloud" size={16} color="#d1ccbd" />}
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
              {syncingPull ? 'Executando...' : 'Forçar Pull'}
            </Text>
          </Pressable>
          <Pressable onPress={forcePush} disabled={syncingPull || syncingPush}
            style={{ flex: 1, backgroundColor: (syncingPull || syncingPush) ? '#9ca3af' : '#2F4B44',
              borderRadius: 8, paddingVertical: 12,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            {syncingPush
              ? <ActivityIndicator color="#d1ccbd" size="small" />
              : <Feather name="upload-cloud" size={16} color="#d1ccbd" />}
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
              {syncingPush ? 'Executando...' : 'Forçar Push'}
            </Text>
          </Pressable>
        </View>
        {config && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#e8e3d8', borderRadius: 8, gap: 2 }}>
            <ConfigInfoRow label="Pull" valor={
              config.syncPullIntervalHoras > 0
                ? `a cada ${config.syncPullIntervalHoras}h`
                : config.syncPullTimes.map(t => t.substring(0, 5)).join(', ')
            } />
            <ConfigInfoRow label="Push" valor={
              config.syncPushIntervalHoras > 0
                ? `a cada ${config.syncPushIntervalHoras}h`
                : config.syncPushTimes.map(t => t.substring(0, 5)).join(', ')
            } />
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

function ModoSyncRow({ modo, onModo, horarios, onHorarios, intervalo, onIntervalo }: {
  modo: 'horarios' | 'intervalo';
  onModo: (m: 'horarios' | 'intervalo') => void;
  horarios: string; onHorarios: (v: string) => void;
  intervalo: string; onIntervalo: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          { id: 'horarios', label: 'Horários fixos' },
          { id: 'intervalo', label: 'Intervalo (horas)' },
        ] as { id: 'horarios' | 'intervalo'; label: string }[]).map(opt => (
          <TouchableOpacity key={opt.id} onPress={() => onModo(opt.id)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
              backgroundColor: modo === opt.id ? '#163029' : '#d1ccbd',
              borderWidth: 1, borderColor: modo === opt.id ? '#163029' : '#b8b4a6' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
              color: modo === opt.id ? '#d1ccbd' : '#163029' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {modo === 'horarios' ? (
        <View>
          <Text style={fLabel}>Horários (HH:mm separados por vírgula)</Text>
          <TextInput value={horarios} onChangeText={onHorarios}
            placeholder="Ex: 07:00, 14:00" placeholderTextColor="#9ca3af" style={fInput} />
        </View>
      ) : (
        <View>
          <Text style={fLabel}>A cada N horas (1–24)</Text>
          <TextInput value={intervalo} onChangeText={onIntervalo}
            keyboardType="numeric" style={[fInput, { width: 80 }]} />
        </View>
      )}
    </View>
  );
}

function Section({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#f0ead6', borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: '#ddd8cc', gap: 12 }}>
      <View>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>{titulo}</Text>
        {descricao && (
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {descricao}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

function ConfigInfoRow({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11, color: '#2F4B44', width: 36 }}>{label}:</Text>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#163029', flex: 1 }}>{valor}</Text>
    </View>
  );
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function CenterLoader() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#163029" />
    </View>
  );
}

const fLabel = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 13, color: '#163029', marginBottom: 6,
};

const fInput = {
  backgroundColor: '#d1ccbd', borderRadius: 8,
  paddingVertical: 10, paddingHorizontal: 12,
  fontSize: 14, fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029', borderWidth: 1, borderColor: '#b8b4a6',
};
