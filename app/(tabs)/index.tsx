import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [isEditingMarker, setIsEditingMarker] = useState(false);
  const [mapRegion, setMapRegion] = useState(currentRegion);
  const tabBarHeight = useBottomTabBarHeight();
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '75%'], []);

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

  const superCluster = useMemo(() => new SuperCluster({
    radius: 60,
    maxZoom: 20,
    minZoom: 0,
    extent: 512,
    nodeSize: 64
  }), []);

  const geoJsonMarkers = useMemo(() => {
    return markers.map(marker => ({
      type: 'Feature',
      properties: {
        cluster: false,
        markerId: marker.key,
        title: marker.title,
        description: marker.description,
        images: marker.images
      },
      geometry: {
        type: 'Point',
        coordinates: [marker.longitude, marker.latitude]
      }
    }));
  }, [markers]);

  const clusteredMarkers = useMemo(() => {
    if (geoJsonMarkers.length === 0) return [];
    
    superCluster.load(geoJsonMarkers);
    
    const bbox = [
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
    setPendingCoordinate(coordinate);
    setIsAddingMarker(true);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
    
    const latitudeDelta = 0.01;
    const adjustedLatitude = coordinate.latitude - (latitudeDelta * 0.5);
    
    mapRef.current?.animateToRegion({
      latitude: adjustedLatitude,
      longitude: coordinate.longitude,
      latitudeDelta: latitudeDelta,
      longitudeDelta: 0.01,
    }, 800);
    
    setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 300);
  };

  const handleMarkerPress = useCallback((marker: TempMarker) => {
    setSelectedMarker(marker);
    setIsAddingMarker(false);
    setIsEditingMarker(false);
    bottomSheetRef.current?.expand();
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

  const handleMarkerDragEnd = useCallback((markerKey: string, event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkers(prev => 
      prev.map(marker => 
        marker.key === markerKey 
          ? { ...marker, latitude: coordinate.latitude, longitude: coordinate.longitude }
          : marker
      )
    );
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
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

  const handleSheetPress = useCallback(() => {
    if (isAddingMarker || isEditingMarker) {
      bottomSheetRef.current?.expand();
    } else {
      Keyboard.dismiss();
    }
  }, [isAddingMarker, isEditingMarker]);

  const handleSaveMarker = useCallback(() => {
    if (!pendingCoordinate) return;
    
    if (!markerTitle.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    const newMarker: TempMarker = {
      latitude: pendingCoordinate.latitude,
      longitude: pendingCoordinate.longitude,
      key: `marker_${Date.now()}`,
      title: markerTitle.trim(),
      description: markerDescription.trim(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
    };

    setMarkers(prev => [...prev, newMarker]);
    setIsAddingMarker(false);
    setPendingCoordinate(null);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
    bottomSheetRef.current?.close();
  }, [pendingCoordinate, markerTitle, markerDescription, selectedImages]);

  const handleCancelAddMarker = useCallback(() => {
    setIsAddingMarker(false);
    setPendingCoordinate(null);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    
    if (isAddingMarker || isEditingMarker) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isAddingMarker, isEditingMarker]);

  const handleEditMarker = useCallback(() => {
    if (!selectedMarker) return;
    
    setIsEditingMarker(true);
    setMarkerTitle(selectedMarker.title || '');
    setMarkerDescription(selectedMarker.description || '');
    setSelectedImages(selectedMarker.images || []);
  }, [selectedMarker]);

  const handleCancelEditMarker = useCallback(() => {
    setIsEditingMarker(false);
    setMarkerTitle('');
    setMarkerDescription('');
    setSelectedImages([]);
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
    bottomSheetRef.current?.snapToIndex(1);
  }, [selectedMarker, markerTitle, markerDescription, selectedImages]);

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
      >
        {clusteredMarkers.map((item, index) => {
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
            
            return (
              <Marker
                key={originalMarker.key}
                coordinate={{ latitude, longitude }}
                draggable={isEditMode}
                onDragEnd={(event) => handleMarkerDragEnd(originalMarker.key, event)}
                onPress={() => handleMarkerPress(originalMarker)}
                pinColor={isEditMode ? "orange" : "red"}
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
      >
        <BottomSheetView style={styles.contentContainer}>
          <View style={styles.sheetContent}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => Keyboard.dismiss()}
              >
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
                      autoFocus={true}
                      returnKeyType="next"
                      blurOnSubmit={false}
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
                      blurOnSubmit={false}
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
              </ScrollView>
            </KeyboardAvoidingView>
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
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
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
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
});