import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

// Render backend URL
const API_BASE_URL = 'https://aqua-watch.onrender.com';

// City information for different datasets
const CITY_INFO = {
  'bhubaneswar_odisha': {
    name: 'Bhubaneswar',
    state: 'Odisha',
    fullName: 'Bhubaneswar, Odisha',
    coords: {
      latitude: 20.2961,
      longitude: 85.8245,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }
  },
  'jaipur_rajasthan': {
    name: 'Jaipur',
    state: 'Rajasthan', 
    fullName: 'Jaipur, Rajasthan',
    coords: {
      latitude: 26.9124,
      longitude: 75.7873,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }
  },
  'nagpur_maharashtra': {
    name: 'Nagpur',
    state: 'Maharashtra',
    fullName: 'Nagpur, Maharashtra',
    coords: {
      latitude: 21.1458,
      longitude: 79.0882,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }
  }
};

type CityKey = keyof typeof CITY_INFO;

// Backup function to test connectivity
const testBackendConnection = async () => {
  try {
    console.log(`Testing Render backend: ${API_BASE_URL}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for Render
    
    const response = await fetch(`${API_BASE_URL}/api/well-data`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    console.log('Render backend response status:', response.status);
    if (response.ok) {
      console.log('Successfully connected to Render backend');
      return true;
    } else {
      console.error('Render backend returned error status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Failed to connect to Render backend:', error);
    return false;
  }
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ labels: string[]; datasets: { data: number[] }[] }>({ labels: [], datasets: [{ data: [] }] });
  const [analysis, setAnalysis] = useState<{ condition: string; steps: string[] }>({ condition: '', steps: [] });
  const [selectedCity, setSelectedCity] = useState<CityKey>('bhubaneswar_odisha');
  const [modalVisible, setModalVisible] = useState(false);

  const currentCity = CITY_INFO[selectedCity];

  const mapLocation = {
    latitude: currentCity.coords.latitude,
    longitude: currentCity.coords.longitude,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Starting fetchData function for city:', selectedCity);
        console.log('API_BASE_URL:', API_BASE_URL);
        
        // Test backend connection first
        const isConnected = await testBackendConnection();
        if (!isConnected) {
          throw new Error('Cannot connect to backend server');
        }
        
        // Test each endpoint individually with detailed logging
        console.log('Fetching well-data...');
        const wellResponse = await fetch(`${API_BASE_URL}/api/well-data?source=${selectedCity}`);
        console.log('Well response status:', wellResponse.status);
        console.log('Well response ok:', wellResponse.ok);
        
        if (!wellResponse.ok) {
          throw new Error(`Well data request failed with status: ${wellResponse.status}`);
        }
        
        console.log('Fetching predict...');
        const predictResponse = await fetch(`${API_BASE_URL}/api/predict?source=${selectedCity}`);
        console.log('Predict response status:', predictResponse.status);
        
        if (!predictResponse.ok) {
          throw new Error(`Predict request failed with status: ${predictResponse.status}`);
        }
        
        console.log('Fetching analysis...');
        const analysisResponse = await fetch(`${API_BASE_URL}/api/analysis?source=${selectedCity}`);
        console.log('Analysis response status:', analysisResponse.status);
        
        if (!analysisResponse.ok) {
          throw new Error(`Analysis request failed with status: ${analysisResponse.status}`);
        }

        console.log('Parsing JSON responses...');
        const wellData = await wellResponse.json();
        console.log('Well data received:', Object.keys(wellData));
        
        const predictData = await predictResponse.json();
        console.log('Predict data received:', Object.keys(predictData));
        
        const analysisData = await analysisResponse.json();
        console.log('Analysis data received:', analysisData);

        console.log('Processing chart data...');
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
        console.log('Data processing completed successfully');
      } catch (error) {
        console.error("Detailed error in fetchData:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error("Error message:", errorMessage);
        if (error instanceof Error) {
          console.error("Error stack:", error.stack);
        }
        setAnalysis({ 
          condition: "Connection Error", 
          steps: [
            `Error: ${errorMessage}`,
            "Check if the Flask backend is running on port 5000",
            "Verify your device is connected to the same WiFi network",
            `Backend URL: ${API_BASE_URL}`
          ] 
        });
      } finally {
        console.log('fetchData completed, setting loading to false');
        setLoading(false);
      }
    }
    
    console.log('useEffect called, starting fetchData');
    fetchData();
  }, [selectedCity]);

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
        <Text style={styles.subHeader}>{currentCity.fullName}</Text>

        {/* City Selection Dropdown */}
        <View style={styles.neumorphicCard}>
          <Text style={styles.selectorLabel}>Select Location</Text>
          <TouchableOpacity 
            style={styles.neumorphicDropdown} 
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.selectedCityText}>{currentCity.name}, {currentCity.state}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Location</Text>
              {Object.entries(CITY_INFO).map(([key, city]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cityOption,
                    selectedCity === key && styles.selectedOption
                  ]}
                  onPress={() => {
                    setSelectedCity(key as CityKey);
                    setModalVisible(false);
                    setLoading(true);
                  }}
                >
                  <Text style={[
                    styles.cityOptionText,
                    selectedCity === key && styles.selectedOptionText
                  ]}>
                    {city.name}, {city.state}
                  </Text>
                  {selectedCity === key && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monitoring Location</Text>
          <MapView style={styles.map} initialRegion={mapLocation}>
            <Marker coordinate={mapLocation} title="Monitoring Well" />
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
  container: { 
    flex: 1, 
    backgroundColor: '#e8ecf3' 
  },
  scrollContent: { 
    padding: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#2c3e50',
    marginBottom: 8
  },
  subHeader: { 
    fontSize: 18, 
    color: '#7f8c8d', 
    textAlign: 'center', 
    marginBottom: 20,
    fontWeight: '600'
  },
  
  // Neumorphic Card Styles
  neumorphicCard: {
    backgroundColor: '#e8ecf3',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    // Inner shadow simulation for Android
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    // Additional shadow for depth
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#ffffff',
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.7,
      shadowRadius: 12,
    } : {}),
  },
  
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center'
  },
  
  neumorphicDropdown: {
    backgroundColor: '#e8ecf3',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  
  selectedCityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  
  // Modal Styles with Neumorphic Design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  modalContent: {
    backgroundColor: '#e8ecf3',
    borderRadius: 25,
    padding: 25,
    width: '90%',
    maxWidth: 350,
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  cityOption: {
    backgroundColor: '#e8ecf3',
    borderRadius: 15,
    padding: 15,
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  selectedOption: {
    backgroundColor: '#d6e7ff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  cityOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  closeButton: {
    backgroundColor: '#e8ecf3',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
  },

  // Updated existing card styles
  card: { 
    backgroundColor: '#e8ecf3', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#b8c2cc',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15,
    color: '#2c3e50',
    textAlign: 'center'
  },
  map: { 
    width: '100%', 
    height: 200, 
    borderRadius: 15,
    overflow: 'hidden'
  },
  condition: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#2c3e50',
    textAlign: 'center'
  },
  stepText: { 
    fontSize: 14, 
    color: '#34495e', 
    marginBottom: 8, 
    lineHeight: 20,
    paddingLeft: 10
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center'
  }
});