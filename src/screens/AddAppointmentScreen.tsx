import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import ToothChart from '../components/ToothChart';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { Appointment, ToothWork, MaterialUsed, ExpenseItem } from '../types';
import { getToday, DENTAL_PROCEDURES, COMMON_MATERIALS, formatCurrency, translateProcedure, translateMaterial, getPatientName } from '../utils/helpers';

function getCurrentTime(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function AddAppointmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patients, appointments, addAppointment, updateAppointment, treatmentPlans, addTreatmentPlan } = useData();
  const { t, language, isRTL } = useLanguage();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const editingAppointment: Appointment | undefined = route.params?.appointment;
  const isEditing = !!editingAppointment;

  // Patient selection
  const [patientId, setPatientId] = useState('');
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  // Date & time
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState(getCurrentTime());

  // Clinical
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  // Teeth
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [teethWork, setTeethWork] = useState<ToothWork[]>([]);

  // Procedure picker modal
  const [procedureModalVisible, setProcedureModalVisible] = useState(false);
  const [procedureModalToothIndex, setProcedureModalToothIndex] = useState(-1);
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  const [showCustomProcedure, setShowCustomProcedure] = useState(false);

  // Materials
  const [materialsUsed, setMaterialsUsed] = useState<MaterialUsed[]>([]);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [materialModalIndex, setMaterialModalIndex] = useState(-1);
  const [customMaterialInput, setCustomMaterialInput] = useState('');
  const [showCustomMaterial, setShowCustomMaterial] = useState(false);

  // Fees
  const [procedureFee, setProcedureFee] = useState('');

  // Additional expenses
  const [additionalExpenses, setAdditionalExpenses] = useState<ExpenseItem[]>([]);
  const [expenseCategoryModalVisible, setExpenseCategoryModalVisible] = useState(false);
  const [expenseCategoryIndex, setExpenseCategoryIndex] = useState(-1);

  // Payment & notes
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Treatment plan
  const [treatmentPlanId, setTreatmentPlanId] = useState<string | undefined>(undefined);
  const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);

  const [saving, setSaving] = useState(false);

  // Pre-fill for editing or from params
  useEffect(() => {
    if (editingAppointment) {
      setPatientId(editingAppointment.patientId);
      setDate(editingAppointment.date);
      setTime(editingAppointment.time);
      setChiefComplaint(editingAppointment.chiefComplaint ?? '');
      setDiagnosis(editingAppointment.diagnosis ?? '');
      setSelectedTeeth(editingAppointment.teethWork.map((tw) => tw.toothNumber));
      setTeethWork(editingAppointment.teethWork);
      setMaterialsUsed(editingAppointment.materialsUsed);
      setProcedureFee(editingAppointment.procedureFee.toString());
      setAdditionalExpenses(editingAppointment.additionalExpenses);
      setAmountPaid(editingAppointment.amountPaid.toString());
      setNotes(editingAppointment.notes ?? '');
      setTreatmentPlanId(editingAppointment.treatmentPlanId);
    } else {
      if (route.params?.patientId) setPatientId(route.params.patientId);
      if (route.params?.date) setDate(route.params.date);
    }
  }, []);

  // Sync teethWork when selectedTeeth changes
  useEffect(() => {
    setTeethWork((prev) => {
      const updated: ToothWork[] = selectedTeeth.map((tooth) => {
        const existing = prev.find((tw) => tw.toothNumber === tooth);
        return existing ?? { toothNumber: tooth, procedure: '', notes: '' };
      });
      return updated;
    });
  }, [selectedTeeth]);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q);
  });

  // Active treatment plans for selected patient
  const patientPlans = treatmentPlans.filter(
    (p) => p.patientId === patientId && p.status === 'active'
  );

  // Calculations
  const materialsCost = materialsUsed.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
  const expensesCost = additionalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const fee = parseFloat(procedureFee) || 0;
  const total = fee + materialsCost + expensesCost;

  const handleToggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  const updateToothWork = (index: number, field: keyof ToothWork, value: string | number) => {
    setTeethWork((prev) => prev.map((tw, i) => (i === index ? { ...tw, [field]: value } : tw)));
  };

  // Materials helpers
  const addMaterial = () => {
    setMaterialsUsed((prev) => [...prev, { name: '', quantity: 1, unitCost: 0 }]);
  };

  const updateMaterial = (index: number, field: keyof MaterialUsed, value: string | number) => {
    setMaterialsUsed((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMaterial = (index: number) => {
    setMaterialsUsed((prev) => prev.filter((_, i) => i !== index));
  };

  // Expense helpers
  const addExpense = () => {
    setAdditionalExpenses((prev) => [
      ...prev,
      { description: '', amount: 0, category: 'other' as const },
    ]);
  };

  const updateExpense = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setAdditionalExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const removeExpense = (index: number) => {
    setAdditionalExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  // Check for time conflicts
  const checkConflict = (): { hasConflict: boolean; conflictPatient: string } => {
    const conflicting = appointments.find(
      (a) =>
        a.date === date &&
        a.time === time &&
        a.status !== 'cancelled' &&
        a.id !== editingAppointment?.id
    );
    if (conflicting) {
      return { hasConflict: true, conflictPatient: getPatientName(conflicting.patientId, patients) };
    }
    return { hasConflict: false, conflictPatient: '' };
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const appointmentData = {
        patientId,
        date,
        time,
        status: (editingAppointment?.status ?? 'scheduled') as Appointment['status'],
        chiefComplaint: chiefComplaint || undefined,
        diagnosis: diagnosis || undefined,
        teethWork,
        materialsUsed,
        procedureFee: fee,
        additionalExpenses,
        amountPaid: parseFloat(amountPaid) || 0,
        notes: notes || undefined,
        treatmentPlanId: treatmentPlanId || undefined,
      };

      if (isEditing && editingAppointment) {
        await updateAppointment({
          ...editingAppointment,
          ...appointmentData,
        });
      } else {
        await addAppointment(appointmentData);
      }

      navigation.goBack();
    } catch (err) {
      showAlert(t('error'), t('failedToSave'), [{ text: t('ok') }]);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!patientId) {
      showAlert(t('error'), t('pleaseSelectPatient'), [{ text: t('ok') }]);
      return;
    }
    if (!date) {
      showAlert(t('error'), t('pleaseEnterDate'), [{ text: t('ok') }]);
      return;
    }

    // Check for time conflicts
    const { hasConflict, conflictPatient } = checkConflict();
    if (hasConflict) {
      showAlert(
        t('timeConflict'),
        t('timeConflictMsg').replace('{patient}', conflictPatient),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('continueAnyway'), onPress: doSave },
        ],
        { icon: 'alert-circle-outline', iconColor: colors.warning }
      );
      return;
    }

    await doSave();
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;
    const plan = await addTreatmentPlan({
      patientId,
      name: newPlanName.trim(),
      toothNumbers: selectedTeeth,
      status: 'active',
    });
    setTreatmentPlanId(plan.id);
    setNewPlanName('');
    setShowNewPlanInput(false);
    setTreatmentModalVisible(false);
  };

  const expenseCategories: ExpenseItem['category'][] = ['material', 'rental', 'lab', 'other'];
  const categoryLabels: Record<string, string> = {
    material: t('catMaterial'),
    rental: t('catRental'),
    lab: t('catLab'),
    other: t('catOther'),
  };

  // ---- Render ----

  const renderSectionHeader = (titleKey: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.sectionTitle}>{t(titleKey)}</Text>
    </View>
  );

  const selectedPlanName = treatmentPlans.find((p) => p.id === treatmentPlanId)?.name;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Patient Selection */}
        <Card>
          {renderSectionHeader('sectionPatient', 'person-outline')}
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setPatientModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons
                name={selectedPatient ? 'person-circle' : 'person-add-outline'}
                size={22}
                color={selectedPatient ? colors.primary : colors.textMuted}
              />
              <View style={styles.selectorText}>
                <Text
                  style={[
                    styles.selectorValue,
                    !selectedPatient && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedPatient?.name ?? t('selectPatient')}
                </Text>
                {selectedPatient?.phone && (
                  <Text style={styles.selectorSub}>{selectedPatient.phone}</Text>
                )}
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Date & Time */}
        <Card>
          {renderSectionHeader('sectionSchedule', 'calendar-outline')}
          <DatePicker selectedDate={date} onSelectDate={setDate} />
          <View style={{ marginTop: spacing.md }}>
            <TimePicker
              label={t('timeLabel')}
              value={time}
              onChange={setTime}
            />
          </View>
        </Card>

        {/* Chief Complaint & Diagnosis */}
        <Card>
          {renderSectionHeader('sectionClinical', 'medkit-outline')}
          <Input
            label={t('chiefComplaint')}
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder={t('chiefComplaintPlaceholder')}
          />
          <Input
            label={t('diagnosis')}
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder={t('diagnosisPlaceholder')}
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
        </Card>

        {/* Tooth Chart */}
        <Card>
          {renderSectionHeader('sectionToothChart', 'grid-outline')}
          <ToothChart selectedTeeth={selectedTeeth} onToggleTooth={handleToggleTooth} />
        </Card>

        {/* Treatment Plan Link */}
        {patientId && selectedTeeth.length > 0 && (
          <Card>
            {renderSectionHeader('linkToTreatment', 'clipboard-outline')}
            <TouchableOpacity
              style={styles.selector}
              onPress={() => {
                setShowNewPlanInput(false);
                setTreatmentModalVisible(true);
              }}
            >
              <View style={styles.selectorContent}>
                <Ionicons
                  name={treatmentPlanId ? 'document-text' : 'document-text-outline'}
                  size={22}
                  color={treatmentPlanId ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.selectorValue,
                    !treatmentPlanId && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedPlanName ?? t('linkToTreatment')}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Teeth Work Details */}
        {teethWork.length > 0 && (
          <Card>
            {renderSectionHeader('sectionTeethWork', 'construct-outline')}
            {teethWork.map((tw, index) => (
              <View key={tw.toothNumber} style={styles.teethWorkRow}>
                <View style={styles.toothBadge}>
                  <Text style={styles.toothBadgeText}>#{tw.toothNumber}</Text>
                </View>
                <View style={styles.teethWorkFields}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setProcedureModalToothIndex(index);
                      setShowCustomProcedure(false);
                      setCustomProcedureInput('');
                      setProcedureModalVisible(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !tw.procedure && styles.pickerPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {tw.procedure
                        ? translateProcedure(tw.procedure, language)
                        : t('selectProcedure')}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <Input
                    placeholder={t('notesPlaceholder')}
                    value={tw.notes ?? ''}
                    onChangeText={(val) => updateToothWork(index, 'notes', val)}
                    style={styles.smallInput}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Materials Used */}
        <Card>
          {renderSectionHeader('sectionMaterials', 'flask-outline')}
          {materialsUsed.map((mat, index) => (
            <View key={index} style={styles.materialRow}>
              <View style={styles.materialHeader}>
                <TouchableOpacity
                  style={[styles.pickerButton, styles.materialPicker]}
                  onPress={() => {
                    setMaterialModalIndex(index);
                    setShowCustomMaterial(false);
                    setCustomMaterialInput('');
                    setMaterialModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !mat.name && styles.pickerPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {mat.name
                      ? translateMaterial(mat.name, language)
                      : t('selectMaterial')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeMaterial(index)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Input
                    label={t('quantity')}
                    value={mat.quantity.toString()}
                    onChangeText={(val) =>
                      updateMaterial(index, 'quantity', parseInt(val) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={styles.halfField}>
                  <Input
                    label={t('unitCost')}
                    value={mat.unitCost ? mat.unitCost.toString() : ''}
                    onChangeText={(val) =>
                      updateMaterial(index, 'unitCost', parseFloat(val) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
              </View>
              <Text style={styles.subtotalText}>
                {t('subtotal')}: {formatCurrency(mat.quantity * mat.unitCost)}
              </Text>
            </View>
          ))}
          <Button
            title={t('addMaterial')}
            variant="ghost"
            size="sm"
            onPress={addMaterial}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Procedure Fee */}
        <Card>
          {renderSectionHeader('sectionFees', 'cash-outline')}
          <Input
            label={t('procedureFee')}
            value={procedureFee}
            onChangeText={setProcedureFee}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </Card>

        {/* Additional Expenses */}
        <Card>
          {renderSectionHeader('sectionExpenses', 'receipt-outline')}
          {additionalExpenses.map((exp, index) => (
            <View key={index} style={styles.expenseRow}>
              <View style={styles.materialHeader}>
                <Input
                  label={t('description')}
                  value={exp.description}
                  onChangeText={(val) => updateExpense(index, 'description', val)}
                  placeholder={t('expenseDescription')}
                  style={styles.expenseDescInput}
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeExpense(index)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Input
                    label={t('amount')}
                    value={exp.amount ? exp.amount.toString() : ''}
                    onChangeText={(val) =>
                      updateExpense(index, 'amount', parseFloat(val) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>{t('category')}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setExpenseCategoryIndex(index);
                      setExpenseCategoryModalVisible(true);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {categoryLabels[exp.category] ?? exp.category}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <Button
            title={t('addExpense')}
            variant="ghost"
            size="sm"
            onPress={addExpense}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Payment */}
        <Card>
          {renderSectionHeader('sectionPayment', 'wallet-outline')}
          <Input
            label={t('amountPaid')}
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </Card>

        {/* Notes */}
        <Card>
          {renderSectionHeader('sectionNotes', 'document-text-outline')}
          <Input
            label={t('additionalNotes')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('anyAdditionalNotes')}
            multiline
            numberOfLines={4}
            style={styles.multiline}
          />
        </Card>

        {/* Total Summary */}
        <Card style={styles.summaryCard}>
          {renderSectionHeader('sectionSummary', 'calculator-outline')}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('procedureFee')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(fee)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('materials')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(materialsCost)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('additionalExpenses')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(expensesCost)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('amountPaid')}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(parseFloat(amountPaid) || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('balanceDue')}</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    total - (parseFloat(amountPaid) || 0) > 0
                      ? colors.danger
                      : colors.success,
                },
              ]}
            >
              {formatCurrency(total - (parseFloat(amountPaid) || 0))}
            </Text>
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title={isEditing ? t('updateAppointment') : t('saveAppointment')}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveButton}
          icon={
            <Ionicons
              name={isEditing ? 'checkmark-circle' : 'add-circle'}
              size={22}
              color="#fff"
            />
          }
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ---- Patient Selection Modal ---- */}
      <Modal visible={patientModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectPatientTitle')}</Text>
              <TouchableOpacity onPress={() => setPatientModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Input
              placeholder={t('searchByNameOrPhone')}
              value={patientSearch}
              onChangeText={setPatientSearch}
              style={styles.searchInput}
            />
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.patientOption,
                    item.id === patientId && styles.patientOptionSelected,
                  ]}
                  onPress={() => {
                    setPatientId(item.id);
                    setPatientModalVisible(false);
                    setPatientSearch('');
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={28}
                    color={item.id === patientId ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.patientOptionText}>
                    <Text
                      style={[
                        styles.patientName,
                        item.id === patientId && styles.patientNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.phone && (
                      <Text style={styles.patientPhone}>{item.phone}</Text>
                    )}
                  </View>
                  {item.id === patientId && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('noPatientFound2')}</Text>
              }
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* ---- Procedure Picker Modal ---- */}
      <Modal visible={procedureModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectProcedureTitle')}</Text>
              <TouchableOpacity onPress={() => setProcedureModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!showCustomProcedure ? (
              <>
                <FlatList
                  data={DENTAL_PROCEDURES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isSelected =
                      procedureModalToothIndex >= 0 &&
                      teethWork[procedureModalToothIndex]?.procedure === item;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemSelected,
                        ]}
                        onPress={() => {
                          if (procedureModalToothIndex >= 0) {
                            updateToothWork(procedureModalToothIndex, 'procedure', item);
                          }
                          setProcedureModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {translateProcedure(item, language)}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.modalList}
                />
                <TouchableOpacity
                  style={styles.customOptionButton}
                  onPress={() => setShowCustomProcedure(true)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.customOptionText}>{t('addCustomProcedure')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  value={customProcedureInput}
                  onChangeText={setCustomProcedureInput}
                  placeholder={t('customProcedurePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.customCancelBtn}
                    onPress={() => {
                      setShowCustomProcedure(false);
                      setCustomProcedureInput('');
                    }}
                  >
                    <Text style={styles.customCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.customConfirmBtn, !customProcedureInput.trim() && styles.customConfirmDisabled]}
                    onPress={() => {
                      if (customProcedureInput.trim() && procedureModalToothIndex >= 0) {
                        updateToothWork(procedureModalToothIndex, 'procedure', customProcedureInput.trim());
                        setCustomProcedureInput('');
                        setShowCustomProcedure(false);
                        setProcedureModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.customConfirmText}>{t('add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ---- Material Picker Modal ---- */}
      <Modal visible={materialModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectMaterialTitle')}</Text>
              <TouchableOpacity onPress={() => setMaterialModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!showCustomMaterial ? (
              <>
                <FlatList
                  data={COMMON_MATERIALS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isSelected =
                      materialModalIndex >= 0 &&
                      materialsUsed[materialModalIndex]?.name === item;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemSelected,
                        ]}
                        onPress={() => {
                          if (materialModalIndex >= 0) {
                            updateMaterial(materialModalIndex, 'name', item);
                          }
                          setMaterialModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {translateMaterial(item, language)}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.modalList}
                />
                <TouchableOpacity
                  style={styles.customOptionButton}
                  onPress={() => setShowCustomMaterial(true)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.customOptionText}>{t('addCustomMaterial')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  value={customMaterialInput}
                  onChangeText={setCustomMaterialInput}
                  placeholder={t('customMaterialPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.customCancelBtn}
                    onPress={() => {
                      setShowCustomMaterial(false);
                      setCustomMaterialInput('');
                    }}
                  >
                    <Text style={styles.customCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.customConfirmBtn, !customMaterialInput.trim() && styles.customConfirmDisabled]}
                    onPress={() => {
                      if (customMaterialInput.trim() && materialModalIndex >= 0) {
                        updateMaterial(materialModalIndex, 'name', customMaterialInput.trim());
                        setCustomMaterialInput('');
                        setShowCustomMaterial(false);
                        setMaterialModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.customConfirmText}>{t('add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ---- Expense Category Picker Modal ---- */}
      <Modal visible={expenseCategoryModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectCategoryTitle')}</Text>
              <TouchableOpacity
                onPress={() => setExpenseCategoryModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {expenseCategories.map((cat) => {
              const isSelected =
                expenseCategoryIndex >= 0 &&
                additionalExpenses[expenseCategoryIndex]?.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    if (expenseCategoryIndex >= 0) {
                      updateExpense(expenseCategoryIndex, 'category', cat);
                    }
                    setExpenseCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {categoryLabels[cat] ?? cat}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ---- Treatment Plan Modal ---- */}
      <Modal visible={treatmentModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('linkToTreatment')}</Text>
              <TouchableOpacity onPress={() => setTreatmentModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* None option */}
            <TouchableOpacity
              style={[styles.optionItem, !treatmentPlanId && styles.optionItemSelected]}
              onPress={() => {
                setTreatmentPlanId(undefined);
                setTreatmentModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, !treatmentPlanId && styles.optionTextSelected]}>—</Text>
              {!treatmentPlanId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>

            {/* Existing plans */}
            {patientPlans.map((plan) => {
              const isSelected = treatmentPlanId === plan.id;
              const sessionCount = appointments.filter((a) => a.treatmentPlanId === plan.id).length;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                  onPress={() => {
                    setTreatmentPlanId(plan.id);
                    setTreatmentModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planMeta}>
                      {plan.toothNumbers.map((n) => `#${n}`).join(', ')} · {sessionCount} {sessionCount === 1 ? t('session') : t('sessions')}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}

            {patientPlans.length === 0 && !showNewPlanInput && (
              <Text style={styles.emptyText}>{t('noActivePlans')}</Text>
            )}

            {/* New plan input */}
            {showNewPlanInput ? (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  value={newPlanName}
                  onChangeText={setNewPlanName}
                  placeholder={t('treatmentNamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.customCancelBtn}
                    onPress={() => {
                      setShowNewPlanInput(false);
                      setNewPlanName('');
                    }}
                  >
                    <Text style={styles.customCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.customConfirmBtn, !newPlanName.trim() && styles.customConfirmDisabled]}
                    onPress={handleCreatePlan}
                  >
                    <Text style={styles.customConfirmText}>{t('add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.customOptionButton}
                onPress={() => setShowNewPlanInput(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.customOptionText}>{t('newPlan')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfField: {
    flex: 1,
  },

  // Patient selector
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  selectorText: {
    flex: 1,
  },
  selectorValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  selectorPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  selectorSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Multiline input
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Teeth work
  teethWorkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  toothBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 2,
  },
  toothBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  teethWorkFields: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  pickerButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.textMuted,
  },
  smallInput: {
    marginBottom: 0,
  },

  // Materials
  materialRow: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  materialPicker: {
    flex: 1,
  },
  deleteButton: {
    padding: spacing.xs,
    marginTop: 2,
  },
  subtotalText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },

  // Expenses
  expenseRow: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  expenseDescInput: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.3,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },

  // Save
  saveButton: {
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xl,
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalContainerSmall: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalList: {
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },

  // Patient option
  patientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  patientOptionSelected: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
  },
  patientOptionText: {
    flex: 1,
  },
  patientName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  patientNameSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  patientPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xl,
  },

  // Option items (procedure, material, category)
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },
  optionItemSelected: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  planMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Custom option
  customOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: spacing.md,
  },
  customOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },

  // Custom input for procedures/materials
  customInputContainer: {
    padding: spacing.md,
  },
  customInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customCancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  customConfirmDisabled: {
    opacity: 0.5,
  },
  customConfirmText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});
