import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import ToothChart from '../components/ToothChart';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { Appointment, ToothWork, MaterialUsed, ExpenseItem } from '../types';
import { getToday, DENTAL_PROCEDURES, COMMON_MATERIALS, formatCurrency } from '../utils/helpers';

function getCurrentTime(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function AddAppointmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patients, addAppointment, updateAppointment } = useData();

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

  // Materials
  const [materialsUsed, setMaterialsUsed] = useState<MaterialUsed[]>([]);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [materialModalIndex, setMaterialModalIndex] = useState(-1);

  // Fees
  const [procedureFee, setProcedureFee] = useState('');

  // Additional expenses
  const [additionalExpenses, setAdditionalExpenses] = useState<ExpenseItem[]>([]);
  const [expenseCategoryModalVisible, setExpenseCategoryModalVisible] = useState(false);
  const [expenseCategoryIndex, setExpenseCategoryIndex] = useState(-1);

  // Payment & notes
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

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

  const handleSave = async () => {
    if (!patientId) {
      Alert.alert('Error', 'Please select a patient.');
      return;
    }
    if (!date) {
      Alert.alert('Error', 'Please enter a date.');
      return;
    }

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
      Alert.alert('Error', 'Failed to save appointment.');
    } finally {
      setSaving(false);
    }
  };

  const expenseCategories: ExpenseItem['category'][] = ['material', 'rental', 'lab', 'other'];

  // ---- Render ----

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Patient Selection */}
        <Card>
          {renderSectionHeader('Patient', 'person-outline')}
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
                  {selectedPatient?.name ?? 'Select a patient'}
                </Text>
                {selectedPatient?.phone && (
                  <Text style={styles.selectorSub}>{selectedPatient.phone}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Date & Time */}
        <Card>
          {renderSectionHeader('Schedule', 'calendar-outline')}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
                placeholder="2025-01-15"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Time (HH:MM)"
                value={time}
                onChangeText={setTime}
                placeholder="09:30"
              />
            </View>
          </View>
        </Card>

        {/* Chief Complaint & Diagnosis */}
        <Card>
          {renderSectionHeader('Clinical Details', 'medkit-outline')}
          <Input
            label="Chief Complaint"
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="Patient's main concern"
          />
          <Input
            label="Diagnosis"
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Clinical diagnosis"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
        </Card>

        {/* Tooth Chart */}
        <Card>
          {renderSectionHeader('Tooth Chart', 'grid-outline')}
          <ToothChart selectedTeeth={selectedTeeth} onToggleTooth={handleToggleTooth} />
        </Card>

        {/* Teeth Work Details */}
        {teethWork.length > 0 && (
          <Card>
            {renderSectionHeader('Teeth Work Details', 'construct-outline')}
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
                      {tw.procedure || 'Select procedure'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <Input
                    placeholder="Notes"
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
          {renderSectionHeader('Materials Used', 'flask-outline')}
          {materialsUsed.map((mat, index) => (
            <View key={index} style={styles.materialRow}>
              <View style={styles.materialHeader}>
                <TouchableOpacity
                  style={[styles.pickerButton, styles.materialPicker]}
                  onPress={() => {
                    setMaterialModalIndex(index);
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
                    {mat.name || 'Select material'}
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
                    label="Quantity"
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
                    label="Unit Cost"
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
                Subtotal: {formatCurrency(mat.quantity * mat.unitCost)}
              </Text>
            </View>
          ))}
          <Button
            title="Add Material"
            variant="ghost"
            size="sm"
            onPress={addMaterial}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Procedure Fee */}
        <Card>
          {renderSectionHeader('Fees', 'cash-outline')}
          <Input
            label="Procedure Fee"
            value={procedureFee}
            onChangeText={setProcedureFee}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </Card>

        {/* Additional Expenses */}
        <Card>
          {renderSectionHeader('Additional Expenses', 'receipt-outline')}
          {additionalExpenses.map((exp, index) => (
            <View key={index} style={styles.expenseRow}>
              <View style={styles.materialHeader}>
                <Input
                  label="Description"
                  value={exp.description}
                  onChangeText={(val) => updateExpense(index, 'description', val)}
                  placeholder="Expense description"
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
                    label="Amount"
                    value={exp.amount ? exp.amount.toString() : ''}
                    onChangeText={(val) =>
                      updateExpense(index, 'amount', parseFloat(val) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setExpenseCategoryIndex(index);
                      setExpenseCategoryModalVisible(true);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <Button
            title="Add Expense"
            variant="ghost"
            size="sm"
            onPress={addExpense}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Payment */}
        <Card>
          {renderSectionHeader('Payment', 'wallet-outline')}
          <Input
            label="Amount Paid"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </Card>

        {/* Notes */}
        <Card>
          {renderSectionHeader('Notes', 'document-text-outline')}
          <Input
            label="Additional Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            multiline
            numberOfLines={4}
            style={styles.multiline}
          />
        </Card>

        {/* Total Summary */}
        <Card style={styles.summaryCard}>
          {renderSectionHeader('Total Summary', 'calculator-outline')}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Procedure Fee</Text>
            <Text style={styles.summaryValue}>{formatCurrency(fee)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Materials</Text>
            <Text style={styles.summaryValue}>{formatCurrency(materialsCost)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Additional Expenses</Text>
            <Text style={styles.summaryValue}>{formatCurrency(expensesCost)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(parseFloat(amountPaid) || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance Due</Text>
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
          title={isEditing ? 'Update Appointment' : 'Save Appointment'}
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
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setPatientModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Input
              placeholder="Search by name or phone..."
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
                <Text style={styles.emptyText}>No patients found</Text>
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
              <Text style={styles.modalTitle}>Select Procedure</Text>
              <TouchableOpacity onPress={() => setProcedureModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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
                      {item}
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
          </View>
        </View>
      </Modal>

      {/* ---- Material Picker Modal ---- */}
      <Modal visible={materialModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Material</Text>
              <TouchableOpacity onPress={() => setMaterialModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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
                      {item}
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
              onPress={() => {
                setMaterialModalVisible(false);
                // Leave the name field empty so the user can type a custom name
                if (materialModalIndex >= 0) {
                  updateMaterial(materialModalIndex, 'name', '');
                }
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.customOptionText}>Enter custom name instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- Expense Category Picker Modal ---- */}
      <Modal visible={expenseCategoryModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
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
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
});
