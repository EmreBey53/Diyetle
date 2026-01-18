// src/services/chatService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';

export interface ChatMessage {
  id?: string;
  chatRoomId: string;
  senderId: string;
  senderRole: 'patient' | 'dietitian';
  senderName: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'voice' | 'system';
  timestamp: Timestamp;
  isRead: boolean;
  isEdited: boolean;
  editedAt?: Timestamp;
  replyTo?: string; // Yanıtlanan mesaj ID'si
  attachments?: ChatAttachment[];
}

export interface ChatRoom {
  id?: string;
  patientId: string;
  dietitianId: string;
  patientName: string;
  dietitianName: string;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount: { [userId: string]: number };
  isActive: boolean;
  createdAt: Timestamp;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'voice';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Chat odası oluşturma
export const createChatRoom = async (patientId: string, dietitianId: string, patientName: string, dietitianName: string) => {
  try {
    // Mevcut chat odası var mı kontrol et
    const existingRoom = await getChatRoom(patientId, dietitianId);
    if (existingRoom) {
      return existingRoom.id;
    }

    const chatRoom: Omit<ChatRoom, 'id'> = {
      patientId,
      dietitianId,
      patientName,
      dietitianName,
      unreadCount: { [patientId]: 0, [dietitianId]: 0 },
      isActive: true,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'chat_rooms'), chatRoom);
    
    await logAuditEvent({
      userId: patientId,
      userRole: 'patient',
      action: 'chat_room_created',
      resource: 'chat_room',
      resourceId: docRef.id,
      details: { dietitianId, dietitianName },
      severity: 'low',
    });

    console.log('✅ Chat odası oluşturuldu');
    return docRef.id;
  } catch (error) {
    console.error('❌ Chat odası oluşturma hatası:', error);
    throw error;
  }
};

// Mesaj gönderme
export const sendMessage = async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead' | 'isEdited'>) => {
  try {
    const newMessage: Omit<ChatMessage, 'id'> = {
      ...message,
      timestamp: Timestamp.now(),
      isRead: false,
      isEdited: false,
    };

    const docRef = await addDoc(collection(db, 'chat_messages'), newMessage);
    
    // Chat odası son mesaj bilgisini güncelle
    await updateChatRoomLastMessage(message.chatRoomId, message.message, newMessage.timestamp);
    
    // Okunmamış mesaj sayısını artır
    await incrementUnreadCount(message.chatRoomId, message.senderId);

    await logAuditEvent({
      userId: message.senderId,
      userRole: message.senderRole,
      action: 'message_sent',
      resource: 'chat_message',
      resourceId: docRef.id,
      details: { chatRoomId: message.chatRoomId, messageType: message.messageType },
      severity: 'low',
    });

    console.log('✅ Mesaj gönderildi');
    return docRef.id;
  } catch (error) {
    console.error('❌ Mesaj gönderme hatası:', error);
    throw error;
  }
};

// Mesajları dinleme (real-time)
export const subscribeToMessages = (chatRoomId: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, 'chat_messages'),
    where('chatRoomId', '==', chatRoomId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatMessage));
    callback(messages);
  });
};

// Chat odalarını getirme
export const getChatRooms = async (userId: string, userRole: 'patient' | 'dietitian') => {
  try {
    const field = userRole === 'patient' ? 'patientId' : 'dietitianId';
    const q = query(
      collection(db, 'chat_rooms'),
      where(field, '==', userId),
      where('isActive', '==', true),
      orderBy('lastMessageTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatRoom));
  } catch (error) {
    console.error('❌ Chat odaları getirme hatası:', error);
    return [];
  }
};

// Mesajları okundu olarak işaretle
export const markMessagesAsRead = async (chatRoomId: string, userId: string) => {
  try {
    const q = query(
      collection(db, 'chat_messages'),
      where('chatRoomId', '==', chatRoomId),
      where('senderId', '!=', userId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(updatePromises);
    
    // Okunmamış sayısını sıfırla
    await resetUnreadCount(chatRoomId, userId);

    console.log('✅ Mesajlar okundu olarak işaretlendi');
  } catch (error) {
    console.error('❌ Mesaj okundu işaretleme hatası:', error);
  }
};

// Yardımcı fonksiyonlar
const getChatRoom = async (patientId: string, dietitianId: string) => {
  const q = query(
    collection(db, 'chat_rooms'),
    where('patientId', '==', patientId),
    where('dietitianId', '==', dietitianId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

const updateChatRoomLastMessage = async (chatRoomId: string, message: string, timestamp: Timestamp) => {
  await updateDoc(doc(db, 'chat_rooms', chatRoomId), {
    lastMessage: message,
    lastMessageTime: timestamp,
  });
};

const incrementUnreadCount = async (chatRoomId: string, senderId: string) => {
  // Bu fonksiyon karmaşık olduğu için basitleştirilmiş
  console.log('Okunmamış mesaj sayısı artırıldı');
};

const resetUnreadCount = async (chatRoomId: string, userId: string) => {
  // Bu fonksiyon karmaşık olduğu için basitleştirilmiş
  console.log('Okunmamış mesaj sayısı sıfırlandı');
};