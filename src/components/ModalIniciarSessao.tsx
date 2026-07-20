import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { UsuarioInterfaceProps } from '@/interfaces/usuarioInterface';
import { OperadorItem } from '@/interfaces/ti400Interface';
import ti400Service from '@/services/ti400Service';

interface Props {
  visible: boolean;
  linhaNome: string;
  loading: boolean;
  usuario: UsuarioInterfaceProps;
  podeAtribuirOperador: boolean;
  onConfirmar: (lote: number, idColaborador: number) => void;
  onCancelar: () => void;
}

export default function ModalIniciarSessao({
  visible,
  linhaNome,
  loading,
  usuario,
  podeAtribuirOperador,
  onConfirmar,
  onCancelar,
}: Props) {
  const [lote, setLote] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [operadores, setOperadores] = useState<OperadorItem[]>([]);
  const [abrirOperadores, setAbrirOperadores] = useState(false);
  const [carregandoOperadores, setCarregandoOperadores] = useState(false);
  const operadorPadrao = String(usuario.id);

  useEffect(() => {
    if (!visible) {
      setLote('');
      setColaborador('');
      setAbrirOperadores(false);
      return;
    }

    if (!podeAtribuirOperador) {
      setColaborador(operadorPadrao);
      setAbrirOperadores(false);
      return;
    }

    setCarregandoOperadores(true);
    ti400Service.getOperadores()
      .then(setOperadores)
      .catch(() => setOperadores([]))
      .finally(() => setCarregandoOperadores(false));
  }, [visible, podeAtribuirOperador, operadorPadrao]);

  const operadorItems = useMemo(
    () => [
      {
        label: `${usuario.dsPessoa} · Matrícula ${usuario.id}`,
        value: operadorPadrao,
      },
      ...operadores
        .filter(item => item.id !== usuario.id)
        .map(item => ({
          label: `${item.nome} · Matrícula ${item.id}`,
          value: String(item.id),
        })),
    ],
    [operadores, operadorPadrao, usuario.dsPessoa, usuario.id],
  );

  const loteNum = parseInt(lote, 10);
  const colNum = parseInt(colaborador, 10);
  const valido = !isNaN(loteNum) && loteNum > 0 && !isNaN(colNum) && colNum > 0;

  function confirmar() {
    if (!valido) return;
    onConfirmar(loteNum, colNum);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View style={modalCard}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: '#163029', marginBottom: 2 }}>
            Iniciar Sessão
          </Text>
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#2F4B44', marginBottom: 20 }}>
            {linhaNome}
          </Text>

          <Text style={label}>OP / Lote</Text>
          <TextInput
            value={lote}
            onChangeText={setLote}
            keyboardType="numeric"
            placeholder="Ex: 42"
            placeholderTextColor="#9ca3af"
            style={input}
            editable={!loading}
          />

          <Text style={[label, { marginTop: 14 }]}>Matrícula do Colaborador</Text>
          {podeAtribuirOperador ? (
            <View style={{ zIndex: 2000, elevation: 2000 }}>
              <DropDownPicker
                open={abrirOperadores}
                setOpen={setAbrirOperadores}
                value={colaborador || null}
                setValue={(callback) => {
                  const novoValor = typeof callback === 'function' ? callback(colaborador || null) : callback;
                  setColaborador(novoValor ?? '');
                }}
                items={operadorItems}
                placeholder={carregandoOperadores ? 'Carregando operadores...' : 'Selecione um operador'}
                searchable
                searchPlaceholder="Buscar por nome ou matrícula..."
                loading={carregandoOperadores}
                disabled={loading || carregandoOperadores}
                closeAfterSelecting
                listMode="SCROLLVIEW"
                dropDownDirection="BOTTOM"
                zIndex={2000}
                zIndexInverse={1000}
                maxHeight={180}
                style={comboInput}
                textStyle={comboText}
                placeholderStyle={comboPlaceholder}
                dropDownContainerStyle={comboDropdown}
                searchContainerStyle={comboSearchContainer}
                searchTextInputStyle={comboSearchInput}
                disabledStyle={comboDisabled}
              />
            </View>
          ) : (
            <TextInput
              value={`${usuario.dsPessoa} · Matrícula ${usuario.id}`}
              keyboardType="numeric"
              placeholder="Ex: 1234"
              placeholderTextColor="#9ca3af"
              style={[input, { backgroundColor: '#e5e2d8', color: '#6b7280' }]}
              editable={false}
            />
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <Pressable
              onPress={onCancelar}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#163029',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmar}
              disabled={!valido || loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 6,
                backgroundColor: valido && !loading ? '#163029' : '#9ca3af',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading
                ? <ActivityIndicator color="#d1ccbd" size="small" />
                : (
                  <>
                    <Feather name="play" size={15} color="#d1ccbd" />
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#d1ccbd' }}>
                      Iniciar
                    </Text>
                  </>
                )
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const label = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 14,
  color: '#163029',
  marginBottom: 6,
};

const modalCard = {
  alignSelf: 'center' as const,
  backgroundColor: '#f0ead6',
  borderRadius: 12,
  height: 330,
  maxWidth: 420,
  overflow: 'visible' as const,
  padding: 20,
  width: '100%' as const,
};

const input = {
  backgroundColor: '#fff',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 14,
  fontSize: 16,
  fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029',
  borderWidth: 1,
  borderColor: '#c8c4ba',
};

const comboInput = {
  backgroundColor: '#fff',
  borderRadius: 8,
  borderColor: '#c8c4ba',
  minHeight: 50,
};

const comboText = {
  fontFamily: 'Sina-Nova-Regular' as const,
  fontSize: 15,
  color: '#163029',
};

const comboPlaceholder = {
  fontFamily: 'Sina-Nova-Regular' as const,
  fontSize: 15,
  color: '#9ca3af',
};

const comboDropdown = {
  backgroundColor: '#fff',
  borderColor: '#c8c4ba',
  borderRadius: 8,
};

const comboSearchContainer = {
  borderBottomColor: '#e5e2d8',
  padding: 8,
};

const comboSearchInput = {
  borderColor: '#c8c4ba',
  borderRadius: 6,
  color: '#163029',
  fontFamily: 'Sina-Nova-Regular' as const,
  minHeight: 40,
};

const comboDisabled = {
  backgroundColor: '#e5e2d8',
  opacity: 0.8,
};
