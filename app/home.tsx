import { useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '@/components/header';
import DrawerSceneWrapper from '@/components/drawer';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import LoginService from '@/services/loginServices';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

export default function Home() {
  const router = useRouter();
  const { usuario } = useUser();
  const [rotasPermitidas, setRotasPermitidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  // ref do ViewShot
  const viewShotRef = useRef<ViewShot>(null);

  const opcoes = [
    { titulo: ' Separação', descricao: 'Separe os produtos do pedido', rota: '/separacaocomum', icone: 'play-circle' },
    { titulo: ' Buscar Item', descricao: 'Procure e localize itens específicos', rota: '/busca', icone: 'search' },
    { titulo: ' Transferência', descricao: 'Transfira produtos entre setores.', rota: '/transferencia', icone: 'repeat' },
    { titulo: ' Repor Varejo', descricao: 'Reposição de produtos no varejo.', rota: '/reporvarejo', icone: 'shopping-cart' },
    { titulo: ' Gerenciar Palete', descricao: 'Gerenciamento de objetos logísticos.', rota: '/criapalete', icone: 'package' },
    { titulo: ' Calculadora', descricao: 'Calculadora comum para operações diarias.', rota: '/calculadora', icone: 'cpu' },
    { titulo: ' Reposição', descricao: 'Lista de reposição de itens.', rota: '/reposicao', icone: 'upload' },
    { titulo: ' Locais', descricao: 'Lista de impressao de locais.', rota: '/locais', icone: 'map-pin' },
    { titulo: ' Recebimento', descricao: 'Recebimento de produtos no  Atacado.', rota: '/reporatacado', icone: 'map-pin' },
    { titulo: ' Locais Atacado', descricao: 'Lista de impressao de locais Atacado.', rota: '/locaisatacado', icone: 'map-pin' },
    { titulo: ' Balanças', descricao: 'Pesagem e etiquetagem das linhas TI400.', rota: '/balancas', icone: 'activity' },

  ] as const;

  useEffect(() => {
    async function carregarPermissoesDoUsuario() {
      try {
        if (!usuario?.id) {
          setRotasPermitidas([]);
          return;
        }

        const res = await LoginService.ObterUrlsExattoApp(usuario.id);
        if (res?.success && Array.isArray(res.data)) {
          setRotasPermitidas(res.data);
        } else {
          setRotasPermitidas([]);
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar permissões:', error);
        setRotasPermitidas([]);
      } finally {
        setCarregando(false);
      }
    }

    carregarPermissoesDoUsuario();
  }, [usuario]);

  // Função de print
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

  if (carregando) {
    return (
      <DrawerSceneWrapper>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: '#d1ccbd',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029' }}>
            Carregando permissões...
          </Text>
        </ScrollView>
      </DrawerSceneWrapper>
    );
  }

  const opcoesFiltradas = opcoes.filter((item) => rotasPermitidas.includes(item.rota));

  return (
    <DrawerSceneWrapper>
      {/* 🔹 Envolve a tela inteira no ViewShot */}
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#d1ccbd' }}>
          {/* Passa handlePrint para o Header */}
          <Header onPrint={handlePrint} />

          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              padding: 12,
              gap: 16,
            }}
          >
            {opcoesFiltradas.map((item, index) => (
              <View
                key={index}
                style={{
                  width: '46%',
                  backgroundColor: '#f0ead6',
                  borderRadius: 12,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 5,
                }}
              >
                <View style={{ backgroundColor: '#163029', paddingVertical: 6, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'Sina-Nova-Bold',
                      fontSize: 14,
                      color: '#f0ead6',
                      textAlign: 'center',
                    }}
                  >
                    {item.titulo}
                  </Text>
                </View>

                <View style={{ padding: 12, alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#d1ccbd', padding: 10, borderRadius: 32, marginBottom: 8 }}>
                    <Feather name={item.icone as any} size={24} color="#163029" />
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: '#163029',
                      fontFamily: 'Sina-Nova-Regular',
                      textAlign: 'center',
                      marginBottom: 8,
                    }}
                  >
                    {item.descricao}
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push(item.rota)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#163029',
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 6,
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontFamily: 'Sina-Nova-Bold',
                        textAlign: 'center',
                        letterSpacing: 1,
                      }}
                    >
                      Executar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animatable.View>
        </ScrollView>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}
