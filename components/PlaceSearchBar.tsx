import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category?: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

interface PlaceSearchBarProps {
  onSearchResultSelect: (result: SearchResult) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  placeholder?: string;
  style?: any;
  onMapPress?: () => void;
}

interface PlaceSearchBarRef {
  blur: () => void;
}

const PlaceSearchBar = forwardRef<PlaceSearchBarRef, PlaceSearchBarProps>(({
  onSearchResultSelect,
  onSearchFocus,
  onSearchBlur,
  placeholder = "장소를 검색하세요",
  style
}, ref) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    blur: () => {
      inputRef.current?.blur();
      setIsFocused(false);
      setShowResults(false);
      animateResultsHide();
      Keyboard.dismiss();
    }
  }));

  const searchPlaces = async (query: string): Promise<SearchResult[]> => {
    if (query.length < 2) return [];
    
    const mockResults: SearchResult[] = [
      {
        id: '1',
        name: '서울역',
        address: '서울특별시 용산구 한강대로 405',
        category: 'transit',
        latitude: 37.5547,
        longitude: 126.9707
      },
      {
        id: '2', 
        name: '서울숲',
        address: '서울특별시 성동구 뚝섬로 273',
        category: 'park',
        latitude: 37.5447,
        longitude: 127.0374
      },
      {
        id: '3',
        name: '서울대학교',
        address: '서울특별시 관악구 관악로 1',
        category: 'education',
        latitude: 37.4601,
        longitude: 126.9520
      },
      {
        id: '4',
        name: '강남역',
        address: '서울특별시 강남구 강남대로 지하 396',
        category: 'transit',
        latitude: 37.4979,
        longitude: 127.0276
      },
      {
        id: '5',
        name: '홍대입구역',
        address: '서울특별시 마포구 양화로 지하 160',
        category: 'transit', 
        latitude: 37.5571,
        longitude: 126.9245
      }
    ].filter(item => 
      item.name.includes(query) || item.address.includes(query)
    );

    try {
      const API_KEY = 'AIzaSyBYYmvRNzwhr7AE_ksKDNRs9IeMQeg52IM';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}&language=ko&region=kr`
      );
      
      if (!response.ok) {
        throw new Error(`Places search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        return mockResults;
      }
      
      return data.results.slice(0, 5).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        category: place.types?.[0] || 'general',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }));
    } catch (error) {
      return mockResults;
    }
  };

  const handleSearchTextChange = async (text: string) => {
    setSearchText(text);
    
    if (text.trim().length >= 2) {
      const results = await searchPlaces(text.trim());
      setSearchResults(results);
      setShowResults(true);
      animateResultsShow();
    } else {
      setSearchResults([]);
      setShowResults(false);
      animateResultsHide();
    }
  };

  const animateResultsShow = () => {
    const targetHeight = 240;
    
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: targetHeight,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const animateResultsHide = () => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handleFocus = () => {
    setIsFocused(true);
    onSearchFocus?.();
    
    if (searchText.trim().length >= 2) {
      setShowResults(true);
      animateResultsShow();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowResults(false);
      animateResultsHide();
      onSearchBlur?.();
    }, 200);
  };

  const handleResultSelect = (result: SearchResult) => {
    setSearchText(result.name);
    setShowResults(false);
    animateResultsHide();
    Keyboard.dismiss();
    inputRef.current?.blur();
    onSearchResultSelect(result);
  };

  const clearSearch = () => {
    setSearchText('');
    setSearchResults([]);
    setShowResults(false);
    animateResultsHide();
    inputRef.current?.focus();
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Ionicons 
            name="location-outline" 
            size={16} 
            color="#666" 
            style={styles.locationIcon}
          />
          <Text style={styles.resultName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.distance && (
            <Text style={styles.distance}>{item.distance}km</Text>
          )}
        </View>
        <Text style={styles.resultAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.searchInputContainer,
        isFocused && styles.focusedInput
      ]}>
        <Ionicons 
          name="search" 
          size={20} 
          color="#666" 
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearchTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          numberOfLines={1}
          multiline={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {showResults && searchResults.length > 0 && (
        <Animated.View 
          style={[
            styles.resultsContainer,
            {
              height: animatedHeight,
              opacity: fadeAnim,
            }
          ]}
        >
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.resultsList}
          />
        </Animated.View>
      )}
    </View>
  );
});

export default PlaceSearchBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 2000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 48,
  },
  focusedInput: {
    borderColor: '#007AFF',
    shadowOpacity: 0.15,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
    height: 20,
  },
  clearButton: {
    padding: 2,
    marginLeft: 8,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    marginRight: 8,
  },
  resultName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  distance: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  resultAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 24,
  },
});