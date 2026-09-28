import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import {
  CommentItem,
  LikedVideoItem,
  SavedVideoItem,
  SubscriptionItem,
  WatchHistoryItem,
  RecentSearchItem,
  VideoItem
} from '../types';

// ================= LIKES =================
export async function toggleLikeVideo(
  userId: string,
  video: VideoItem,
  isCurrentlyLiked: boolean
): Promise<boolean> {
  const path = `users/${userId}/likes/${video.id}`;
  try {
    const likeRef = doc(db, 'users', userId, 'likes', video.id);
    if (isCurrentlyLiked) {
      await deleteDoc(likeRef);
      return false;
    } else {
      const likeData: LikedVideoItem = {
        videoId: video.id,
        title: video.title.slice(0, 300),
        thumbnail: video.thumbnailUrl.slice(0, 1000),
        channelTitle: video.channelTitle.slice(0, 100),
        likedAt: new Date().toISOString()
      };
      await setDoc(likeRef, likeData);
      return true;
    }
  } catch (err) {
    handleFirestoreError(err, isCurrentlyLiked ? OperationType.DELETE : OperationType.WRITE, path);
  }
}

export async function checkIsVideoLiked(userId: string, videoId: string): Promise<boolean> {
  const path = `users/${userId}/likes/${videoId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'likes', videoId));
    return snap.exists();
  } catch (err) {
    console.error('Error checking like status:', err);
    return false;
  }
}

export function subscribeToUserLikes(
  userId: string,
  callback: (likes: LikedVideoItem[]) => void
) {
  const path = `users/${userId}/likes`;
  const q = query(collection(db, 'users', userId, 'likes'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as LikedVideoItem);
      items.sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());
      callback(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

// ================= SAVED / WATCH LATER =================
export async function toggleSaveVideo(
  userId: string,
  video: VideoItem,
  isCurrentlySaved: boolean
): Promise<boolean> {
  const path = `users/${userId}/saved/${video.id}`;
  try {
    const savedRef = doc(db, 'users', userId, 'saved', video.id);
    if (isCurrentlySaved) {
      await deleteDoc(savedRef);
      return false;
    } else {
      const savedData: SavedVideoItem = {
        videoId: video.id,
        title: video.title.slice(0, 300),
        thumbnail: video.thumbnailUrl.slice(0, 1000),
        channelTitle: video.channelTitle.slice(0, 100),
        savedAt: new Date().toISOString()
      };
      await setDoc(savedRef, savedData);
      return true;
    }
  } catch (err) {
    handleFirestoreError(err, isCurrentlySaved ? OperationType.DELETE : OperationType.WRITE, path);
  }
}

export async function checkIsVideoSaved(userId: string, videoId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'saved', videoId));
    return snap.exists();
  } catch (err) {
    return false;
  }
}

export function subscribeToUserSaved(
  userId: string,
  callback: (saved: SavedVideoItem[]) => void
) {
  const path = `users/${userId}/saved`;
  const q = query(collection(db, 'users', userId, 'saved'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as SavedVideoItem);
      items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      callback(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

// ================= SUBSCRIPTIONS =================
export async function toggleSubscribeChannel(
  userId: string,
  channel: { id: string; title: string; thumbnail?: string },
  isSubscribed: boolean
): Promise<boolean> {
  const path = `users/${userId}/subscriptions/${channel.id}`;
  try {
    const subRef = doc(db, 'users', userId, 'subscriptions', channel.id);
    if (isSubscribed) {
      await deleteDoc(subRef);
      return false;
    } else {
      const subData: SubscriptionItem = {
        channelId: channel.id,
        channelTitle: channel.title.slice(0, 100),
        channelThumbnail: (channel.thumbnail || `https://api.dicebear.com/7.x/identicon/svg?seed=${channel.id}`).slice(0, 1000),
        subscribedAt: new Date().toISOString()
      };
      await setDoc(subRef, subData);
      return true;
    }
  } catch (err) {
    handleFirestoreError(err, isSubscribed ? OperationType.DELETE : OperationType.WRITE, path);
  }
}

