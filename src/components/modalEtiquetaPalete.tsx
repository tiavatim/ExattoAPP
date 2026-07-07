import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import EtiquetaPalete from 'src/components/etiquetaPalete';

interface Props {
  visible: boolean;
  onClose: () => void;
  palete: LocalDetalhado;
}

export default function ModalEtiquetaPalete({ visible, onClose, palete }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: '85%' }}>
          <Text style={{ fontSize: 18, fontFamily: 'Sina-Nova-Bold', color: '#163029', marginBottom: 12 }}>
            🏷️ Etiqueta do Palete
          </Text>

          <View style={{ backgroundColor: '#eee', padding: 16, borderRadius: 6, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Sina-Nova-Bold', color: '#2F4B44' }}>
              Código: {palete.Label_Code}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Sina-Nova-Regular', color: '#163029' }}>
              {palete.Warehouse_Code} / {palete.Zone_Code} / {palete.Aisle_Code} / {palete.Rack_Code} / {palete.Shelf_Code} / {palete.Bin_Code}
            </Text>
          </View>

          <EtiquetaPalete
            numberCode={palete.Label_Code}
            idLocation={String(palete.Location_Id)}
          />

          <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'flex-end' }}>
            <Text style={{ color: '#8b0000', fontFamily: 'Sina-Nova-Bold' }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
