import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

const SetupScreen = ({ navigation }) => {
  const [m3uUrl, setM3uUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const validateM3U = async (url) => {
    try {
      // Tentar fazer um GET completo para URLs com parâmetros
      const response = await fetch(url, {
        method: 'GET',
        timeout: 15000,
      });
      
      if (response.ok) {
        const content = await response.text();
        // Verificar se o conteúdo parece ser M3U
        return content.includes('#EXTM3U') || 
               content.includes('#EXTINF') || 
               url.includes('.m3u') || 
               url.includes('m3u8') ||
               url.includes('type=m3u');
      }
      return false;
    } catch (error) {
      console.error('Erro na validação:', error);
      // Para URLs com parâmetros de IPTV, assumir válida se tem indicadores M3U
      return url.includes('.m3u') || 
             url.includes('m3u8') || 
             url.includes('type=m3u') ||
             url.includes('output=m3u');
    }
  };

  const handleSaveConfiguration = async () => {
    if (!m3uUrl.trim()) {
      Alert.alert('Erro', 'Por favor, insira a URL da lista M3U');
      return;
    }

    if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
      Alert.alert('Erro', 'Por favor, insira uma URL válida (http:// ou https://)');
      return;
    }

    setLoading(true);

    try {
      const isValid = await validateM3U(m3uUrl);
      
      if (!isValid) {
        Alert.alert(
          'Validação da URL',
          'Não foi possível validar automaticamente esta URL. Deseja tentar configurar mesmo assim?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
            { 
              text: 'Configurar Mesmo Assim', 
              onPress: () => saveAndProceed()
            }
          ]
        );
        return;
      }

      await saveAndProceed();
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Erro de Conexão', 
        'Não foi possível validar a URL. Verifique sua conexão e tente novamente, ou configure sem validação.',
        [
          { text: 'Tentar Novamente', onPress: handleSaveConfiguration },
          { text: 'Configurar Sem Validação', onPress: saveAndProceed }
        ]
      );
    }
  };

  const saveAndProceed = async () => {
    try {
      await AsyncStorage.setItem('m3u_url', m3uUrl.trim());
      
      // Reset navigation stack and go to main app
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Erro', 'Não foi possível salvar a configuração');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="tv" size={80} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Bem-vindo ao IPTV Pro</Text>
            <Text style={styles.subtitle}>
              Configure sua lista M3U para começar a assistir seus canais favoritos
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>URL da Lista M3U</Text>
              <TextInput
                style={styles.input}
                placeholder="https://exemplo.com/lista.m3u"
                placeholderTextColor="#999"
                value={m3uUrl}
                onChangeText={setM3uUrl}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleSaveConfiguration}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSaveConfiguration}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Configurar</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Dicas:</Text>
              <Text style={styles.infoText}>
                • A URL deve começar com http:// ou https://
              </Text>
              <Text style={styles.infoText}>
                • Certifique-se que a lista M3U está acessível
              </Text>
              <Text style={styles.infoText}>
                • Você pode alterar esta configuração depois nas configurações
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default SetupScreen;