import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import {
  CommentItem,
  LikedVideoItem,
  SavedVideoItem,
  SubscriptionItem,
  WatchHistoryItem,
  VideoItem
} from '../types';

// ================= LOCAL STORAGE HELPERS =================
function getLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const keyLikes = (uid: string) => `streamhub_${uid || 'guest'}_likes`;
const keySaved = (uid: string) => `streamhub_${uid || 'guest'}_saved`;
const keySubs = (uid: string) => `streamhub_${uid || 'guest'}_subs`;
const keyHistory = (uid: string) => `streamhub_${uid || 'guest'}_history`;

// ================= LIKES =================
export async function toggleLikeVideo(
  userId: string,
  video: VideoItem,
  isCurrentlyLiked: boolean
): Promise<boolean> {
  const uid = userId || 'guest';
  const local = getLocal<LikedVideoItem>(keyLikes(uid));

  if (isCurrentlyLiked) {
    const updated = local.filter((item) => item.videoId !== video.id);
    setLocal(keyLikes(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await deleteDoc(doc(db, 'users', userId, 'likes', video.id));
      } catch (err) {
        console.warn('Firestore like removal failed:', err);
      }
    }
    return false;
  } else {
    const likeData: LikedVideoItem = {
      videoId: video.id,
      title: video.title.slice(0, 300),
      thumbnail: video.thumbnailUrl.slice(0, 1000),
      channelTitle: video.channelTitle.slice(0, 100),
      likedAt: new Date().toISOString()
    };
    const updated = [likeData, ...local.filter((item) => item.videoId !== video.id)];
    setLocal(keyLikes(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await setDoc(doc(db, 'users', userId, 'likes', video.id), likeData);
      } catch (err) {
        console.warn('Firestore like write failed:', err);
      }
    }
    return true;
  }
}

export async function checkIsVideoLiked(userId: string, videoId: string): Promise<boolean> {
  const uid = userId || 'guest';
  const local = getLocal<LikedVideoItem>(keyLikes(uid));
  if (local.some((i) => i.videoId === videoId)) return true;

  if (userId && userId !== 'guest') {
    try {
      const snap = await getDoc(doc(db, 'users', userId, 'likes', videoId));
      return snap.exists();
    } catch {
      return false;
    }
  }
  return false;
}

export function subscribeToUserLikes(
  userId: string,
  callback: (likes: LikedVideoItem[]) => void
) {
  const uid = userId || 'guest';
  // Immediate delivery from local storage
  callback(getLocal<LikedVideoItem>(keyLikes(uid)));

  if (!userId || userId === 'guest') {
    return () => {};
  }

  try {
    const q = query(collection(db, 'users', userId, 'likes'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as LikedVideoItem);
        items.sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());
        setLocal(keyLikes(userId), items);
        callback(items);
      },
      (err) => {
        console.warn('Firestore like subscription fallback to local cache:', err);
        callback(getLocal<LikedVideoItem>(keyLikes(userId)));
      }
    );
  } catch (err) {
    console.warn('Subscribe to likes error:', err);
    return () => {};
  }
}

// ================= SAVED / WATCH LATER =================
export async function toggleSaveVideo(
  userId: string,
  video: VideoItem,
  isCurrentlySaved: boolean
): Promise<boolean> {
  const uid = userId || 'guest';
  const local = getLocal<SavedVideoItem>(keySaved(uid));

  if (isCurrentlySaved) {
    const updated = local.filter((item) => item.videoId !== video.id);
    setLocal(keySaved(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await deleteDoc(doc(db, 'users', userId, 'saved', video.id));
      } catch (err) {
        console.warn('Firestore saved removal failed:', err);
      }
    }
    return false;
  } else {
    const savedData: SavedVideoItem = {
      videoId: video.id,
      title: video.title.slice(0, 300),
      thumbnail: video.thumbnailUrl.slice(0, 1000),
      channelTitle: video.channelTitle.slice(0, 100),
      savedAt: new Date().toISOString()
    };
    const updated = [savedData, ...local.filter((item) => item.videoId !== video.id)];
    setLocal(keySaved(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await setDoc(doc(db, 'users', userId, 'saved', video.id), savedData);
      } catch (err) {
        console.warn('Firestore saved write failed:', err);
      }
    }
    return true;
  }
}

export async function checkIsVideoSaved(userId: string, videoId: string): Promise<boolean> {
  const uid = userId || 'guest';
  const local = getLocal<SavedVideoItem>(keySaved(uid));
  if (local.some((i) => i.videoId === videoId)) return true;

  if (userId && userId !== 'guest') {
    try {
      const snap = await getDoc(doc(db, 'users', userId, 'saved', videoId));
      return snap.exists();
    } catch {
      return false;
    }
  }
  return false;
}

