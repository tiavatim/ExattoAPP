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
  Impressora,
  LinhaCadastro,
  ProdutoItem,
} from '@/interfaces/ti400Interface';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ConfigTab = 'linhas' | 'impressoras' | 'geral';

const GUID_VAZIO = '00000000-0000-0000-0000-000000000000';
const COR_FAIXA_VERDE = '#166534';
const COR_FAIXA_AMARELA = '#facc15';
const COR_FUNDO_FAIXA_AMARELA = '#fff7cc';
const COR_TEXTO_FAIXA_AMARELA = '#3a2a00';
const COR_BORDA_FAIXA_AMARELA = '#eab308';

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function ConfiguracoesView({ onBack }: Props) {
  const [tab, setTab] = useState<ConfigTab>('linhas');

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
            { id: 'linhas',      label: 'Linhas' },
            { id: 'impressoras', label: 'Impressoras' },
            { id: 'geral',       label: 'Geral' },
          ] as { id: ConfigTab; label: string }[]).map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
                backgroundColor: tab === t.id ? '#163029' : 'transparent' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12,
                color: tab === t.id ? '#d1ccbd' : '#2F4B44' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'linhas'      && <LinhasTab />}
      {tab === 'impressoras' && <ImpressorasTab />}
      {tab === 'geral'       && <GeralTab />}
    </View>
  );
}

// ─── Aba Linhas ───────────────────────────────────────────────────────────────

