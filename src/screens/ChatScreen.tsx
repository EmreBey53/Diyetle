// src/screens/ChatScreen.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { ChatMessage, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import { getCurrentUser } from '../services/authService';

export default function ChatScreen({ route, navigation }: any) {
  const { chatRoomId, otherUserName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
    const unsubscribe = subscribeToMessages(chatRoomId, setMessages);
    
    // Mesajları okundu olarak işaretle
    if (currentUser) {
      markMessagesAsRead(chatRoomId, currentUser.uid);
    }

    return unsubscribe;
  }, [chatRoomId, currentUser]);

  const loadCurrentUser = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      await sendMessage({
        chatRoomId,
        senderId: currentUser.uid,
        senderRole: currentUser.role,
        senderName: currentUser.displayName || 'Kullanıcı',
        message: newMessage.trim(),
        messageType: 'text',
      });

      setNewMessage('');
      
      // Listeyi en alta kaydır
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          { backgroundColor: isMyMessage ? colors.primary : colors.lightGray }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isMyMessage ? colors.white : colors.darkGray }
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isMyMessage ? colors.white + '80' : colors.gray }
          ]}>
            {item.timestamp.toDate().toLocaleTimeString('tr-TR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUserName}</Text>
        <TouchableOpacity>
          <Ionicons name="videocam" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id!}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesajınızı yazın..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={newMessage.trim() ? colors.white : colors.gray} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});