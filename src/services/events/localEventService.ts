import { notificationRepository, type NotificationRepository } from "../storage/notificationRepository";

export const FIRST_UNLOCK_EVENT_ID = "event-first-unlock-message";
const EVENT_THREAD_ID = "thread-mom";
const EVENT_MESSAGE = "晚饭记得按时吃，别忙忘了。";

export class LocalEventService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private starting: Promise<void> | null = null;
  private generation = 0;

  constructor(private readonly notifications: NotificationRepository = notificationRepository) {}

  start(getActiveThreadId: () => string | null, delay = 5_000): Promise<void> {
    if (this.timer) return Promise.resolve();
    if (this.starting) return this.starting;
    const generation = this.generation;

    this.starting = this.notifications
      .hasNotification(FIRST_UNLOCK_EVENT_ID)
      .then((hasTriggered) => {
        if (hasTriggered || this.timer || generation !== this.generation) return;
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.triggerNow(getActiveThreadId());
        }, delay);
      })
      .finally(() => {
        if (generation === this.generation) this.starting = null;
      });

    return this.starting;
  }

  reset(): void {
    this.generation += 1;
    this.starting = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async triggerNow(activeThreadId: string | null): Promise<void> {
    if (await this.notifications.hasNotification(FIRST_UNLOCK_EVENT_ID)) return;
    await this.notifications.deliverIncomingMessage({
      threadId: EVENT_THREAD_ID,
      body: EVENT_MESSAGE,
      isThreadActive: activeThreadId === EVENT_THREAD_ID,
      notificationId: FIRST_UNLOCK_EVENT_ID,
    });
  }
}

export const localEventService = new LocalEventService();
