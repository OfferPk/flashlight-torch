/**
 * Capacitor Torch plugin definitions (documentation / optional TS).
 */
export interface TorchAvailability {
  available: boolean;
  reason?: string;
  strengthSupported?: boolean;
  maxStrength?: number;
}

export interface TorchPlugin {
  isAvailable(): Promise<TorchAvailability>;
  turnOn(): Promise<{ on: boolean }>;
  turnOnWithStrength(options: { level: number }): Promise<{ on: boolean; strength: number }>;
  turnOff(): Promise<{ on: boolean }>;
  addListener(
    eventName: 'torchAvailabilityChanged',
    listenerFunc: (info: { available: boolean; reason?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const TORCH_PLUGIN_NAME = 'Torch';
