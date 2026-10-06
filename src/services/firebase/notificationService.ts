import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SystemNotification } from '../../types/notification';
import { sanitizeFirestoreData } from '../../utils/sanitize';
import { parseNotificationDate } from '../../utils/dateUtils';

// In-memory cache for notification deduplication (5-second window)
const recentNotificationKeys = new Set<string>();

export interface PaginatedNotificationsResult {
  notifications: SystemNotification[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const sendNotification = async (
  recipientUid: string,
  sender: { uid: string; name: string; role: string },
  title: string,
  message: string,
  navigationTarget: string,
  type: string = 'SYSTEM',
  referenceId?: string
): Promise<string> => {
  try {
    // 1. Deduplication check
    const dedupKey = `${recipientUid}:${title}:${message}`;
    if (recentNotificationKeys.has(dedupKey)) {
      console.log(`[NOTIFICATION_DEDUP] Omitted duplicate notification for ${recipientUid}`);
      return '';
    }
    recentNotificationKeys.add(dedupKey);
    setTimeout(() => recentNotificationKeys.delete(dedupKey), 5000);

    // Ensure route has deep link highlight parameter if referenceId is provided
    let finalRoute = navigationTarget;
    if (referenceId && !finalRoute.includes('highlight=')) {
      const joinChar = finalRoute.includes('?') ? '&' : '?';
      finalRoute = `${finalRoute}${joinChar}highlight=${referenceId}`;
    }

    // 2. Persist notification document in Firestore
    const rawData = {
      recipientUid,
      sender,
      title,
      message,
      type,
      referenceId: referenceId || '',
      route: finalRoute,
      navigationTarget: finalRoute, // Maintain backward compatibility
      read: false,
      createdAt: serverTimestamp(),
    };
    const cleanData = sanitizeFirestoreData(rawData);

    const docRef = await addDoc(collection(db, 'notifications'), cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Failed to store notification:', error);
    return '';
  }
};

/**
 * Fetches user notifications ordered by createdAt DESC with pagination support.
 */
export const fetchUserNotifications = async (
  recipientUid: string,
  limitCount = 20,
  lastDocSnap?: QueryDocumentSnapshot | null
): Promise<PaginatedNotificationsResult> => {
  if (!recipientUid) {
    return { notifications: [], lastDoc: null, hasMore: false };
  }

  try {
    const queryConstraints: any[] = [
      where('recipientUid', '==', recipientUid),
      orderBy('createdAt', 'desc'),
    ];

    if (lastDocSnap) {
      queryConstraints.push(startAfter(lastDocSnap));
    }

    queryConstraints.push(limit(limitCount));

    const q = query(collection(db, 'notifications'), ...queryConstraints);
    const snap = await getDocs(q);

    const notifications = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as SystemNotification[];

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === limitCount;

    return { notifications, lastDoc, hasMore };
  } catch {
    // Fallback: If index is building or not yet deployed, fetch by recipientUid and sort in memory
    try {
      const fallbackQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', recipientUid)
      );
      const snap = await getDocs(fallbackQuery);
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SystemNotification[];

      // Sort DESC (newest first)
      list = list.sort((a, b) => {
        const timeA = parseNotificationDate(a.createdAt).getTime();
        const timeB = parseNotificationDate(b.createdAt).getTime();
        return timeB - timeA;
      });

      return {
        notifications: list.slice(0, limitCount),
        lastDoc: null,
        hasMore: list.length > limitCount,
      };
    } catch (fallbackError) {
      console.error('Error fetching notifications (fallback):', fallbackError);
      return { notifications: [], lastDoc: null, hasMore: false };
    }
  }
};

export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    const ref = doc(db, 'notifications', notificationId);
    const cleanData = sanitizeFirestoreData({ read: true });
    await updateDoc(ref, cleanData);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
