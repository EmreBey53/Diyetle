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
import { colors } from '../constants/colors';
import { ChatMessage, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import { getCurrentUser } from '../services/authService';

const { width } = Dimensions.get('window');

const EMOJI_LIST =['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥', '💪', '🙏', '👏', '✨', '💯', '🎯'];

export default function ChatScreen({ route, navigation }: any) {
  const { chatRoomId, otherUserName, otherUserId } = route.params;
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
        // Mesajları okundu olarak işaretle
        markMessagesAsRead(chatRoomId, currentUser.id);
      });

      return unsubscribe;
    }
  }, [chatRoomId, currentUser]);

  useEffect(() => {
    // Emoji picker animasyonu
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
      
      // Listeyi en alta kaydır
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
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {otherUserName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !isMyMessage && !showAvatar && styles.messageWithoutAvatar
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.message}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.timestamp)}
            </Text>
            
            {isMyMessage && (
              <Ionicons 
                name={item.isRead ? "checkmark-done" : "checkmark"} 
                size={12} 
                color={item.isRead ? colors.success : colors.textLight}
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
            style={styles.emojiButton}
            onPress={() => handleEmojiSelect(item)}
          >
            <Text style={styles.emojiText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {otherUserName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{otherUserName || 'Kullanıcı'}</Text>
              <Text style={styles.onlineStatus}>
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
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
              <Text style={styles.emptyText}>
                {otherUserName} ile ilk mesajınızı gönderin!
              </Text>
            </View>
          )}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Mesaj gönderiliyor...</Text>
          </View>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && renderEmojiPicker()}

        {/* Input Container */}
        <View style={styles.inputContainer}>
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
            style={styles.textInput}
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
              color={colors.white}
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
    backgroundColor: colors.background,
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
    paddingTop: Platform.OS === 'ios' ? 8 : 12, // iOS için daha az padding
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  onlineStatus: {
    fontSize: 12,
    color: colors.textLight,
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
    backgroundColor: colors.background,
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
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
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
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 2,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: colors.white,
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
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text,
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
    color: colors.white + 'CC',
  },
  otherMessageTime: {
    color: colors.textLight,
  },
  readIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  typingText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  emojiPicker: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  emojiButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  emojiText: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16, // iOS için daha az bottom padding
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emojiToggleButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});