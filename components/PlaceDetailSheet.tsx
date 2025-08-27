import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Place, PlaceDetails } from '@/types/places';
import { placesService } from '@/services/placesService';

interface PlaceDetailSheetProps {
  place: Place | null;
  isVisible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlaceDetailSheet({ place, isVisible, onClose }: PlaceDetailSheetProps) {
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const snapPoints = ['40%', '80%'];

  useEffect(() => {
    console.log('=== PlaceDetailSheet useEffect ===');
    console.log('isVisible:', isVisible);
    console.log('place:', place?.name || 'null');
    
    if (isVisible && place) {
      console.log('>>> Opening place detail sheet for:', place.name);
      // 약간의 지연을 두어 안정성 향상
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 100);
      loadPlaceDetails();
    } else if (!isVisible) {
      console.log('>>> Closing place detail sheet');
      bottomSheetRef.current?.close();
    }
  }, [isVisible, place, loadPlaceDetails]);

  const loadPlaceDetails = useCallback(async () => {
    if (!place) return;
    
    setIsLoading(true);
    try {
      const details = await placesService.getPlaceDetails(place.place_id);
      setPlaceDetails(details);
    } catch (error) {
      console.error('Failed to load place details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [place]);

  const handleClose = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      onClose();
      setPlaceDetails(null);
      setSelectedImageIndex(0);
    }, 200);
  };

  const openInMaps = () => {
    if (!place) return;
    const url = `https://maps.google.com/?q=${place.geometry.location.lat},${place.geometry.location.lng}`;
    Linking.openURL(url);
  };

  const callPlace = () => {
    if (!placeDetails?.formatted_phone_number) return;
    const phoneUrl = `tel:${placeDetails.formatted_phone_number.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(phoneUrl);
  };

  const openWebsite = () => {
    if (!placeDetails?.website) return;
    Linking.openURL(placeDetails.website);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  };

  const getStatusText = (place: Place | PlaceDetails) => {
    if (place.permanently_closed) return { text: '영구 폐업', color: '#FF3B30' };
    if (place.business_status === 'CLOSED_TEMPORARILY') return { text: '임시 휴업', color: '#FF9500' };
    if (place.business_status === 'CLOSED_PERMANENTLY') return { text: '영구 폐업', color: '#FF3B30' };
    if (place.opening_hours?.open_now === false) return { text: '영업종료', color: '#FF9500' };
    if (place.opening_hours?.open_now === true) return { text: '영업중', color: '#34C759' };
    return null;
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} style={styles.star}>★</Text>);
    }
    if (hasHalfStar) {
      stars.push(<Text key="half" style={styles.star}>⭐</Text>);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Text key={i} style={styles.emptyStar}>☆</Text>);
    }
    return stars;
  };

  if (!place) return null;

  const currentPlace = placeDetails || place;
  const status = getStatusText(currentPlace);
  const photos = currentPlace.photos || [];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={handleClose}
      style={{ zIndex: 2000, elevation: 2000 }}
      handleComponent={() => (
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
      )}
    >
      <BottomSheetView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 정보 */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Text style={styles.categoryIcon}>{currentPlace.category?.icon || '📍'}</Text>
                <View style={styles.titleContainer}>
                  <Text style={styles.placeName} numberOfLines={2}>{currentPlace.name}</Text>
                  <Text style={styles.categoryName}>{currentPlace.category?.name || '장소'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                {status && (
                  <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                    <Text style={styles.statusText}>{status.text}</Text>
                  </View>
                )}
                {place.distance && (
                  <Text style={styles.distance}>{formatDistance(place.distance)}</Text>
                )}
              </View>
            </View>
          </View>

          {/* 평점 및 기본 정보 */}
          {currentPlace.rating && (
            <View style={styles.ratingSection}>
              <View style={styles.ratingRow}>
                <View style={styles.starsContainer}>
                  {renderRatingStars(currentPlace.rating)}
                </View>
                <Text style={styles.ratingText}>
                  {currentPlace.rating.toFixed(1)} ({currentPlace.user_ratings_total || 0}개 리뷰)
                </Text>
              </View>
            </View>
          )}

          {/* 사진 갤러리 */}
          {photos.length > 0 && (
            <View style={styles.photosSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                  setSelectedImageIndex(index);
                }}
              >
                {photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: placesService.getPhotoUrl(photo.photo_reference, 600) }}
                    style={styles.placePhoto}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.photoIndicator}>
                  {photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicatorDot,
                        index === selectedImageIndex && styles.activeDot
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 주소 */}
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>주소</Text>
            <Text style={styles.address}>
              {currentPlace.formatted_address || currentPlace.vicinity}
            </Text>
          </View>

          {/* 상세 정보 로딩 */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>상세 정보 로딩중...</Text>
            </View>
          )}

          {/* 연락처 및 웹사이트 */}
          {placeDetails && (
            <>
              {placeDetails.formatted_phone_number && (
                <View style={styles.contactSection}>
                  <Text style={styles.sectionTitle}>연락처</Text>
                  <TouchableOpacity onPress={callPlace} style={styles.contactButton}>
                    <Text style={styles.phoneNumber}>{placeDetails.formatted_phone_number}</Text>
                    <Text style={styles.callLabel}>전화걸기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {placeDetails.website && (
                <View style={styles.websiteSection}>
                  <Text style={styles.sectionTitle}>웹사이트</Text>
                  <TouchableOpacity onPress={openWebsite} style={styles.websiteButton}>
                    <Text style={styles.websiteText} numberOfLines={1}>
                      {placeDetails.website}
                    </Text>
                    <Text style={styles.visitLabel}>방문하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 영업시간 */}
              {placeDetails.opening_hours?.weekday_text && (
                <View style={styles.hoursSection}>
                  <Text style={styles.sectionTitle}>영업시간</Text>
                  {placeDetails.opening_hours.weekday_text.map((hour, index) => (
                    <Text key={index} style={styles.hourText}>{hour}</Text>
                  ))}
                </View>
              )}
            </>
          )}

          {/* 액션 버튼 */}
          <View style={styles.actionsSection}>
            <TouchableOpacity onPress={openInMaps} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📍 지도에서 보기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  handleContainer: {
    paddingVertical: 12,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  titleSection: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 28,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  distance: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  ratingSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    color: '#FFD700',
    fontSize: 16,
  },
  emptyStar: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  photosSection: {
    marginBottom: 20,
  },
  placePhoto: {
    width: SCREEN_WIDTH - 40,
    height: 200,
    borderRadius: 12,
    marginRight: 10,
  },
  photoIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activeDot: {
    backgroundColor: '#007AFF',
  },
  addressSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  contactSection: {
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  callLabel: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  websiteSection: {
    marginBottom: 20,
  },
  websiteButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  websiteText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 8,
  },
  visitLabel: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  hoursSection: {
    marginBottom: 20,
  },
  hourText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});