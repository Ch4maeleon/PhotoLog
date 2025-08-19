import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
 return (
   <View style={styles.container}>
     <Text style={styles.text}>안녕하세요</Text>
   </View>
 );
}

const styles = StyleSheet.create({
 container: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
 },
 text: {
   fontSize: 24,
   fontWeight: 'bold',
 },
});