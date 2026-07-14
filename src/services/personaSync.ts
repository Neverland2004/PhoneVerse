import { aiApiClient } from "./api/aiApiClient";
import { aiRepository } from "./storage/aiRepository";
import { chatRepository } from "./storage/chatRepository";

/** 启动时从项目 personas/ 文件夹加载到 IndexedDB。 */
export async function syncPersonasFromDisk(): Promise<void> {
  const items = await aiApiClient.listPersonas();
  for (const item of items) {
    await chatRepository.updateContact(item.contactId, {
      name: item.name,
      avatar: item.avatar,
      status: item.status,
    });
    await aiRepository.updateProfile(item.contactId, {
      displayName: item.name,
      persona: item.persona,
    });
  }
}

/** 前端保存人设时同步写入 personas/*.json */
export async function savePersonaToDisk(input: {
  contactId: string;
  name: string;
  avatar: string;
  status: string;
  persona: string;
}): Promise<void> {
  await aiApiClient.savePersona(input);
}

/** @deprecated 使用 savePersonaToDisk */
export const persistPersonaToDisk = savePersonaToDisk;
