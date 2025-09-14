import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';

// Change this to your backend IP
const API_BASE_URL = 'https://aqua-watch.onrender.com';

export default function IndexScreen() {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ labels: string[]; datasets: { data: number[] }[] }>({ labels: [], datasets: [{ data: [] }] });
  const [analysis, setAnalysis] = useState<{ condition: string; steps: string[] }>({ condition: '', steps: [] });

  // Hard-coded location for the case study
  const sangrurLocation = {
    latitude: 30.25,
    longitude: 75.84,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [wellResponse, predictResponse, analysisResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/well-data`),
          fetch(`${API_BASE_URL}/api/predict`),
          fetch(`${API_BASE_URL}/api/analysis`),
        ]);

        const wellData = await wellResponse.json();
        const predictData = await predictResponse.json();
        const analysisData = await analysisResponse.json();

        const combinedLabels = [...wellData.dates];
        const historicalDataset = wellData.levels;
        const forecastDataset = Array(wellData.levels.length).fill(null).concat(predictData.predicted_levels);

        setChartData({
          labels: combinedLabels.filter((_, i) => i % 60 === 0),
          datasets: [
            { data: historicalDataset },
            { data: forecastDataset }
          ]
        });

        setAnalysis(analysisData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setAnalysis({ condition: "Error", steps: ["Could not connect to the server. Make sure the backend is running and the IP address is correct."] });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Fetching Groundwater Data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Groundwater Dashboard</Text>
        <Text style={styles.subHeader}>Case Study: Sangrur, Punjab</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monitoring Location</Text>
          <MapView style={styles.map} initialRegion={sangrurLocation}>
            <Marker coordinate={sangrurLocation} title="Monitoring Well" />
          </MapView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Water Level Trend & Forecast</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix="m"
            yLabelsOffset={5}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 8 }}
            verticalLabelRotation={30}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Analysis</Text>
          <Text style={[styles.condition, {color: analysis.condition.includes('Critical') ? 'red' : analysis.condition.includes('Semi-Critical') ? 'orange' : 'green'}]}>
            {analysis.condition}
          </Text>
          <Text style={styles.cardTitle}>Actionable Steps</Text>
          {analysis.steps.map((step, index) => (
            <Text key={index} style={styles.stepText}>• {step}</Text>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: '#e26a00',
  backgroundGradientFrom: '#fb8c00',
  backgroundGradientTo: '#ffa726',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#ffa726' }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f9' },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subHeader: { fontSize: 18, color: 'gray', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 8, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  map: { width: '100%', height: 200, borderRadius: 8 },
  condition: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  stepText: { fontSize: 14, color: '#333', marginBottom: 5, lineHeight: 20 },
  loadingText: { marginTop: 10, fontSize: 16 }
});
