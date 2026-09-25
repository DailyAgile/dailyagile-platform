/**
 * Live Quiz Realtime Manager
 * Handles Supabase Realtime subscriptions for live quiz sessions with automatic
 * reconnection, error handling, and graceful degradation.
 *
 * Subscribes to three tables via postgres_changes:
 * - live_quiz_sessions: session status, current question, timing
 * - live_quiz_participants: leaderboard scores, activity
 * - live_quiz_responses: incoming answer submissions
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface LiveQuizSession extends Record<string, unknown> {
  session_id?: string;
  status?: string;
  current_question_index?: number;
  question_started_at?: string;
}

interface LiveQuizParticipant extends Record<string, unknown> {
  id?: string;
  session_id?: string;
  current_score?: number;
  questions_answered?: number;
  last_activity?: string;
}

interface LiveQuizResponse extends Record<string, unknown> {
  id?: string;
  session_id?: string;
  participant_id?: string;
  question_index?: number;
  answer?: string;
  submitted_at?: string;
}

interface Subscription {
  sessionId: string;
  channels: Map<string, RealtimeChannel>;
  retryCount: number;
  isUnsubscribing: boolean;
}

/**
 * Manages real-time subscriptions for live quiz sessions
 */
export class LiveQuizRealtimeManager {
  private supabase: SupabaseClient;
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private connectionListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY_MS = 3000;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.setupConnectionMonitoring();
  }

  /**
   * Monitor overall Supabase connection status
   */
  private setupConnectionMonitoring(): void {
    // Listen to auth state changes as a proxy for connection status
    this.supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          this.setConnectionStatus('connected');
        } else if (event === 'SIGNED_OUT') {
          this.setConnectionStatus('disconnected');
          this.unsubscribeAll();
        }
      }
    );
  }

  /**
   * Update connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.connectionListeners.forEach(listener => listener(status));

      if (status === 'connected') {
        // Re-subscribe to any active subscriptions
        this.subscriptions.forEach((sub) => {
          if (!sub.isUnsubscribing && sub.channels.size === 0) {
            console.log(`[Realtime] Reconnecting subscriptions for session ${sub.sessionId}`);
          }
        });
      }
    }
  }

  /**
   * Subscribe to session updates (status, current question, timing)
   */
  subscribeToSessionUpdates(
    sessionId: string,
    onUpdate: (session: LiveQuizSession) => void,
    onError?: (error: Error) => void,
  ): void {
    this.createOrGetSubscription(sessionId);

    const attemptSubscribe = (retryCount: number) => {
      const channelName = `session:${sessionId}:updates`;
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_quiz_sessions',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            try {
              onUpdate(payload.new);
              console.log(`[Realtime] Session update for ${sessionId}`, payload.new);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              onError?.(error);
            }
          }
        )
        .on('system', { event: 'join' }, () => {
          console.log(`[Realtime] Subscribed to session updates: ${sessionId}`);
          const sub = this.subscriptions.get(sessionId);
          if (sub) sub.retryCount = 0;
        })
        .on('system', { event: 'leave' }, () => {
          console.log(`[Realtime] Unsubscribed from session updates: ${sessionId}`);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Session subscription SUBSCRIBED for ${sessionId}`);
            const sub = this.subscriptions.get(sessionId);
            if (sub) sub.retryCount = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Channel error for ${sessionId}`, status);
            if (retryCount < this.MAX_RETRIES) {
              setTimeout(() => {
                attemptSubscribe(retryCount + 1);
              }, this.RETRY_DELAY_MS);
            } else {
              onError?.(new Error(`Failed to subscribe to session updates after ${this.MAX_RETRIES} retries`));
            }
          }
        });

      const sub = this.subscriptions.get(sessionId);
      if (sub) {
        sub.channels.set('sessionUpdates', channel);
      }
    };

    attemptSubscribe(0);
  }

  /**
   * Subscribe to leaderboard updates (participant scores, activity)
   */
  subscribeToLeaderboard(
    sessionId: string,
    onUpdate: (participants: LiveQuizParticipant[]) => void,
    onError?: (error: Error) => void,
  ): void {
    this.createOrGetSubscription(sessionId);

    const attemptSubscribe = (retryCount: number) => {
      const channelName = `session:${sessionId}:leaderboard`;
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_quiz_participants',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            try {
              // Fetch entire leaderboard ordered by score DESC
              const { data, error } = await this.supabase
                .from('live_quiz_participants')
                .select('*')
                .eq('session_id', sessionId)
                .order('current_score', { ascending: false });

              if (error) throw error;

              onUpdate(data || []);
              console.log(`[Realtime] Leaderboard updated for ${sessionId}`, data?.length || 0, 'participants');
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              onError?.(error);
            }
          }
        )
        .on('system', { event: 'join' }, () => {
          console.log(`[Realtime] Subscribed to leaderboard: ${sessionId}`);
          const sub = this.subscriptions.get(sessionId);
          if (sub) sub.retryCount = 0;
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Leaderboard subscription SUBSCRIBED for ${sessionId}`);
            const sub = this.subscriptions.get(sessionId);
            if (sub) sub.retryCount = 0;

            // Fetch initial leaderboard state
            const { data, error } = await this.supabase
              .from('live_quiz_participants')
              .select('*')
              .eq('session_id', sessionId)
              .order('current_score', { ascending: false });

            if (!error) {
              onUpdate(data || []);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Channel error for leaderboard ${sessionId}`, status);
            if (retryCount < this.MAX_RETRIES) {
              setTimeout(() => {
                attemptSubscribe(retryCount + 1);
              }, this.RETRY_DELAY_MS);
            } else {
              onError?.(new Error(`Failed to subscribe to leaderboard after ${this.MAX_RETRIES} retries`));
            }
          }
        });

      const sub = this.subscriptions.get(sessionId);
      if (sub) {
        sub.channels.set('leaderboard', channel);
      }
    };

    attemptSubscribe(0);
  }

  /**
   * Subscribe to response submissions (instructor dashboard - incoming answers)
   */
  subscribeToResponses(
    sessionId: string,
    onResponse: (response: LiveQuizResponse) => void,
    onError?: (error: Error) => void,
  ): void {
    this.createOrGetSubscription(sessionId);

    const attemptSubscribe = (retryCount: number) => {
      const channelName = `session:${sessionId}:responses`;
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_quiz_responses',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            try {
              onResponse(payload.new);
              console.log(`[Realtime] New response for ${sessionId}`, payload.new);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              onError?.(error);
            }
          }
        )
        .on('system', { event: 'join' }, () => {
          console.log(`[Realtime] Subscribed to responses: ${sessionId}`);
          const sub = this.subscriptions.get(sessionId);
          if (sub) sub.retryCount = 0;
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Response subscription SUBSCRIBED for ${sessionId}`);
            const sub = this.subscriptions.get(sessionId);
            if (sub) sub.retryCount = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Channel error for responses ${sessionId}`, status);
            if (retryCount < this.MAX_RETRIES) {
              setTimeout(() => {
                attemptSubscribe(retryCount + 1);
              }, this.RETRY_DELAY_MS);
            } else {
              onError?.(new Error(`Failed to subscribe to responses after ${this.MAX_RETRIES} retries`));
            }
          }
        });

      const sub = this.subscriptions.get(sessionId);
      if (sub) {
        sub.channels.set('responses', channel);
      }
    };

    attemptSubscribe(0);
  }

  /**
   * Unsubscribe from all channels for a specific session
   */
  unsubscribe(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) return;

    subscription.isUnsubscribing = true;
    console.log(`[Realtime] Unsubscribing from all channels for session ${sessionId}`);

    subscription.channels.forEach((channel) => {
      channel.unsubscribe().catch((err) => {
        console.error(`[Realtime] Error unsubscribing from channel:`, err);
      });
    });

    subscription.channels.clear();
    this.subscriptions.delete(sessionId);
  }

  /**
   * Unsubscribe from all active subscriptions (cleanup)
   */
  unsubscribeAll(): void {
    console.log(`[Realtime] Unsubscribing from all active sessions (${this.subscriptions.size} total)`);

    this.subscriptions.forEach((_, sessionId) => {
      this.unsubscribe(sessionId);
    });

    this.subscriptions.clear();
    this.connectionListeners.clear();
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Register a listener for connection status changes
   */
  onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Create or get an existing subscription entry for a session
   */
  private createOrGetSubscription(sessionId: string): Subscription {
    let subscription = this.subscriptions.get(sessionId);
    if (!subscription) {
      subscription = {
        sessionId,
        channels: new Map(),
        retryCount: 0,
        isUnsubscribing: false,
      };
      this.subscriptions.set(sessionId, subscription);
    }
    return subscription;
  }
}
