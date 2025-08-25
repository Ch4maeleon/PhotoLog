import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '@/components/ui/CustomTabBar';

declare global {
  var homeTabPressed: (() => void) | undefined;
}

export default function TabLayout() {
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