export function subscribeToUserSaved(
  userId: string,
  callback: (saved: SavedVideoItem[]) => void
) {
  const uid = userId || 'guest';
  callback(getLocal<SavedVideoItem>(keySaved(uid)));

  if (!userId || userId === 'guest') {
    return () => {};
  }

  try {
    const q = query(collection(db, 'users', userId, 'saved'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as SavedVideoItem);
        items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        setLocal(keySaved(userId), items);
        callback(items);
      },
      (err) => {
        console.warn('Firestore saved subscription fallback to local cache:', err);
        callback(getLocal<SavedVideoItem>(keySaved(userId)));
      }
    );
  } catch (err) {
    return () => {};
  }
}

// ================= SUBSCRIPTIONS =================
export async function toggleSubscribeChannel(
  userId: string,
  channel: { id: string; title: string; thumbnail?: string },
  isSubscribed: boolean
): Promise<boolean> {
  const uid = userId || 'guest';
  const local = getLocal<SubscriptionItem>(keySubs(uid));
  const cleanChannelId = channel.id || 'channel_' + channel.title.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (isSubscribed) {
    const updated = local.filter((item) => item.channelId !== cleanChannelId);
    setLocal(keySubs(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await deleteDoc(doc(db, 'users', userId, 'subscriptions', cleanChannelId));
      } catch (err) {
        console.warn('Firestore subscription removal failed:', err);
      }
    }
    return false;
  } else {
    const subData: SubscriptionItem = {
      channelId: cleanChannelId,
      channelTitle: channel.title.slice(0, 100),
      channelThumbnail: (channel.thumbnail || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanChannelId}`).slice(0, 1000),
      subscribedAt: new Date().toISOString()
    };
    const updated = [subData, ...local.filter((item) => item.channelId !== cleanChannelId)];
    setLocal(keySubs(uid), updated);

    if (userId && userId !== 'guest') {
      try {
        await setDoc(doc(db, 'users', userId, 'subscriptions', cleanChannelId), subData);
      } catch (err) {
        console.warn('Firestore subscription write failed:', err);
      }
    }
    return true;
  }
}

export async function checkIsChannelSubscribed(userId: string, channelId?: string): Promise<boolean> {
  if (!channelId) return false;
  const uid = userId || 'guest';
  const local = getLocal<SubscriptionItem>(keySubs(uid));
  if (local.some((i) => i.channelId === channelId)) return true;

  if (userId && userId !== 'guest') {
    try {
      const snap = await getDoc(doc(db, 'users', userId, 'subscriptions', channelId));
      return snap.exists();
    } catch {
      return false;
    }
  }
  return false;
}

export function subscribeToUserSubscriptions(
  userId: string,
  callback: (subs: SubscriptionItem[]) => void
) {
  const uid = userId || 'guest';
  callback(getLocal<SubscriptionItem>(keySubs(uid)));

  if (!userId || userId === 'guest') {
    return () => {};
  }

  try {
    const q = query(collection(db, 'users', userId, 'subscriptions'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as SubscriptionItem);
        items.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
        setLocal(keySubs(userId), items);
        callback(items);
      },
      (err) => {
        console.warn('Firestore subscriptions fallback to local cache:', err);
        callback(getLocal<SubscriptionItem>(keySubs(userId)));
      }
    );
  } catch (err) {
    return () => {};
  }
}

// ================= WATCH HISTORY =================
export async function addToWatchHistory(userId: string, video: VideoItem): Promise<void> {
  const uid = userId || 'guest';
  const local = getLocal<WatchHistoryItem>(keyHistory(uid));
  const histData: WatchHistoryItem = {
    videoId: video.id,
    title: video.title.slice(0, 300),
    thumbnail: video.thumbnailUrl.slice(0, 1000),
    channelTitle: video.channelTitle.slice(0, 100),
    watchedAt: new Date().toISOString()
  };
  const updated = [histData, ...local.filter((item) => item.videoId !== video.id)].slice(0, 100);
  setLocal(keyHistory(uid), updated);

  if (userId && userId !== 'guest') {
    try {
      await setDoc(doc(db, 'users', userId, 'history', video.id), histData);
    } catch (err) {
      console.warn('Watch history write failed:', err);
    }
  }
}

export function subscribeToWatchHistory(
  userId: string,
  callback: (history: WatchHistoryItem[]) => void
) {
  const uid = userId || 'guest';
  callback(getLocal<WatchHistoryItem>(keyHistory(uid)));

  if (!userId || userId === 'guest') {
    return () => {};
  }

  try {
    const q = query(collection(db, 'users', userId, 'history'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as WatchHistoryItem);
        items.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
        setLocal(keyHistory(userId), items);
        callback(items);
      },
      (err) => {
        console.warn('Watch history fallback to local cache:', err);
        callback(getLocal<WatchHistoryItem>(keyHistory(userId)));
      }
    );
  } catch (err) {
    return () => {};
  }
}

export async function clearWatchHistory(userId: string): Promise<void> {
  const uid = userId || 'guest';
  setLocal(keyHistory(uid), []);

  if (userId && userId !== 'guest') {
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'history'));
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);
    } catch (err) {
      console.warn('Clear history failed:', err);
    }
  }
}

export async function deleteHistoryItem(userId: string, videoId: string): Promise<void> {
  const uid = userId || 'guest';
  const local = getLocal<WatchHistoryItem>(keyHistory(uid));
  setLocal(keyHistory(uid), local.filter((i) => i.videoId !== videoId));

  if (userId && userId !== 'guest') {
    try {
      await deleteDoc(doc(db, 'users', userId, 'history', videoId));
    } catch (err) {
      console.warn('Delete history item failed:', err);
    }
  }
}

// ================= RECENT SEARCHES =================
export async function saveRecentSearch(userId: string, queryText: string): Promise<void> {
  const clean = queryText.trim().slice(0, 100);
  if (!clean) return;
  const key = `streamhub_${userId || 'guest'}_searches`;
  const existing = getLocal<string>(key);
  const updated = [clean, ...existing.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(0, 15);
  setLocal(key, updated);

  if (userId && userId !== 'guest') {
    const searchId = clean.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) || 's_' + Date.now();
    try {
      await setDoc(doc(db, 'users', userId, 'searches', searchId), {
        query: clean,
        searchedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not save search to cloud:', err);
    }
  }
}

export async function getRecentSearches(userId: string): Promise<string[]> {
  const key = `streamhub_${userId || 'guest'}_searches`;
  const local = getLocal<string>(key);
  if (local.length > 0) return local;

  if (userId && userId !== 'guest') {
    try {
      const snap = await getDocs(query(collection(db, 'users', userId, 'searches'), limit(15)));
      const list = snap.docs.map((d) => d.data() as { query: string; searchedAt: string });
      list.sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());
      const res = list.map((item) => item.query);
      if (res.length > 0) setLocal(key, res);
      return res;
    } catch {
      return [];
    }
  }
  return [];
}

// ================= GUEST TO USER SYNC =================
export async function syncGuestDataToUser(userId: string): Promise<void> {
  if (!userId || userId === 'guest') return;

  try {
    // 1. Migrate Likes
    const guestLikes = getLocal<LikedVideoItem>('streamhub_guest_likes');
    if (guestLikes.length > 0) {
      for (const item of guestLikes) {
        await setDoc(doc(db, 'users', userId, 'likes', item.videoId), item).catch(() => {});
      }
      setLocal('streamhub_guest_likes', []);
    }

    // 2. Migrate Saved
    const guestSaved = getLocal<SavedVideoItem>('streamhub_guest_saved');
    if (guestSaved.length > 0) {
      for (const item of guestSaved) {
        await setDoc(doc(db, 'users', userId, 'saved', item.videoId), item).catch(() => {});
      }
      setLocal('streamhub_guest_saved', []);
    }

    // 3. Migrate Subscriptions
    const guestSubs = getLocal<SubscriptionItem>('streamhub_guest_subs');
    if (guestSubs.length > 0) {
      for (const item of guestSubs) {
        await setDoc(doc(db, 'users', userId, 'subscriptions', item.channelId), item).catch(() => {});
      }
      setLocal('streamhub_guest_subs', []);
    }

    // 4. Migrate History
    const guestHistory = getLocal<WatchHistoryItem>('streamhub_guest_history');
    if (guestHistory.length > 0) {
      for (const item of guestHistory) {
        await setDoc(doc(db, 'users', userId, 'history', item.videoId), item).catch(() => {});
      }
      setLocal('streamhub_guest_history', []);
    }
  } catch (err) {
    console.warn('Sync guest data error:', err);
  }
}

// ================= COMMENTS & REPLIES =================
export function subscribeToVideoComments(
  videoId: string,
  callback: (comments: CommentItem[]) => void
) {
  try {
    const q = query(collection(db, 'videos', videoId, 'comments'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as CommentItem);
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (err) => {
        console.warn('Firestore video comments notice:', err);
        callback([]);
      }
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export async function addVideoComment(
  videoId: string,
  user: { uid: string; displayName: string; photoURL: string },
  text: string,
  parentId?: string
): Promise<CommentItem> {
  const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const newComment: CommentItem = {
    id: commentId,
    videoId,
    authorUid: user.uid,
    authorName: user.displayName || 'User',
    authorPhoto: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
    text: text.trim().slice(0, 1000),
    createdAt: now,
    updatedAt: now,
    edited: false,
    ...(parentId ? { parentId } : {})
  };

  try {
    await setDoc(doc(db, 'videos', videoId, 'comments', commentId), newComment);
    return newComment;
  } catch (err) {
    console.warn('Failed to add cloud comment:', err);
    return newComment;
  }
}

export async function updateVideoComment(
  videoId: string,
  commentId: string,
  _authorUid: string,
  newText: string
): Promise<void> {
  try {
    const commentRef = doc(db, 'videos', videoId, 'comments', commentId);
    await updateDoc(commentRef, {
      text: newText.trim().slice(0, 1000),
      updatedAt: new Date().toISOString(),
      edited: true
    });
  } catch (err) {
    console.warn('Failed to update comment:', err);
  }
}

export async function deleteVideoComment(
  videoId: string,
  commentId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'videos', videoId, 'comments', commentId));
  } catch (err) {
    console.warn('Failed to delete comment:', err);
  }
}
