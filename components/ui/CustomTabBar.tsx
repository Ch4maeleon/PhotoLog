import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

const { width: screenWidth } = Dimensions.get('window');

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / state.routes.length;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: state.index * tabWidth,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [state.index, tabWidth, animatedValue]);

  const getIconName = (routeName: string) => {
    switch (routeName) {
      case 'tab1': return 'home';
      case 'tab2': return 'search';
      case 'index': return 'map-marker-alt';
      case 'tab3': return 'heart';
      case 'tab4': return 'user';
      default: return 'circle';
    }
  };

  const getTabTitle = (routeName: string) => {
    switch (routeName) {
      case 'tab1': return '홈';
      case 'tab2': return '검색';
      case 'index': return '탐색';
      case 'tab3': return '좋아요';
      case 'tab4': return '프로필';
      default: return '';
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      height: Platform.OS === 'ios' ? 84 : 70,
      backgroundColor: 'white',
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      position: Platform.OS === 'ios' ? 'absolute' : 'relative',
      bottom: 0,
      left: 0,
      right: 0,
    }}>
      {/* Animated Top Indicator */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          height: 3,
          width: tabWidth,
          backgroundColor: '#007AFF',
          left: animatedValue,
        }}
      />
      
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          // Add haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }

          // Handle special case for index tab
          if (route.name === 'index') {
            (global as any).homeTabPressed?.();
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 8,
            }}
          >
            <Icon
              name={getIconName(route.name)}
              size={20}
              color={isFocused ? '#007AFF' : '#8E8E93'}
              style={{ marginBottom: 6 }}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: isFocused ? '#007AFF' : '#8E8E93',
              }}
            >
              {getTabTitle(route.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default CustomTabBar;