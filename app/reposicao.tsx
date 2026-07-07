import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import ReposicaoService from '@/services/reposicaoService';
import { Reposicao } from '@/interfaces/reposicaoInterface';
import ReposicaoCard from '@/components/reposicaoCard';
import { useUser } from '@/contexts/UserContext';
import Header from '@/components/header';
import DrawerSceneWrapper from '@/components/drawer';

// 🔹 Imports para captura de tela
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

// 🔹 Dropdown de busca
import BuscaDropdown from '@/components/buscaDropdown';

const statusColors: Record<string, string> = {
  'TAREFA INICIADA': '#fff3cd',
  'TAREFA INCLUÍDA': '#e7f1ff',
  'TAREFA FINALIZADA': '#f8d7da',
};

export default function ReposicaoScreen() {
  const [reps, setReps] = useState<Reposicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { usuario } = useUser();

  // 🔎 Estados de busca
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');

  // 🔹 Ref para captura
  const viewShotRef = useRef<ViewShot>(null);

  // 🔹 Função de print
  const handlePrint = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await viewShotRef.current.capture();
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão negada',
          text2: 'Ative acesso à galeria.',
        });
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({ type: 'success', text1: '📸 Print salvo na galeria!' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao salvar print',
        text2: err.message || 'Tente novamente.',
      });
    }
  };

  const carregarReposicoes = useCallback(async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const dados = await ReposicaoService.getReposicoes();
      const prioridadeStatus = { 48: 1, 44: 2, 45: 3 };
      const minhas = dados.filter(rep => rep.IdRepositor === usuario.id);

      const ordenadas = minhas.sort((a, b) => {
        const prioridadeA = prioridadeStatus[a.IdStatus] || 99;
        const prioridadeB = prioridadeStatus[b.IdStatus] || 99;
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

        if (a.DsProduto !== b.DsProduto) {
          const primeiroIndexA = minhas.findIndex(
            r => r.DsProduto === a.DsProduto && r.IdStatus === a.IdStatus
          );
          const primeiroIndexB = minhas.findIndex(
            r => r.DsProduto === b.DsProduto && r.IdStatus === b.IdStatus
          );
          return primeiroIndexA - primeiroIndexB;
        }

        return new Date(a.DtSys).getTime() - new Date(b.DtSys).getTime();
      });

      setReps(ordenadas);
    } catch (error: any) {
      console.error('Erro ao carregar reposições:', error.message);
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarReposicoes();
    setRefreshing(false);
  };

  useEffect(() => {
    carregarReposicoes();
  }, [carregarReposicoes]);

  // 🔄 Atualização automática a cada 30 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      carregarReposicoes();
    }, 30000);

    return () => clearInterval(intervalo);
  }, [carregarReposicoes]);

  // 🔎 Monta lista de produtos a partir das reposições
  const produtosReposicao = useMemo(() => {
    return reps.map(r => ({
      value: String(r.IdReposicao),
      label: r.DsProduto,
    }));
  }, [reps]);

  // 🔎 Filtragem da lista
  const repsFiltradas = useMemo(() => {
    if (!produtoSelecionado) return reps;
    return reps.filter(r => String(r.IdReposicao) === produtoSelecionado);
  }, [reps, produtoSelecionado]);

  return (
    <DrawerSceneWrapper>
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#d1ccbd' }}>
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          <Header onPrint={handlePrint} />

          <View style={{ flex: 1, padding: 16 }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'Sina-Nova-Bold',
                color: '#163029',
                marginBottom: 12,
              }}
            >
              📦 Minhas Reposições
            </Text>

            {/* 🔹 Legenda */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {Object.entries(statusColors).map(([status, color]) => (
                <View
                  key={status}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: color,
                      borderWidth: 1,
                      borderColor: '#ccc',
                      marginRight: 4,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: 'Sina-Nova-Regular',
                      fontSize: 12,
                      color: '#163029',
                    }}
                  >
                    {status}
                  </Text>
                </View>
              ))}
            </View>

            {/* 🔎 Botão e Dropdown de busca */}
            <TouchableOpacity
              onPress={() => setMostrarBusca(!mostrarBusca)}
              style={{
                marginTop: 10,
                paddingVertical: 6,
                alignItems: 'center',
                borderRadius: 6,
                backgroundColor: '#f0ead6',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Sina-Nova-Regular',
                  color: '#163029',
                  fontSize: 14,
                }}
              >
                🔍 Buscar produto
              </Text>
            </TouchableOpacity>

            {mostrarBusca && (
              <View style={{ marginTop: 8 }}>
                <BuscaDropdown
                  label="Selecione o produto"
                  dados={[
                    { value: '', label: '❌ Limpar filtro' }, // opção extra
                    ...produtosReposicao,
                  ]}
                  valorSelecionado={produtoSelecionado}
                  aoSelecionar={(val) => {
                    if (val === '') {
                      setProdutoSelecionado('');
                    } else {
                      setProdutoSelecionado(val);
                    }
                  }}
                />
              </View>
            )}

            {/* 🔹 Lista com Refresh sempre ativo */}
            <FlatList
              data={repsFiltradas}
              keyExtractor={(item) => item.IdReposicao.toString()}
              renderItem={({ item }) => (
                <ReposicaoCard reposicao={item} onFinalizada={carregarReposicoes} />
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ paddingTop: 12, flexGrow: 1 }}
              ListEmptyComponent={() => (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {!loading && (
                    <Text
                      style={{
                        fontFamily: 'Sina-Nova-Regular',
                        color: '#163029',
                        marginTop: 16,
                      }}
                    >
                      Nenhuma reposição encontrada.
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}
