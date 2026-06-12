import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageIcon, Plus, X, Trash2, Star, Calendar, Users as UsersIcon, Edit3 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from '@/lib/imagePicker';
import { getStorage } from '@/lib/storage';

type MediaCategory = 'event' | 'success-story' | 'promotional';

interface MediaItem {
  id: string;
  uri: string;
  title: string;
  description: string;
  category: MediaCategory;
  eventName?: string;
  date: string;
  featured: boolean;
  createdAt: string;
}

interface SuccessStory {
  id: string;
  title: string;
  clientName: string;
  eventType: string;
  description: string;
  testimonial: string;
  imageUri?: string;
  attendeeCount?: number;
  eventDate: string;
  featured: boolean;
  createdAt: string;
}

const STORAGE_KEY_MEDIA = 'event_app_gallery_media';
const STORAGE_KEY_STORIES = 'event_app_success_stories';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3;

export default function GalleryScreen() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'gallery' | 'stories'>('gallery');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState<SuccessStory | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const storage = getStorage();

  const [mediaFormData, setMediaFormData] = useState({
    uri: '',
    title: '',
    description: '',
    category: 'event' as MediaCategory,
    eventName: '',
    featured: false,
  });

  const [storyFormData, setStoryFormData] = useState({
    title: '',
    clientName: '',
    eventType: '',
    description: '',
    testimonial: '',
    imageUri: '',
    attendeeCount: '',
    eventDate: new Date().toISOString().split('T')[0],
    featured: false,
  });

  const loadData = useCallback(async () => {
    try {
      const [storedMedia, storedStories] = await Promise.all([
        storage.getItem(STORAGE_KEY_MEDIA),
        storage.getItem(STORAGE_KEY_STORIES),
      ]);

      if (storedMedia) {
        setMediaItems(JSON.parse(storedMedia));
      }
      if (storedStories) {
        setStories(JSON.parse(storedStories));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [storage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveMedia = async (updatedMedia: MediaItem[]) => {
    try {
      await storage.setItem(STORAGE_KEY_MEDIA, JSON.stringify(updatedMedia));
      setMediaItems(updatedMedia);
    } catch (error) {
      console.error('Failed to save media:', error);
      Alert.alert('Error', 'Failed to save media data');
    }
  };

  const saveStories = async (updatedStories: SuccessStory[]) => {
    try {
      await storage.setItem(STORAGE_KEY_STORIES, JSON.stringify(updatedStories));
      setStories(updatedStories);
    } catch (error) {
      console.error('Failed to save stories:', error);
      Alert.alert('Error', 'Failed to save story data');
    }
  };

  const pickImage = async (isForStory: boolean = false) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access photos is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (isForStory) {
          setStoryFormData(prev => ({ ...prev, imageUri: result.assets[0].uri }));
        } else {
          setMediaFormData(prev => ({ ...prev, uri: result.assets[0].uri }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddMedia = async () => {
    if (!mediaFormData.uri || !mediaFormData.title.trim()) {
      Alert.alert('Error', 'Please provide an image and title');
      return;
    }

    const newMedia: MediaItem = {
      id: Date.now().toString(),
      uri: mediaFormData.uri,
      title: mediaFormData.title.trim(),
      description: mediaFormData.description.trim(),
      category: mediaFormData.category,
      eventName: mediaFormData.eventName.trim(),
      date: new Date().toISOString().split('T')[0],
      featured: mediaFormData.featured,
      createdAt: new Date().toISOString(),
    };

    await saveMedia([...mediaItems, newMedia]);
    closeMediaModal();
    Alert.alert('Success', 'Media added successfully');
  };

  const handleAddStory = async () => {
    if (!storyFormData.title.trim() || !storyFormData.clientName.trim()) {
      Alert.alert('Error', 'Please provide a title and client name');
      return;
    }

    const newStory: SuccessStory = {
      id: Date.now().toString(),
      title: storyFormData.title.trim(),
      clientName: storyFormData.clientName.trim(),
      eventType: storyFormData.eventType.trim(),
      description: storyFormData.description.trim(),
      testimonial: storyFormData.testimonial.trim(),
      imageUri: storyFormData.imageUri,
      attendeeCount: storyFormData.attendeeCount ? parseInt(storyFormData.attendeeCount) : undefined,
      eventDate: storyFormData.eventDate,
      featured: storyFormData.featured,
      createdAt: new Date().toISOString(),
    };

    await saveStories([...stories, newStory]);
    closeStoryModal();
    Alert.alert('Success', 'Success story added successfully');
  };

  const handleEditStory = async () => {
    if (!editingStory) return;

    const updatedStories = stories.map(s =>
      s.id === editingStory.id
        ? {
            ...s,
            title: storyFormData.title.trim(),
            clientName: storyFormData.clientName.trim(),
            eventType: storyFormData.eventType.trim(),
            description: storyFormData.description.trim(),
            testimonial: storyFormData.testimonial.trim(),
            imageUri: storyFormData.imageUri,
            attendeeCount: storyFormData.attendeeCount ? parseInt(storyFormData.attendeeCount) : undefined,
            eventDate: storyFormData.eventDate,
            featured: storyFormData.featured,
          }
        : s
    );

    await saveStories(updatedStories);
    closeStoryModal();
    Alert.alert('Success', 'Success story updated successfully');
  };

  const handleDeleteMedia = (media: MediaItem) => {
    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete "${media.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedMedia = mediaItems.filter(m => m.id !== media.id);
            await saveMedia(updatedMedia);
            Alert.alert('Success', 'Media deleted successfully');
          },
        },
      ]
    );
  };

  const handleDeleteStory = (story: SuccessStory) => {
    Alert.alert(
      'Delete Story',
      `Are you sure you want to delete "${story.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedStories = stories.filter(s => s.id !== story.id);
            await saveStories(updatedStories);
            Alert.alert('Success', 'Story deleted successfully');
          },
        },
      ]
    );
  };

  const toggleFeatured = async (item: MediaItem | SuccessStory, type: 'media' | 'story') => {
    if (type === 'media') {
      const updatedMedia = mediaItems.map(m =>
        m.id === item.id ? { ...m, featured: !m.featured } : m
      );
      await saveMedia(updatedMedia);
    } else {
      const updatedStories = stories.map(s =>
        s.id === item.id ? { ...s, featured: !s.featured } : s
      );
      await saveStories(updatedStories);
    }
  };

  const openEditStory = (story: SuccessStory) => {
    setEditingStory(story);
    setStoryFormData({
      title: story.title,
      clientName: story.clientName,
      eventType: story.eventType,
      description: story.description,
      testimonial: story.testimonial,
      imageUri: story.imageUri || '',
      attendeeCount: story.attendeeCount?.toString() || '',
      eventDate: story.eventDate,
      featured: story.featured,
    });
  };

  const closeMediaModal = () => {
    setShowAddMediaModal(false);
    setMediaFormData({
      uri: '',
      title: '',
      description: '',
      category: 'event',
      eventName: '',
      featured: false,
    });
  };

  const closeStoryModal = () => {
    setShowAddStoryModal(false);
    setEditingStory(null);
    setStoryFormData({
      title: '',
      clientName: '',
      eventType: '',
      description: '',
      testimonial: '',
      imageUri: '',
      attendeeCount: '',
      eventDate: new Date().toISOString().split('T')[0],
      featured: false,
    });
  };

  const featuredMedia = mediaItems.filter(m => m.featured);
  const featuredStories = stories.filter(s => s.featured);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Promotional Materials</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (activeTab === 'gallery') {
                setShowAddMediaModal(true);
              } else {
                setShowAddStoryModal(true);
              }
            }}
          >
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
          onPress={() => setActiveTab('gallery')}
        >
          <ImageIcon size={20} color={activeTab === 'gallery' ? colors.primary : colors.gray[600]} />
          <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>
            Gallery ({mediaItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stories' && styles.activeTab]}
          onPress={() => setActiveTab('stories')}
        >
          <Star size={20} color={activeTab === 'stories' ? colors.primary : colors.gray[600]} />
          <Text style={[styles.tabText, activeTab === 'stories' && styles.activeTabText]}>
            Success Stories ({stories.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'gallery' ? (
          <>
            {featuredMedia.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Media</Text>
                <View style={styles.mediaGrid}>
                  {featuredMedia.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.mediaItem}
                      onPress={() => setSelectedImage(item.uri)}
                    >
                      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                      <View style={styles.featuredBadge}>
                        <Star size={12} color={colors.warning} fill={colors.warning} />
                      </View>
                      {isAdmin && (
                        <View style={styles.mediaActions}>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => toggleFeatured(item, 'media')}
                          >
                            <Star size={14} color={colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, styles.deleteIconButton]}
                            onPress={() => handleDeleteMedia(item)}
                          >
                            <Trash2 size={14} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <View style={styles.mediaInfo}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Media</Text>
              {mediaItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <ImageIcon size={64} color={colors.gray[300]} />
                  <Text style={styles.emptyStateText}>No media items yet</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => setShowAddMediaModal(true)}
                    >
                      <Text style={styles.emptyStateButtonText}>Add First Media</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.mediaGrid}>
                  {mediaItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.mediaItem}
                      onPress={() => setSelectedImage(item.uri)}
                    >
                      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                      {item.featured && (
                        <View style={styles.featuredBadge}>
                          <Star size={12} color={colors.warning} fill={colors.warning} />
                        </View>
                      )}
                      {isAdmin && (
                        <View style={styles.mediaActions}>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => toggleFeatured(item, 'media')}
                          >
                            <Star size={14} color={colors.white} fill={item.featured ? colors.warning : 'transparent'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, styles.deleteIconButton]}
                            onPress={() => handleDeleteMedia(item)}
                          >
                            <Trash2 size={14} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <View style={styles.mediaInfo}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {featuredStories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Stories</Text>
                {featuredStories.map(story => (
                  <View key={story.id} style={styles.storyCard}>
                    <View style={styles.storyHeader}>
                      <View style={styles.storyHeaderLeft}>
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        <Text style={styles.storyClient}>{story.clientName}</Text>
                      </View>
                      <View style={styles.featuredStoryBadge}>
                        <Star size={16} color={colors.warning} fill={colors.warning} />
                      </View>
                    </View>

                    {story.imageUri && (
                      <Image source={{ uri: story.imageUri }} style={styles.storyImage} />
                    )}

                    <View style={styles.storyMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={14} color={colors.gray[600]} />
                        <Text style={styles.metaText}>
                          {new Date(story.eventDate).toLocaleDateString()}
                        </Text>
                      </View>
                      {story.attendeeCount && (
                        <View style={styles.metaItem}>
                          <UsersIcon size={14} color={colors.gray[600]} />
                          <Text style={styles.metaText}>{story.attendeeCount} attendees</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.storyDescription}>{story.description}</Text>

                    {story.testimonial && (
                      <View style={styles.testimonialBox}>
                        <Text style={styles.testimonialText}>&ldquo;{story.testimonial}&rdquo;</Text>
                      </View>
                    )}

                    {isAdmin && (
                      <View style={styles.storyActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => toggleFeatured(story, 'story')}
                        >
                          <Star size={16} color={colors.warning} />
                          <Text style={styles.actionButtonText}>
                            {story.featured ? 'Unfeature' : 'Feature'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditStory(story)}
                        >
                          <Edit3 size={16} color={colors.secondary} />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteActionButton]}
                          onPress={() => handleDeleteStory(story)}
                        >
                          <Trash2 size={16} color={colors.error} />
                          <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Success Stories</Text>
              {stories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Star size={64} color={colors.gray[300]} />
                  <Text style={styles.emptyStateText}>No success stories yet</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => setShowAddStoryModal(true)}
                    >
                      <Text style={styles.emptyStateButtonText}>Add First Story</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                stories.filter(s => !s.featured).map(story => (
                  <View key={story.id} style={styles.storyCard}>
                    <View style={styles.storyHeader}>
                      <View style={styles.storyHeaderLeft}>
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        <Text style={styles.storyClient}>{story.clientName}</Text>
                      </View>
                    </View>

                    {story.imageUri && (
                      <Image source={{ uri: story.imageUri }} style={styles.storyImage} />
                    )}

                    <View style={styles.storyMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={14} color={colors.gray[600]} />
                        <Text style={styles.metaText}>
                          {new Date(story.eventDate).toLocaleDateString()}
                        </Text>
                      </View>
                      {story.attendeeCount && (
                        <View style={styles.metaItem}>
                          <UsersIcon size={14} color={colors.gray[600]} />
                          <Text style={styles.metaText}>{story.attendeeCount} attendees</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.storyDescription}>{story.description}</Text>

                    {story.testimonial && (
                      <View style={styles.testimonialBox}>
                        <Text style={styles.testimonialText}>&ldquo;{story.testimonial}&rdquo;</Text>
                      </View>
                    )}

                    {isAdmin && (
                      <View style={styles.storyActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => toggleFeatured(story, 'story')}
                        >
                          <Star size={16} color={colors.gray[600]} />
                          <Text style={styles.actionButtonText}>Feature</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditStory(story)}
                        >
                          <Edit3 size={16} color={colors.secondary} />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteActionButton]}
                          onPress={() => handleDeleteStory(story)}
                        >
                          <Trash2 size={16} color={colors.error} />
                          <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showAddMediaModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeMediaModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Media</Text>
            <TouchableOpacity onPress={closeMediaModal}>
              <X size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(false)}
            >
              {mediaFormData.uri ? (
                <Image source={{ uri: mediaFormData.uri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <ImageIcon size={48} color={colors.gray[400]} />
                  <Text style={styles.imagePickerText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={mediaFormData.title}
                onChangeText={(text) => setMediaFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter title"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={mediaFormData.description}
                onChangeText={(text) => setMediaFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={mediaFormData.eventName}
                onChangeText={(text) => setMediaFormData(prev => ({ ...prev, eventName: text }))}
                placeholder="Enter event name"
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxOption}
              onPress={() => setMediaFormData(prev => ({ ...prev, featured: !prev.featured }))}
            >
              <View style={[styles.checkbox, mediaFormData.featured && styles.checkboxChecked]}>
                {mediaFormData.featured && <Star size={16} color={colors.warning} fill={colors.warning} />}
              </View>
              <Text style={styles.checkboxLabel}>Mark as featured</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeMediaModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleAddMedia}>
              <Text style={styles.saveButtonText}>Add Media</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddStoryModal || editingStory !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeStoryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingStory ? 'Edit Success Story' : 'Add Success Story'}
            </Text>
            <TouchableOpacity onPress={closeStoryModal}>
              <X size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(true)}
            >
              {storyFormData.imageUri ? (
                <Image source={{ uri: storyFormData.imageUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <ImageIcon size={48} color={colors.gray[400]} />
                  <Text style={styles.imagePickerText}>Tap to select image (Optional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Story Title</Text>
              <TextInput
                style={styles.input}
                value={storyFormData.title}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter story title"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={styles.input}
                value={storyFormData.clientName}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, clientName: text }))}
                placeholder="Enter client name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Type</Text>
              <TextInput
                style={styles.input}
                value={storyFormData.eventType}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, eventType: text }))}
                placeholder="e.g., Wedding, Corporate Event"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Date</Text>
              <TextInput
                style={styles.input}
                value={storyFormData.eventDate}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, eventDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Attendee Count (Optional)</Text>
              <TextInput
                style={styles.input}
                value={storyFormData.attendeeCount}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, attendeeCount: text }))}
                placeholder="Number of attendees"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={storyFormData.description}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, description: text }))}
                placeholder="Describe the event and what made it successful"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Testimonial (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={storyFormData.testimonial}
                onChangeText={(text) => setStoryFormData(prev => ({ ...prev, testimonial: text }))}
                placeholder="Client's feedback about the event"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxOption}
              onPress={() => setStoryFormData(prev => ({ ...prev, featured: !prev.featured }))}
            >
              <View style={[styles.checkbox, storyFormData.featured && styles.checkboxChecked]}>
                {storyFormData.featured && <Star size={16} color={colors.warning} fill={colors.warning} />}
              </View>
              <Text style={styles.checkboxLabel}>Mark as featured</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeStoryModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editingStory ? handleEditStory : handleAddStory}
            >
              <Text style={styles.saveButtonText}>
                {editingStory ? 'Update' : 'Add'} Story
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity style={styles.closeImageButton} onPress={() => setSelectedImage(null)}>
              <X size={24} color={colors.white} />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
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
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  mediaItem: {
    width: imageSize,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaImage: {
    width: '100%',
    height: imageSize,
    backgroundColor: colors.gray[200],
  },
  mediaInfo: {
    padding: 8,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  mediaActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  featuredStoryBadge: {
    backgroundColor: colors.warning + '20',
    borderRadius: 20,
    padding: 8,
  },
  storyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storyHeaderLeft: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  storyClient: {
    fontSize: 14,
    color: colors.gray[600],
  },
  storyImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: colors.gray[200],
  },
  storyMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.gray[600],
  },
  storyDescription: {
    fontSize: 14,
    color: colors.gray[700],
    lineHeight: 20,
    marginBottom: 12,
  },
  testimonialBox: {
    backgroundColor: colors.gray[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 14,
    color: colors.gray[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  storyActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteActionButton: {
    backgroundColor: colors.error + '20',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[700],
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 16,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  imagePickerButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: colors.gray[100],
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 12,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
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
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '20',
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.gray[200],
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
