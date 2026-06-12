import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, MessageSquare, Send, Users, CheckCircle, AlertCircle, FileText, Upload, Trash2, UserPlus } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import { trpc } from '@/lib/trpc';

type MessageChannel = 'email' | 'sms' | 'whatsapp';
type MessageMode = 'broadcast' | 'personalized';

interface PersonalizedMessage {
  id: string;
  phoneNumber: string;
  message: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'document' | 'video';
}

export default function CommunicationsScreen() {
  const { isAdmin } = useAuth();
  const { events } = useFilteredEvents();
  const insets = useSafeAreaInsets();
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('email');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [recipients, setRecipients] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [messageMode, setMessageMode] = useState<MessageMode>('broadcast');
  const [personalizedMessages, setPersonalizedMessages] = useState<PersonalizedMessage[]>([]);
  const [bulkAttachmentUrl, setBulkAttachmentUrl] = useState<string>('');
  const [bulkAttachmentType, setBulkAttachmentType] = useState<'image' | 'document' | 'video'>('image');

  const sendSmsMutation = trpc.messaging.sendSms.useMutation();
  const sendWhatsappMutation = trpc.messaging.sendWhatsapp.useMutation();

  const handleSend = async () => {
    if (!recipients.trim()) {
      Alert.alert('Error', 'Please enter recipient(s)');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (selectedChannel === 'email' && !subject.trim()) {
      Alert.alert('Error', 'Please enter an email subject');
      return;
    }

    setIsSending(true);

    try {
      const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);

      if (selectedChannel === 'email') {
        if (Platform.OS === 'web') {
          const mailtoLink = `mailto:${recipientList.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
          window.open(mailtoLink, '_blank');
          Alert.alert('Success', 'Email client opened. Please send the email from your email application.');
        } else {
          Alert.alert(
            'Email Sending',
            `This would send an email to ${recipientList.length} recipient(s).\n\nIn production, this would integrate with your email service provider (SendGrid, AWS SES, etc.).`,
            [{ text: 'OK' }]
          );
        }
        clearForm();
      } else if (selectedChannel === 'sms') {
        if (messageMode === 'personalized' && personalizedMessages.length > 0) {
          const result = await sendSmsMutation.mutateAsync({
            phoneNumbers: [],
            message: '',
            eventId: selectedEvent,
            personalizedMessages: personalizedMessages.map(pm => ({
              phoneNumber: pm.phoneNumber,
              message: pm.message,
            })),
          });
          Alert.alert('Success', result.message || `Personalized SMS sent to ${personalizedMessages.length} recipient(s)`);
        } else {
          const result = await sendSmsMutation.mutateAsync({
            phoneNumbers: recipientList,
            message: message,
            eventId: selectedEvent,
          });
          Alert.alert('Success', result.message || `SMS sent to ${recipientList.length} recipient(s)`);
        }
        clearForm();
      } else if (selectedChannel === 'whatsapp') {
        if (messageMode === 'personalized' && personalizedMessages.length > 0) {
          const result = await sendWhatsappMutation.mutateAsync({
            phoneNumbers: [],
            message: '',
            eventId: selectedEvent,
            personalizedMessages: personalizedMessages,
          });
          Alert.alert('Success', result.message || `Personalized WhatsApp messages sent to ${personalizedMessages.length} recipient(s)`);
        } else {
          const result = await sendWhatsappMutation.mutateAsync({
            phoneNumbers: recipientList,
            message: message,
            eventId: selectedEvent,
            attachmentUrl: bulkAttachmentUrl || undefined,
            attachmentType: bulkAttachmentUrl ? bulkAttachmentType : undefined,
          });
          Alert.alert('Success', result.message || `WhatsApp message sent to ${recipientList.length} recipient(s)`);
        }
        clearForm();
      }
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert(
        'Send Failed',
        error instanceof Error ? error.message : 'Failed to send message'
      );
    } finally {
      setIsSending(false);
    }
  };

  const clearForm = () => {
    setRecipients('');
    setSubject('');
    setMessage('');
    setSelectedEvent('');
    setPersonalizedMessages([]);
    setBulkAttachmentUrl('');
    setMessageMode('broadcast');
  };

  const addPersonalizedMessage = () => {
    setPersonalizedMessages([...personalizedMessages, {
      id: Date.now().toString(),
      phoneNumber: '',
      message: '',
    }]);
  };

  const updatePersonalizedMessage = (id: string, field: keyof PersonalizedMessage, value: string) => {
    setPersonalizedMessages(personalizedMessages.map(pm => 
      pm.id === id ? { ...pm, [field]: value } : pm
    ));
  };

  const removePersonalizedMessage = (id: string) => {
    setPersonalizedMessages(personalizedMessages.filter(pm => pm.id !== id));
  };

  const importBulkRecipients = () => {
    Alert.prompt(
      'Import Recipients',
      'Paste phone numbers separated by commas or new lines',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: (text?: string) => {
            if (text) {
              const phones = text.split(/[,\n]/).map((p: string) => p.trim()).filter((p: string) => p);
              const newMessages = phones.map((phone: string, i: number) => ({
                id: `${Date.now()}-${i}`,
                phoneNumber: phone,
                message: message || '',
              }));
              setPersonalizedMessages([...personalizedMessages, ...newMessages]);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getChannelIcon = (channel: MessageChannel) => {
    switch (channel) {
      case 'email':
        return Mail;
      case 'sms':
        return MessageSquare;
      case 'whatsapp':
        return MessageSquare;
    }
  };

  const getPlaceholder = () => {
    switch (selectedChannel) {
      case 'email':
        return 'Enter email addresses separated by commas';
      case 'sms':
        return 'Enter phone numbers separated by commas (+1234567890)';
      case 'whatsapp':
        return 'Enter WhatsApp numbers separated by commas (+1234567890)';
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorDescription}>
            Only administrators can access communication features
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Communications</Text>
        <Send size={24} color={colors.white} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Channel</Text>
          <View style={styles.channelSelector}>
            {(['email', 'sms', 'whatsapp'] as MessageChannel[]).map((channel) => {
              const Icon = getChannelIcon(channel);
              return (
                <TouchableOpacity
                  key={channel}
                  style={[
                    styles.channelCard,
                    selectedChannel === channel && styles.channelCardSelected,
                  ]}
                  onPress={() => setSelectedChannel(channel)}
                >
                  <Icon
                    size={32}
                    color={selectedChannel === channel ? colors.primary : colors.gray[600]}
                  />
                  <Text
                    style={[
                      styles.channelText,
                      selectedChannel === channel && styles.channelTextSelected,
                    ]}
                  >
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </Text>
                  {selectedChannel === channel && (
                    <View style={styles.selectedBadge}>
                      <CheckCircle size={20} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(selectedChannel === 'sms' || selectedChannel === 'whatsapp') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Messaging Mode</Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  messageMode === 'broadcast' && styles.modeButtonSelected,
                ]}
                onPress={() => setMessageMode('broadcast')}
              >
                <Users size={20} color={messageMode === 'broadcast' ? colors.white : colors.gray[600]} />
                <Text
                  style={[
                    styles.modeText,
                    messageMode === 'broadcast' && styles.modeTextSelected,
                  ]}
                >
                  Broadcast
                </Text>
                <Text style={[
                  styles.modeDescription,
                  messageMode === 'broadcast' && styles.modeDescriptionSelected,
                ]}>Same message to all</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  messageMode === 'personalized' && styles.modeButtonSelected,
                ]}
                onPress={() => setMessageMode('personalized')}
              >
                <UserPlus size={20} color={messageMode === 'personalized' ? colors.white : colors.gray[600]} />
                <Text
                  style={[
                    styles.modeText,
                    messageMode === 'personalized' && styles.modeTextSelected,
                  ]}
                >
                  Personalized
                </Text>
                <Text style={[
                  styles.modeDescription,
                  messageMode === 'personalized' && styles.modeDescriptionSelected,
                ]}>Custom per recipient</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Link to Event (Optional)</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Event',
                    'Choose an event to associate with this message',
                    [
                      { text: 'None', onPress: () => setSelectedEvent('') },
                      ...events.map(event => ({
                        text: event.name,
                        onPress: () => setSelectedEvent(event.id),
                      })),
                    ]
                  );
                }}
              >
                <Text style={selectedEvent ? styles.pickerText : styles.pickerPlaceholder}>
                  {selectedEvent
                    ? events.find(e => e.id === selectedEvent)?.name
                    : 'Select event (optional)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Recipients
              {selectedChannel === 'email' ? ' (Email Addresses)' : ' (Phone Numbers)'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={recipients}
              onChangeText={setRecipients}
              placeholder={getPlaceholder()}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              {selectedChannel === 'email'
                ? 'Example: john@example.com, jane@example.com'
                : 'Example: +1234567890, +0987654321 (include country code)'}
            </Text>
          </View>

          {selectedChannel === 'email' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter email subject"
              />
            </View>
          )}

          {messageMode === 'broadcast' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.messageArea]}
                value={message}
                onChangeText={setMessage}
                placeholder={`Enter your ${selectedChannel} message...`}
                multiline
                numberOfLines={8}
              />
              <Text style={styles.characterCount}>{message.length} characters</Text>
            </View>
          )}

          {messageMode === 'broadcast' && selectedChannel === 'whatsapp' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Attachment (Optional)</Text>
              <View style={styles.attachmentContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={bulkAttachmentUrl}
                  onChangeText={setBulkAttachmentUrl}
                  placeholder="Enter attachment URL (image, document, or video)"
                  autoCapitalize="none"
                />
              </View>
              {bulkAttachmentUrl && (
                <View style={styles.attachmentTypeSelector}>
                  {(['image', 'document', 'video'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.attachmentTypeButton,
                        bulkAttachmentType === type && styles.attachmentTypeButtonSelected,
                      ]}
                      onPress={() => setBulkAttachmentType(type)}
                    >
                      <Text
                        style={[
                          styles.attachmentTypeText,
                          bulkAttachmentType === type && styles.attachmentTypeTextSelected,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {messageMode === 'personalized' && (selectedChannel === 'sms' || selectedChannel === 'whatsapp') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personalized Messages</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity style={styles.actionButton} onPress={importBulkRecipients}>
                  <Upload size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Import</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={addPersonalizedMessage}>
                  <UserPlus size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {personalizedMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color={colors.gray[400]} />
                <Text style={styles.emptyStateText}>No personalized messages yet</Text>
                <Text style={styles.emptyStateDescription}>
                  Add recipients and customize their messages
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.personalizedList} nestedScrollEnabled>
                {personalizedMessages.map((pm, index) => (
                  <View key={pm.id} style={styles.personalizedCard}>
                    <View style={styles.personalizedHeader}>
                      <Text style={styles.personalizedIndex}>#{index + 1}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removePersonalizedMessage(pm.id)}
                      >
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.personalizedFormGroup}>
                      <Text style={styles.personalizedLabel}>Phone Number</Text>
                      <TextInput
                        style={styles.personalizedInput}
                        value={pm.phoneNumber}
                        onChangeText={(text) => updatePersonalizedMessage(pm.id, 'phoneNumber', text)}
                        placeholder="+1234567890"
                        autoCapitalize="none"
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.personalizedFormGroup}>
                      <Text style={styles.personalizedLabel}>Message</Text>
                      <TextInput
                        style={[styles.personalizedInput, styles.personalizedTextArea]}
                        value={pm.message}
                        onChangeText={(text) => updatePersonalizedMessage(pm.id, 'message', text)}
                        placeholder="Enter personalized message"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {selectedChannel === 'whatsapp' && (
                      <View style={styles.personalizedFormGroup}>
                        <Text style={styles.personalizedLabel}>Attachment URL (Optional)</Text>
                        <TextInput
                          style={styles.personalizedInput}
                          value={pm.attachmentUrl || ''}
                          onChangeText={(text) => updatePersonalizedMessage(pm.id, 'attachmentUrl', text)}
                          placeholder="https://example.com/file.jpg"
                          autoCapitalize="none"
                        />
                        {pm.attachmentUrl && (
                          <View style={styles.attachmentTypeSelector}>
                            {(['image', 'document', 'video'] as const).map(type => (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.attachmentTypeButtonSmall,
                                  pm.attachmentType === type && styles.attachmentTypeButtonSelected,
                                ]}
                                onPress={() => updatePersonalizedMessage(pm.id, 'attachmentType', type)}
                              >
                                <Text
                                  style={[
                                    styles.attachmentTypeTextSmall,
                                    pm.attachmentType === type && styles.attachmentTypeTextSelected,
                                  ]}
                                >
                                  {type}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.templateCard}
              onPress={() => setMessage('Thank you for attending our event! We hope you enjoyed it.')}
            >
              <Text style={styles.templateTitle}>Thank You</Text>
              <Text style={styles.templatePreview}>Thank you for attending...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.templateCard}
              onPress={() => setMessage('You are invited to our upcoming event. Please confirm your attendance.')}
            >
              <Text style={styles.templateTitle}>Event Invitation</Text>
              <Text style={styles.templatePreview}>You are invited to...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.templateCard}
              onPress={() => setMessage('Reminder: Our event is tomorrow. Looking forward to seeing you!')}
            >
              <Text style={styles.templateTitle}>Event Reminder</Text>
              <Text style={styles.templatePreview}>Reminder: Our event...</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Send size={20} color={colors.white} />
            <Text style={styles.sendButtonText}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
            <Text style={styles.clearButtonText}>Clear Form</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Communication Guidelines</Text>
          <Text style={styles.infoText}>
            • Email: Best for detailed information and attachments
          </Text>
          <Text style={styles.infoText}>
            • SMS: Quick updates, reminders, and time-sensitive messages
          </Text>
          <Text style={styles.infoText}>
            • WhatsApp: Rich media messages and group communications
          </Text>
          <Text style={styles.infoText}>
            • Always obtain consent before sending marketing messages
          </Text>
          <Text style={styles.infoText}>
            • Include opt-out options in bulk messages
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  channelSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  channelCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  channelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 8,
  },
  channelTextSelected: {
    color: colors.primary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  messageArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 6,
    fontStyle: 'italic',
  },
  characterCount: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'right',
    marginTop: 6,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  modeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 8,
  },
  modeTextSelected: {
    color: colors.white,
  },
  modeDescription: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 4,
  },
  modeDescriptionSelected: {
    color: colors.white,
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 8,
    textAlign: 'center',
  },
  personalizedList: {
    maxHeight: 600,
  },
  personalizedCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  personalizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  personalizedIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    padding: 4,
  },
  personalizedFormGroup: {
    marginBottom: 12,
  },
  personalizedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  personalizedInput: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.gray[50],
  },
  personalizedTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  attachmentContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  attachmentTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  attachmentTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  attachmentTypeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  attachmentTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  attachmentTypeTextSelected: {
    color: colors.white,
  },
  attachmentTypeButtonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  attachmentTypeTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[700],
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  picker: {
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: colors.gray[500],
  },
  templateCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 180,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  templatePreview: {
    fontSize: 12,
    color: colors.gray[600],
    lineHeight: 18,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  infoSection: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 0,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.gray[700],
    lineHeight: 20,
    marginBottom: 6,
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
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});
