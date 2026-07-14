import { seedContacts, seedMessages, seedThreads } from "../data/seed/chatSeed";
import { seedNotes, seedPhotos, seedSettings } from "../data/seed/contentSeed";
import { db, type PhoneVerseDatabase } from "../db/database";
import { localEventService, type LocalEventService } from "./events/localEventService";
import { aiRepository, type AiRepository } from "./storage/aiRepository";

export class DemoDataService {
  constructor(
    private readonly database: PhoneVerseDatabase = db,
    private readonly events: LocalEventService = localEventService,
    private readonly ai: AiRepository = aiRepository,
  ) {}

  async reset(): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.contacts,
        this.database.threads,
        this.database.messages,
        this.database.notifications,
        this.database.photos,
        this.database.notes,
        this.database.settings,
        this.database.aiRequests,
        this.database.contactAIProfiles,
      ],
      async () => {
        await Promise.all([
          this.database.contacts.clear(),
          this.database.threads.clear(),
          this.database.messages.clear(),
          this.database.notifications.clear(),
          this.database.photos.clear(),
          this.database.notes.clear(),
          this.database.settings.clear(),
          this.database.aiRequests.clear(),
          this.database.contactAIProfiles.clear(),
        ]);
        await this.database.contacts.bulkAdd(seedContacts);
        await this.database.threads.bulkAdd(seedThreads);
        await this.database.messages.bulkAdd(seedMessages);
        await this.database.photos.bulkAdd(seedPhotos);
        await this.database.notes.bulkAdd(seedNotes);
        await this.database.settings.bulkAdd(seedSettings);
      },
    );
    await this.ai.initialize();
    this.events.reset();
  }
}

export const demoDataService = new DemoDataService();
