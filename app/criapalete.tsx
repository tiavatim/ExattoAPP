import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StatusBar, Pressable, ScrollView, RefreshControl } from 'react-native';
import DrawerSceneWrapper from 'src/components/drawer';
import Header from 'src/components/header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsuarioInterfaceProps } from 'src/interfaces/usuarioInterface';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import PaleteSelector from 'src/components/paleteSelector';
import NovoPaleteButton from 'src/components/novoPaleteButton';
import PaleteInfo from 'src/components/paleteInfo';
import ModalAssociarProduto from 'src/components/modalAssociarProduto';
import ModalEtiquetaPalete from 'src/components/modalEtiquetaPalete';
import ModalLocalizarPalete from 'src/components/modalLocalizarPalete';
import localService from 'src/services/localService';

// 🔹 Imports para captura
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

export default function CriarPalete() {
  const [usuario, setUsuario] = useState<UsuarioInterfaceProps | null>(null);
  const [paleteSelecionado, setPaleteSelecionado] = useState<string | null>(null);
  const [paleteAtual, setPaleteAtual] = useState<LocalDetalhado | null>(null);
  const [todosPaletes, setTodosPaletes] = useState<LocalDetalhado[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalEtiquetaVisivel, setModalEtiquetaVisivel] = useState(false);
  const [modalLocalizarVisivel, setModalLocalizarVisivel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 🔹 Ref para captura
  const viewShotRef = useRef<ViewShot>(null);

  // 🔹 Função de captura
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

  useEffect(() => {
    async function carregarUsuario() {
      const json = await AsyncStorage.getItem('@user');
      if (json) setUsuario(JSON.parse(json));
    }
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (paleteSelecionado && todosPaletes.length > 0) {
      const encontrado = todosPaletes.find((p) => p.Code === paleteSelecionado);
      setPaleteAtual(encontrado ?? null);
    }
  }, [paleteSelecionado, todosPaletes]);

  async function atualizarPaletes() {
    try {
      setRefreshing(true);
      const resposta = await localService.getLocaisDetalhadoPaletes();
      setTodosPaletes(resposta);
      if (paleteSelecionado) {
        const atualizado = resposta.find((p) => p.Code === paleteSelecionado);
        setPaleteAtual(atualizado ?? null);
      }
    } catch (error) {
      console.error('Erro ao atualizar paletes:', error);
    } finally {
      setRefreshing(false);
    }
  }

  if (!usuario) return <Text>Carregando usuário...</Text>;

  return (
    <DrawerSceneWrapper>
      {/* 🔹 ViewShot englobando toda a tela */}
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#d1ccbd' }}>
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          {/* Passa função de print para o Header */}
          <Header onPrint={handlePrint} />

          <ScrollView
            style={{ flex: 1, padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={atualizarPaletes} />
            }
          >
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'Sina-Nova-Bold',
                color: '#163029',
                marginBottom: 12,
              }}
            >
              📦 Gerenciar Paletes
            </Text>

            <NovoPaleteButton
              idUsuario={usuario.id}
              onPaleteCriado={(novo) => {
                setTodosPaletes((prev) => [novo, ...prev]);
                setPaleteSelecionado(novo.Code);
                setPaleteAtual(novo);
              }}
            />

            <PaleteSelector
              paleteSelecionado={paleteSelecionado}
              setPaleteSelecionado={setPaleteSelecionado}
              setListaCompleta={setTodosPaletes}
              listaPaletes={todosPaletes}
            />

            {paleteAtual && (
              <>
                <PaleteInfo palete={paleteAtual} />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Pressable onPress={() => setModalVisivel(true)} style={botaoAcao}>
                    <Text style={textoBotao}>➕ Associar Produtos</Text>
                  </Pressable>

                  <Pressable onPress={() => setModalEtiquetaVisivel(true)} style={botaoAcao}>
                    <Text style={textoBotao}>🖨️ Imprimir Etiqueta</Text>
                  </Pressable>

                  <Pressable onPress={() => setModalLocalizarVisivel(true)} style={botaoAcao}>
                    <Text style={textoBotao}>📍 Localizar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>

          {paleteAtual && (
            <>
              <ModalAssociarProduto
                visible={modalVisivel}
                onClose={() => setModalVisivel(false)}
                locationId={paleteAtual.Location_Id}
                onSucesso={() => {
                  // ações após sucesso
                }}
              />

              <ModalEtiquetaPalete
                visible={modalEtiquetaVisivel}
                onClose={() => setModalEtiquetaVisivel(false)}
                palete={paleteAtual}
              />

              <ModalLocalizarPalete
                visible={modalLocalizarVisivel}
                onClose={() => setModalLocalizarVisivel(false)}
                palete={paleteAtual}
                onAtualizado={atualizarPaletes}
              />
            </>
          )}
        </View>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}

const botaoAcao = {
  flex: 1,
  backgroundColor: '#2F4B44',
  paddingVertical: 12,
  borderRadius: 6,
  alignItems: 'center' as const,
};

const textoBotao = {
  color: '#fff',
  fontFamily: 'Sina-Nova-Bold',
  fontSize: 14,
};
