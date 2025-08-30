import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import xtreamService from '../services/XtreamService';

const SeriesScreen = ({ navigation }) => {
  const [series, setSeries] = useState([]);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [seriesInCategory, setSeriesInCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteSeries, setFavoriteSeries] = useState([]);
  const [totalSeriesCount, setTotalSeriesCount] = useState(0);
  const [isXtreamMode, setIsXtreamMode] = useState(false);

  useEffect(() => {
    initializeScreen();
    loadFavoriteSeries();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [seriesCategories, searchQuery]);

  const initializeScreen = async () => {
    try {
      const connectionType = await AsyncStorage.getItem('connection_type');
      
      if (connectionType === 'xtream') {
        setIsXtreamMode(true);
        const initialized = await xtreamService.init();
        if (initialized) {
          await loadSeriesFromXtream();
        } else {
          Alert.alert('Erro', 'Não foi possível conectar ao Xtream Codes');
          setLoading(false);
        }
      } else {
        setIsXtreamMode(false);
        await loadSeriesFromM3u();
      }
    } catch (error) {
      console.error('Erro ao inicializar tela de séries:', error);
      setLoading(false);
    }
  };

  const loadSeriesFromXtream = async () => {
    try {
      console.log('📺 Carregando séries do Xtream Codes...');
      
      // Buscar categorias de séries
      const categoriesResult = await xtreamService.getContent('series_categories');
      
      if (categoriesResult.success) {
        console.log('📁 Categorias encontradas:', categoriesResult.categories.length);
        
        // Organizar categorias
        const organizedCategories = categoriesResult.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: 'series',
          seriesCount: 0 // Será preenchido quando carregar as séries
        }));
        
        setSeriesCategories(organizedCategories);
        
        // Buscar todas as séries para contagem
        const allSeriesResult = await xtreamService.getContent('series');
        
        if (allSeriesResult.success) {
          console.log('📺 Total de séries:', allSeriesResult.series.length);
          setTotalSeriesCount(allSeriesResult.series.length);
          setSeries(allSeriesResult.series);
          
          // Contar séries por categoria
          const categoriesWithCount = organizedCategories.map(cat => {
            const count = allSeriesResult.series.filter(serie => 
              serie.group === cat.name
            ).length;
            return { ...cat, seriesCount: count };
          });
          
          setSeriesCategories(categoriesWithCount);
        }
      } else {
        throw new Error(categoriesResult.error || 'Erro ao buscar categorias');
      }
    } catch (error) {
      console.error('Erro ao carregar séries do Xtream:', error);
      Alert.alert('Erro', 'Não foi possível carregar as séries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSeriesFromM3u = async () => {
    // Fallback para modo M3U (código anterior adaptado)
    try {
      const m3uUrl = await AsyncStorage.getItem('m3u_url');
      if (!m3uUrl) {
        setLoading(false);
        return;
      }

      console.log('📺 Carregando séries do M3U...');
      const response = await fetch(m3uUrl);
      const content = await response.text();
      const allChannels = parseM3U(content);
      
      // Filtrar séries usando a lógica anterior
      const seriesChannels = allChannels.filter(channel => isVodSeries(channel));
      
      setSeries(seriesChannels);
      setTotalSeriesCount(seriesChannels.length);
      
      // Organizar por grupos
      const groupedSeries = organizeSeriesByGroups(seriesChannels);
      setSeriesCategories(groupedSeries);
      
    } catch (error) {
      console.error('Erro ao carregar séries do M3U:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVodSeries = (channel) => {
    const name = channel.name.toLowerCase();
    const group = (channel.group || '').toLowerCase();
    
    const seriesKeywords = ['serie', 'temporada', 's01', 'e01', 'season', 'episode'];
    const isSeries = seriesKeywords.some(keyword => 
      name.includes(keyword) || group.includes(keyword)
    );
    
    const movieKeywords = ['filme', 'movie', 'cinema', 'lançamento'];
    const isMovie = movieKeywords.some(keyword => 
      name.includes(keyword) || group.includes(keyword)
    );
    
    return isSeries && !isMovie;
  };

  const parseM3U = (content) => {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};
    let channelIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        const logoMatch = info.match(/tvg-logo="([^"]+)"/i);
        const groupMatch = info.match(/group-title="([^"]+)"/i);
        
        currentChannel = {
          id: `series_${channelIndex}_${Date.now()}`,
          name: nameMatch ? nameMatch[1].trim() : 'Série sem nome',
          logo: logoMatch ? logoMatch[1] : null,
          group: groupMatch ? groupMatch[1] : 'Séries',
        };
        channelIndex++;
      } else if (line.startsWith('http')) {
        if (currentChannel.name) {
          currentChannel.url = line;
          channels.push({ ...currentChannel });
          currentChannel = {};
        }
      }
    }

    return channels;
  };

  const organizeSeriesByGroups = (series) => {
    const groups = {};
    
    series.forEach(serie => {
      const groupName = serie.group || 'Séries Diversas';
      
      if (!groups[groupName]) {
        groups[groupName] = {
          id: groupName,
          name: groupName,
          seriesCount: 0
        };
      }
      
      groups[groupName].seriesCount++;
    });

    return Object.values(groups).sort((a, b) => b.seriesCount - a.seriesCount);
  };

  const loadFavoriteSeries = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_series');
      if (favorites) {
        setFavoriteSeries(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Erro ao carregar séries favoritas:', error);
    }
  };

  const filterCategories = () => {
    let filtered = seriesCategories;

    if (searchQuery.trim()) {
      filtered = seriesCategories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  };

  const openCategory = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    
    try {
      if (isXtreamMode) {
        // Buscar séries da categoria específica via Xtream API
        const result = await xtreamService.getContent('series', category.id);
        
        if (result.success) {
          let seriesToShow = result.series;
          
          if (searchQuery.trim()) {
            seriesToShow = result.series.filter(serie =>
              serie.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          setSeriesInCategory(seriesToShow);
        } else {
          Alert.alert('Erro', 'Não foi possível carregar as séries da categoria');
        }
      } else {
        // Modo M3U - filtrar séries por grupo
        let seriesToShow = series.filter(serie => serie.group === category.name);
        
        if (searchQuery.trim()) {
          seriesToShow = seriesToShow.filter(serie =>
            serie.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setSeriesInCategory(seriesToShow);
      }
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      Alert.alert('Erro', 'Não foi possível carregar as séries');
    } finally {
      setLoading(false);
    }
  };

  const goBackToCategories = () => {
    setSelectedCategory(null);
    setSeriesInCategory([]);
  };

  const getGroupIcon = (groupName) => {
    const name = groupName.toLowerCase();
    
    // Ícones baseados em plataformas
    if (name.includes('netflix')) return 'tv';
    if (name.includes('hbo') || name.includes('max')) return 'star';
    if (name.includes('disney')) return 'happy';
    if (name.includes('amazon') || name.includes('prime')) return 'storefront';
    if (name.includes('apple')) return 'logo-apple';
    if (name.includes('globo')) return 'globe';
    
    // Ícones baseados no gênero
    if (name.includes('drama')) return 'sad';
    if (name.includes('comédia') || name.includes('comedy')) return 'happy';
    if (name.includes('ação') || name.includes('action')) return 'flash';
    if (name.includes('thriller') || name.includes('suspense')) return 'eye';
    if (name.includes('sci-fi') || name.includes('ficção')) return 'planet';
    if (name.includes('horror') || name.includes('terror')) return 'skull';
    if (name.includes('animação') || name.includes('animation')) return 'color-palette';
    if (name.includes('romance')) return 'heart';
    if (name.includes('crime') || name.includes('policial')) return 'shield';
    if (name.includes('documentário')) return 'library';
    if (name.includes('kids') || name.includes('infantil')) return 'happy';
    if (name.includes('nacional') || name.includes('brasileiro')) return 'flag';
    if (name.includes('internacional')) return 'globe';
    if (name.includes('sitcom')) return 'chatbubbles';
    if (name.includes('novela') || name.includes('soap')) return 'heart-circle';
    if (name.includes('miniserie') || name.includes('minisserie')) return 'layers';
    
    return 'library';
  };

  const toggleFavorite = async (serie) => {
    try {
      const isFavorite = favoriteSeries.some(fav => fav.id === serie.id);
      let newFavorites;

      if (isFavorite) {
        newFavorites = favoriteSeries.filter(fav => fav.id !== serie.id);
      } else {
        newFavorites = [...favoriteSeries, serie];
      }

      setFavoriteSeries(newFavorites);
      await AsyncStorage.setItem('favorite_series', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erro ao salvar série favorita:', error);
      Alert.alert('Erro', 'Não foi possível salvar o favorito');
    }
  };

  const playSeries = async (serie) => {
    try {
      // Se for Xtream Codes, verificar se há múltiplos episódios
      if (isXtreamMode && serie.type === 'series') {
        // Buscar informações da série para mostrar episódios
        const seriesInfo = await xtreamService.getSeriesInfo(serie.id);
        
        if (seriesInfo.success && seriesInfo.seriesInfo.seasonsCount > 0) {
          // Navegar para tela de episódios (implementar depois)
          Alert.alert(
            'Série com Episódios',
            `Esta série tem ${seriesInfo.seriesInfo.totalEpisodes} episódios em ${seriesInfo.seriesInfo.seasonsCount} temporadas.\n\nImplementar tela de episódios?`,
            [
              { text: 'OK', onPress: () => {
                // Por enquanto, reproduzir o primeiro episódio da primeira temporada
                const firstSeason = Object.keys(seriesInfo.seriesInfo.seasons)[0];
                const firstEpisode = seriesInfo.seriesInfo.seasons[firstSeason][0];
                if (firstEpisode) {
                  navigation.navigate('Player', { channel: { ...serie, url: firstEpisode.url, name: firstEpisode.title } });
                }
              }}
            ]
          );
          return;
        }
      }
      
      // Adicionar às séries recentes
      const recentSeries = await AsyncStorage.getItem('recent_series');
      const recent = recentSeries ? JSON.parse(recentSeries) : [];
      const newRecent = [serie, ...recent.filter(s => s.id !== serie.id)].slice(0, 10);
      await AsyncStorage.setItem('recent_series', JSON.stringify(newRecent));
      
      // Navegar para o player
      navigation.navigate('Player', { channel: serie });
    } catch (error) {
      console.error('Erro ao reproduzir série:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir a série');
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => openCategory(item)}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name={getGroupIcon(item.name)} size={24} color="#7B68EE" />
      </View>
      
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.categorySeriesCount}>
          {item.seriesCount} séries
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderSeriesItem = ({ item }) => {
    const isFavorite = favoriteSeries.some(fav => fav.id === item.id);
    
    return (
      <TouchableOpacity
        style={styles.seriesItem}
        onPress={() => playSeries(item)}
      >
        <View style={styles.seriesInfo}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.seriesLogo} />
          ) : (
            <View style={styles.seriesLogoPlaceholder}>
              <Ionicons name="library" size={24} color="#7B68EE" />
            </View>
          )}
          
          <View style={styles.seriesDetails}>
            <Text style={styles.seriesName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.seriesGroup}>{item.group}</Text>
            {item.year && (
              <Text style={styles.seriesYear}>{item.year}</Text>
            )}
            {item.rating && (
              <Text style={styles.seriesRating}>⭐ {item.rating}</Text>
            )}
          </View>
        </View>

        <View style={styles.seriesActions}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#FF6B6B" : "#666"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => playSeries(item)}
          >
            <Ionicons name="play" size={20} color="#7B68EE" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !selectedCategory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B68EE" />
        <Text style={styles.loadingText}>
          {isXtreamMode ? 'Carregando séries do Xtream Codes...' : 'Carregando séries...'}
        </Text>
        <Text style={styles.loadingSubText}>
          {isXtreamMode ? 'Organizando por categorias' : 'Analisando lista M3U'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com busca e navegação */}
      <View style={styles.header}>
        {selectedCategory && (
          <TouchableOpacity style={styles.backButton} onPress={goBackToCategories}>
            <Ionicons name="arrow-back" size={24} color="#7B68EE" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={selectedCategory ? `Buscar em ${selectedCategory.name}...` : "Buscar séries..."}
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Lista de Categorias ou Séries */}
      <View style={styles.contentContainer}>
        {!selectedCategory ? (
          // Mostrar lista de categorias
          <>
            <View style={styles.statsContainer}>
              <Ionicons name="library" size={20} color="#7B68EE" />
              <Text style={styles.statsText}>
                {filteredCategories.length} categorias • {totalSeriesCount.toLocaleString()} séries
                {isXtreamMode && <Text style={styles.xtreamBadge}> • Xtream API</Text>}
              </Text>
            </View>

            <FlatList
              data={filteredCategories}
              renderItem={renderCategoryItem}
              keyExtractor={(item, index) => `series-category-${item.id || index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="library-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Nenhuma categoria encontrada' : 'Nenhuma série disponível'}
                  </Text>
                  {searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Tente buscar por outro termo
                    </Text>
                  )}
                </View>
              }
            />
          </>
        ) : (
          // Mostrar séries da categoria selecionada
          <>
            <View style={styles.statsContainer}>
              <Ionicons name={getGroupIcon(selectedCategory.name)} size={20} color="#7B68EE" />
              <Text style={styles.statsText}>
                {loading ? 'Carregando...' : `${seriesInCategory.length} séries em "${selectedCategory.name}"`}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7B68EE" />
                <Text style={styles.loadingText}>Carregando séries da categoria...</Text>
              </View>
            ) : (
              <FlatList
                data={seriesInCategory}
                renderItem={renderSeriesItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="library-outline" size={64} color="#666" />
                    <Text style={styles.emptyText}>
                      {searchQuery 
                        ? `Nenhuma série encontrada em "${selectedCategory.name}"` 
                        : `Nenhuma série disponível em "${selectedCategory.name}"`
                      }
                    </Text>
                    {searchQuery && (
                      <Text style={styles.emptySubtext}>
                        Tente buscar por outro termo
                      </Text>
                    )}
                  </View>
                }
              />
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  loadingSubText: {
    color: '#666',
    marginTop: 5,
    fontSize: 14,
  },
  header: {
    backgroundColor: '#1a1a1a',
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#7B68EE',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  xtreamBadge: {
    color: '#7B68EE',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#7B68EE',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categorySeriesCount: {
    color: '#666',
    fontSize: 14,
  },
  seriesItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  seriesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seriesLogo: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  seriesLogoPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  seriesDetails: {
    flex: 1,
  },
  seriesName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  seriesGroup: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  seriesYear: {
    color: '#7B68EE',
    fontSize: 12,
    marginBottom: 2,
  },
  seriesRating: {
    color: '#FFD700',
    fontSize: 12,
  },
  seriesActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 10,
    marginRight: 5,
  },
  playButton: {
    backgroundColor: '#7B68EE',
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default SeriesScreen;