import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PlayerScreen = ({ navigation, route }) => {
  const { channel } = route.params;
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const hideControlsTimeout = useRef(null);

  useEffect(() => {
    // Auto-hide controls
    resetHideControlsTimer();

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const resetHideControlsTimer = () => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    setControlsVisible(true);
    hideControlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  const onLoadStart = () => {
    setLoading(true);
    setError(false);
    setIsBuffering(true);
  };

  const onLoad = () => {
    setLoading(false);
    setError(false);
    setIsBuffering(false);
  };

  const onError = (error) => {
    console.error('Erro no player:', error);
    setLoading(false);
    setError(true);
    setIsBuffering(false);
    
    Alert.alert(
      'Erro de Reprodução',
      'Não foi possível reproduzir este canal. Verifique sua conexão ou tente novamente.',
      [
        { text: 'Tentar Novamente', onPress: retryPlayback },
        { text: 'Voltar', onPress: () => navigation.goBack() }
      ]
    );
  };

  const onBuffer = ({ isBuffering }) => {
    setIsBuffering(isBuffering);
  };

  const onPlaybackStatusUpdate = (playbackStatus) => {
    setStatus(playbackStatus);
    
    if (playbackStatus.error) {
      onError(playbackStatus.error);
    }
  };

  const retryPlayback = async () => {
    setError(false);
    setLoading(true);
    
    try {
      if (videoRef.current) {
        await videoRef.current.loadAsync({ uri: channel.url }, {}, false);
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Erro ao tentar novamente:', error);
      setError(true);
      setLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Erro ao pausar/reproduzir:', error);
    }
  };

  const handleScreenTouch = () => {
    resetHideControlsTimer();
  };

  const goBack = () => {
    navigation.goBack();
  };

  const renderControls = () => {
    if (!controlsVisible) return null;

    return (
      <View style={styles.controlsContainer}>
        {/* Header Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.channelInfo}>
            <Text style={styles.channelName} numberOfLines={1}>
              {channel.name}
            </Text>
            <Text style={styles.channelGroup}>{channel.group}</Text>
          </View>
        </View>

        {/* Center Controls */}
        <View style={styles.centerControls}>
          {(loading || isBuffering) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                {loading ? 'Carregando...' : 'Buffer...'}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>Erro na reprodução</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryPlayback}>
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && !isBuffering && (
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
            >
              <Ionicons
                name={status.isPlaying ? "pause" : "play"}
                size={48}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.statusInfo}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: status.isPlaying ? '#4CAF50' : '#FF6B6B' }
            ]} />
            <Text style={styles.statusText}>
              {status.isPlaying ? 'AO VIVO' : 'PAUSADO'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handleScreenTouch}
      >
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: channel.url }}
          shouldPlay
          isLooping={false}
          resizeMode="contain"
          onLoadStart={onLoadStart}
          onLoad={onLoad}
          onError={onError}
          onBuffer={onBuffer}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
        />
      </TouchableOpacity>

      {renderControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  channelGroup: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 35,
    padding: 15,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PlayerScreen;