export async function checkIsChannelSubscribed(userId: string, channelId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'subscriptions', channelId));
    return snap.exists();
  } catch (err) {
    return false;
  }
}

export function subscribeToUserSubscriptions(
  userId: string,
  callback: (subs: SubscriptionItem[]) => void
) {
  const path = `users/${userId}/subscriptions`;
  const q = query(collection(db, 'users', userId, 'subscriptions'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as SubscriptionItem);
      items.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
      callback(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

// ================= WATCH HISTORY =================
export async function addToWatchHistory(userId: string, video: VideoItem): Promise<void> {
  const path = `users/${userId}/history/${video.id}`;
  try {
    const histRef = doc(db, 'users', userId, 'history', video.id);
    const histData: WatchHistoryItem = {
      videoId: video.id,
      title: video.title.slice(0, 300),
      thumbnail: video.thumbnailUrl.slice(0, 1000),
      channelTitle: video.channelTitle.slice(0, 100),
      watchedAt: new Date().toISOString()
    };
    await setDoc(histRef, histData);
  } catch (err) {
    console.warn('Failed to record watch history:', err);
  }
}

export function subscribeToWatchHistory(
  userId: string,
  callback: (history: WatchHistoryItem[]) => void
) {
  const path = `users/${userId}/history`;
  const q = query(collection(db, 'users', userId, 'history'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as WatchHistoryItem);
      items.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
      callback(items);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function clearWatchHistory(userId: string): Promise<void> {
  const path = `users/${userId}/history`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'history'));
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteHistoryItem(userId: string, videoId: string): Promise<void> {
  const path = `users/${userId}/history/${videoId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'history', videoId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ================= RECENT SEARCHES =================
export async function saveRecentSearch(userId: string, queryText: string): Promise<void> {
  const clean = queryText.trim().slice(0, 100);
  if (!clean) return;
  const searchId = clean.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) || 's_' + Date.now();
  const path = `users/${userId}/searches/${searchId}`;
  try {
    const ref = doc(db, 'users', userId, 'searches', searchId);
    await setDoc(ref, {
      query: clean,
      searchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not save search:', err);
  }
}

export async function getRecentSearches(userId: string): Promise<string[]> {
  const path = `users/${userId}/searches`;
  try {
    const snap = await getDocs(query(collection(db, 'users', userId, 'searches'), limit(15)));
    const list = snap.docs.map((d) => d.data() as { query: string; searchedAt: string });
    list.sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());
    return list.map((item) => item.query);
  } catch (err) {
    return [];
  }
}

// ================= COMMENTS & REPLIES =================
export function subscribeToVideoComments(
  videoId: string,
  callback: (comments: CommentItem[]) => void
) {
  const path = `videos/${videoId}/comments`;
  const q = query(collection(db, 'videos', videoId, 'comments'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as CommentItem);
      callback(items);
    },
    (err) => {
      console.error('Error fetching comments:', err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function addVideoComment(
  videoId: string,
  user: { uid: string; displayName: string; photoURL: string },
  text: string,
  parentId?: string
): Promise<CommentItem> {
  const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `videos/${videoId}/comments/${commentId}`;
  const now = new Date().toISOString();
  const newComment: CommentItem = {
    id: commentId,
    videoId,
    authorUid: user.uid,
    authorName: user.displayName || 'User',
    authorPhoto: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
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
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateVideoComment(
  videoId: string,
  commentId: string,
  authorUid: string,
  newText: string
): Promise<void> {
  const path = `videos/${videoId}/comments/${commentId}`;
  try {
    const commentRef = doc(db, 'videos', videoId, 'comments', commentId);
    await updateDoc(commentRef, {
      text: newText.trim().slice(0, 1000),
      updatedAt: new Date().toISOString(),
      edited: true
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteVideoComment(
  videoId: string,
  commentId: string
): Promise<void> {
  const path = `videos/${videoId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'videos', videoId, 'comments', commentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
