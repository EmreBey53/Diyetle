import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { ChatMessage, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import { getCurrentUser } from '../services/authService';

const { width } = Dimensions.get('window');

const EMOJI_LIST =['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥', '💪', '🙏', '👏', '✨', '💯', '🎯'];

export default function ChatScreen({ route, navigation }: any) {
  const { chatRoomId, otherUserName, otherUserId } = route.params;
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const emojiAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && chatRoomId) {
      const unsubscribe = subscribeToMessages(chatRoomId, (newMessages) => {
        setMessages(newMessages);
        markMessagesAsRead(chatRoomId, currentUser.id);
      });

      return unsubscribe;
    }
  }, [chatRoomId, currentUser]);

  useEffect(() => {
    Animated.timing(emojiAnimation, {
      toValue: showEmojiPicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showEmojiPicker]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi');
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend || !currentUser) return;

    try {
      setIsTyping(true);

      await sendMessage({
        chatRoomId,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        senderName: currentUser.displayName || 'Kullanıcı',
        message: textToSend,
        messageType: 'text',
      });

      if (!messageText) {
        setNewMessage('');
      }
      setShowEmojiPicker(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setIsTyping(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (newMessage.trim()) {
      setNewMessage(prev => prev + emoji);
    } else {
      handleSendMessage(emoji);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.senderId === currentUser?.id;
    const showAvatar = index === 0 || messages[index - 1]?.senderId !== item.senderId;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && showAvatar && (
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {otherUserName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMyMessage
            ? [styles.myMessageBubble, { backgroundColor: colors.primary }]
            : [styles.otherMessageBubble, { backgroundColor: colors.cardBackground }],
          !isMyMessage && !showAvatar && styles.messageWithoutAvatar
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : { color: colors.text }
          ]}>
            {item.message}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : { color: colors.textLight }
            ]}>
              {formatMessageTime(item.timestamp)}
            </Text>

            {isMyMessage && (
              <Ionicons
                name={item.isRead ? "checkmark-done" : "checkmark"}
                size={12}
                color={item.isRead ? colors.success : 'rgba(255,255,255,0.7)'}
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmojiPicker = () => (
    <Animated.View style={[
      styles.emojiPicker,
      {
        backgroundColor: colors.cardBackground,
        borderTopColor: colors.border,
        opacity: emojiAnimation,
        transform: [{
          translateY: emojiAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }
    ]}>
      <FlatList
        data={EMOJI_LIST}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.emojiButton, { backgroundColor: colors.background }]}
            onPress={() => handleEmojiSelect(item)}
          >
            <Text style={styles.emojiText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.headerAvatarText, { color: colors.primary }]}>
                {otherUserName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{otherUserName || 'Kullanıcı'}</Text>
              <Text style={[styles.onlineStatus, { color: colors.textLight }]}>
                {onlineStatus ? '🟢 Çevrimiçi' : '⚪ Çevrimdışı'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                Alert.alert(
                  'Bilgi',
                  `${otherUserName} ile mesajlaşıyorsunuz.\n\nMesaj sayısı: ${messages.length}`,
                  [{ text: 'Tamam' }]
                );
              }}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id!}
          style={[styles.messagesList, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz mesaj yok</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                {otherUserName} ile ilk mesajınızı gönderin!
              </Text>
            </View>
          )}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.typingContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.typingText, { color: colors.textLight }]}>Mesaj gönderiliyor...</Text>
          </View>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && renderEmojiPicker()}

        {/* Input Container */}
        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.emojiToggleButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Ionicons
              name={showEmojiPicker ? "close" : "happy"}
              size={24}
              color={showEmojiPicker ? colors.error : colors.primary}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: newMessage.trim() ? colors.primary : colors.textLight }
            ]}
            onPress={() => handleSendMessage()}
            disabled={!newMessage.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginVertical: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 2,
  },
  myMessageBubble: {
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  readIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emojiPicker: {
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  emojiButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  emojiText: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    borderTopWidth: 1,
  },
  emojiToggleButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