function LinhasTab() {
  const [linhas, setLinhas]           = useState<LinhaCadastro[]>([]);
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalLinha, setModalLinha]   = useState<LinhaCadastro | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [l, i] = await Promise.all([
        ti400Service.getLinhasCadastro(),
        ti400Service.getImpressoras(),
      ]);
      setLinhas(l);
      setImpressoras(i);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar linhas', text2: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function confirmarDesativar(linha: LinhaCadastro) {
    Alert.alert(
      'Desativar linha',
      `Desativar a linha "${linha.nome}"? Ela deixará de aparecer no painel e não aceitará novas sessões.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: async () => {
          try {
            await ti400Service.desativarLinha(linha.id);
            setLinhas(prev => prev.map(l => l.id === linha.id ? { ...l, ativa: false } : l));
            Toast.show({ type: 'success', text1: 'Linha desativada' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao desativar', text2: err.response?.data?.error ?? err.message });
          }
        }},
      ],
    );
  }

  async function salvarLinha(linha: LinhaCadastro) {
    try {
      const salva = await ti400Service.upsertLinha(linha);
      setLinhas(prev => {
        const idx = prev.findIndex(l => l.id === salva.id);
        return idx >= 0 ? prev.map((l, i) => i === idx ? salva : l) : [...prev, salva];
      });
      setModalLinha(null);
      Toast.show({ type: 'success', text1: linha.id === GUID_VAZIO ? 'Linha criada' : 'Linha atualizada' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar', text2: err.response?.data?.error ?? err.message });
    }
  }

  if (loading) return <CenterLoader />;

  return (
    <>
      <FlatList
        data={linhas}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Feather name="activity" size={36} color="#9ca3af" />
            <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
              Nenhuma linha cadastrada
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#f0ead6', borderRadius: 10, padding: 14,
            borderWidth: 1, borderColor: '#ddd8cc', opacity: item.ativa ? 1 : 0.55 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                  {item.nome}
                </Text>
                {!item.ativa && <StatusBadge label="Inativa" cor="#ef4444" />}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setModalLinha(item)} hitSlop={8}>
                  <Feather name="edit-2" size={17} color="#2F4B44" />
                </Pressable>
                {item.ativa && (
                  <Pressable onPress={() => confirmarDesativar(item)} hitSlop={8}>
                    <Feather name="slash" size={17} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            </View>
            <InfoLinha icone="wifi" texto={`${item.ip}:${item.porta}`} />
            <InfoLinha icone="printer" texto={item.impressoraNome ?? 'Sem impressora vinculada'} />
            <InfoLinha icone="clock" texto={`Timeouts: conexão ${item.timeoutConnMs} ms · leitura ${item.timeoutReadMs} ms`} />
          </View>
        )}
      />

      <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <Pressable
          onPress={() => setModalLinha({ id: GUID_VAZIO, nome: '', ip: '', porta: 9000,
            timeoutConnMs: 3000, timeoutReadMs: 5000, idImpressora: null, impressoraNome: null, ativa: true })}
          style={{ backgroundColor: '#163029', width: 52, height: 52, borderRadius: 26,
            justifyContent: 'center', alignItems: 'center', elevation: 4 }}>
          <Feather name="plus" size={24} color="#d1ccbd" />
        </Pressable>
      </View>

      {modalLinha && (
        <LinhaModal
          linha={modalLinha}
          impressoras={impressoras.filter(i => i.ativa || i.id === modalLinha.idImpressora)}
          onSalvar={salvarLinha}
          onCancelar={() => setModalLinha(null)}
        />
      )}
    </>
  );
}

function StatusBadge({ label, cor }: { label: string; cor: string }) {
  return (
    <View style={{ backgroundColor: cor + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
      borderWidth: 1, borderColor: cor + '44' }}>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 10, color: cor }}>{label}</Text>
    </View>
  );
}

function InfoLinha({ icone, texto }: { icone: any; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <Feather name={icone} size={12} color="#6b7280" />
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44' }}>{texto}</Text>
    </View>
  );
}

// ─── Modal Linha ─────────────────────────────────────────────────────────────

interface LinhaModalProps {
  linha: LinhaCadastro;
  impressoras: Impressora[];
  onSalvar: (l: LinhaCadastro) => Promise<void>;
  onCancelar: () => void;
}

function LinhaModal({ linha, impressoras, onSalvar, onCancelar }: LinhaModalProps) {
  const [nome, setNome]                   = useState(linha.nome);
  const [ip, setIp]                       = useState(linha.ip);
  const [porta, setPorta]                 = useState(String(linha.porta));
  const [timeoutConn, setTimeoutConn]     = useState(String(linha.timeoutConnMs));
  const [timeoutRead, setTimeoutRead]     = useState(String(linha.timeoutReadMs));
  const [idImpressora, setIdImpressora]   = useState<string | null>(linha.idImpressora);
  const [ativa, setAtiva]                 = useState(linha.ativa);
  const [saving, setSaving]               = useState(false);
  const [pickerAberto, setPickerAberto]   = useState(false);

  const impressoraSelecionada = impressoras.find(i => i.id === idImpressora);

  function validar(): string | null {
    if (!nome.trim()) return 'Nome é obrigatório.';
    if (!ip.trim()) return 'IP é obrigatório.';
    const p = parseInt(porta, 10);
    if (isNaN(p) || p < 1 || p > 65535) return 'Porta deve estar entre 1 e 65535.';
    const tc = parseInt(timeoutConn, 10), tr = parseInt(timeoutRead, 10);
    if (isNaN(tc) || tc <= 0 || isNaN(tr) || tr <= 0) return 'Timeouts devem ser maiores que zero.';
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setSaving(true);
    await onSalvar({
      id: linha.id, nome: nome.trim(), ip: ip.trim(),
      porta: parseInt(porta, 10),
      timeoutConnMs: parseInt(timeoutConn, 10),
      timeoutReadMs: parseInt(timeoutRead, 10),
      idImpressora, impressoraNome: null, ativa,
    });
    setSaving(false);
  }

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 14, maxHeight: '90%', overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: '#ddd8cc',
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029' }}>
              {linha.id === GUID_VAZIO ? 'Nova Linha' : 'Editar Linha'}
            </Text>
            <Pressable onPress={onCancelar} hitSlop={8}>
              <Feather name="x" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={fLabel}>Nome</Text>
              <TextInput value={nome} onChangeText={setNome}
                placeholder="Ex: Linha 01" placeholderTextColor="#9ca3af" style={fInput} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={fLabel}>IP do terminal</Text>
                <TextInput value={ip} onChangeText={setIp}
                  placeholder="Ex: 192.168.0.50" placeholderTextColor="#9ca3af"
                  keyboardType="numbers-and-punctuation" autoCapitalize="none" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Porta</Text>
                <TextInput value={porta} onChangeText={setPorta}
                  keyboardType="numeric" style={fInput} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Timeout conexão (ms)</Text>
                <TextInput value={timeoutConn} onChangeText={setTimeoutConn}
                  keyboardType="numeric" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Timeout leitura (ms)</Text>
                <TextInput value={timeoutRead} onChangeText={setTimeoutRead}
                  keyboardType="numeric" style={fInput} />
              </View>
            </View>

            <View>
              <Text style={fLabel}>Impressora</Text>
              {!pickerAberto ? (
                <Pressable onPress={() => setPickerAberto(true)}
                  style={{ ...fInput as any, flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 11 }}>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#163029', flex: 1 }}>
                    {impressoraSelecionada ? impressoraSelecionada.nome : 'Sem impressora'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#6b7280" />
                </Pressable>
              ) : (
                <View style={{ borderWidth: 1, borderColor: '#b8b4a6', borderRadius: 8, overflow: 'hidden' }}>
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled keyboardShouldPersistTaps="always">
                    <Pressable onPress={() => { setIdImpressora(null); setPickerAberto(false); }}
                      style={({ pressed }) => ({
                        paddingVertical: 10, paddingHorizontal: 12,
                        backgroundColor: pressed ? '#e0dbd0' : (idImpressora === null ? '#d1ccbd' : '#f0ead6'),
                        borderBottomWidth: 1, borderColor: '#e0dbd0',
                      })}>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#6b7280' }}>
                        Sem impressora
                      </Text>
                    </Pressable>
                    {impressoras.map(i => (
                      <Pressable key={i.id} onPress={() => { setIdImpressora(i.id); setPickerAberto(false); }}
                        style={({ pressed }) => ({
                          paddingVertical: 10, paddingHorizontal: 12,
                          backgroundColor: pressed ? '#e0dbd0' : (i.id === idImpressora ? '#d1ccbd' : '#f0ead6'),
                          borderBottomWidth: 1, borderColor: '#e0dbd0',
                        })}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                          {i.nome}
                        </Text>
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44' }}>
                          {i.ip}:{i.porta} · {i.linguagem}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={fLabel}>Linha ativa</Text>
              <Switch value={ativa} onValueChange={setAtiva}
                trackColor={{ false: '#9ca3af', true: '#163029' }} thumbColor="#fff" />
            </View>

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

// ─── Aba Impressoras ──────────────────────────────────────────────────────────

const LINGUAGENS = ['PPLB', 'PPLA', 'ZPL', 'EPL', 'TSPL'];

function ImpressorasTab() {
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalImp, setModalImp]       = useState<Impressora | null>(null);
  const [testandoId, setTestandoId]   = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setImpressoras(await ti400Service.getImpressoras());
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar impressoras', text2: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function confirmarDesativar(imp: Impressora) {
    Alert.alert(
      'Desativar impressora',
      `Desativar a impressora "${imp.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: async () => {
          try {
            await ti400Service.desativarImpressora(imp.id);
            setImpressoras(prev => prev.map(i => i.id === imp.id ? { ...i, ativa: false } : i));
            Toast.show({ type: 'success', text1: 'Impressora desativada' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao desativar', text2: err.response?.data?.error ?? err.message });
          }
        }},
      ],
    );
  }

  async function testarImpressao(imp: Impressora) {
    if (testandoId) return;
    setTestandoId(imp.id);
    try {
      const destino = await ti400Service.imprimirEtiquetaTeste(imp);
      Toast.show({ type: 'success', text1: 'Etiqueta de teste enviada', text2: `Enviada para ${destino}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro no teste de impressão', text2: err.response?.data?.error ?? err.message });
    } finally {
      setTestandoId(null);
    }
  }

  async function salvarImpressora(imp: Impressora) {
    try {
      const salva = await ti400Service.upsertImpressora(imp);
      setImpressoras(prev => {
        const idx = prev.findIndex(i => i.id === salva.id);
        return idx >= 0 ? prev.map((i, x) => x === idx ? salva : i) : [...prev, salva];
      });
      setModalImp(null);
      Toast.show({ type: 'success', text1: imp.id === GUID_VAZIO ? 'Impressora criada' : 'Impressora atualizada' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar', text2: err.response?.data?.error ?? err.message });
    }
  }

  if (loading) return <CenterLoader />;

  return (
    <>
      <FlatList
        data={impressoras}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Feather name="printer" size={36} color="#9ca3af" />
            <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#6b7280', marginTop: 8 }}>
              Nenhuma impressora cadastrada
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#f0ead6', borderRadius: 10, padding: 14,
            borderWidth: 1, borderColor: '#ddd8cc', opacity: item.ativa ? 1 : 0.55 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                  {item.nome}
                </Text>
                {!item.ativa && <StatusBadge label="Inativa" cor="#ef4444" />}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {item.ativa && (
                  <Pressable onPress={() => testarImpressao(item)} hitSlop={8} disabled={testandoId !== null}>
                    {testandoId === item.id
                      ? <ActivityIndicator size="small" color="#2F4B44" />
                      : <Feather name="printer" size={17} color="#2F4B44" />}
                  </Pressable>
                )}
                <Pressable onPress={() => setModalImp(item)} hitSlop={8}>
                  <Feather name="edit-2" size={17} color="#2F4B44" />
                </Pressable>
                {item.ativa && (
                  <Pressable onPress={() => confirmarDesativar(item)} hitSlop={8}>
                    <Feather name="slash" size={17} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            </View>
            <InfoLinha icone="wifi" texto={`${item.ip}:${item.porta}`} />
            <InfoLinha icone="code" texto={`${item.linguagem} · ${item.codePage} · ${item.dpi} dpi`} />
            <InfoLinha icone="maximize-2" texto={`Etiqueta ${item.larguraMm} × ${item.alturaMm} mm`} />
            {item.descricao ? <InfoLinha icone="info" texto={item.descricao} /> : null}
          </View>
        )}
      />

      <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <Pressable
          onPress={() => setModalImp({ id: GUID_VAZIO, nome: '', ip: '', porta: 9100,
            linguagem: 'PPLB', codePage: 'WINDOWS-1252', dpi: 203,
            larguraMm: 101.6, alturaMm: 127, descricao: null, ativa: true })}
          style={{ backgroundColor: '#163029', width: 52, height: 52, borderRadius: 26,
            justifyContent: 'center', alignItems: 'center', elevation: 4 }}>
          <Feather name="plus" size={24} color="#d1ccbd" />
        </Pressable>
      </View>

      {modalImp && (
        <ImpressoraModal
          impressora={modalImp}
          onSalvar={salvarImpressora}
          onCancelar={() => setModalImp(null)}
        />
      )}
    </>
  );
}

// ─── Modal Impressora ────────────────────────────────────────────────────────

interface ImpressoraModalProps {
  impressora: Impressora;
  onSalvar: (i: Impressora) => Promise<void>;
  onCancelar: () => void;
}

function ImpressoraModal({ impressora, onSalvar, onCancelar }: ImpressoraModalProps) {
  const [nome, setNome]           = useState(impressora.nome);
  const [ip, setIp]               = useState(impressora.ip);
  const [porta, setPorta]         = useState(String(impressora.porta));
  const [linguagem, setLinguagem] = useState(impressora.linguagem);
  const [codePage, setCodePage]   = useState(impressora.codePage);
  const [dpi, setDpi]             = useState(String(impressora.dpi));
  const [larguraMm, setLarguraMm] = useState(String(impressora.larguraMm));
  const [alturaMm, setAlturaMm]   = useState(String(impressora.alturaMm));
  const [descricao, setDescricao] = useState(impressora.descricao ?? '');
  const [ativa, setAtiva]         = useState(impressora.ativa);
  const [saving, setSaving]       = useState(false);

  function validar(): string | null {
    if (!nome.trim()) return 'Nome é obrigatório.';
    if (!ip.trim()) return 'IP é obrigatório.';
    const p = parseInt(porta, 10);
    if (isNaN(p) || p < 1 || p > 65535) return 'Porta deve estar entre 1 e 65535.';
    if (!codePage.trim()) return 'CodePage é obrigatório.';
    const d = parseInt(dpi, 10);
    if (isNaN(d) || d <= 0) return 'DPI deve ser maior que zero.';
    const n = (s: string) => parseFloat(s.replace(',', '.'));
    if ([n(larguraMm), n(alturaMm)].some(v => isNaN(v) || v <= 0))
      return 'Largura e altura devem ser maiores que zero.';
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setSaving(true);
    const n = (s: string) => parseFloat(s.replace(',', '.'));
    await onSalvar({
      id: impressora.id, nome: nome.trim(), ip: ip.trim(),
      porta: parseInt(porta, 10), linguagem, codePage: codePage.trim().toUpperCase(),
      dpi: parseInt(dpi, 10), larguraMm: n(larguraMm), alturaMm: n(alturaMm),
      descricao: descricao.trim() || null, ativa,
    });
    setSaving(false);
  }

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 14, maxHeight: '90%', overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: '#ddd8cc',
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029' }}>
              {impressora.id === GUID_VAZIO ? 'Nova Impressora' : 'Editar Impressora'}
            </Text>
            <Pressable onPress={onCancelar} hitSlop={8}>
              <Feather name="x" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={fLabel}>Nome</Text>
              <TextInput value={nome} onChangeText={setNome}
                placeholder="Ex: Argox Linha 01" placeholderTextColor="#9ca3af" style={fInput} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={fLabel}>IP</Text>
                <TextInput value={ip} onChangeText={setIp}
                  placeholder="Ex: 192.168.0.60" placeholderTextColor="#9ca3af"
                  keyboardType="numbers-and-punctuation" autoCapitalize="none" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Porta</Text>
                <TextInput value={porta} onChangeText={setPorta}
                  keyboardType="numeric" style={fInput} />
              </View>
            </View>

            <View>
              <Text style={fLabel}>Linguagem</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {LINGUAGENS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setLinguagem(l)}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                      backgroundColor: linguagem === l ? '#163029' : '#d1ccbd',
                      borderWidth: 1, borderColor: linguagem === l ? '#163029' : '#b8b4a6' }}>
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 11,
                      color: linguagem === l ? '#d1ccbd' : '#163029' }}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={fLabel}>CodePage</Text>
                <TextInput value={codePage} onChangeText={setCodePage}
                  autoCapitalize="characters" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>DPI</Text>
                <TextInput value={dpi} onChangeText={setDpi}
                  keyboardType="numeric" style={fInput} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Largura (mm)</Text>
                <TextInput value={larguraMm} onChangeText={setLarguraMm}
                  keyboardType="decimal-pad" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Altura (mm)</Text>
                <TextInput value={alturaMm} onChangeText={setAlturaMm}
                  keyboardType="decimal-pad" style={fInput} />
              </View>
            </View>

            <View>
              <Text style={fLabel}>Descrição (opcional)</Text>
              <TextInput value={descricao} onChangeText={setDescricao}
                placeholder="Ex: Impressora da expedição" placeholderTextColor="#9ca3af" style={fInput} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={fLabel}>Impressora ativa</Text>
              <Switch value={ativa} onValueChange={setAtiva}
                trackColor={{ false: '#9ca3af', true: '#163029' }} thumbColor="#fff" />
            </View>

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

// ─── Aba Faixas de Peso ───────────────────────────────────────────────────────

export function FaixasTab() {
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
              <PesoChip
                label="Verde ↓"
                valor={item.verdeMin}
                cor={COR_TEXTO_FAIXA_AMARELA}
                fundoCor={COR_FAIXA_VERDE + '22'}
                bordaCor={COR_FAIXA_VERDE + '66'}
              />
              <PesoChip
                label="Verde ↑"
                valor={item.verdeMax}
                cor={COR_TEXTO_FAIXA_AMARELA}
                fundoCor={COR_FAIXA_VERDE + '22'}
                bordaCor={COR_FAIXA_VERDE + '66'}
              />
              <PesoChip
                label="Amar. ↓"
                valor={item.amarelaMin}
                cor={COR_TEXTO_FAIXA_AMARELA}
                fundoCor={COR_FUNDO_FAIXA_AMARELA}
                bordaCor={COR_BORDA_FAIXA_AMARELA}
              />
              <PesoChip
                label="Amar. ↑"
                valor={item.amarelaMax}
                cor={COR_TEXTO_FAIXA_AMARELA}
                fundoCor={COR_FUNDO_FAIXA_AMARELA}
                bordaCor={COR_BORDA_FAIXA_AMARELA}
              />
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

function PesoChip({ label, valor, cor, fundoCor, bordaCor }: {
  label: string;
  valor: number;
  cor: string;
  fundoCor?: string;
  bordaCor?: string;
}) {
  return (
    <View style={{ backgroundColor: fundoCor ?? cor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: bordaCor ?? cor + '66' }}>
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
  titulo?: string;
  produtoBloqueado?: boolean;
}

export function FaixaModal({ faixa, produtos, onSalvar, onCancelar, titulo, produtoBloqueado = false }: FaixaModalProps) {
  const [idProduto, setIdProduto]   = useState(faixa.idProduto);
  const [pesoAlvo, setPesoAlvo]     = useState(faixa.pesoAlvo ? String(faixa.pesoAlvo) : '');
  const [verdeMin, setVerdeMin]     = useState(faixa.verdeMin  ? String(faixa.verdeMin) : '');
  const [verdeMax, setVerdeMax]     = useState(faixa.verdeMax  ? String(faixa.verdeMax) : '');
  const [amarelaMin, setAmarelaMin] = useState(faixa.amarelaMin ? String(faixa.amarelaMin) : '');
  const [amarelaMax, setAmarelaMax] = useState(faixa.amarelaMax ? String(faixa.amarelaMax) : '');
  const [saving, setSaving]         = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [pickerAberto, setPickerAberto] = useState(idProduto === 0 && !produtoBloqueado);

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
              {titulo ?? (faixa.id === 0 ? 'Nova Faixa de Peso' : 'Editar Faixa de Peso')}
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
                <Pressable onPress={() => { if (!produtoBloqueado) setPickerAberto(true); }}
                  style={{ ...fInput as any, flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 11 }}>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#163029', flex: 1 }}>
                    {produtoSelecionado
                      ? `${produtoSelecionado.cdProduto} — ${produtoSelecionado.dsProduto}`
                      : 'Selecionar produto...'}
                  </Text>
                  {!produtoBloqueado && <Feather name="chevron-down" size={16} color="#6b7280" />}
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
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: COR_FAIXA_VERDE, marginBottom: 8 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COR_FAIXA_AMARELA,
                  borderWidth: 1, borderColor: COR_BORDA_FAIXA_AMARELA }} />
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                  Faixa Amarela (kg)
                </Text>
              </View>
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
