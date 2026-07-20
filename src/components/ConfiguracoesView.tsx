import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useUser } from '@/contexts/UserContext';
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

function horariosSyncValidos(valor: string) {
  const partes = valor.split(',').map(v => v.trim()).filter(Boolean);
  return partes.length > 0 && partes.every(v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

interface ConfirmacaoState {
  titulo: string;
  mensagem: string;
  confirmarTexto: string;
  destrutiva?: boolean;
  onConfirmar: () => void | Promise<void>;
}

function ConfirmacaoModal({ confirmacao, onCancelar }: {
  confirmacao: ConfirmacaoState | null;
  onCancelar: () => void;
}) {
  if (!confirmacao) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 440,
          backgroundColor: '#f0ead6', borderRadius: 14, padding: 20 }}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: '#163029', marginBottom: 8 }}>
            {confirmacao.titulo}
          </Text>
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, lineHeight: 20,
            color: '#2F4B44', marginBottom: 20 }}>
            {confirmacao.mensagem}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onCancelar} style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
              borderWidth: 1, borderColor: '#163029', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', color: '#163029' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={() => { const acao = confirmacao.onConfirmar; onCancelar(); void acao(); }}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
                backgroundColor: confirmacao.destrutiva ? '#b91c1c' : '#163029' }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', color: '#fff' }}>{confirmacao.confirmarTexto}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ConfiguracoesView({ onBack }: Props) {
  const { temAcesso } = useUser();
  const [tab, setTab] = useState<ConfigTab>('linhas');
  const podeLinhas = temAcesso('/balancas/configuracoes/linhas');
  const podeImpressoras = temAcesso('/balancas/configuracoes/impressoras');
  const podeGeral = temAcesso('/balancas/configuracoes/gerais')
    || temAcesso('/balancas/configuracoes/sincronizacao')
    || temAcesso('/balancas/configuracoes/impressao');
  const tabsPermitidas = ([
    { id: 'linhas', label: 'Linhas', permitido: podeLinhas },
    { id: 'impressoras', label: 'Impressoras', permitido: podeImpressoras },
    { id: 'geral', label: 'Geral', permitido: podeGeral },
  ] as { id: ConfigTab; label: string; permitido: boolean }[]).filter(t => t.permitido);

  useEffect(() => {
    if (tabsPermitidas.length > 0 && !tabsPermitidas.some(t => t.id === tab))
      setTab(tabsPermitidas[0].id);
  }, [tab, podeLinhas, podeImpressoras, podeGeral]);

  if (tabsPermitidas.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="lock" size={36} color="#6b7280" />
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029', marginTop: 12 }}>
          Acesso não autorizado
        </Text>
        <Pressable onPress={onBack} style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10,
          borderRadius: 8, backgroundColor: '#163029' }}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', color: '#fff' }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

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
          {tabsPermitidas.map((t) => (
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

      {tab === 'linhas' && podeLinhas && <LinhasTab />}
      {tab === 'impressoras' && podeImpressoras && <ImpressorasTab />}
      {tab === 'geral' && podeGeral && <GeralTab />}
    </View>
  );
}

// ─── Aba Linhas ───────────────────────────────────────────────────────────────

function LinhasTab() {
  const [linhas, setLinhas]           = useState<LinhaCadastro[]>([]);
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalLinha, setModalLinha]   = useState<LinhaCadastro | null>(null);
  const [desativandoId, setDesativandoId] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

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
    setConfirmacao({
      titulo: 'Desativar linha',
      mensagem: `Desativar a linha "${linha.nome}"? Ela deixará de aparecer no painel e não aceitará novas sessões.`,
      confirmarTexto: 'Desativar',
      destrutiva: true,
      onConfirmar: async () => {
          setDesativandoId(linha.id);
          try {
            await ti400Service.desativarLinha(linha.id);
            setLinhas(prev => prev.map(l => l.id === linha.id ? { ...l, ativa: false } : l));
            Toast.show({ type: 'success', text1: 'Linha desativada' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao desativar', text2: err.response?.data?.error ?? err.message });
          } finally { setDesativandoId(null); }
      },
    });
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
                  <Pressable onPress={() => confirmarDesativar(item)} hitSlop={8} disabled={desativandoId !== null}
                    accessibilityLabel={`Desativar linha ${item.nome}`}>
                    {desativandoId === item.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Feather name="slash" size={17} color="#ef4444" />}
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

  const impressoraSelecionada = impressoras.find(i => i.id === idImpressora);
  const alterado = nome.trim() !== linha.nome.trim()
    || ip.trim() !== linha.ip.trim()
    || porta !== String(linha.porta)
    || timeoutConn !== String(linha.timeoutConnMs)
    || timeoutRead !== String(linha.timeoutReadMs)
    || idImpressora !== linha.idImpressora
    || ativa !== linha.ativa;

  function validar(): string | null {
    if (!nome.trim()) return 'Nome é obrigatório.';
    if (!ip.trim()) return 'IP é obrigatório.';
    const p = parseInt(porta, 10);
    if (isNaN(p) || p < 1 || p > 65535) return 'Porta deve estar entre 1 e 65535.';
    const tc = parseInt(timeoutConn, 10), tr = parseInt(timeoutRead, 10);
    if (isNaN(tc) || tc <= 0 || isNaN(tr) || tr <= 0) return 'Timeouts devem ser maiores que zero.';
    return null;
  }

  async function executarSalvar() {
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

  function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setConfirmacao({
      titulo: linha.id === GUID_VAZIO ? 'Criar linha' : 'Salvar alterações',
      mensagem: linha.id === GUID_VAZIO ? `Confirma a criação da linha "${nome.trim()}"?` : `Confirma as alterações da linha "${linha.nome}"?`,
      confirmarTexto: 'Confirmar', onConfirmar: executarSalvar,
    });
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
              <Pressable onPress={salvar} disabled={saving || !alterado}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
                  backgroundColor: (saving || !alterado) ? '#9ca3af' : '#163029',
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
  const [desativandoId, setDesativandoId] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

  const carregar = useCallback(async () => {
    try {
      setImpressoras(await ti400Service.getImpressoras());
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar impressoras', text2: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function confirmarDesativar(imp: Impressora) {
    setConfirmacao({
      titulo: 'Desativar impressora',
      mensagem: `Desativar a impressora "${imp.nome}"?`,
      confirmarTexto: 'Desativar',
      destrutiva: true,
      onConfirmar: async () => {
          setDesativandoId(imp.id);
          try {
            await ti400Service.desativarImpressora(imp.id);
            setImpressoras(prev => prev.map(i => i.id === imp.id ? { ...i, ativa: false } : i));
            Toast.show({ type: 'success', text1: 'Impressora desativada' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao desativar', text2: err.response?.data?.error ?? err.message });
          } finally { setDesativandoId(null); }
      },
    });
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
                  <Pressable onPress={() => confirmarDesativar(item)} hitSlop={8} disabled={desativandoId !== null}
                    accessibilityLabel={`Desativar impressora ${item.nome}`}>
                    {desativandoId === item.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Feather name="slash" size={17} color="#ef4444" />}
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);
  const alterado = nome.trim() !== impressora.nome.trim()
    || ip.trim() !== impressora.ip.trim()
    || porta !== String(impressora.porta)
    || linguagem !== impressora.linguagem
    || codePage.trim().toUpperCase() !== impressora.codePage.trim().toUpperCase()
    || dpi !== String(impressora.dpi)
    || larguraMm.replace(',', '.') !== String(impressora.larguraMm)
    || alturaMm.replace(',', '.') !== String(impressora.alturaMm)
    || descricao.trim() !== (impressora.descricao ?? '').trim()
    || ativa !== impressora.ativa;

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

  async function executarSalvar() {
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

  function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setConfirmacao({
      titulo: impressora.id === GUID_VAZIO ? 'Criar impressora' : 'Salvar alterações',
      mensagem: impressora.id === GUID_VAZIO ? `Confirma a criação da impressora "${nome.trim()}"?` : `Confirma as alterações da impressora "${impressora.nome}"?`,
      confirmarTexto: 'Confirmar', onConfirmar: executarSalvar,
    });
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
              <Pressable onPress={salvar} disabled={saving || !alterado}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
                  backgroundColor: (saving || !alterado) ? '#9ca3af' : '#163029',
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
    </Modal>
  );
}

// ─── Aba Faixas de Peso ───────────────────────────────────────────────────────

export function FaixasTab() {
  const [faixas, setFaixas]     = useState<FaixaPeso[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalFaixa, setModalFaixa] = useState<FaixaPeso | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

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

  function nomeProduto(idProduto: number, faixa?: FaixaPeso) {
    const p = produtos.find(x => x.idProduto === idProduto);
    const nome = p?.dsProduto ?? faixa?.dsProduto;
    const codigo = p?.cdProduto ?? faixa?.cdProduto;
    return nome && codigo ? `${nome} · Código ${codigo}` : `Produto não localizado · ID ${idProduto}`;
  }

  function confirmarDelete(faixa: FaixaPeso) {
    setConfirmacao({
      titulo: 'Remover produto',
      mensagem: `Remover a configuração de peso de "${nomeProduto(faixa.idProduto, faixa)}"?`,
      confirmarTexto: 'Remover',
      destrutiva: true,
      onConfirmar: async () => {
          setExcluindoId(faixa.id);
          try {
            await ti400Service.deleteFaixa(faixa.id);
            setFaixas(prev => prev.filter(f => f.id !== faixa.id));
            Toast.show({ type: 'success', text1: 'Faixa removida' });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao remover', text2: err.message });
          } finally { setExcluindoId(null); }
      },
    });
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
      try { setProdutos(await ti400Service.getProdutos()); } catch { /* chip atualiza no próximo load */ }
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
        renderItem={({ item }) => {
          const produto = produtos.find(p => p.idProduto === item.idProduto);
          const qtdOp = produto?.qtdPorCaixaOp ?? 0;
          return (
            <View style={{ backgroundColor: '#f0ead6', borderRadius: 10, padding: 14,
              borderWidth: 1, borderColor: '#ddd8cc' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', flex: 1 }}>
                  {nomeProduto(item.idProduto, item)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={() => setModalFaixa(item)} hitSlop={8}>
                    <Feather name="edit-2" size={17} color="#2F4B44" />
                  </Pressable>
                  <Pressable onPress={() => confirmarDelete(item)} hitSlop={8} disabled={excluindoId !== null}>
                    {excluindoId === item.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Feather name="trash-2" size={17} color="#ef4444" />}
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
                <View style={{ backgroundColor: '#2F4B4418', borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 4,
                  borderWidth: 1, borderColor: '#2F4B4444' }}>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 10, color: '#2F4B44' }}>
                    Itens/caixa
                  </Text>
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#2F4B44' }}>
                    {qtdOp > 0 ? `${qtdOp} un` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
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
          produtoBloqueado={modalFaixa.id !== 0}
          onSalvar={salvarFaixa}
          onCancelar={() => setModalFaixa(null)}
        />
      )}
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
  qtdObrigatoria?: boolean;
}

export function FaixaModal({ faixa, produtos, onSalvar, onCancelar, titulo, produtoBloqueado = false, qtdObrigatoria = false }: FaixaModalProps) {
  const produtoInicial = produtos.find(p => p.idProduto === faixa.idProduto);
  const [idProduto, setIdProduto]   = useState(faixa.idProduto);
  const [pesoAlvo, setPesoAlvo]     = useState(faixa.pesoAlvo ? String(faixa.pesoAlvo) : '');
  const [verdeMin, setVerdeMin]     = useState(faixa.verdeMin  ? String(faixa.verdeMin) : '');
  const [verdeMax, setVerdeMax]     = useState(faixa.verdeMax  ? String(faixa.verdeMax) : '');
  const [amarelaMin, setAmarelaMin] = useState(faixa.amarelaMin ? String(faixa.amarelaMin) : '');
  const [amarelaMax, setAmarelaMax] = useState(faixa.amarelaMax ? String(faixa.amarelaMax) : '');
  const [qtdCaixa, setQtdCaixa]     = useState(produtoInicial?.qtdPorCaixaOp ? String(produtoInicial.qtdPorCaixaOp) : '');
  const [saving, setSaving]         = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [pickerAberto, setPickerAberto] = useState(idProduto === 0 && !produtoBloqueado);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

  const produtoSelecionado = produtos.find(p => p.idProduto === idProduto);
  const alterado = idProduto !== faixa.idProduto
    || pesoAlvo.replace(',', '.') !== (faixa.pesoAlvo ? String(faixa.pesoAlvo) : '')
    || verdeMin.replace(',', '.') !== (faixa.verdeMin ? String(faixa.verdeMin) : '')
    || verdeMax.replace(',', '.') !== (faixa.verdeMax ? String(faixa.verdeMax) : '')
    || amarelaMin.replace(',', '.') !== (faixa.amarelaMin ? String(faixa.amarelaMin) : '')
    || amarelaMax.replace(',', '.') !== (faixa.amarelaMax ? String(faixa.amarelaMax) : '')
    || qtdCaixa !== (produtoInicial?.qtdPorCaixaOp ? String(produtoInicial.qtdPorCaixaOp) : '');
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
    if (vMin > alvo) return 'Verde Mín deve ser ≤ Peso Alvo.';
    if (alvo > vMax) return 'Peso Alvo deve ser ≤ Verde Máx.';
    if (vMin > vMax) return 'Verde Mín deve ser ≤ Verde Máx.';
    if (vMax > aMax) return 'Verde Máx deve ser ≤ Amarela Máx.';
    if (qtdObrigatoria && !qtdCaixa.trim())
      return 'Informe os itens por caixa do produto.';
    if (qtdCaixa.trim() && (!/^\d+$/.test(qtdCaixa.trim()) || parseInt(qtdCaixa, 10) <= 0))
      return 'Itens por caixa deve ser um número inteiro maior que zero.';
    return null;
  }

  async function executarSalvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    setSaving(true);

    const qtdNova = qtdCaixa.trim() ? parseInt(qtdCaixa, 10) : null;
    if (qtdNova != null && produtoSelecionado && qtdNova !== produtoSelecionado.qtdPorCaixaOp) {
      try {
        await ti400Service.updateQtdPorCaixa(
          produtoSelecionado.cdProduto, produtoSelecionado.dsProduto, qtdNova);
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Erro ao atualizar itens por caixa',
          text2: err.response?.data?.error ?? err.message });
        setSaving(false);
        return;
      }
    }

    const n = (s: string) => parseFloat(s.replace(',', '.'));
    await onSalvar({ id: faixa.id, idProduto, pesoAlvo: n(pesoAlvo),
      verdeMin: n(verdeMin), verdeMax: n(verdeMax),
      amarelaMin: n(amarelaMin), amarelaMax: n(amarelaMax) });
    setSaving(false);
  }

  function salvar() {
    const erro = validar();
    if (erro) { Toast.show({ type: 'error', text1: erro }); return; }
    const nome = produtoSelecionado ? `${produtoSelecionado.dsProduto} (${produtoSelecionado.cdProduto})` : 'produto selecionado';
    setConfirmacao({
      titulo: faixa.id === 0 ? 'Criar configuração do produto' : 'Salvar alterações',
      mensagem: `Confirma os dados de peso e quantidade para ${nome}?`,
      confirmarTexto: 'Confirmar', onConfirmar: executarSalvar,
    });
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
                produtoBloqueado ? (
                  <View style={{ ...fInput as any, flexDirection: 'row', alignItems: 'center',
                    gap: 8, paddingVertical: 11, backgroundColor: '#e3ded2' }}>
                    <Feather name="lock" size={14} color="#6b7280" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                        {produtoSelecionado?.dsProduto ?? faixa.dsProduto ?? 'Produto não localizado'}
                      </Text>
                      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#6b7280' }}>
                        Código: {produtoSelecionado?.cdProduto ?? faixa.cdProduto ?? faixa.idProduto}
                      </Text>
                    </View>
                  </View>
                ) : (
                <Pressable onPress={() => setPickerAberto(true)}
                  style={{ ...fInput as any, flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 11 }}>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#163029', flex: 1 }}>
                    {produtoSelecionado
                      ? `${produtoSelecionado.dsProduto} · Código ${produtoSelecionado.cdProduto}`
                      : 'Selecionar produto...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#6b7280" />
                </Pressable>
                )
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
                          setQtdCaixa(p.qtdPorCaixaOp ? String(p.qtdPorCaixaOp) : '');
                          setPickerAberto(false);
                          setBuscaProduto('');
                        }}
                        style={({ pressed }) => ({
                          paddingVertical: 10, paddingHorizontal: 12,
                          backgroundColor: pressed ? '#e0dbd0' : (p.idProduto === idProduto ? '#d1ccbd' : '#f0ead6'),
                          borderBottomWidth: 1, borderColor: '#e0dbd0',
                        })}>
                        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029' }}>
                          {p.dsProduto}
                        </Text>
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#2F4B44' }}>
                          Código: {p.cdProduto}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Peso Alvo + Itens por caixa */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Peso Alvo (kg)</Text>
                <TextInput value={pesoAlvo} onChangeText={setPesoAlvo}
                  placeholder="Ex: 0.500" placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad" style={fInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fLabel}>Itens por caixa</Text>
                <TextInput value={qtdCaixa}
                  onChangeText={t => setQtdCaixa(t.replace(/[^0-9]/g, ''))}
                  placeholder="Ex: 12"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad" style={fInput} />
              </View>
            </View>
            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#6b7280',
              fontStyle: 'italic', marginTop: -8 }}>
              Alterar itens por caixa atualiza o cadastro do produto e vale para as próximas sessões.
            </Text>

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
              <Pressable onPress={salvar} disabled={saving || !alterado}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8,
                  backgroundColor: (saving || !alterado) ? '#9ca3af' : '#163029',
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);

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

  const formValido = useMemo(() => {
    const intervaloValido = (valor: string) => /^\d+$/.test(valor) && +valor >= 1 && +valor <= 24;
    return (pullModo === 'horarios' ? horariosSyncValidos(pullHorarios) : intervaloValido(pullIntervalo))
      && (pushModo === 'horarios' ? horariosSyncValidos(pushHorarios) : intervaloValido(pushIntervalo))
      && ['todos', 'aprovados', 'nao_reprovados'].includes(compModo)
      && /^\d+$/.test(retryDelay) && +retryDelay > 0
      && /^\d+$/.test(retryMax) && +retryMax >= 0
      && (!retentEnabled || (/^\d+$/.test(retentDays) && +retentDays > 0));
  }, [pullModo, pullHorarios, pullIntervalo, pushModo, pushHorarios, pushIntervalo,
    compModo, retryDelay, retryMax, retentEnabled, retentDays]);
  const formAlterado = useMemo(() => {
    if (!config) return false;
    const times = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean).join(',');
    return pullModo !== (config.syncPullIntervalHoras > 0 ? 'intervalo' : 'horarios')
      || (pullModo === 'horarios' ? times(pullHorarios) !== config.syncPullTimes.map(t => t.substring(0, 5)).join(',') : +pullIntervalo !== config.syncPullIntervalHoras)
      || pushModo !== (config.syncPushIntervalHoras > 0 ? 'intervalo' : 'horarios')
      || (pushModo === 'horarios' ? times(pushHorarios) !== config.syncPushTimes.map(t => t.substring(0, 5)).join(',') : +pushIntervalo !== config.syncPushIntervalHoras)
      || compAtiva !== config.comparacaoAtiva
      || compModo !== config.comparacaoModoImpressao
      || +retryDelay !== config.retryDelaySeconds
      || +retryMax !== config.retryMaxAttempts
      || retentEnabled !== config.retentionEnabled
      || +retentDays !== config.retentionDays;
  }, [config, pullModo, pullHorarios, pullIntervalo, pushModo, pushHorarios, pushIntervalo,
    compAtiva, compModo, retryDelay, retryMax, retentEnabled, retentDays]);

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

  async function executarSalvar() {
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

  function salvar() {
    if (!formValido) {
      Toast.show({ type: 'error', text1: 'Revise os campos', text2: 'Horários usam HH:mm; intervalos aceitam de 1 a 24 horas.' });
      return;
    }
    setConfirmacao({
      titulo: 'Salvar configurações',
      mensagem: 'Estas alterações afetam sincronização, comparação, tentativas e retenção. Deseja continuar?',
      confirmarTexto: 'Salvar', onConfirmar: executarSalvar,
    });
  }

  async function executarPull() {
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

  async function executarPush() {
    setSyncingPush(true);
    try {
      await ti400Service.syncPush();
      Toast.show({ type: 'success', text1: 'Push concluído', text2: 'Dados enviados ao remoto' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Push falhou', text2: err.message });
    } finally { setSyncingPush(false); }
  }

  function forcePull() {
    setConfirmacao({ titulo: 'Forçar Pull', mensagem: 'Importar agora os dados do ERP para a base local?',
      confirmarTexto: 'Executar', onConfirmar: executarPull });
  }

  function forcePush() {
    setConfirmacao({ titulo: 'Forçar Push', mensagem: 'Enviar agora sessões e pesagens locais para o ERP?',
      confirmarTexto: 'Executar', onConfirmar: executarPush });
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
      <Pressable onPress={salvar} disabled={saving || !formAlterado || !formValido}
        accessibilityState={{ disabled: saving || !formAlterado || !formValido, busy: saving }}
        style={{ backgroundColor: (saving || !formAlterado || !formValido) ? '#9ca3af' : '#163029', borderRadius: 10,
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
      <ConfirmacaoModal confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />
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
            placeholder="Ex: 07:00, 14:00" placeholderTextColor="#9ca3af" style={fInput}
            autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation"
            accessibilityHint="Informe horários no formato de vinte e quatro horas, separados por vírgula" />
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#6b7280', marginTop: 5 }}>
            Formato 24 horas. Exemplos: 07:00 ou 07:00, 12:00, 19:00.
          </Text>
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
