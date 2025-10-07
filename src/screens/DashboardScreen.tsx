import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  startCallListening, 
  stopCallListening, 
  loadRecentCalls, 
  loadCallEvents,
  manualCallCheck 
} from '../store/slices/callSlice';
import { loadContacts, importDeviceContacts } from '../store/slices/contactSlice';
import { setEnabled } from '../store/slices/appSlice';
import { t } from '../localization';

const DashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isEnabled, currentMode } = useAppSelector(state => state.app);
  const { isListening, callEvents, recentCalls, statistics } = useAppSelector(state => state.calls);
  const { contacts } = useAppSelector(state => state.contacts);

  useEffect(() => {
    // Load initial data
    dispatch(loadContacts());
    dispatch(loadRecentCalls());
    dispatch(loadCallEvents());
  }, [dispatch]);

  const handleToggleService = async () => {
    if (isEnabled && isListening) {
      await dispatch(stopCallListening());
      dispatch(setEnabled(false));
    } else {
      const result = await dispatch(startCallListening());
      if (startCallListening.fulfilled.match(result)) {
        dispatch(setEnabled(true));
      } else {
        Alert.alert(t('error'), 'Failed to start call monitoring');
      }
    }
  };

  const handleImportContacts = async () => {
    Alert.alert(
      t('importContacts'),
      'Import contacts from your device?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: 'Import', 
          onPress: () => dispatch(importDeviceContacts())
        }
      ]
    );
  };

  const handleManualCheck = () => {
    dispatch(manualCallCheck());
  };

  const getStatusColor = () => {
    if (isEnabled && isListening) return '#4CAF50'; // Green
    if (isEnabled && !isListening) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getStatusText = () => {
    if (isEnabled && isListening) return 'Active';
    if (isEnabled && !isListening) return 'Starting...';
    return 'Inactive';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>Bulgarian Tradesperson Assistant</Text>
      </View>

      {/* Service Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.cardTitle}>Service Status</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        </View>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.modeText}>Mode: {currentMode}</Text>
        
        <TouchableOpacity 
          style={[styles.button, isEnabled ? styles.stopButton : styles.startButton]}
          onPress={handleToggleService}
        >
          <Text style={styles.buttonText}>
            {isEnabled ? 'Stop Service' : 'Start Service'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>{t('statistics')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.totalCalls}</Text>
            <Text style={styles.statLabel}>{t('totalCalls')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.missedCalls}</Text>
            <Text style={styles.statLabel}>{t('missedCalls')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.responsesSent}</Text>
            <Text style={styles.statLabel}>Responses Sent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{contacts.length}</Text>
            <Text style={styles.statLabel}>{t('contacts')}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityCard}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {callEvents.length > 0 ? (
          callEvents.slice(0, 5).map((event, index) => (
            <View key={event.id} style={styles.activityItem}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityPhone}>
                  {event.callRecord.phoneNumber}
                </Text>
                <Text style={styles.activityName}>
                  {event.contact?.name || 'Unknown'}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <View style={[
                styles.activityStatus,
                { backgroundColor: event.responseTriggered ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.activityStatusText}>
                  {event.responseTriggered ? '✓' : '⏳'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noActivity}>No recent activity</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleImportContacts}
        >
          <Text style={styles.actionButtonText}>📱 Import Contacts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleManualCheck}
        >
          <Text style={styles.actionButtonText}>🔍 Check for Missed Calls</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Coming Soon', 'Message templates feature will be available in Phase 2')}
        >
          <Text style={styles.actionButtonText}>💬 Message Templates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ServiceText Pro v1.0 - Phase 1 Complete
        </Text>
        <Text style={styles.footerText}>
          Core Infrastructure ✓ | Call Detection ✓ | Contact Management ✓
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  modeText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityInfo: {
    flex: 1,
  },
  activityPhone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activityName: {
    fontSize: 14,
    color: '#666',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityStatus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityStatusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noActivity: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  actionsCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default DashboardScreen;

