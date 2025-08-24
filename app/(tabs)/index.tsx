import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import SuperCluster from 'supercluster';

interface TempMarker {
  latitude: number;
  longitude: number;
  key: string;
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  bestTime?: string[];
  difficulty?: number;
  gpsMetadata?: {
    altitude?: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp?: string;
  };
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [markers, setMarkers] = useState<TempMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<TempMarker | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [pendingCoordinate, setPendingCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerDescription, setMarkerDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
  const [isEditingMarker, setIsEditingMarker] = useState(false);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [originalMarkerPosition, setOriginalMarkerPosition] = useState<{latitude: number, longitude: number} | null>(null);
  const [isMarkerInDeleteZone, setIsMarkerInDeleteZone] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(-1);
  const tabBarHeight = useBottomTabBarHeight();
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['13%', '75%'], []);


  const categories = ['풍경', '야경', '일출/일몰', '인물', '거리', '건축', '자연', '도시', '기타'];
  const timeOptions = ['새벽', '아침', '낮', '황금시간', '저녁', '밤'];
  const difficultyLabels = ['매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];

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

  const [mapRegion, setMapRegion] = useState(currentRegion);

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
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);


  const superCluster = useMemo(() => new SuperCluster({
    radius: 60,
    maxZoom: 20,
    minZoom: 0,
    extent: 512,
    nodeSize: 64
  }), []);

