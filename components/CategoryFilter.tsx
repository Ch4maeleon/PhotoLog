import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { PLACE_CATEGORIES } from '@/constants/placeCategories';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  isVisible: boolean;
}

export default function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
  isVisible
}: CategoryFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    onCategoriesChange(newCategories);
  };


  const visibleCategories = isExpanded ? PLACE_CATEGORIES : PLACE_CATEGORIES.slice(0, 6);

  return (
    <View style={styles.container}>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleCategories.map((category, index) => {
          const isSelected = selectedCategories.includes(category.id);
          const isLast = index === visibleCategories.length - 1 && (isExpanded || PLACE_CATEGORIES.length <= 6);
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                isSelected && styles.selectedChip,
                isLast && { marginRight: 0 }
              ]}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryName,
                isSelected && styles.selectedCategoryName
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {!isExpanded && PLACE_CATEGORIES.length > 6 && (
          <TouchableOpacity
            style={[styles.expandButton, { marginRight: 0 }]}
            onPress={() => setIsExpanded(true)}
          >
            <Text style={styles.expandButtonText}>더보기 +</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {isExpanded && (
        <View style={styles.collapseContainer}>
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={() => setIsExpanded(false)}
          >
            <Text style={styles.collapseButtonText}>접기 ↑</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 88,
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
    paddingBottom: 6,
    zIndex: 1000,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    paddingRight: 0,
    gap: 4,
  },
  categoryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  selectedCategoryName: {
    color: 'white',
    fontWeight: '600',
  },
  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
    minHeight: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
  collapseContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  collapseButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  collapseButtonText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
});