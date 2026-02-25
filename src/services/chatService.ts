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
  replyTo?: string;
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

export const createChatRoom = async (patientId: string, dietitianId: string, patientName: string, dietitianName: string) => {
  try {
    if (!patientId || !dietitianId || !patientName || !dietitianName) {
      throw new Error('Gerekli parametreler eksik');
    }

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

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const sendMessage = async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead' | 'isEdited'>) => {
  try {
    if (!message.chatRoomId || !message.senderId || !message.message) {
      throw new Error('Gerekli mesaj parametreleri eksik');
    }

    const newMessage: Omit<ChatMessage, 'id'> = {
      ...message,
      timestamp: Timestamp.now(),
      isRead: false,
      isEdited: false,
    };

    const docRef = await addDoc(collection(db, 'chat_messages'), newMessage);
    
    await updateChatRoomLastMessage(message.chatRoomId, message.message, newMessage.timestamp);
    await incrementUnreadCount(message.chatRoomId, message.senderId);
    await sendChatNotificationToRecipient(message.chatRoomId, message.senderId, message.senderName, message.message);

    await logAuditEvent({
      userId: message.senderId,
      userRole: message.senderRole,
      action: 'message_sent',
      resource: 'chat_message',
      resourceId: docRef.id,
      details: { chatRoomId: message.chatRoomId, messageType: message.messageType },
      severity: 'low',
    });

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const subscribeToMessages = (chatRoomId: string, callback: (messages: ChatMessage[]) => void) => {
  if (!chatRoomId) {
    callback([]);
    return () => {};
  }

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
  }, (error) => {
    // Fallback query when Firestore composite index is not available
    const fallbackQ = query(
      collection(db, 'chat_messages'),
      where('chatRoomId', '==', chatRoomId)
    );
    
    return onSnapshot(fallbackQ, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ChatMessage))
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis() || 0;
          const bTime = b.timestamp?.toMillis() || 0;
          return aTime - bTime;
        });
      callback(messages);
    });
  });
};

export const getChatRooms = async (userId: string, userRole: 'patient' | 'dietitian') => {
  try {
    if (!userId || !userRole) {
      return [];
    }

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
    // Fallback query when Firestore composite index is not available
    try {
      const field = userRole === 'patient' ? 'patientId' : 'dietitianId';
      const fallbackQ = query(
        collection(db, 'chat_rooms'),
        where(field, '==', userId)
      );

      const snapshot = await getDocs(fallbackQ);
      const rooms = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ChatRoom))
        .filter(room => room.isActive)
        .sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
        });

      return rooms;
    } catch (fallbackError) {
      return [];
    }
  }
};

export const markMessagesAsRead = async (chatRoomId: string, userId: string) => {
  try {
    if (!chatRoomId || !userId) {
      return;
    }

    const q = query(
      collection(db, 'chat_messages'),
      where('chatRoomId', '==', chatRoomId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    
    const messagesToUpdate = snapshot.docs.filter(doc =>
      doc.data().senderId !== userId
    );
    
    if (messagesToUpdate.length > 0) {
      const updatePromises = messagesToUpdate.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );

      await Promise.all(updatePromises);
    }
    
    await resetUnreadCount(chatRoomId, userId);
  } catch (error) {
  }
};

const getChatRoom = async (patientId: string, dietitianId: string) => {
  if (!patientId || !dietitianId) {
    return null;
  }

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
};

const resetUnreadCount = async (chatRoomId: string, userId: string) => {
};

const sendChatNotificationToRecipient = async (chatRoomId: string, senderId: string, senderName: string, message: string) => {
  try {
    const q = query(
      collection(db, 'chat_rooms'),
      where('__name__', '==', chatRoomId)
    );
    
    const chatRoomDoc = await getDocs(q);

    if (!chatRoomDoc.empty) {
      const chatRoom = chatRoomDoc.docs[0].data() as ChatRoom;
      const recipientId = chatRoom.patientId === senderId ? chatRoom.dietitianId : chatRoom.patientId;

      if (recipientId) {
        // Dynamic import to avoid circular dependency
        const { sendChatNotification } = await import('./smartNotificationService');
        await sendChatNotification(recipientId, senderName, message, chatRoomId);
        
      }
    }
  } catch (error) {
  }
};