  const geoJsonMarkers = useMemo(() => {
    return markers.map(marker => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        markerId: marker.key,
        title: marker.title,
        description: marker.description,
        images: marker.images
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [marker.longitude, marker.latitude]
      }
    }));
  }, [markers]);

  const clusteredMarkers = useMemo(() => {
    if (geoJsonMarkers.length === 0) return [];
    
    superCluster.load(geoJsonMarkers);
    
    const bbox: [number, number, number, number] = [
      mapRegion.longitude - mapRegion.longitudeDelta / 2,
      mapRegion.latitude - mapRegion.latitudeDelta / 2,
      mapRegion.longitude + mapRegion.longitudeDelta / 2,
      mapRegion.latitude + mapRegion.latitudeDelta / 2
    ];
    
    const zoom = Math.floor(Math.log2(360 / mapRegion.longitudeDelta));
    return superCluster.getClusters(bbox, zoom);
  }, [geoJsonMarkers, mapRegion, superCluster]);

  const handleMapLongPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    // 스팟 추가 중이라면 기존 추가를 취소하고 새로운 위치로 시작
    if (isAddingMarker) {
      // 기존 데이터 모두 초기화
      setMarkerTitle('');
      setMarkerDescription('');
      setSelectedImages([]);
      setSelectedCategory('');
      setSelectedTimes([]);
      setSelectedDifficulty(1);
    }
    
    // 다른 상태들도 초기화 (편집 모드나 선택된 마커가 있다면)
    setIsEditingMarker(false);
    setSelectedMarker(null);
    
    // 새로운 스팟 추가 시작
    setPendingCoordinate(coordinate);
    setIsAddingMarker(true);
    
    const latitudeDelta = 0.01;
    // mapPadding bottom 20px을 고려하여 중심을 조정
    const adjustedLatitude = coordinate.latitude - (latitudeDelta * 0.5);
    
    mapRef.current?.animateToRegion({
      latitude: adjustedLatitude,
      longitude: coordinate.longitude,
      latitudeDelta: latitudeDelta,
      longitudeDelta: 0.01,
    }, 800);
    
    setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(1); // 75% 상태로 열기
    }, 300);
  };

  const handleMarkerPress = useCallback((marker: TempMarker) => {
    setSelectedMarker(marker);
    setIsAddingMarker(false);
    setIsEditingMarker(false);
    bottomSheetRef.current?.snapToIndex(1); // 75% 상태로 열기
  }, []);

  const handleClusterPress = useCallback((cluster: any) => {
    const expansionZoom = Math.min(superCluster.getClusterExpansionZoom(cluster.id), 20);
    
    mapRef.current?.animateToRegion({
      latitude: cluster.geometry.coordinates[1],
      longitude: cluster.geometry.coordinates[0],
      latitudeDelta: mapRegion.latitudeDelta / Math.pow(2, expansionZoom - Math.floor(Math.log2(360 / mapRegion.longitudeDelta))),
      longitudeDelta: mapRegion.longitudeDelta / Math.pow(2, expansionZoom - Math.floor(Math.log2(360 / mapRegion.longitudeDelta))),
    }, 500);
  }, [mapRegion, superCluster]);

  const onRegionChangeComplete = useCallback((region: any) => {
    setMapRegion(region);
  }, []);

  const checkIfInDeleteZone = useCallback((coordinate: {latitude: number, longitude: number}) => {
    const mapTop = mapRegion.latitude + (mapRegion.latitudeDelta / 2);
    const deleteZoneCenter = {
      latitude: mapTop - (mapRegion.latitudeDelta * 0.15),
      longitude: mapRegion.longitude
    };
    
    const distance = Math.sqrt(
      Math.pow(coordinate.latitude - deleteZoneCenter.latitude, 2) +
      Math.pow(coordinate.longitude - deleteZoneCenter.longitude, 2)
    );
    
    const deleteRadius = mapRegion.latitudeDelta * 0.12;
    return distance <= deleteRadius;
  }, [mapRegion]);


  const getCurrentGPSMetadata = useCallback(async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      return {
        altitude: currentLocation.coords.altitude || undefined,
        accuracy: currentLocation.coords.accuracy || undefined,
        heading: currentLocation.coords.heading || undefined,
        speed: currentLocation.coords.speed || undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('GPS 메타데이터 수집 실패:', error);
      return {
        timestamp: new Date().toISOString(),
      };
    }
  }, []);


  const handleSheetChanges = useCallback((index: number) => {
    setCurrentSheetIndex(index);
    
    if (index === -1) {
      setIsAddingMarker(false);
      setIsEditingMarker(false);
      setPendingCoordinate(null);
      setSelectedMarker(null);
      setSelectedImages([]);
      setMarkerTitle('');
      setMarkerDescription('');
    }
  }, []);


  const handleHandlePress = useCallback(() => {
    if (currentSheetIndex === 0) {
      // 13% 상태에서 핸들바 클릭 시 75%로 확장
      bottomSheetRef.current?.snapToIndex(1);
    } else if (currentSheetIndex === 1) {
      // 75% 상태에서 핸들바 클릭 시 13%로 축소
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [currentSheetIndex]);



  const handleSaveMarker = useCallback(async () => {
    try {
      if (!pendingCoordinate) return;
      
      if (!markerTitle.trim()) {
        Alert.alert('알림', '제목을 입력해주세요.');
        return;
      }

      const gpsMetadata = await getCurrentGPSMetadata();

      const newMarker: TempMarker = {
        latitude: pendingCoordinate.latitude,
        longitude: pendingCoordinate.longitude,
        key: `marker_${Date.now()}`,
        title: markerTitle.trim(),
        description: markerDescription.trim(),
        images: selectedImages.length > 0 ? [...selectedImages] : undefined,
        category: selectedCategory || undefined,
        bestTime: selectedTimes.length > 0 ? [...selectedTimes] : undefined,
        difficulty: selectedDifficulty,
        gpsMetadata,
      };

      setMarkers(prev => [...prev, newMarker]);
      setIsAddingMarker(false);
      setPendingCoordinate(null);
      setMarkerTitle('');
      setMarkerDescription('');
      setSelectedImages([]);
      setSelectedCategory('');
      setSelectedTimes([]);
      setSelectedDifficulty(1);
      bottomSheetRef.current?.close();
    } catch (error) {
      console.error('마커 저장 중 오류:', error);
      Alert.alert('오류', '마커 저장 중 문제가 발생했습니다.');
    }
  }, [pendingCoordinate, markerTitle, markerDescription, selectedImages, selectedCategory, selectedTimes, selectedDifficulty, getCurrentGPSMetadata]);

  const handleCancelAddMarker = useCallback(() => {
    setIsAddingMarker(false);
    setPendingCoordinate(null);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
    setSelectedCategory('');
    setSelectedTimes([]);
    setSelectedDifficulty(1);
    bottomSheetRef.current?.close();
  }, []);

  const handlePickImage = useCallback(async () => {
    Keyboard.dismiss();
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setSelectedImages(prev => [...prev, ...newImages]);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    Keyboard.dismiss();
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 촬영하려면 카메라 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImage = result.assets[0].uri;
      setSelectedImages(prev => [...prev, newImage]);
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const showImagePicker = useCallback(() => {
    Alert.alert(
      '사진 선택',
      '사진을 어떻게 추가하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '갤러리에서 선택', onPress: handlePickImage },
        { text: '카메라로 촬영', onPress: handleTakePhoto },
      ]
    );
  }, [handlePickImage, handleTakePhoto]);

  const handleMapPress = useCallback(() => {
    Keyboard.dismiss();
    
    if (isAddingMarker || isEditingMarker || selectedMarker) {
      // 바텀시트가 열린 상태(추가/편집/정보보기)에서 지도 클릭 시 20%로 축소
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isAddingMarker, isEditingMarker, selectedMarker]);

  const handleEditMarker = useCallback(() => {
    if (!selectedMarker) return;
    
    setIsEditingMarker(true);
    setMarkerTitle(selectedMarker.title || '');
    setMarkerDescription(selectedMarker.description || '');
    setSelectedImages(selectedMarker.images || []);
    setSelectedCategory(selectedMarker.category || '');
    setSelectedTimes(selectedMarker.bestTime || []);
    setSelectedDifficulty(selectedMarker.difficulty || 1);
  }, [selectedMarker]);

  const handleCancelEditMarker = useCallback(() => {
    setIsEditingMarker(false);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
    setSelectedCategory('');
    setSelectedTimes([]);
    setSelectedDifficulty(1);
  }, []);

  const handleUpdateMarker = useCallback(() => {
    if (!selectedMarker) return;
    
    if (!markerTitle.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    const updatedMarker: TempMarker = {
      ...selectedMarker,
      title: markerTitle.trim(),
      description: markerDescription.trim(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      category: selectedCategory || undefined,
      bestTime: selectedTimes.length > 0 ? [...selectedTimes] : undefined,
      difficulty: selectedDifficulty,
    };

    setMarkers(prev => 
      prev.map(marker => 
        marker.key === selectedMarker.key ? updatedMarker : marker
      )
    );
    
    setSelectedMarker(updatedMarker);
    setIsEditingMarker(false);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
    setSelectedCategory('');
    setSelectedTimes([]);
    setSelectedDifficulty(1);
    bottomSheetRef.current?.snapToIndex(1); // 75% 상태로 열기
  }, [selectedMarker, markerTitle, markerDescription, selectedImages, selectedCategory, selectedTimes, selectedDifficulty]);

  const handleDeleteMarker = useCallback((markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.key !== markerId));
    setIsDraggingMarker(false);
    setDraggedMarkerId(null);
    setSelectedMarker(null);
    bottomSheetRef.current?.close();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.editButton, isEditMode && styles.editButtonActive]}
          onPress={() => setIsEditMode(!isEditMode)}
        >
          <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
            {isEditMode ? '완료' : '편집'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {isEditMode && isDraggingMarker && (
        <View style={styles.deleteZone}>
          <View style={styles.deleteZoneInner}>
            <Text style={styles.deleteZoneIcon}>✕</Text>
          </View>
          <Text style={styles.deleteZoneText}>삭제</Text>
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
        onLongPress={!isEditMode ? handleMapLongPress : undefined}
        onPress={handleMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
        mapPadding={{ top: 0, right: 0, bottom: 20, left: 0 }}
      >
        {clusteredMarkers.map((item: any, index: number) => {
          const [longitude, latitude] = item.geometry.coordinates;
          
          if (item.properties.cluster) {
            return (
              <Marker
                key={`cluster-${index}`}
                coordinate={{ latitude, longitude }}
                onPress={() => handleClusterPress(item)}
              >
                <View style={styles.clusterContainer}>
                  <Text style={styles.clusterText}>
                    {item.properties.point_count}
                  </Text>
                </View>
              </Marker>
            );
          } else {
            const originalMarker = markers.find(m => m.key === item.properties.markerId);
            if (!originalMarker) return null;
            
            // 일반적인 좌표 사용 (드래그 중에도 실제 마커 데이터 기준)
            
            return (
              <Marker
                key={originalMarker.key}
                coordinate={{ latitude: originalMarker.latitude, longitude: originalMarker.longitude }}
                draggable={isEditMode}
                opacity={isEditMode && draggedMarkerId === originalMarker.key && isMarkerInDeleteZone ? 0.3 : 1}
                onDragStart={() => {
                  if (isEditMode) {
                    setOriginalMarkerPosition({
                      latitude: originalMarker.latitude,
                      longitude: originalMarker.longitude
                    });
                    setIsDraggingMarker(true);
                    setDraggedMarkerId(originalMarker.key);
                    setIsMarkerInDeleteZone(false);
                  }
                }}
                onDrag={(event) => {
                  if (isEditMode && draggedMarkerId === originalMarker.key) {
                    const { coordinate } = event.nativeEvent;
                    const inDeleteZone = checkIfInDeleteZone(coordinate);
                    setIsMarkerInDeleteZone(inDeleteZone);
                    
                    // 드래그 중 실시간으로 마커 위치 업데이트
                    setMarkers(prev => 
                      prev.map(marker => 
                        marker.key === originalMarker.key 
                          ? { ...marker, latitude: coordinate.latitude, longitude: coordinate.longitude }
                          : marker
                      )
                    );
                  }
                }}
                onDragEnd={(event) => {
                  const { coordinate } = event.nativeEvent;
                  const inDeleteZone = checkIfInDeleteZone(coordinate);
                  
                  if (inDeleteZone && isEditMode && isDraggingMarker) {
                    // 삭제 영역에서 종료 - 현재 위치를 유지하고 Alert 표시
                    Alert.alert(
                      '마커 삭제',
                      '이 마커를 삭제하시겠습니까?',
                      [
                        { 
                          text: '취소', 
                          style: 'cancel',
                          onPress: () => {
                            // 취소 시 원래 위치로 복원
                            setMarkers(prev => 
                              prev.map(marker => 
                                marker.key === originalMarker.key 
                                  ? { ...marker, latitude: originalMarkerPosition!.latitude, longitude: originalMarkerPosition!.longitude }
                                  : marker
                              )
                            );
                            setIsDraggingMarker(false);
                            setDraggedMarkerId(null);
                            setOriginalMarkerPosition(null);
                            setIsMarkerInDeleteZone(false);
                          }
                        },
                        { 
                          text: '삭제', 
                          style: 'destructive', 
                          onPress: () => {
                            handleDeleteMarker(originalMarker.key);
                            setIsDraggingMarker(false);
                            setDraggedMarkerId(null);
                            setOriginalMarkerPosition(null);
                            setIsMarkerInDeleteZone(false);
                          }
                        }
                      ]
                    );
                  } else {
                    // 일반적인 위치 이동
                    setMarkers(prev => 
                      prev.map(marker => 
                        marker.key === originalMarker.key 
                          ? { ...marker, latitude: coordinate.latitude, longitude: coordinate.longitude }
                          : marker
                      )
                    );
                    
                    setIsDraggingMarker(false);
                    setDraggedMarkerId(null);
                    setOriginalMarkerPosition(null);
                    setIsMarkerInDeleteZone(false);
                  }
                }}
                onPress={() => handleMarkerPress(originalMarker)}
                pinColor={isEditMode ? (draggedMarkerId === originalMarker.key ? "red" : "orange") : "red"}
              />
            );
          }
        })}
        {isAddingMarker && pendingCoordinate && (
          <Marker
            coordinate={pendingCoordinate}
            pinColor="blue"
            opacity={0.7}
          />
        )}
      </MapView>
      
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        enableDynamicSizing={false}
        maxDynamicContentSize={0.75}
        animateOnMount={true}
        onAnimate={(fromIndex, toIndex) => {
          // 75%에서 바로 닫히려고 할 때 13%로 강제 이동
          if (fromIndex === 1 && toIndex === -1) {
            setTimeout(() => {
              bottomSheetRef.current?.snapToIndex(0);
            }, 0);
          }
        }}
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
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={styles.sheetContent}>
              {isAddingMarker ? (
                <>
                  <Text style={styles.title}>새 출사 스팟 추가</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>제목</Text>
                    <TextInput
                      style={styles.input}
                      value={markerTitle}
                      onChangeText={setMarkerTitle}
                      placeholder="스팟 이름을 입력하세요"
                      returnKeyType="next"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>설명</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={markerDescription}
                      onChangeText={setMarkerDescription}
                      placeholder="스팟에 대한 설명을 입력하세요"
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>카테고리</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonSelected]}
                          onPress={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                        >
                          <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextSelected]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>최적 촬영 시간</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {timeOptions.map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={[styles.timeButton, selectedTimes.includes(time) && styles.timeButtonSelected]}
                          onPress={() => {
                            setSelectedTimes(prev => 
                              prev.includes(time) 
                                ? prev.filter(t => t !== time)
                                : [...prev, time]
                            );
                          }}
                        >
                          <Text style={[styles.timeButtonText, selectedTimes.includes(time) && styles.timeButtonTextSelected]}>
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>접근 난이도: {difficultyLabels[selectedDifficulty - 1]}</Text>
                    <View style={styles.difficultyContainer}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[styles.difficultyButton, selectedDifficulty >= level && styles.difficultyButtonSelected]}
                          onPress={() => setSelectedDifficulty(level)}
                        >
                          <Text style={[styles.difficultyButtonText, selectedDifficulty >= level && styles.difficultyButtonTextSelected]}>
                            ★
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.inputContainer}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>사진</Text>
                      <TouchableOpacity style={styles.addPhotoButton} onPress={showImagePicker}>
                        <Text style={styles.addPhotoButtonText}>+ 사진 추가</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedImages.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
                        {selectedImages.map((imageUri, index) => (
                          <View key={index} style={styles.imagePreviewWrapper}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity 
                              style={styles.removeImageButton} 
                              onPress={() => handleRemoveImage(index)}
                            >
                              <Text style={styles.removeImageButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                  {pendingCoordinate && (
                    <View style={styles.coordinateInfo}>
                      <Text style={styles.coordinates}>
                        위도: {pendingCoordinate.latitude.toFixed(6)}
                      </Text>
                      <Text style={styles.coordinates}>
                        경도: {pendingCoordinate.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                </>
              ) : isEditingMarker ? (
                <>
                  <Text style={styles.title}>스팟 정보 편집</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>제목</Text>
                    <TextInput
                      style={styles.input}
                      value={markerTitle}
                      onChangeText={setMarkerTitle}
                      placeholder="스팟 이름을 입력하세요"
                      returnKeyType="next"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>설명</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={markerDescription}
                      onChangeText={setMarkerDescription}
                      placeholder="스팟에 대한 설명을 입력하세요"
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>사진</Text>
                      <TouchableOpacity style={styles.addPhotoButton} onPress={showImagePicker}>
                        <Text style={styles.addPhotoButtonText}>+ 사진 추가</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedImages.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
                        {selectedImages.map((imageUri, index) => (
                          <View key={index} style={styles.imagePreviewWrapper}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity 
                              style={styles.removeImageButton} 
                              onPress={() => handleRemoveImage(index)}
                            >
                              <Text style={styles.removeImageButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                  {selectedMarker && (
                    <View style={styles.coordinateInfo}>
                      <Text style={styles.coordinates}>
                        위도: {selectedMarker.latitude.toFixed(6)}
                      </Text>
                      <Text style={styles.coordinates}>
                        경도: {selectedMarker.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>출사 스팟 정보</Text>
                    {selectedMarker && !isEditMode && (
                      <TouchableOpacity style={styles.editInfoButton} onPress={handleEditMarker}>
                        <Text style={styles.editInfoButtonText}>편집</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {selectedMarker && (
                    <View>
                      {selectedMarker.title && (
                        <Text style={styles.markerTitle}>{selectedMarker.title}</Text>
                      )}
                      {selectedMarker.description && (
                        <Text style={styles.markerDescription}>{selectedMarker.description}</Text>
                      )}
                      {selectedMarker.images && selectedMarker.images.length > 0 && (
                        <View style={styles.imageSection}>
                          <Text style={styles.imageSectionTitle}>사진</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
                            {selectedMarker.images.map((imageUri, index) => (
                              <Image 
                                key={index} 
                                source={{ uri: imageUri }} 
                                style={styles.galleryImage} 
                              />
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      <View style={styles.coordinateInfo}>
                        <Text style={styles.coordinates}>
                          위도: {selectedMarker.latitude.toFixed(6)}
                        </Text>
                        <Text style={styles.coordinates}>
                          경도: {selectedMarker.longitude.toFixed(6)}
                        </Text>
                      </View>
                      {isEditMode && (
                        <Text style={styles.editHint}>
                          마커를 드래그해서 위치를 변경할 수 있습니다
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
              
              {(isAddingMarker || isEditingMarker) && (
                <View style={[styles.buttonContainer, { paddingBottom: tabBarHeight + 20 }]}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={isAddingMarker ? handleCancelAddMarker : handleCancelEditMarker}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={isAddingMarker ? handleSaveMarker : handleUpdateMarker}
                  >
                    <Text style={styles.saveButtonText}>
                      {isAddingMarker ? '저장' : '완료'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 24, 
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    right: 16,
    zIndex: 1,
  },
  editButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editButtonTextActive: {
    color: 'white',
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    height: '100%',
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
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  editHint: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2c2c2c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  coordinateInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    marginTop: 20,
    paddingBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8e9aaf',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  markerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  markerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addPhotoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreviewWrapper: {
    marginRight: 8,
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSection: {
    marginBottom: 16,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  imageGallery: {
    marginBottom: 8,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editInfoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editInfoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  clusterContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  clusterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteZone: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: '50%',
    transform: [{ translateX: -25 }],
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  deleteZoneInner: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteZoneIcon: {
    fontSize: 18,
    color: 'rgba(255, 59, 48, 0.8)',
    fontWeight: 'bold',
  },
  deleteZoneText: {
    color: 'rgba(255, 59, 48, 0.7)',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    position: 'absolute',
    bottom: -12,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '600',
  },
  categoryButtonTextSelected: {
    color: 'white',
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  timeButtonSelected: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '600',
  },
  timeButtonTextSelected: {
    color: 'white',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  difficultyButton: {
    padding: 8,
  },
  difficultyButtonSelected: {
    backgroundColor: 'transparent',
  },
  difficultyButtonText: {
    fontSize: 24,
    color: '#e1e1e1',
  },
  difficultyButtonTextSelected: {
    color: '#FFD700',
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
});