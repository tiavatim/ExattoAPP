import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import localService from 'src/services/localService';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onClose: () => void;
  palete: LocalDetalhado;
  onAtualizado?: () => void;
}

export default function ModalLocalizarPalete({ visible, onClose, palete, onAtualizado }: Props) {
  const [locais, setLocais] = useState<LocalDetalhado[]>([]);
  const [abrir, setAbrir] = useState(false);
  const [localSelecionado, setLocalSelecionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      carregarLocais();
    }
  }, [visible]);

  async function carregarLocais() {
    try {
      const lista = await localService.getLocaisDetalhadoAtacado();
      setLocais(lista);
      setLocalSelecionado(null);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao carregar locais', text2: err.message || '' });
    }
  }

  async function confirmar() {
    if (!localSelecionado) {
      Toast.show({ type: 'error', text1: 'Selecione um local' });
      return;
    }

    setLoading(true);
    try {
      await localService.atualizarParentLocation(palete.Location_Id, localSelecionado);
      Toast.show({ type: 'success', text1: 'Localização atualizada' });
      onAtualizado?.();
      onClose();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao atualizar', text2: err.message || '' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: '85%' }}>
          <Text style={{ fontSize: 18, fontFamily: 'Sina-Nova-Bold', color: '#163029', marginBottom: 12 }}>
            📍 Localizar Palete
          </Text>

          <DropDownPicker
            open={abrir}
            setOpen={setAbrir}
            value={localSelecionado}
            setValue={setLocalSelecionado}
            items={locais.map(l => ({
              label: `${l.Warehouse_Code} / ${l.Zone_Code} / ${l.Code}`,
              value: l.Location_Id,
            }))}
            placeholder="Selecione o local"
            searchable
            listMode="MODAL"
            style={{ borderColor: '#163029', marginBottom: 16 }}
            textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose}>
              <Text style={{ color: '#8b0000', fontFamily: 'Sina-Nova-Bold' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmar} disabled={loading}>
              <Text style={{ color: '#2F4B44', fontFamily: 'Sina-Nova-Bold' }}>
                {loading ? 'Salvando...' : 'Confirmar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
