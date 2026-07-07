import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import notificacaoService from '@/services/notificacaoService';
import { Notificacao } from '@/interfaces/notificacaoInterface';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificacaoModal({ visible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [selecionada, setSelecionada] = useState<Notificacao | null>(null);
  const [mostrarNaoLidas, setMostrarNaoLidas] = useState(false);

  useEffect(() => {
    async function carregarUsuario() {
      const json = await AsyncStorage.getItem('@user');
      if (json) {
        const user = JSON.parse(json);
        setUsuarioId(user.id);
      }
    }
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (visible && usuarioId) {
      carregarNotificacoes();
      setSelecionada(null);
    }
  }, [visible, usuarioId]);

  async function carregarNotificacoes() {
    try {
      setLoading(true);
      const lista = await notificacaoService.getNotificacoes(usuarioId!);

      // ordenar por DtSys (mais novas primeiro)
      const ordenadas = [...lista].sort((a, b) => {
        const matchA = /\/Date\((\d+)\)\//.exec(a.DtSys);
        const matchB = /\/Date\((\d+)\)\//.exec(b.DtSys);
        const dateA = matchA ? Number(matchA[1]) : 0;
        const dateB = matchB ? Number(matchB[1]) : 0;
        return dateB - dateA;
      });

      setNotificacoes(ordenadas);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro', text2: err.message || 'Erro ao carregar notificações' });
    } finally {
      setLoading(false);
    }
  }

  async function abrirNotificacao(id: number) {
    const notif = await notificacaoService.visualizarNotificacao(id);
    if (notif) {
      setSelecionada(notif);
      await carregarNotificacoes();
    }
  }

  function formatarData(dtSys: string) {
    const match = /\/Date\((\d+)\)\//.exec(dtSys);
    if (match && match[1]) {
      return new Date(Number(match[1])).toLocaleString('pt-BR');
    }
    return dtSys;
  }

  const listaFiltrada = mostrarNaoLidas
    ? notificacoes.filter((n) => n.IdStatus !== 45) // 45 = Lida
    : notificacoes;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxHeight: '85%' }}>
          {/* Cabeçalho */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
              <Ionicons name="notifications" size={20} color="#163029" /> Notificações
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close-circle" size={24} color="#8b0000" />
            </Pressable>
          </View>

          {/* Botão de filtro */}
          {!selecionada && (
            <Pressable
              onPress={() => setMostrarNaoLidas(!mostrarNaoLidas)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-end',
                marginBottom: 8,
                padding: 6,
                backgroundColor: mostrarNaoLidas ? '#163029' : '#eee',
                borderRadius: 6,
              }}
            >
              <Ionicons
                name={mostrarNaoLidas ? 'mail-unread' : 'mail'}
                size={16}
                color={mostrarNaoLidas ? '#fff' : '#163029'}
              />
              <Text
                style={{
                  marginLeft: 6,
                  color: mostrarNaoLidas ? '#fff' : '#163029',
                  fontFamily: 'Sina-Nova-Bold',
                  fontSize: 13,
                }}
              >
                {mostrarNaoLidas ? 'Mostrando não lidas' : 'Todas as notificações'}
              </Text>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#163029" />
          ) : selecionada ? (
            // 🔎 Detalhes da notificação
            <ScrollView style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: '#163029', marginBottom: 12 }}>
                <Ionicons name="alert-circle" size={20} color="#163029" /> {selecionada.DsAssunto}
              </Text>

              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 15, color: '#333', marginBottom: 12 }}>
                {selecionada.DsTexto}
              </Text>

              {selecionada.DsLink && (
                <Text style={{ color: '#1e90ff', marginBottom: 12 }}>
                  <Ionicons name="link" size={16} color="#1e90ff" /> {selecionada.DsLink}
                </Text>
              )}

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#555' }}>
                  <Ionicons name="information-circle" size={14} color="#555" /> Status: {selecionada.DsStatus}
                </Text>
                <Text style={{ fontSize: 13, color: '#555' }}>
                  <Ionicons name="person" size={14} color="#555" /> Origem: {selecionada.DsUsuarioOrigem}
                </Text>
                {selecionada.DtNotificar && (
                  <Text style={{ fontSize: 13, color: '#555' }}>
                    <Ionicons name="alarm" size={14} color="#555" /> Agendada para: {formatarData(selecionada.DtNotificar)}
                  </Text>
                )}
              </View>
            </ScrollView>
          ) : (
            // 📋 Lista de notificações
            <FlatList
              data={listaFiltrada}
              keyExtractor={(item) => item.IdNotificacao.toString()}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => abrirNotificacao(item.IdNotificacao)}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                    backgroundColor: item.IdStatus === 45 ? '#f9f9f9' : '#e7f1ff',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029', marginBottom: 4 }}>
                    <Ionicons
                      name={item.IdStatus === 45 ? 'mail-open' : 'mail-unread'}
                      size={18}
                      color={item.IdStatus === 45 ? '#999' : '#163029'}
                    />{' '}
                    {item.DsAssunto}
                  </Text>
                  <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#555', marginBottom: 4 }}>
                    <Ionicons name="document-text" size={14} color="#555" />{' '}
                    {item.DsTexto.length > 50 ? item.DsTexto.substring(0, 50) + '...' : item.DsTexto}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999' }}>
                    <Ionicons name="time-outline" size={12} color="#999" /> {formatarData(item.DtSys)}
                  </Text>
                </Pressable>
              )}
            />
          )}

          {/* Botão para voltar */}
          {selecionada && (
            <Pressable
              onPress={() => setSelecionada(null)}
              style={{ marginTop: 12, alignSelf: 'center', padding: 10 }}
            >
              <Text style={{ color: '#2F4B44', fontFamily: 'Sina-Nova-Bold' }}>
                <Ionicons name="arrow-back-circle" size={16} color="#2F4B44" /> Voltar para lista
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
