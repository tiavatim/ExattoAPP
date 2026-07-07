import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { Text, View, TouchableOpacity } from 'react-native';

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#198754', backgroundColor: '#d1ccbd', minHeight: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15, flex: 1 }}
      text1Style={{ fontSize: 15, color: '#163029', fontFamily: 'Sina-Nova-Bold' }}
      text2Style={{ fontSize: 13, color: '#163029', fontFamily: 'Sina-Nova-Regular', flexWrap: 'wrap' }}
      renderLeadingIcon={() => (
        <Feather name="check-circle" size={24} color="#198754" style={{ marginLeft: 8 }} />
      )}
      renderTrailingIcon={() => (
        <TouchableOpacity onPress={() => props.hide()}>
          <Feather name="x" size={20} color="#163029" style={{ marginRight: 10 }} />
        </TouchableOpacity>
      )}
    />
  ),

  error: (props: any) => {
    const maxChars = 80;
    const isLong = props.text2?.length > maxChars;
    const [expanded, setExpanded] = useState(false);

    return (
      <View
        style={{
          backgroundColor: '#d1ccbd',
          borderLeftColor: '#dc3545',
          borderLeftWidth: 5,
          padding: 15,
          marginHorizontal: 10,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'flex-start',
          minHeight: 80,
        }}
      >
        <Feather name="alert-circle" size={24} color="#dc3545" style={{ marginRight: 10, marginTop: 4 }} />

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Sina-Nova-Bold', color: '#163029', marginBottom: 4 }}>
            {props.text1}
          </Text>

          <Text style={{ fontSize: 13, fontFamily: 'Sina-Nova-Regular', color: '#163029' }}>
            {isLong && !expanded
              ? `${props.text2.substring(0, maxChars)}...`
              : props.text2}
          </Text>

          {isLong && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Sina-Nova-Bold', color: '#dc3545' }}>
                {expanded ? 'Ver menos ▲' : 'Ver mais ▼'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => props.hide()} style={{ marginLeft: 8 }}>
          <Feather name="x" size={20} color="#163029" />
        </TouchableOpacity>
      </View>
    );
  },
};
