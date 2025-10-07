import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';

interface ReferralData {
  referralCode: string;
  referralLink: string;
}

const SettingsScreen: React.FC = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralCode();
  }, []);

  const fetchReferralCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/v1/referrals/code`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch referral code');
      }

      const data = await response.json();
      setReferralData(data.data);
    } catch (err) {
      console.error('Error fetching referral code:', err);
      setError('Неуспешно зареждане на препоръчителния код');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // This would typically come from your auth service/storage
    // For now, return a placeholder
    return 'your-auth-token';
  };

  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;

    try {
      await Clipboard.setString(referralData.referralCode);
      Alert.alert('Успех', 'Препоръчителният код е копиран!');
    } catch (err) {
      Alert.alert('Грешка', 'Неуспешно копиране на кода');
    }
  };

  const copyReferralLink = async () => {
    if (!referralData?.referralLink) return;

    try {
      await Clipboard.setString(referralData.referralLink);
      Alert.alert('Успех', 'Препоръчителната връзка е копирана!');
    } catch (err) {
      Alert.alert('Грешка', 'Неуспешно копиране на връзката');
    }
  };

  const shareReferralLink = async () => {
    if (!referralData?.referralLink) return;

    try {
      const result = await Share.share({
        message: `Присъедини се към ServiceText Pro и получи достъп до най-добрите майстори в България! ${referralData.referralLink}`,
        url: referralData.referralLink,
        title: 'ServiceText Pro - Препоръка',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (err) {
      Alert.alert('Грешка', 'Неуспешно споделяне');
    }
  };

  const openReferralDashboard = () => {
    // Navigate to referral dashboard (would use navigation prop in real app)
    Alert.alert('Информация', 'Препоръчителното табло ще бъде отворено в браузъра');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Настройки</Text>
          <Text style={styles.headerSubtitle}>Управлявайте вашия профил и настройки</Text>
        </View>

        {/* Referral Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Препоръчителна система</Text>
          <Text style={styles.sectionDescription}>
            Препоръчайте ServiceText Pro на колеги и получавайте награди
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Зареждане...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchReferralCode}>
                <Text style={styles.retryButtonText}>Опитай отново</Text>
              </TouchableOpacity>
            </View>
          ) : referralData ? (
            <View style={styles.referralContainer}>
              {/* Referral Code */}
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCodeLabel}>Вашият препоръчителен код:</Text>
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCode}>{referralData.referralCode}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={copyReferralCode}>
                    <Text style={styles.copyButtonText}>📋</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.primaryButton} onPress={shareReferralLink}>
                  <Text style={styles.primaryButtonText}>📱 Сподели връзката</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={copyReferralLink}>
                  <Text style={styles.secondaryButtonText}>🔗 Копирай връзката</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={openReferralDashboard}>
                  <Text style={styles.secondaryButtonText}>📊 Виж статистики</Text>
                </TouchableOpacity>
              </View>

              {/* Reward Tiers Info */}
              <View style={styles.rewardTiers}>
                <Text style={styles.rewardTiersTitle}>🏆 Нива на награди</Text>
                <View style={styles.rewardTier}>
                  <Text style={styles.rewardTierText}>50 кликове → 10% отстъпка</Text>
                </View>
                <View style={styles.rewardTier}>
                  <Text style={styles.rewardTierText}>100 кликове → 50% отстъпка</Text>
                </View>
                <View style={styles.rewardTier}>
                  <Text style={styles.rewardTierText}>500 кликове → Безплатен месец</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Other Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Профил</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Редактирай профил</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Смени парола</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Известия</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Push известия</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Email известия</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Информация</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Условия за ползване</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Политика за поверителност</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>За приложението</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>🚪 Изход</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  referralContainer: {
    marginTop: 8,
  },
  referralCodeContainer: {
    marginBottom: 20,
  },
  referralCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  referralCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  copyButtonText: {
    fontSize: 18,
  },
  actionButtons: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  rewardTiers: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rewardTiersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 12,
  },
  rewardTier: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  rewardTierText: {
    fontSize: 14,
    color: '#0C4A6E',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemText: {
    fontSize: 16,
    color: '#374151',
  },
  settingItemArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
