import React, { memo, useCallback } from 'react';
import { Marker } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import { Place } from '@/types/places';

interface PlaceMarkerProps {
  place: Place;
  onPress?: (place: Place) => void;
  isSelected?: boolean;
}

function PlaceMarker({ place, onPress, isSelected = false }: PlaceMarkerProps) {
  const handlePress = useCallback(() => {
    console.log('>>> Marker touched:', place.name);
    console.log('onPress callback exists:', !!onPress);
    
    // null 체크 및 안전한 호출
    if (onPress && place) {
      console.log('Calling onPress for:', place.name);
      onPress(place);
    } else {
      console.warn('onPress callback not available or place is null');
    }
  }, [place, onPress]);

  const categoryIcon = place.category?.icon || '📍';
  const categoryColor = place.category?.color || '#007AFF';

  return (
    <Marker
      coordinate={{
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }}
      onPress={handlePress}
      tracksViewChanges={false}
      stopPropagation
      tappable={true}
      identifier={place.place_id}
    >
      <View style={[
        styles.markerContainer,
        isSelected && styles.selectedMarker
      ]}>
        {/* 메인 마커 */}
        <View style={[
          styles.modernMarker,
          { backgroundColor: categoryColor },
          isSelected && styles.selectedModernMarker
        ]}>
          <Text style={styles.modernIcon}>{categoryIcon}</Text>
        </View>
        
        {/* 바닥 점 */}
        <View style={[
          styles.markerDot,
          { backgroundColor: categoryColor }
        ]} />
        
        {/* 선택 효과 */}
        {isSelected && (
          <>
            <View style={[styles.pulseRing1, { borderColor: categoryColor }]} />
            <View style={[styles.pulseRing2, { borderColor: categoryColor }]} />
          </>
        )}
      </View>
    </Marker>
  );
}

export default memo(PlaceMarker);

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
  },
  modernMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 2,
  },
  modernIcon: {
    fontSize: 12,
    textAlign: 'center',
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedMarker: {
    // 선택된 마커는 transform을 사용하지 않고 링으로 표시
  },
  selectedModernMarker: {
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  pulseRing1: {
    position: 'absolute',
    top: -8,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  pulseRing2: {
    position: 'absolute',
    top: -12,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: 'transparent',
    opacity: 0.2,
  },
});