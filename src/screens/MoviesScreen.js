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

const MoviesScreen = ({ navigation }) => {
  const [movies, setMovies] = useState([]);
  const [movieGroups, setMovieGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [moviesInGroup, setMoviesInGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [totalMoviesCount, setTotalMoviesCount] = useState(0);

  useEffect(() => {
    loadMovies();
    loadFavoriteMovies();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [movieGroups, searchQuery]);

  const isVodMovie = (channel) => {
    const name = channel.name.toLowerCase();
    const group = (channel.group || '').toLowerCase();
    const url = (channel.url || '').toLowerCase();
    
    // PRIMEIRO: Verificar se é VOD (Video On Demand) através da URL
    const isVodUrl = url.includes('/movie/') || 
                     url.includes('/filme/') || 
                     url.includes('/movies/') ||
                     url.includes('/filmes/') ||
                     url.includes('movie') ||
                     url.includes('filme');

    // SEGUNDO: Verificar grupos que claramente indicam VOD de filmes
    const movieVodGroups = [
      // Grupos explícitos de filmes VOD
      'filmes', 'filme', 'movies', 'movie', 'cinema',
      
      // Padrões comuns de grupos VOD
      'filmes |', '| filmes', 'movies |', '| movies',
      'filme |', '| filme', 'movie |', '| movie',
      'cinema |', '| cinema',
      
      // Por ano (típico de VOD)
      'lançamentos', 'lancamentos', 'releases',
      '2024', '2023', '2022', '2021', '2020', '2019',
      
      // Por gênero (típico de VOD)
      'ação', 'acao', 'action', 'aventura', 'adventure',
      'comédia', 'comedia', 'comedy', 'drama', 'suspense',
      'thriller', 'terror', 'horror', 'romance', 'romântico',
      'ficção', 'sci-fi', 'fantasia', 'fantasy', 'animação',
      'animation', 'documentário', 'documentary',
      
      // Qualidade (típico de VOD)
      'hd', 'full hd', '4k', 'uhd', 'bluray', 'blu-ray',
      'dvdrip', 'webrip', 'hdtv', 'cam', 'ts',
      
      // Idioma (típico de VOD)
      'dublado', 'legendado', 'dual', 'nacional'
    ];

    const isMovieVodGroup = movieVodGroups.some(keyword => 
      group.includes(keyword)
    );

    // TERCEIRO: Verificar nomes que indicam filmes VOD
    const movieVodNames = [
      // Indicadores diretos
      'filme', 'movie', 'cinema',
      
      // Anos no nome (comum em VOD)
      '(2024)', '(2023)', '(2022)', '(2021)', '(2020)',
      '[2024]', '[2023]', '[2022]', '[2021]', '[2020]',
      '- 2024', '- 2023', '- 2022', '- 2021', '- 2020',
      
      // Qualidade no nome (comum em VOD)
      'hd', 'full hd', '4k', 'uhd', 'bluray', 'blu-ray',
      'dvdrip', 'webrip', 'hdtv', 'cam', 'ts', 'r5',
      
      // Idioma no nome (comum em VOD)
      'dublado', 'legendado', 'dual audio', 'nacional',
      
      // Padrões de nomeação VOD
      'vol.', 'part', 'parte', 'disc', 'disco'
    ];

    const isMovieVodName = movieVodNames.some(keyword => 
      name.includes(keyword)
    );

    // QUARTO: Excluir explicitamente canais de TV ao vivo
    const liveChannelKeywords = [
      // Canais brasileiros
      'globo', 'sbt', 'record', 'band', 'rede tv', 'cultura',
      'tv brasil', 'tv senado', 'tv câmara', 'tv justiça',
      
      // Canais por assinatura
      'multishow', 'gnt', 'sportv', 'telecine', 'hbo max',
      'fox', 'universal', 'sony', 'warner', 'paramount',
      
      // Esportes
      'espn', 'fox sports', 'premiere', 'combate',
      
      // Notícias
      'cnn', 'bbc', 'band news', 'globo news', 'sbt news',
      
      // Música
      'mtv', 'music', 'vh1', 'bis',
      
      // Documentários (canais)
      'discovery channel', 'history channel', 'natgeo',
      'animal planet', 'investigation',
      
      // Infantil (canais)
      'cartoon network', 'nickelodeon', 'disney channel',
      
      // Indicadores de TV ao vivo
      'ao vivo', 'live', 'canal', 'tv ', ' tv',
      'broadcasting', 'stream', 'transmissão'
    ];

    const isLiveChannel = liveChannelKeywords.some(keyword => 
      name.includes(keyword) || group.includes(keyword)
    );

    // QUINTO: Excluir séries VOD
    const seriesVodKeywords = [
      'serie', 'series', 'série', 'séries', 'temporada',
      'season', 'episodio', 'episode', 'ep ', ' ep',
      's01', 's02', 's03', 's04', 's05', 's06', 's07',
      'e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07',
      't01', 't02', 't03', 'temp', 'sitcom', 'miniserie'
    ];

    const isSeriesVod = seriesVodKeywords.some(keyword => 
      name.includes(keyword) || group.includes(keyword)
    );

    // LÓGICA FINAL: É filme VOD se:
    // 1. É VOD (URL, grupo ou nome indicam) E
    // 2. NÃO é canal de TV ao vivo E
    // 3. NÃO é série VOD
    const isVod = isVodUrl || isMovieVodGroup || isMovieVodName;
    
    return isVod && !isLiveChannel && !isSeriesVod;
  };

  const loadMovies = async () => {
    try {
      await loadMoviesFromUrl();
    } catch (error) {
      console.error('Erro ao carregar filmes da URL:', error);
      try {
        const cachedMovies = await AsyncStorage.getItem('cached_movies');
        if (cachedMovies) {
          console.log('Carregando filmes do cache...');
          const movieChannels = JSON.parse(cachedMovies);
          setMovies(movieChannels);
          setTotalMoviesCount(movieChannels.length);
          const groupedMovies = organizeMoviesByGroups(movieChannels);
          setMovieGroups(groupedMovies);
        }
      } catch (cacheError) {
        console.error('Erro ao carregar cache de filmes:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoviesFromUrl = async () => {
    try {
      const m3uUrl = await AsyncStorage.getItem('m3u_url');
      if (!m3uUrl) return;

      console.log('🎬 Carregando filmes VOD da URL M3U...');
      const response = await fetch(m3uUrl);
      const content = await response.text();
      const allChannels = parseM3U(content);
      
      console.log('📊 Total de itens encontrados:', allChannels.length);
      
      // Filtrar apenas filmes VOD
      const movieChannels = allChannels.filter(channel => isVodMovie(channel));
      
      console.log('🎬 Filmes VOD encontrados:', movieChannels.length);
      console.log('🔍 Primeiros 10 filmes:', movieChannels.slice(0, 10).map(m => ({ 
        name: m.name, 
        group: m.group,
        url: m.url?.substring(0, 50) + '...'
      })));
      
      setMovies(movieChannels);
      setTotalMoviesCount(movieChannels.length);
      
      // Organizar filmes por grupos
      const groupedMovies = organizeMoviesByGroups(movieChannels);
      setMovieGroups(groupedMovies);
      
      // Salvar cache
      try {
        await AsyncStorage.setItem('cached_movies', JSON.stringify(movieChannels.slice(0, 2000)));
        console.log('💾 Cache de filmes VOD salvo');
      } catch (storageError) {
        console.warn('⚠️ Não foi possível salvar cache de filmes:', storageError);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar filmes da URL:', error);
      throw error;
    }
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
          id: `movie_${channelIndex}_${Date.now()}`,
          name: nameMatch ? nameMatch[1].trim() : 'Filme sem nome',
          logo: logoMatch ? logoMatch[1] : null,
          group: groupMatch ? groupMatch[1] : 'Filmes',
        };
        channelIndex++;
      } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
        if (currentChannel.name) {
          currentChannel.url = line;
          channels.push({ ...currentChannel });
          currentChannel = {};
        }
      }
    }

    return channels;
  };

  const organizeMoviesByGroups = (movies) => {
    const groups = {};
    
    movies.forEach(movie => {
      let groupName = movie.group || 'Filmes Diversos';
      
      // Limpar e normalizar nomes de grupos
      groupName = groupName
        .replace(/^\||\|$/g, '') // Remove | no início ou fim
        .replace(/^[Ff]ilmes?\s*\|\s*/, '') // Remove "Filmes |" do início
        .replace(/^[Mm]ovies?\s*\|\s*/, '') // Remove "Movies |" do início
        .replace(/\s*\|\s*[Ff]ilmes?$/, '') // Remove "| Filmes" do fim
        .replace(/\s*\|\s*[Mm]ovies?$/, '') // Remove "| Movies" do fim
        .trim();
      
      // Se ficou vazio, usar nome padrão
      if (!groupName || groupName.toLowerCase() === 'filmes' || groupName.toLowerCase() === 'movies') {
        groupName = 'Filmes Diversos';
      }
      
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          movies: [],
          movieCount: 0
        };
      }
      
      groups[groupName].movies.push(movie);
      groups[groupName].movieCount++;
    });

    // Converter para array e ordenar por quantidade (maiores primeiro)
    const sortedGroups = Object.values(groups).sort((a, b) => b.movieCount - a.movieCount);
    
    console.log('📁 Grupos de filmes criados:', sortedGroups.map(g => `${g.name} (${g.movieCount})`));
    
    return sortedGroups;
  };

  const loadFavoriteMovies = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_movies');
      if (favorites) {
        setFavoriteMovies(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Erro ao carregar filmes favoritos:', error);
    }
  };

  const filterGroups = () => {
    let filtered = movieGroups;

    if (searchQuery.trim()) {
      filtered = movieGroups.filter(group => {
        const groupMatch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
        const movieMatch = group.movies.some(movie => 
          movie.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return groupMatch || movieMatch;
      });
    }

    setFilteredGroups(filtered);
  };

  const openGroup = (group) => {
    setSelectedGroup(group);
    
    let moviesToShow = group.movies;
    if (searchQuery.trim()) {
      moviesToShow = group.movies.filter(movie =>
        movie.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setMoviesInGroup(moviesToShow);
  };

  const goBackToGroups = () => {
    setSelectedGroup(null);
    setMoviesInGroup([]);
  };

  const getGroupIcon = (groupName) => {
    const name = groupName.toLowerCase();
    
    // Ícones baseados no ano
    if (name.includes('2025')) return 'calendar';
    if (name.includes('2024')) return 'time';
    if (name.includes('2023') || name.includes('2022')) return 'archive';
    if (name.includes('lançamento') || name.includes('lancamento')) return 'rocket';
    
    // Ícones baseados no gênero
    if (name.includes('ação') || name.includes('acao') || name.includes('action') || name.includes('aventura') || name.includes('guerra')) return 'flash';
    if (name.includes('comédia') || name.includes('comedia') || name.includes('comedy')) return 'happy';
    if (name.includes('drama') || name.includes('romance') || name.includes('romântico')) return 'heart';
    if (name.includes('terror') || name.includes('horror')) return 'skull';
    if (name.includes('suspense') || name.includes('thriller')) return 'eye';
    if (name.includes('sci-fi') || name.includes('ficção') || name.includes('fantasia') || name.includes('fantasy')) return 'planet';
    if (name.includes('animação') || name.includes('animacao') || name.includes('animation')) return 'color-palette';
    if (name.includes('documentário') || name.includes('documentario') || name.includes('documentary')) return 'library';
    if (name.includes('cinema')) return 'videocam';
    if (name.includes('nacional') || name.includes('brasileiro')) return 'flag';
    if (name.includes('dublado')) return 'chatbubbles';
    if (name.includes('legendado')) return 'text';
    if (name.includes('hd') || name.includes('4k') || name.includes('uhd')) return 'tv';
    
    return 'film';
  };

  const toggleFavorite = async (movie) => {
    try {
      const isFavorite = favoriteMovies.some(fav => fav.id === movie.id);
      let newFavorites;

      if (isFavorite) {
        newFavorites = favoriteMovies.filter(fav => fav.id !== movie.id);
      } else {
        newFavorites = [...favoriteMovies, movie];
      }

      setFavoriteMovies(newFavorites);
      await AsyncStorage.setItem('favorite_movies', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erro ao salvar filme favorito:', error);
      Alert.alert('Erro', 'Não foi possível salvar o favorito');
    }
  };

  const playMovie = async (movie) => {
    try {
      // Adicionar aos filmes recentes
      const recentMovies = await AsyncStorage.getItem('recent_movies');
      const recent = recentMovies ? JSON.parse(recentMovies) : [];
      const newRecent = [movie, ...recent.filter(m => m.id !== movie.id)].slice(0, 10);
      await AsyncStorage.setItem('recent_movies', JSON.stringify(newRecent));
      
      // Navegar para o player
      navigation.navigate('Player', { channel: movie });
    } catch (error) {
      console.error('Erro ao reproduzir filme:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir o filme');
    }
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => openGroup(item)}
    >
      <View style={styles.groupIcon}>
        <Ionicons name={getGroupIcon(item.name)} size={24} color="#FF6B35" />
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.groupMovieCount}>
          {item.movieCount} filmes
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderMovieItem = ({ item }) => {
    const isFavorite = favoriteMovies.some(fav => fav.id === item.id);
    
    return (
      <TouchableOpacity
        style={styles.movieItem}
        onPress={() => playMovie(item)}
      >
        <View style={styles.movieInfo}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.movieLogo} />
          ) : (
            <View style={styles.movieLogoPlaceholder}>
              <Ionicons name="film" size={24} color="#FF6B35" />
            </View>
          )}
          
          <View style={styles.movieDetails}>
            <Text style={styles.movieName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.movieGroup}>{item.group}</Text>
          </View>
        </View>

        <View style={styles.movieActions}>
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
            onPress={() => playMovie(item)}
          >
            <Ionicons name="play" size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Carregando filmes VOD...</Text>
        <Text style={styles.loadingSubText}>Analisando conteúdo da lista M3U</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com busca e navegação */}
      <View style={styles.header}>
        {selectedGroup && (
          <TouchableOpacity style={styles.backButton} onPress={goBackToGroups}>
            <Ionicons name="arrow-back" size={24} color="#FF6B35" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={selectedGroup ? `Buscar em ${selectedGroup.name}...` : "Buscar filmes VOD..."}
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

      {/* Lista de Grupos ou Filmes */}
      <View style={styles.contentContainer}>
        {!selectedGroup ? (
          // Mostrar lista de grupos (pastas)
          <>
            <View style={styles.statsContainer}>
              <Ionicons name="film" size={20} color="#FF6B35" />
              <Text style={styles.statsText}>
                {filteredGroups.length} categorias • {totalMoviesCount.toLocaleString()} filmes VOD
              </Text>
            </View>

            <FlatList
              data={filteredGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item, index) => `movie-group-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Nenhum filme encontrado' : 'Nenhum filme VOD disponível'}
                  </Text>
                  {searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Tente buscar por outro termo
                    </Text>
                  )}
                  {!searchQuery && totalMoviesCount === 0 && (
                    <Text style={styles.emptySubtext}>
                      Sua lista M3U não contém filmes VOD ou{'\n'}
                      os filtros precisam ser ajustados
                    </Text>
                  )}
                </View>
              }
            />
          </>
        ) : (
          // Mostrar filmes da categoria selecionada
          <>
            <View style={styles.statsContainer}>
              <Ionicons name={getGroupIcon(selectedGroup.name)} size={20} color="#FF6B35" />
              <Text style={styles.statsText}>
                {moviesInGroup.length} filmes em "{selectedGroup.name}"
              </Text>
            </View>

            <FlatList
              data={moviesInGroup}
              renderItem={renderMovieItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `Nenhum filme encontrado em "${selectedGroup.name}"` 
                      : `Nenhum filme disponível em "${selectedGroup.name}"`
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
    color: '#FF6B35',
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
  listContainer: {
    padding: 15,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  groupIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupMovieCount: {
    color: '#666',
    fontSize: 14,
  },
  movieItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  movieInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  movieLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  movieLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  movieDetails: {
    flex: 1,
  },
  movieName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  movieGroup: {
    color: '#666',
    fontSize: 14,
  },
  movieActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 10,
    marginRight: 5,
  },
  playButton: {
    backgroundColor: '#FF6B35',
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

export default MoviesScreen;