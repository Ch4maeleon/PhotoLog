import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import CustomTabBar from '@/components/ui/CustomTabBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

declare global {
  var homeTabPressed: (() => void) | undefined;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="tab1"
        options={{
          title: '홈',
        }}
      />
      <Tabs.Screen
        name="tab2"
        options={{
          title: '검색',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '탐색',
        }}
        listeners={{
          tabPress: () => {
            // 전역 이벤트로 홈 탭 클릭 알림
            global.homeTabPressed?.();
          },
        }}
      />
      <Tabs.Screen
        name="tab3"
        options={{
          title: '좋아요',
        }}
      />
      <Tabs.Screen
        name="tab4"
        options={{
          title: '프로필',
        }}
      />
    </Tabs>
  );
}
