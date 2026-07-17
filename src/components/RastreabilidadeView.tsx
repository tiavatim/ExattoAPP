import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import ti400Service from '@/services/ti400Service';
import { RastreabilidadeItem, RESULTADO_COR, RESULTADO_LABEL } from '@/interfaces/ti400Interface';

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ResultadoBadge({ nr }: { nr: number | null }) {
  const n = nr ?? 0;
  const cor = RESULTADO_COR[n] ?? '#9ca3af';
  const label = RESULTADO_LABEL[n] ?? '—';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cor }} />
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: cor }}>{label}</Text>
    </View>
  );
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0ddd4' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: 130 }}>
        <Feather name={icon as any} size={14} color="#2F4B44" />
        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44' }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 13, color: '#163029', flex: 1 }}>{value}</Text>
    </View>
  );
}

export function RastreabilidadeDetalheCard({ item }: { item: RastreabilidadeItem }) {
  return (
    <View style={{ backgroundColor: '#f0ead6', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0ddd4' }}>
      {/* Produto */}
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029', marginBottom: 2 }}>
        {item.dsProduto}
      </Text>
      <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44', marginBottom: 12 }}>
        {item.cdProduto}
      </Text>

      {/* Badge resultado */}
      <View style={{ marginBottom: 12 }}>
        <ResultadoBadge nr={item.nrResultadoComparacao} />
      </View>

      {/* Dados */}
      <InfoRow icon="tag"       label="OP / Lote"    value={String(item.lote)} />
      <InfoRow icon="activity"  label="Linha"        value={item.linhaNome} />
      <InfoRow icon="clock"     label="Pesado em"    value={formatarData(item.dtPesagem)} />
      <InfoRow icon="droplet"   label="Peso bruto"   value={`${item.vlPesoBruto.toFixed(3)} ${item.dsUnidade}`} />
      <InfoRow icon="minus"     label="Tara"         value={`${item.vlTara.toFixed(3)} ${item.dsUnidade}`} />
      <InfoRow icon="user"      label="Operador"     value={item.operador || '—'} />
      <InfoRow icon="calendar"  label="Fabricação"   value={item.fabricacao || '—'} />
      <InfoRow icon="clock"     label="Validade"     value={item.validade || '—'} />

      <View style={{ marginTop: 4, paddingTop: 8 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#9ca3af' }}>
          {item.nrRastreabilidade}
        </Text>
      </View>
    </View>
  );
}

interface Props {
  onBack: () => void;
}

export default function RastreabilidadeView({ onBack }: Props) {
  const [codigo, setCodigo]   = useState('');
  const [loading, setLoading] = useState(false);
  const [item, setItem]       = useState<RastreabilidadeItem | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [reimprimindo, setReimprimindo]   = useState(false);

  async function buscar() {
    const nr = codigo.trim();
    if (!nr) return;
    setLoading(true);
    setItem(null);
    setNaoEncontrado(false);
    try {
      const resultado = await ti400Service.getRastreabilidade(nr);
      if (resultado) {
        setItem(resultado);
      } else {
        setNaoEncontrado(true);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro na consulta', text2: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function reimprimir() {
    if (!item || reimprimindo) return;
    setReimprimindo(true);
    try {
      const destino = await ti400Service.reimprimirPesagem(item.idPesagem);
      Toast.show({ type: 'success', text1: 'Etiqueta reimpressa', text2: `Enviada para ${destino}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao reimprimir', text2: err.response?.data?.error ?? err.message });
    } finally {
      setReimprimindo(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Sub-header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#163029" />
        </Pressable>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
          Rastreabilidade
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Campo de busca */}
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', marginBottom: 8 }}>
          Código da etiqueta
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={codigo}
            onChangeText={setCodigo}
            onSubmitEditing={buscar}
            returnKeyType="search"
            placeholder="Ex: a1b2c3-0000000000042"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              backgroundColor: '#f0ead6',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              fontSize: 15,
              fontFamily: 'Sina-Nova-Regular',
              color: '#163029',
              borderWidth: 1,
              borderColor: '#c8c4ba',
            }}
          />
          <Pressable
            onPress={buscar}
            disabled={!codigo.trim() || loading}
            style={{
              backgroundColor: codigo.trim() && !loading ? '#163029' : '#9ca3af',
              borderRadius: 8,
              paddingHorizontal: 18,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {loading
              ? <ActivityIndicator color="#d1ccbd" size="small" />
              : <Feather name="search" size={20} color="#d1ccbd" />
            }
          </Pressable>
        </View>

        {/* Resultado */}
        {naoEncontrado && (
          <View style={{ marginTop: 24, alignItems: 'center', gap: 8 }}>
            <Feather name="alert-circle" size={32} color="#9ca3af" />
            <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#9ca3af', fontSize: 14 }}>
              Código não encontrado.
            </Text>
          </View>
        )}

        {item && (
          <View style={{ marginTop: 24 }}>
            <View style={{ backgroundColor: '#f0ead6', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0ddd4' }}>
              {/* Produto */}
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 17, color: '#163029', marginBottom: 2 }}>
                {item.dsProduto}
              </Text>
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44', marginBottom: 12 }}>
                {item.cdProduto}
              </Text>

              {/* Badge resultado */}
              <View style={{ marginBottom: 12 }}>
                <ResultadoBadge nr={item.nrResultadoComparacao} />
              </View>

              {/* Dados */}
              <InfoRow icon="tag"       label="OP / Lote"    value={String(item.lote)} />
              <InfoRow icon="activity"  label="Linha"        value={item.linhaNome} />
              <InfoRow icon="clock"     label="Pesado em"    value={formatarData(item.dtPesagem)} />
              <InfoRow icon="droplet"   label="Peso bruto"   value={`${item.vlPesoBruto.toFixed(3)} ${item.dsUnidade}`} />
              <InfoRow icon="minus"     label="Tara"         value={`${item.vlTara.toFixed(3)} ${item.dsUnidade}`} />
              <InfoRow icon="user"      label="Operador"     value={item.operador || '—'} />
              <InfoRow icon="calendar"  label="Fabricação"   value={item.fabricacao || '—'} />
              <InfoRow icon="clock"     label="Validade"     value={item.validade || '—'} />

              <View style={{ marginTop: 4, paddingTop: 8 }}>
                <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 11, color: '#9ca3af' }}>
                  {item.nrRastreabilidade}
                </Text>
              </View>
            </View>

            <Pressable onPress={reimprimir} disabled={reimprimindo}
              style={{ marginTop: 12, backgroundColor: reimprimindo ? '#9ca3af' : '#163029',
                borderRadius: 10, paddingVertical: 13,
                flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {reimprimindo
                ? <ActivityIndicator color="#d1ccbd" size="small" />
                : <Feather name="printer" size={17} color="#d1ccbd" />}
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#d1ccbd' }}>
                {reimprimindo ? 'Reimprimindo...' : 'Reimprimir Etiqueta'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
