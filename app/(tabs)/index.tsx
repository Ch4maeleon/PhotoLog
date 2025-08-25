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
  const [hourlyForecast, setHourlyForecast] = useState<{
    time: string;
    temp: number;
    condition: string;
  }[]>([]);
  const [dailyForecast, setDailyForecast] = useState<{
    date: string;
    minTemp: number;
    maxTemp: number;
    condition: string;
  }[]>([]);
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily'>('hourly');
  const [currentLocation, setCurrentLocation] = useState<string>('Unknown Location');
  const [airQuality, setAirQuality] = useState<{pm25: number, pm10: number, aqi: number} | null>(null);
  const [showWeatherDetails, setShowWeatherDetails] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const hourlyScrollRef = useRef<ScrollView>(null);
  const dailyScrollRef = useRef<ScrollView>(null);
  const snapPoints = useMemo(() => ['70%'], []);

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
      
      // 현재 날씨 데이터
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      // 5일 예보 데이터
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('Weather API failed');
      }
      
      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();
      
      const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      };
      
      // 현재 날씨
      setWeather({
        temp: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main
      });
      
      setDetailedWeather({
        temp: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main,
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind?.speed * 3.6) || 0,
        windDirection: currentData.wind?.deg || 0,
        pressure: currentData.main.pressure,
        visibility: Math.round((currentData.visibility || 10000) / 1000),
        sunrise: formatTime(currentData.sys.sunrise),
        sunset: formatTime(currentData.sys.sunset),
        description: currentData.weather[0].description
      });
      
      // 시간대별 예보 (7개, 3시간 간격)
      const hourlyData = forecastData.list.slice(0, 7).map((item: any) => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours();
        
        return {
          time: hour + '시',
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main
        };
      });
      setHourlyForecast(hourlyData);
      
      // 일별 예보 (6일) - 날짜/요일 표시
      const dailyData: { [key: string]: { temps: number[], condition: string, date: string } } = {};
      
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dailyData[dateKey]) {
          const dayMonth = `${date.getMonth() + 1}.${date.getDate()}`;
          const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
          
          dailyData[dateKey] = {
            temps: [],
            condition: item.weather[0].main,
            date: `${dayMonth}.(${dayName})`
          };
        }
        dailyData[dateKey].temps.push(item.main.temp);
      });
      
      const dailyForecastData = Object.values(dailyData).slice(0, 6).map(day => ({
        date: day.date,
        minTemp: Math.round(Math.min(...day.temps)),
        maxTemp: Math.round(Math.max(...day.temps)),
        condition: day.condition
      }));
      
      setDailyForecast(dailyForecastData);
      
      // 대기질 데이터 가져오기 (OpenWeatherMap Air Pollution API)
      try {
        const airResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${API_KEY}`
        );
        
        if (airResponse.ok) {
          const airData = await airResponse.json();
          if (airData.list && airData.list.length > 0) {
            const pollution = airData.list[0];
            setAirQuality({
              pm25: pollution.components.pm2_5,
              pm10: pollution.components.pm10,
              aqi: pollution.main.aqi
            });
          }
        }
      } catch (airError) {
        console.log('Air quality fetch failed:', airError);
        setAirQuality(null);
      }
      
      // 위치 정보 가져오기 (Expo Location)
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng
        });
        
        if (address && address.length > 0) {
          const location = address[0];
          let locationString = '';
          
          if (location.city && location.district) {
            locationString = `${location.city} ${location.district}`;
          } else if (location.city) {
            locationString = location.city;
          } else if (location.region) {
            locationString = location.region;
          }
          
          if (locationString) {
            setCurrentLocation(locationString);
          }
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
        // 기본값 유지
      }
      
    } catch (error) {
      console.log('Weather fetch failed:', error);
      setWeather(null);
      setDetailedWeather(null);
      setHourlyForecast([]);
      setDailyForecast([]);
      setAirQuality(null);
    }
  }, []);

  const resetToHome = useCallback(async () => {
    // 바텀시트를 즉시 닫기
    bottomSheetRef.current?.close();
    
    // 상태 초기화
    setShowWeatherDetails(false);
    setActiveTab('hourly');
    setCurrentLocation('Unknown Location');
    setAirQuality(null);
    
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
    setActiveTab('hourly'); // 항상 시간대별로 시작
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

  const getSimpleWeatherDescription = (condition: string, description: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return '맑음';
      case 'clouds': 
        if (description.includes('few')) return '구름조금';
        if (description.includes('scattered')) return '구름많음';
        if (description.includes('broken') || description.includes('overcast')) return '흐림';
        return '구름많음';
      case 'rain': return '비';
      case 'drizzle': return '이슬비';
      case 'thunderstorm': return '천둥번개';
      case 'snow': return '눈';
      case 'mist':
      case 'fog': return '안개';
      case 'haze': return '실안개';
      default: return '맑음';
    }
  };

  const getAirQualityLevel = (value: number, type: 'pm25' | 'pm10') => {
    if (type === 'pm25') {
      if (value <= 15) return { text: '좋음', color: '#007AFF' };
      if (value <= 35) return { text: '보통', color: '#1a1a1a' };
      if (value <= 75) return { text: '나쁨', color: '#FF3B30' };
      return { text: '매우나쁨', color: '#FF3B30' };
    } else { // pm10
      if (value <= 30) return { text: '좋음', color: '#007AFF' };
      if (value <= 80) return { text: '보통', color: '#1a1a1a' };
      if (value <= 150) return { text: '나쁨', color: '#FF3B30' };
      return { text: '매우나쁨', color: '#FF3B30' };
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
                  {/* 헤더 */}
                  <View style={styles.weatherHeader}>
                    <Text style={styles.locationTitle}>{currentLocation}</Text>
                  </View>
                  
                  {/* 구분선 */}
                  <View style={styles.headerDivider} />
                  
                  {detailedWeather && (
                    <View>
                      {/* 메인 날씨 정보 */}
                      <View style={styles.mainWeatherInfo}>
                        <View style={styles.weatherIconContainer}>
                          <Text style={styles.mainWeatherIcon}>{getWeatherIcon(detailedWeather.condition)}</Text>
                        </View>
                        <View style={styles.weatherDetailsContainer}>
                          <View style={styles.mainTempContainer}>
                            <Text style={styles.mainTemperature}>{detailedWeather.temp}°</Text>
                            <Text style={styles.weatherCondition}>{getSimpleWeatherDescription(detailedWeather.condition, detailedWeather.description)}</Text>
                          </View>
                        </View>
                        <View style={styles.additionalInfo}>
                          <Text style={styles.feelsLike}>체감온도 {detailedWeather.feelsLike}°</Text>
                          <Text style={styles.humidity}>습도 {detailedWeather.humidity}%</Text>
                          <Text style={styles.airQuality}>
                            미세{' '}
                            <Text style={{ color: airQuality ? getAirQualityLevel(airQuality.pm10, 'pm10').color : '#666' }}>
                              {airQuality ? getAirQualityLevel(airQuality.pm10, 'pm10').text : '정보없음'}
                            </Text>
                          </Text>
                          <Text style={styles.ultraFineDust}>
                            초미세{' '}
                            <Text style={{ color: airQuality ? getAirQualityLevel(airQuality.pm25, 'pm25').color : '#666' }}>
                              {airQuality ? getAirQualityLevel(airQuality.pm25, 'pm25').text : '정보없음'}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      
                      {/* 탭 메뉴 */}
                      <View style={styles.tabContainer}>
                        <TouchableOpacity 
                          style={[styles.tab, activeTab === 'hourly' && styles.activeTab]}
                          onPress={() => {
                            setActiveTab('hourly');
                            // 시간대별로 전환할 때만 리셋
                            setTimeout(() => {
                              hourlyScrollRef.current?.scrollTo({ x: 0, animated: false });
                            }, 0);
                          }}
                        >
                          <Text style={[styles.tabText, activeTab === 'hourly' && styles.activeTabText]}>시간대별</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
                          onPress={() => {
                            setActiveTab('daily');
                            // 일별로 전환할 때만 리셋
                            setTimeout(() => {
                              dailyScrollRef.current?.scrollTo({ x: 0, animated: false });
                            }, 0);
                          }}
                        >
                          <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>일별</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* 예보 컨텐츠 */}
                      {activeTab === 'hourly' ? (
                        <ScrollView 
                          ref={hourlyScrollRef}
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          style={styles.forecastContainer}
                        >
                          {hourlyForecast.map((hour, index) => (
                            <View key={index} style={[styles.hourlyItem, index === hourlyForecast.length - 1 && { marginRight: 0 }]}>
                              <Text style={styles.hourText}>{hour.time}</Text>
                              <Text style={styles.hourIcon}>{getWeatherIcon(hour.condition)}</Text>
                              <Text style={styles.hourTemp}>{hour.temp}°</Text>
                            </View>
                          ))}
                        </ScrollView>
                      ) : (
                        <ScrollView 
                          ref={dailyScrollRef}
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          style={styles.forecastContainer}
                        >
                          {dailyForecast.map((day, index) => (
                            <View key={index} style={[styles.dailyItem, index === dailyForecast.length - 1 && { marginRight: 0 }]}>
                              <Text style={styles.dayText}>{day.date}</Text>
                              <Text style={styles.dayIcon}>{getWeatherIcon(day.condition)}</Text>
                              <View style={styles.tempRange}>
                                <Text style={styles.minTemp}>{day.minTemp}°</Text>
                                <Text style={styles.tempSeparator}>/</Text>
                                <Text style={styles.maxTemp}>{day.maxTemp}°</Text>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                      
                      {/* 일출/일몰 시간 */}
                      <View style={styles.sunTimesContainer}>
                        <View style={styles.sunTimeItem}>
                          <View style={styles.sunTimeInfo}>
                            <Text style={styles.sunTimeLabel}>일출</Text>
                            <Text style={styles.sunTimeValue}>{detailedWeather.sunrise}</Text>
                          </View>
                        </View>
                        <View style={styles.sunTimeDivider} />
                        <View style={styles.sunTimeItem}>
                          <View style={styles.sunTimeInfo}>
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
    marginLeft: 4,
  },
  // 카카오맵 스타일 날씨 UI
  weatherHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    marginTop: -16,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  mainWeatherInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIconContainer: {
    marginRight: 16,
  },
  mainWeatherIcon: {
    fontSize: 56,
  },
  weatherDetailsContainer: {
    flex: 1,
    marginRight: 16,
  },
  mainTempContainer: {
    marginBottom: 4,
  },
  mainTemperature: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  weatherCondition: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  additionalInfo: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 80,
  },
  feelsLike: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 3,
    textAlign: 'left',
  },
  humidity: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 3,
    textAlign: 'left',
  },
  airQuality: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 3,
    textAlign: 'left',
  },
  ultraFineDust: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
    textAlign: 'left',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  forecastContainer: {
    marginBottom: 16,
  },
  hourlyItem: {
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    minWidth: 50,
  },
  hourText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  hourIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  hourTemp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dailyItem: {
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    minWidth: 70,
  },
  dayText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  dayIcon: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  tempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minTemp: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  tempSeparator: {
    fontSize: 13,
    color: '#666',
    marginHorizontal: 3,
  },
  maxTemp: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  sunTimesContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunTimeItem: {
    flex: 1,
    alignItems: 'center',
  },
  sunTimeInfo: {
    alignItems: 'center',
  },
  sunTimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e1e1e1',
    marginHorizontal: 24,
  },
  sunTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  sunTimeValue: {
    fontSize: 15,
    fontWeight: '600',
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