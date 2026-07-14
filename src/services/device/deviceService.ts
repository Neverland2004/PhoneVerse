export interface DeviceService {
  getPlatform(): "web" | "android" | "ios";
  showNativeNotification?(title: string, body: string): Promise<void>;
  pickImage?(): Promise<string | null>;
}

export const webDeviceService: DeviceService = {
  getPlatform: () => "web",
};
