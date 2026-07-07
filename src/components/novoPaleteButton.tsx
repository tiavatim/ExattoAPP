import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import localService from 'src/services/localService';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';

interface Props {
  idUsuario: number;
  onPaleteCriado: (palete: LocalDetalhado) => void;
}

export default function NovoPaleteButton({
  idUsuario,
  onPaleteCriado,
}: Props) {
  const [loading, setLoading] = useState(false);

  const criarPalete = async () => {
    setLoading(true);
 
    try {
      const novo = await localService.inserirPalete(idUsuario);



      if (novo) {
        Toast.show({
          type: 'success',
          text1: 'Palete criado',
          text2: `Código: ${novo.Code}`,
        });

    
        onPaleteCriado(novo);
      } else {
        console.warn('⚠️ Nenhum palete retornado da API');
      }
    } catch (err: any) {
      console.error('❌ Erro ao criar palete:', err.message || err);
      Toast.show({
        type: 'error',
        text1: 'Erro ao criar palete',
        text2: err.message || 'Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={criarPalete}
      disabled={loading}
      style={{
        backgroundColor: '#2F4B44',
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 16,
        alignItems: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>
          + Novo Palete
        </Text>
      )}
    </Pressable>
  );
}
