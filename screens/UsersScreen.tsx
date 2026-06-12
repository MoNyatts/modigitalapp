import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Shield, UserCheck, LogOut, Plus, Edit3, Trash2, X, Calendar, QrCode } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import { router } from '@/navigation/router';
import { colors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import type { User, UserRole } from '@/types';

export default function UsersScreen() {
  const { user, logout, isAdmin, isGuest, clearAllData } = useAuth();
  const { events } = useFilteredEvents();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'guest' as UserRole,
  });

  // Assignment state
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // ── tRPC — all user data comes from / goes to the server ─────────────────
  const utils = trpc.useUtils();

  const usersQuery = trpc.users.list.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const users: User[] = (usersQuery.data ?? []) as User[];
  const loading = usersQuery.isLoading;

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });

  // Add new user — saved to server DB
  const handleAddUser = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        role: formData.role,
        assignedEventIds: formData.role === 'guest' ? [] : [],
        scannerEnabled: formData.role === 'guest' ? true : true,
      });
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'guest' });
      Alert.alert('Success', 'User added successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add user');
    }
  };

  // Edit user — updates on server
  const handleEditUser = async () => {
    if (!editingUser || !formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (formData.password.trim() && formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim() || undefined,
        role: formData.role,
      });
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'guest' });
      Alert.alert('Success', 'User updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user');
    }
  };

  // Delete user — removes from server
  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.id === user?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userToDelete.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserMutation.mutateAsync({ id: userToDelete.id });
              Alert.alert('Success', 'User deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  // Open edit modal
  const openEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
    });
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setEditingUser(null);
    setShowAssignModal(false);
    setAssigningUser(null);
    setFormData({ name: '', email: '', password: '', role: 'guest' });
    setSelectedEventIds([]);
  };

  // Open assign events modal
  const openAssignModal = (userToAssign: User) => {
    setAssigningUser(userToAssign);
    const validEventIds = (userToAssign.assignedEventIds || []).filter(eventId =>
      events.some(event => event.id === eventId)
    );
    setSelectedEventIds(validEventIds);
    setShowAssignModal(true);
  };

  // Handle event assignment — updates server
  const handleAssignEvents = async () => {
    if (!assigningUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: assigningUser.id,
        assignedEventIds: selectedEventIds,
      });
      setShowAssignModal(false);
      setAssigningUser(null);
      setSelectedEventIds([]);
      Alert.alert('Success', 'Event assignments updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update assignments');
    }
  };

  // Toggle scanner access — updates server
  const toggleScannerAccess = async (userToUpdate: User) => {
    if (userToUpdate.role !== 'guest') return;
    const newScannerEnabled = !userToUpdate.scannerEnabled;
    try {
      await updateUserMutation.mutateAsync({
        id: userToUpdate.id,
        scannerEnabled: newScannerEnabled,
      });
      Alert.alert(
        'Scanner Access Updated',
        `Scanner access has been ${newScannerEnabled ? 'enabled' : 'disabled'} for ${userToUpdate.name}.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update scanner access');
    }
  };

  // Toggle event selection
  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Logging out user...');
              await logout();
              console.log('User logged out successfully');
              // Navigate to login screen after successful logout
              router.replace('/login');
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Guest user view - only shows logout option
  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Profile</Text>
          <Users size={28} color="#ffffff" />
        </View>

        <View style={styles.content}>
          <View style={styles.currentUserSection}>
            <Text style={styles.sectionTitle}>Current User</Text>
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <UserCheck size={24} color="#1e40af" />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: '#fef3c7' }]}>
                    <Users size={14} color="#f59e0b" />
                    <Text style={[styles.roleText, { color: '#f59e0b' }]}>Guest</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.actionButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Guest Access</Text>
            <Text style={styles.infoDescription}>
              As a guest user, you have restricted access to:
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Only assigned events ({user?.assignedEventIds?.filter(eventId => events.some(event => event.id === eventId)).length || 0} events)</Text>
              <Text style={[
                styles.featureItem,
                { color: user?.scannerEnabled !== false ? '#374151' : '#ef4444' }
              ]}>
                • Scanner access: {user?.scannerEnabled !== false ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.featureItem}>• View reports for assigned events only</Text>
              <Text style={styles.featureItem}>• Cannot create or delete events/activities</Text>
            </View>
            {(user?.assignedEventIds?.filter(eventId => events.some(event => event.id === eventId)).length || 0) === 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ No events assigned. Contact admin to assign events to your account.
                </Text>
              </View>
            )}
            {user?.scannerEnabled === false && (
              <View style={[styles.warningBox, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
                <Text style={[styles.warningText, { color: '#991b1b' }]}>
                  🚫 Scanner access is disabled. Contact admin to enable scanner functionality.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Admin access denied view (shouldn't happen but keeping as fallback)
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Shield size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorDescription}>
            You don&apos;t have permission to access user management
          </Text>
        </View>
      </View>
    );
  }



  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all app data including events, activities, and scan records. Guest users will be logged out, but you will remain logged in as admin. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'All data has been cleared. Guest users have been logged out.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <UserCheck size={24} color="#1e40af" />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[
            styles.roleBadge,
            { backgroundColor: item.role === 'admin' ? '#d1fae5' : '#fef3c7' }
          ]}>
            {item.role === 'admin' ? (
              <Shield size={14} color="#10b981" />
            ) : (
              <Users size={14} color="#f59e0b" />
            )}
            <Text style={[
              styles.roleText,
              { color: item.role === 'admin' ? '#10b981' : '#f59e0b' }
            ]}>
              {item.role === 'admin' ? 'Administrator' : 'Guest'}
            </Text>
          </View>
          {item.role === 'guest' && (
            <>
              <Text style={styles.assignedEvents}>
                Assigned Events: {item.assignedEventIds?.filter(eventId => events.some(event => event.id === eventId)).length || 0}
              </Text>
              <View style={styles.scannerStatus}>
                <QrCode size={12} color={item.scannerEnabled !== false ? '#10b981' : '#ef4444'} />
                <Text style={[
                  styles.scannerStatusText,
                  { color: item.scannerEnabled !== false ? '#10b981' : '#ef4444' }
                ]}>
                  Scanner {item.scannerEnabled !== false ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </>
          )}
        </View>
        <View style={styles.userActions}>
          {item.role === 'guest' && (
            <>
              <TouchableOpacity 
                style={styles.assignButton} 
                onPress={() => openAssignModal(item)}
              >
                <Calendar size={16} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.scannerButton,
                  { backgroundColor: item.scannerEnabled !== false ? '#fef2f2' : '#d1fae5' }
                ]} 
                onPress={() => toggleScannerAccess(item)}
              >
                <QrCode size={16} color={item.scannerEnabled !== false ? '#ef4444' : '#10b981'} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => openEditModal(item)}
          >
            <Edit3 size={16} color="#3b82f6" />
          </TouchableOpacity>
          {item.id !== user?.id && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDeleteUser(item)}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderAssignModal = () => (
    <Modal
      visible={showAssignModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModals}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Assign Events to {assigningUser?.name}
          </Text>
          <TouchableOpacity onPress={closeModals}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.assignDescription}>
            Select which events this guest user can access:
          </Text>
          
          {events.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Calendar size={48} color="#9ca3af" />
              <Text style={styles.noEventsText}>No events available</Text>
              <Text style={styles.noEventsSubtext}>
                Create events first to assign them to users
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventOption,
                    selectedEventIds.includes(event.id) && styles.eventOptionSelected
                  ]}
                  onPress={() => toggleEventSelection(event.id)}
                >
                  <View style={styles.eventOptionContent}>
                    <View style={styles.eventOptionInfo}>
                      <Text style={[
                        styles.eventOptionName,
                        selectedEventIds.includes(event.id) && styles.eventOptionNameSelected
                      ]}>
                        {event.name}
                      </Text>
                      <Text style={[
                        styles.eventOptionDescription,
                        selectedEventIds.includes(event.id) && styles.eventOptionDescriptionSelected
                      ]}>
                        {event.description}
                      </Text>
                      <Text style={[
                        styles.eventOptionDate,
                        selectedEventIds.includes(event.id) && styles.eventOptionDateSelected
                      ]}>
                        {event.isMultiDay && event.endDate 
                          ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`
                          : new Date(event.startDate || event.date || '').toLocaleDateString()
                        }
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      selectedEventIds.includes(event.id) && styles.checkboxSelected
                    ]}>
                      {selectedEventIds.includes(event.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.assignmentSummary}>
            <Text style={styles.summaryText}>
              Selected: {selectedEventIds.length} of {events.length} events
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={closeModals}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleAssignEvents}
          >
            <Text style={styles.saveButtonText}>Update Assignments</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderModal = () => {
    const isEditing = editingUser !== null;
    const isVisible = showAddModal || isEditing;
    
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModals}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit User' : 'Add New User'}
            </Text>
            <TouchableOpacity onPress={closeModals}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter full name"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Password {isEditing && <Text style={styles.optionalText}>(leave blank to keep current)</Text>}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                placeholder={isEditing ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    formData.role === 'admin' && styles.roleOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                >
                  <Shield size={20} color={formData.role === 'admin' ? '#ffffff' : '#10b981'} />
                  <Text style={[
                    styles.roleOptionText,
                    formData.role === 'admin' && styles.roleOptionTextSelected
                  ]}>Administrator</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    formData.role === 'guest' && styles.roleOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, role: 'guest' }))}
                >
                  <Users size={20} color={formData.role === 'guest' ? '#ffffff' : '#f59e0b'} />
                  <Text style={[
                    styles.roleOptionText,
                    formData.role === 'guest' && styles.roleOptionTextSelected
                  ]}>Guest</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {formData.role === 'guest' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Guest users will have restricted access and can only view/scan assigned events.
                </Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeModals}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={isEditing ? handleEditUser : handleAddUser}
            >
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update User' : 'Add User'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>User Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.statsSection}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{users.length}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {users.filter(u => u.role === 'admin').length}
                </Text>
                <Text style={styles.statLabel}>Administrators</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {users.filter(u => u.role === 'guest').length}
                </Text>
                <Text style={styles.statLabel}>Guests</Text>
              </View>
            </View>

            <View style={styles.usersSection}>
              <Text style={styles.sectionTitle}>All Users</Text>
              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptyDescription}>
                Add your first user to get started
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.actionButtonText}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.clearDataButton]} 
              onPress={handleClearAllData}
            >
              <Text style={styles.clearDataIcon}>🗑️</Text>
              <Text style={styles.clearDataButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContentContainer}
      />
      
      {renderModal()}
      {renderAssignModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listContentContainer: {
    padding: 20,
  },
  statsSection: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  usersSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  assignedEvents: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  scannerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  scannerStatusText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
  },
  assignButton: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 8,
  },
  scannerButton: {
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  roleOptionSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  roleOptionTextSelected: {
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionsSection: {
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearDataButton: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  clearDataIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  clearDataButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#dc2626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Guest user section styles
  currentUserSection: {
    marginBottom: 32,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Assignment modal styles
  assignDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  eventsList: {
    gap: 12,
  },
  eventOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  eventOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  eventOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventOptionInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventOptionNameSelected: {
    color: '#065f46',
  },
  eventOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  eventOptionDescriptionSelected: {
    color: '#047857',
  },
  eventOptionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  eventOptionDateSelected: {
    color: '#059669',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assignmentSummary: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionalText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9ca3af',
  },
});