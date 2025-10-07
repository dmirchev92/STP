import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import {
  BulgarianMarketService,
  BulgarianBusinessInfo,
  BulgarianCertification,
  BulgarianPricing,
  SofiaDistrict
} from '../services/bulgarian/BulgarianMarketService';

const BulgarianBusinessScreen: React.FC = () => {
  const [businessInfo, setBusinessInfo] = useState<BulgarianBusinessInfo | null>(null);
  const [pricing, setPricing] = useState<BulgarianPricing | null>(null);
  const [sofiaDistricts, setSofiaDistricts] = useState<SofiaDistrict[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<BulgarianCertification | null>(null);
  const [bulgarianService] = useState(() => BulgarianMarketService.getInstance());

  // Form state
  const [formData, setFormData] = useState<Partial<BulgarianBusinessInfo>>({});
  const [eikValidation, setEikValidation] = useState<{ isValid: boolean; message: string }>({ isValid: true, message: '' });
  const [vatValidation, setVatValidation] = useState<{ isValid: boolean; message: string }>({ isValid: true, message: '' });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      await bulgarianService.initialize();
      
      const [businessData, pricingData, districts] = await Promise.all([
        bulgarianService.getBusinessInfo(),
        bulgarianService.getBulgarianPricing(),
        bulgarianService.getSofiaDistricts()
      ]);

      setBusinessInfo(businessData);
      setPricing(pricingData);
      setSofiaDistricts(districts);

      if (businessData) {
        setFormData(businessData);
      } else {
        // Initialize with default values
        setFormData({
          companyName: '',
          eikNumber: '',
          vatNumber: '',
          address: '',
          city: 'София',
          postalCode: '',
          phoneNumber: '',
          email: '',
          tradeLicense: '',
          certifications: [],
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '18:00', isWorking: true },
            saturday: { start: '09:00', end: '15:00', isWorking: true },
            sunday: { start: '10:00', end: '14:00', isWorking: false },
            holidays: [],
            vacationPeriods: []
          }
        });
      }
    } catch (error) {
      console.error('Error loading business data:', error);
      Alert.alert('Грешка', 'Неуспешно зареждане на бизнес данните');
    }
  };

  const handleSaveBusinessInfo = async () => {
    try {
      // Validate required fields
      if (!formData.companyName || !formData.eikNumber || !formData.address || !formData.phoneNumber) {
        Alert.alert('Грешка', 'Моля попълнете всички задължителни полета');
        return;
      }

      // Validate EIK
      if (!bulgarianService.validateEIK(formData.eikNumber!)) {
        setEikValidation({ isValid: false, message: 'Невалиден ЕИК номер' });
        return;
      }

      // Validate VAT if provided
      if (formData.vatNumber && !bulgarianService.validateVATNumber(formData.vatNumber)) {
        setVatValidation({ isValid: false, message: 'Невалиден ДДС номер' });
        return;
      }

      // Format phone number
      if (formData.phoneNumber) {
        formData.phoneNumber = bulgarianService.formatBulgarianPhoneNumber(formData.phoneNumber);
      }

      await bulgarianService.saveBusinessInfo(formData as BulgarianBusinessInfo);
      setBusinessInfo(formData as BulgarianBusinessInfo);
      setEditMode(false);
      
      Alert.alert('Успех', 'Бизнес информацията е запазена успешно');
    } catch (error) {
      console.error('Error saving business info:', error);
      Alert.alert('Грешка', 'Неуспешно запазване на информацията');
    }
  };

  const handleEikChange = (eik: string) => {
    setFormData({ ...formData, eikNumber: eik });
    
    if (eik.length >= 9) {
      const isValid = bulgarianService.validateEIK(eik);
      setEikValidation({
        isValid,
        message: isValid ? 'Валиден ЕИК номер' : 'Невалиден ЕИК номер'
      });
    } else {
      setEikValidation({ isValid: true, message: '' });
    }
  };

  const handleVatChange = (vat: string) => {
    setFormData({ ...formData, vatNumber: vat });
    
    if (vat.length >= 9) {
      const isValid = bulgarianService.validateVATNumber(vat);
      setVatValidation({
        isValid,
        message: isValid ? 'Валиден ДДС номер' : 'Невалиден ДДС номер'
      });
    } else {
      setVatValidation({ isValid: true, message: '' });
    }
  };

  const calculateSamplePrice = () => {
    if (!pricing) return null;

    const sampleJob = bulgarianService.calculateJobPrice({
      serviceType: 'electrical',
      complexity: 'standard',
      estimatedHours: 2,
      materialCost: 50,
      isEmergency: false,
      isHoliday: false,
      isNightTime: false
    });

    return sampleJob;
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} лв`;
  };

  const getDayName = (day: string): string => {
    const dayNames: Record<string, string> = {
      monday: 'Понеделник',
      tuesday: 'Вторник',
      wednesday: 'Сряда',
      thursday: 'Четвъртък',
      friday: 'Петък',
      saturday: 'Събота',
      sunday: 'Неделя'
    };
    return dayNames[day] || day;
  };

  const addCertification = () => {
    const newCert: BulgarianCertification = {
      id: Date.now().toString(),
      type: 'electrical',
      name: '',
      number: '',
      issuedBy: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      isValid: true
    };
    setSelectedCertification(newCert);
    setShowCertificationModal(true);
  };

  const saveCertification = (cert: BulgarianCertification) => {
    const updatedCertifications = [...(formData.certifications || [])];
    const existingIndex = updatedCertifications.findIndex(c => c.id === cert.id);
    
    if (existingIndex >= 0) {
      updatedCertifications[existingIndex] = cert;
    } else {
      updatedCertifications.push(cert);
    }
    
    setFormData({ ...formData, certifications: updatedCertifications });
    setShowCertificationModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🇧🇬 Български бизнес</Text>
        <Text style={styles.subtitle}>Локализация и интеграция</Text>
        <TouchableOpacity 
          onPress={() => setEditMode(!editMode)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {editMode ? '💾 Запази' : '✏️ Редактирай'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Business Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Информация за фирмата</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Име на фирмата *</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
              placeholder="Въведете име на фирмата"
              editable={editMode}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ЕИК номер *</Text>
            <TextInput
              style={[
                styles.input, 
                !editMode && styles.inputDisabled,
                !eikValidation.isValid && styles.inputError
              ]}
              value={formData.eikNumber}
              onChangeText={handleEikChange}
              placeholder="Въведете ЕИК номер (9 или 13 цифри)"
              keyboardType="numeric"
              editable={editMode}
            />
            {eikValidation.message ? (
              <Text style={[
                styles.validationText,
                { color: eikValidation.isValid ? '#4CAF50' : '#F44336' }
              ]}>
                {eikValidation.message}
              </Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ДДС номер</Text>
            <TextInput
              style={[
                styles.input, 
                !editMode && styles.inputDisabled,
                !vatValidation.isValid && styles.inputError
              ]}
              value={formData.vatNumber}
              onChangeText={handleVatChange}
              placeholder="Въведете ДДС номер (ако сте регистрирани)"
              keyboardType="numeric"
              editable={editMode}
            />
            {vatValidation.message ? (
              <Text style={[
                styles.validationText,
                { color: vatValidation.isValid ? '#4CAF50' : '#F44336' }
              ]}>
                {vatValidation.message}
              </Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Адрес *</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Въведете адрес"
              multiline
              editable={editMode}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Град</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="София"
                editable={editMode}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Пощенски код</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                placeholder="1000"
                keyboardType="numeric"
                editable={editMode}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Телефон *</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="+359888123456"
              keyboardType="phone-pad"
              editable={editMode}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="info@example.com"
              keyboardType="email-address"
              editable={editMode}
            />
          </View>

          {editMode && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveBusinessInfo}>
              <Text style={styles.saveButtonText}>💾 Запази информацията</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Working Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Работно време</Text>
          {formData.workingHours && Object.entries(formData.workingHours).filter(([key]) => 
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(key)
          ).map(([day, hours]: [string, any]) => (
            <View key={day} style={styles.workingHourRow}>
              <Text style={styles.dayName}>{getDayName(day)}</Text>
              <Switch
                value={hours.isWorking}
                onValueChange={(value) => {
                  if (editMode) {
                    setFormData({
                      ...formData,
                      workingHours: {
                        ...formData.workingHours!,
                        [day]: { ...hours, isWorking: value }
                      }
                    });
                  }
                }}
                disabled={!editMode}
              />
              {hours.isWorking && (
                <View style={styles.timeInputs}>
                  <TextInput
                    style={[styles.timeInput, !editMode && styles.inputDisabled]}
                    value={hours.start}
                    onChangeText={(text) => {
                      if (editMode) {
                        setFormData({
                          ...formData,
                          workingHours: {
                            ...formData.workingHours!,
                            [day]: { ...hours, start: text }
                          }
                        });
                      }
                    }}
                    placeholder="08:00"
                    editable={editMode}
                  />
                  <Text style={styles.timeSeparator}>-</Text>
                  <TextInput
                    style={[styles.timeInput, !editMode && styles.inputDisabled]}
                    value={hours.end}
                    onChangeText={(text) => {
                      if (editMode) {
                        setFormData({
                          ...formData,
                          workingHours: {
                            ...formData.workingHours!,
                            [day]: { ...hours, end: text }
                          }
                        });
                      }
                    }}
                    placeholder="18:00"
                    editable={editMode}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Certifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Сертификати и лицензи</Text>
            {editMode && (
              <TouchableOpacity onPress={addCertification} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Добави</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {formData.certifications && formData.certifications.length > 0 ? (
            formData.certifications.map(cert => (
              <TouchableOpacity
                key={cert.id}
                style={styles.certificationItem}
                onPress={() => {
                  if (editMode) {
                    setSelectedCertification(cert);
                    setShowCertificationModal(true);
                  }
                }}
              >
                <View style={styles.certificationHeader}>
                  <Text style={styles.certificationName}>{cert.name || 'Нов сертификат'}</Text>
                  <View style={[
                    styles.certificationStatus,
                    { backgroundColor: cert.isValid ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.certificationStatusText}>
                      {cert.isValid ? 'Валиден' : 'Изтекъл'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.certificationDetails}>
                  Номер: {cert.number} • Издаден от: {cert.issuedBy}
                </Text>
                <Text style={styles.certificationDate}>
                  Валиден до: {cert.expiryDate}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Няма добавени сертификати</Text>
          )}
        </View>

        {/* Pricing Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ценова структура</Text>
            <TouchableOpacity onPress={() => setShowPricingModal(true)} style={styles.viewButton}>
              <Text style={styles.viewButtonText}>👁️ Преглед</Text>
            </TouchableOpacity>
          </View>

          {pricing && (
            <View style={styles.pricingPreview}>
              <Text style={styles.pricingTitle}>Примерна цена за стандартна електро услуга:</Text>
              {(() => {
                const sample = calculateSamplePrice();
                return sample ? (
                  <View style={styles.pricingBreakdown}>
                    <Text style={styles.pricingLine}>
                      Труд (2ч): {formatCurrency(sample.breakdown.laborCost)}
                    </Text>
                    <Text style={styles.pricingLine}>
                      Материали: {formatCurrency(sample.breakdown.materialCost)}
                    </Text>
                    <Text style={styles.pricingLine}>
                      Такса за излизане: {formatCurrency(sample.breakdown.calloutFee)}
                    </Text>
                    <Text style={styles.pricingLine}>
                      ДДС (20%): {formatCurrency(sample.vat)}
                    </Text>
                    <Text style={styles.pricingTotal}>
                      Общо: {formatCurrency(sample.total)}
                    </Text>
                  </View>
                ) : null;
              })()}
            </View>
          )}
        </View>

        {/* Sofia Districts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>София - райони за обслужване</Text>
          {sofiaDistricts.filter(d => d.serviceArea).map(district => (
            <View key={district.name} style={styles.districtItem}>
              <Text style={styles.districtName}>{district.name}</Text>
              <Text style={styles.districtInfo}>
                Време за отговор: {district.averageResponseTime} мин
              </Text>
              <Text style={styles.districtZones}>
                Зони: {district.zones.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pricing Modal */}
      <Modal visible={showPricingModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ценова структура</Text>
            <TouchableOpacity onPress={() => setShowPricingModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {pricing && Object.entries(pricing.serviceRates).map(([service, rates]) => (
              <View key={service} style={styles.serviceRateCard}>
                <Text style={styles.serviceTitle}>
                  {service === 'electrical' ? 'Електро услуги' :
                   service === 'plumbing' ? 'ВиК услуги' : 'Климатични услуги'}
                </Text>
                <Text style={styles.rateItem}>
                  Основна ставка: {formatCurrency(rates.baseRate)}/час
                </Text>
                <Text style={styles.rateItem}>
                  Такса за излизане: {formatCurrency(rates.calloutFee)}
                </Text>
                <Text style={styles.rateItem}>
                  Надценка материали: {rates.materialMarkup}%
                </Text>
                <Text style={styles.complexityTitle}>Множители по сложност:</Text>
                {Object.entries(rates.complexityMultipliers).map(([complexity, multiplier]) => (
                  <Text key={complexity} style={styles.complexityItem}>
                    {complexity}: {multiplier}x
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Certification Modal */}
      <Modal visible={showCertificationModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCertification?.name ? 'Редактиране на сертификат' : 'Нов сертификат'}
            </Text>
            <TouchableOpacity onPress={() => setShowCertificationModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedCertification && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Име на сертификата</Text>
                <TextInput
                  style={styles.input}
                  value={selectedCertification.name}
                  onChangeText={(text) => setSelectedCertification({ ...selectedCertification, name: text })}
                  placeholder="Електротехник ниско напрежение"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Номер</Text>
                <TextInput
                  style={styles.input}
                  value={selectedCertification.number}
                  onChangeText={(text) => setSelectedCertification({ ...selectedCertification, number: text })}
                  placeholder="ET-2024-001234"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Издаден от</Text>
                <TextInput
                  style={styles.input}
                  value={selectedCertification.issuedBy}
                  onChangeText={(text) => setSelectedCertification({ ...selectedCertification, issuedBy: text })}
                  placeholder="Министерство на енергетиката"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Дата на издаване</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedCertification.issueDate}
                    onChangeText={(text) => setSelectedCertification({ ...selectedCertification, issueDate: text })}
                    placeholder="2024-01-15"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Валиден до</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedCertification.expiryDate}
                    onChangeText={(text) => setSelectedCertification({ ...selectedCertification, expiryDate: text })}
                    placeholder="2029-01-15"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveCertification(selectedCertification)}
              >
                <Text style={styles.saveButtonText}>💾 Запази сертификата</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#673AB7',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  inputError: {
    borderColor: '#F44336',
  },
  validationText: {
    fontSize: 12,
    marginTop: 5,
  },
  workingHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  certificationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  certificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  certificationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  certificationStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  certificationStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  certificationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  certificationDate: {
    fontSize: 12,
    color: '#999',
  },
  pricingPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  pricingBreakdown: {
    gap: 3,
  },
  pricingLine: {
    fontSize: 14,
    color: '#666',
  },
  pricingTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 5,
  },
  districtItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  districtName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  districtInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  districtZones: {
    fontSize: 12,
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#673AB7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    fontSize: 20,
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  serviceRateCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  rateItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  complexityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  complexityItem: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    marginBottom: 2,
  },
});

export default BulgarianBusinessScreen;
