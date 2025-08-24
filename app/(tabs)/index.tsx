import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weather, setWeather] = useState<{temp: number, condition: string} | null>(null);
  const [detailedWeather, setDetailedWeather] = useState<{
    temp: number;
    condition: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    visibility: number;
    sunrise: string;
    sunset: string;
    description: string;
  } | null>(null);
  const [showWeatherDetails, setShowWeatherDetails] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  const defaultRegion = {
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const currentRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : defaultRegion;


  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    try {
      const API_KEY = '6a912e0ef1cab73570c17e15c0feab5d';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      if (!response.ok) {
        throw new Error('Weather API failed');
      }
      
      const data = await response.json();
      
      const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      };
      
      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main
      });
      
      setDetailedWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind?.speed * 3.6) || 0,
        windDirection: data.wind?.deg || 0,
        pressure: data.main.pressure,
        visibility: Math.round((data.visibility || 10000) / 1000),
        sunrise: formatTime(data.sys.sunrise),
        sunset: formatTime(data.sys.sunset),
        description: data.weather[0].description
      });
    } catch (error) {
      console.log('Weather fetch failed:', error);
      setWeather(null);
      setDetailedWeather(null);
    }
  }, []);

  const resetToHome = useCallback(async () => {
    // 바텀시트를 즉시 닫기
    bottomSheetRef.current?.close();
    
    // 상태 초기화
    setShowWeatherDetails(false);
    
    // 현재 위치로 이동
    if (location) {
      const currentRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current?.animateToRegion(currentRegion, 500);
      fetchWeather(location.coords.latitude, location.coords.longitude);
    }
  }, [location, fetchWeather]);

  // 홈 탭 클릭 시 모든 동작 취소하고 현재 위치로 이동
  useEffect(() => {
    (global as any).homeTabPressed = () => {
      resetToHome();
    };

    return () => {
      (global as any).homeTabPressed = undefined;
    };
  }, [resetToHome]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        fetchWeather(location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, [fetchWeather]);


  const handleWeatherPress = useCallback(() => {
    if (!detailedWeather) return;
    
    setShowWeatherDetails(true);
    bottomSheetRef.current?.snapToIndex(0);
  }, [detailedWeather]);

  const handleHandlePress = useCallback(() => {
    if (showWeatherDetails) {
      // 날씨 정보 표시 시에는 핸들바 클릭으로 바로 닫기
      bottomSheetRef.current?.close();
      return;
    }
  }, [showWeatherDetails]);

  const handleMapPress = useCallback(() => {
    if (showWeatherDetails) {
      // 날씨 정보가 열린 상태에서 지도 클릭 시 바로 닫기
      bottomSheetRef.current?.close();
    }
  }, [showWeatherDetails]);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return '☀️';
      case 'clouds': return '☁️';
      case 'rain': return '🌧️';
      case 'drizzle': return '🌦️';
      case 'thunderstorm': return '⛈️';
      case 'snow': return '❄️';
      case 'mist':
      case 'fog':
      case 'haze': return '🌫️';
      default: return '🌤️';
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {weather && (
        <View style={styles.weatherContainer}>
          <TouchableOpacity 
            style={styles.weatherWidget} 
            onPress={handleWeatherPress}
            activeOpacity={0.7}
            delayPressIn={0}
            delayPressOut={100}
          >
            <Text style={styles.weatherIcon}>{getWeatherIcon(weather.condition)}</Text>
            <Text style={styles.weatherTemp}>{weather.temp}°</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <MapView
        ref={mapRef}
        style={[styles.map, { marginBottom: tabBarHeight }]}
        provider={PROVIDER_GOOGLE}
        region={currentRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        zoomEnabled={true}
        zoomControlEnabled={Platform.OS === 'android'}
        followsUserLocation={location !== null}
        onPress={handleMapPress}
        mapPadding={{ top: 0, right: 0, bottom: 20, left: 0 }}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        loadingEnabled={true}
      >
      </MapView>
      
      <View style={styles.bottomSheetContainer}>
        <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        handleComponent={() => (
          <TouchableOpacity 
            style={styles.handleContainer}
            onPress={handleHandlePress}
            activeOpacity={0.7}
          >
            <View style={styles.handleBar} />
          </TouchableOpacity>
        )}
      >
        <BottomSheetView style={styles.contentContainer}>
          <ScrollView 
            style={{ height: '100%' }}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={[styles.sheetContent, showWeatherDetails && { paddingBottom: tabBarHeight + 5 }]}>
              {showWeatherDetails ? (
                <>
                  <Text style={styles.title}>날씨 정보</Text>
                  {detailedWeather && (
                    <View>
                      <View style={styles.weatherMainInfo}>
                        <Text style={styles.weatherMainIcon}>{getWeatherIcon(detailedWeather.condition)}</Text>
                        <View>
                          <Text style={styles.weatherMainTemp}>{detailedWeather.temp}°C</Text>
                          <Text style={styles.weatherDescription}>{detailedWeather.description}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.weatherDetailGrid}>
                        <View style={styles.weatherDetailItem}>
                          <Text style={styles.weatherDetailLabel}>체감온도</Text>
                          <Text style={styles.weatherDetailValue}>{detailedWeather.feelsLike}°C</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Text style={styles.weatherDetailLabel}>습도</Text>
                          <Text style={styles.weatherDetailValue}>{detailedWeather.humidity}%</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Text style={styles.weatherDetailLabel}>풍속</Text>
                          <Text style={styles.weatherDetailValue}>{detailedWeather.windSpeed} km/h</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Text style={styles.weatherDetailLabel}>기압</Text>
                          <Text style={styles.weatherDetailValue}>{detailedWeather.pressure} hPa</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Text style={styles.weatherDetailLabel}>가시거리</Text>
                          <Text style={styles.weatherDetailValue}>{detailedWeather.visibility} km</Text>
                        </View>
                      </View>
                      
                      <View style={styles.sunTimesContainer}>
                        <Text style={styles.sunTimesTitle}>🌅 일출/일몰 시간</Text>
                        <View style={styles.sunTimesGrid}>
                          <View style={styles.sunTimeItem}>
                            <Text style={styles.sunTimeIcon}>🌅</Text>
                            <Text style={styles.sunTimeLabel}>일출</Text>
                            <Text style={styles.sunTimeValue}>{detailedWeather.sunrise}</Text>
                          </View>
                          <View style={styles.sunTimeItem}>
                            <Text style={styles.sunTimeIcon}>🌇</Text>
                            <Text style={styles.sunTimeLabel}>일몰</Text>
                            <Text style={styles.sunTimeValue}>{detailedWeather.sunset}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.title}>PhotoLog</Text>
                  <Text style={styles.description}>출사 장소를 찾고 날씨를 확인하세요</Text>
                </>
              )}
            </View>
          </ScrollView>
        </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 24, 
  },
  map: {
    flex: 1,
  },
  contentContainer: {
    height: '100%',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  handleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  weatherContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 180 : 160,
    right: 10,
    zIndex: 1,
  },
  weatherWidget: {
    width: 56,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1 }],
  },
  weatherIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  weatherTemp: {
    fontSize: 9,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    lineHeight: 10,
  },
  weatherMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  weatherMainIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  weatherMainTemp: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  weatherDescription: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  weatherDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  weatherDetailItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    width: '48%',
    alignItems: 'center',
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weatherDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sunTimesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sunTimesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  sunTimesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sunTimeItem: {
    alignItems: 'center',
  },
  sunTimeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  sunTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sunTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bottomSheetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    pointerEvents: 'box-none',
  },
});