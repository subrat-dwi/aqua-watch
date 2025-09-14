import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Explore</Text>
        <Text style={styles.subHeader}>Additional features coming soon...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f9' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subHeader: { fontSize: 18, color: 'gray', textAlign: 'center', marginTop: 10 },
});