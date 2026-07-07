import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ScrollView, View, Text, StatusBar, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Alert, } from 'react-native';
import DrawerSceneWrapper from 'src/components/drawer';
import Header from 'src/components/header';
import PedidoService from 'src/services/pedidoService';
import localService from 'src/services/localService';
import buscaService from 'src/services/buscaService';
import { Separacao } from 'src/interfaces/separacao';
import { ProdutoSeparacao } from 'src/interfaces/produtoSeparacao';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import { LocalOuProduto } from 'src/interfaces/buscaInterface';
import SeparacaoCard from 'src/components/SeparacaoCard';
import SeparacaoCabecalho from 'src/components/SeparacaoCabecalho';
import ItemSeparacaoCard from 'src/components/ItemSeparacaoCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import BuscaDropdown from '@/components/buscaDropdown';

export default function SeparacaoComum() {
  const [separacoes, setSeparacoes] = useState<Separacao[]>([]);
  const [separacaoAtiva, setSeparacaoAtiva] = useState<Separacao | null>(null);
  const [itens, setItens] = useState<ProdutoSeparacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todosLocais, setTodosLocais] = useState<LocalDetalhado[]>([]);
  const [filtro, setFiltro] = useState<'pendentes' | 'separados' | 'todos'>('pendentes');

  // 🔎 Estado do dropdown de busca
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [produtos, setProdutos] = useState<LocalOuProduto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');

  const viewShotRef = useRef<ViewShot>(null);

  const produtosSeparacao = useMemo(() => {
    return itens.map(i => ({
      value: String(i.IdProdutoPedido),
      label: i.DsProduto || `Produto ${i.IdProdutoPedido}`,
    }));
  }, [itens]);

  const handlePrint = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await viewShotRef.current.capture();
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permissão negada', text2: 'Ative acesso à galeria.' });
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({ type: 'success', text1: '📸 Print salvo na galeria!' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar print', text2: err.message || 'Tente novamente.' });
    }
  };

  function parseMicrosoftDate(dateString: string): Date | null {
    const match = /\/Date\((\d+)\)\//.exec(dateString);
    if (match && match[1]) return new Date(Number(match[1]));
    return null;
  }

  async function atualizarSeparacaoAtiva() {
    if (!separacaoAtiva) return;
    const jsonUser = await AsyncStorage.getItem('@user');
    const usuario = jsonUser ? JSON.parse(jsonUser) : null;
    const listaAtualizada = await PedidoService.getSeparacoes(usuario.id);
    const atualizada = listaAtualizada.find(s => s.IdSeparacao === separacaoAtiva.IdSeparacao);
    if (atualizada) setSeparacaoAtiva(atualizada);
  }

  async function carregarSeparacoes() {
    setLoading(true);
    const jsonUser = await AsyncStorage.getItem('@user');
    const usuario = jsonUser ? JSON.parse(jsonUser) : null;

    const [resultado, locais] = await Promise.all([
      PedidoService.getSeparacoes(usuario.id),
      localService.getLocaisDetalhados(),
    ]);

    const statusOrder: Record<string, number> = {
      'TAREFA INICIADA': 1,
      'TAREFA PAUSADA': 2,
      'TAREFA INCLUÍDA': 3,
      'TAREFA FINALIZADA': 4,
    };

    const ordenadas = resultado.sort((a, b) => {
      const sa = statusOrder[a.DsStatus] ?? 99;
      const sb = statusOrder[b.DsStatus] ?? 99;
      if (sa !== sb) return sa - sb;
      const dtA = parseMicrosoftDate(a.DtPrevisaoInicio)?.getTime() ?? 0;
      const dtB = parseMicrosoftDate(b.DtPrevisaoInicio)?.getTime() ?? 0;
      return dtA - dtB;
    });

    setTodosLocais(locais);
    setSeparacoes(ordenadas);
    setLoading(false);
  }

  useEffect(() => {
    carregarSeparacoes();
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarSeparacoes();
    }, [])
  );

  async function iniciarOuRetomar(idSeparacao: number) {
    const sep = separacoes.find(s => s.IdSeparacao === idSeparacao);
    if (!sep) return;
    setLoading(true);
    setSeparacaoAtiva(sep);
    const itensSeparacao = await PedidoService.getItensSeparacao(idSeparacao);
    setItens(itensSeparacao.sort((a, b) => a.PickingOrder - b.PickingOrder));
    setLoading(false);
  }

  async function voltarParaLista() {
    setSeparacaoAtiva(null);
    setItens([]);
    await carregarSeparacoes();
  }

  async function atualizarListaItens(idSeparacao: number) {
    const novos = await PedidoService.getItensSeparacao(idSeparacao);
    setItens(novos.sort((a, b) => a.PickingOrder - b.PickingOrder));
  }

  async function pausarEVoltar() {
    if (!separacaoAtiva) return;
    try {
      setLoading(true);
      const ok = await PedidoService.pausarSeparacao(separacaoAtiva.IdSeparacao);
      if (!ok) Alert.alert('Atenção', 'Não foi possível pausar a separação.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao pausar separação.');
    } finally {
      setLoading(false);
      await voltarParaLista();
    }
  }

  async function finalizarEVoltar() {
    if (!separacaoAtiva) return;
    try {
      setLoading(true);
      const ok = await PedidoService.finalizarSeparacao(separacaoAtiva.IdSeparacao);
      if (!ok) Alert.alert('Atenção', 'Não foi possível finalizar a separação.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao finalizar separação.');
    } finally {
      setLoading(false);
      await voltarParaLista();
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    if (separacaoAtiva) {
      await atualizarListaItens(separacaoAtiva.IdSeparacao);
    } else {
      await carregarSeparacoes();
    }
    setRefreshing(false);
  };

  const statusColors: Record<string, string> = {
    'TAREFA PAUSADA': '#fff3cd',
    'TAREFA INCLUÍDA': '#e7f1ff',
    'TAREFA FINALIZADA': '#f8d7da',
  };

  const itensFiltrados = useMemo(() => {
    if (filtro === 'todos') return itens;
    if (filtro === 'separados') return itens.filter(i => (i.QtSeparada ?? 0) >= (i.QtVendida ?? 0));
    return itens.filter(i => (i.QtSeparada ?? 0) < (i.QtVendida ?? 0));
  }, [itens, filtro]);

  const { pendentesCount, separadosCount } = useMemo(() => {
    const p = itens.reduce((acc, i) => acc + ((i.QtSeparada ?? 0) < (i.QtVendida ?? 0) ? 1 : 0), 0);
    const s = itens.length - p;
    return { pendentesCount: p, separadosCount: s };
  }, [itens]);

  // 🔎 Carregar produtos para dropdown
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const lista = await buscaService.getProdutos();
        setProdutos(lista);
      } catch {
        setProdutos([]);
      }
    }
    carregarProdutos();
  }, []);

  return (
    <DrawerSceneWrapper>
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#d1ccbd' }}>
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          <Header onPrint={handlePrint} />

          {loading && <ActivityIndicator size="large" color="#163029" style={{ marginTop: 24 }} />}

          {!separacaoAtiva && !loading && (
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 8 }}>
                {Object.entries(statusColors).map(([status, color]) => (
                  <View key={status} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <View style={{ width: 16, height: 16, backgroundColor: color, borderWidth: 1, borderColor: '#ccc', marginRight: 4 }} />
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029' }}>{status}</Text>
                  </View>
                ))}
              </View>

              {separacoes.map(sep => (
                <SeparacaoCard key={sep.IdSeparacao} separacao={sep} onIniciar={iniciarOuRetomar} onRetomar={iniciarOuRetomar} />
              ))}
            </ScrollView>
          )}

          {separacaoAtiva && !loading && (
            <FlatList
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListHeaderComponent={
                <>
                  {/* Botões principais */}
                  <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 }}>
                    <TouchableOpacity onPress={pausarEVoltar} style={{ flex: 1, padding: 10, backgroundColor: '#2F4B44', borderRadius: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>⏸️ Pausar separação</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={finalizarEVoltar} style={{ flex: 1, padding: 10, backgroundColor: '#8b0000', borderRadius: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>✅ Finalizar separação</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Filtros */}
                  <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => setFiltro('pendentes')}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: filtro === 'pendentes' ? '#2F4B44' : '#b9b4a6',
                        backgroundColor: filtro === 'pendentes' ? '#2F4B44' : '#e7e1d1',
                      }}
                    >
                      <Text style={{ color: filtro === 'pendentes' ? '#fff' : '#163029', fontFamily: 'Sina-Nova-Bold', fontSize: 14 }}>
                        Pendentes ({pendentesCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFiltro('separados')}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: filtro === 'separados' ? '#2F4B44' : '#b9b4a6',
                        backgroundColor: filtro === 'separados' ? '#2F4B44' : '#e7e1d1',
                      }}
                    >
                      <Text style={{ color: filtro === 'separados' ? '#fff' : '#163029', fontFamily: 'Sina-Nova-Bold', fontSize: 14 }}>
                        Separados ({separadosCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFiltro('todos')}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: filtro === 'todos' ? '#2F4B44' : '#b9b4a6',
                        backgroundColor: filtro === 'todos' ? '#2F4B44' : '#e7e1d1',
                      }}
                    >
                      <Text style={{ color: filtro === 'todos' ? '#fff' : '#163029', fontFamily: 'Sina-Nova-Bold', fontSize: 14 }}>
                        Todos ({itens.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Botão de busca */}
                  <TouchableOpacity
                    onPress={() => setMostrarBusca(!mostrarBusca)}
                    style={{
                      marginTop: 10,
                      marginHorizontal: 16,
                      paddingVertical: 6,
                      alignItems: 'center',
                      borderRadius: 6,
                      backgroundColor: '#f0ead6',
                    }}
                  >
                    <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#163029', fontSize: 14 }}>🔍 Buscar produto</Text>
                  </TouchableOpacity>

                  {/* Dropdown visível somente quando acionado */}
                  {mostrarBusca && (
                    <View style={{ marginHorizontal: 16, marginTop: 8 }}>
                      <BuscaDropdown
                        label="Selecione ou bip o produto"
                        dados={[
                          { value: '', label: '❌ Limpar filtro' }, // 🔹 opção extra
                          ...produtosSeparacao,
                        ]}
                        valorSelecionado={produtoSelecionado}
                        aoSelecionar={(val) => {
                          if (val === '') {
                            // 🔹 resetar filtro
                            setProdutoSelecionado('');
                            setItens([...itens].sort((a, b) => a.PickingOrder - b.PickingOrder));
                          } else {
                            setProdutoSelecionado(val);
                            const item = itens.find(i => String(i.IdProdutoPedido) === val);
                            if (item) {
                              const novaLista = [item, ...itens.filter(i => i.IdProdutoPedido !== item.IdProdutoPedido)];
                              setItens(novaLista);
                            }
                          }
                        }}
                      />
                    </View>
                  )}


                  <View style={{ height: 8 }} />
                  <SeparacaoCabecalho separacao={separacaoAtiva} />
                </>
              }
              data={itensFiltrados}
              keyExtractor={(item, index) => `${item.IdProdutoPedido}-${index}`}
              renderItem={({ item }) => (
                <ItemSeparacaoCard
                  item={item}
                  locais={todosLocais}
                  itensSeparacao={itens}
                  onAtualizarLista={() => atualizarListaItens(item.IdSeparacao)}
                  onAtualizarSeparacaoAtiva={atualizarSeparacaoAtiva}
                  onPular={() => {
                    const novaLista = [...itens];
                    const index = novaLista.findIndex(i => i.IdProdutoPedido === item.IdProdutoPedido);
                    if (index !== -1) {
                      const pulado = novaLista.splice(index, 1)[0];
                      pulado.PickingOrder = 9999;
                      novaLista.push(pulado);
                      setItens(novaLista);
                    }
                  }}
                />
              )}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              windowSize={10}
              removeClippedSubviews
              ListFooterComponent={<View style={{ height: 24 }} />}
            />
          )}
        </View>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}
