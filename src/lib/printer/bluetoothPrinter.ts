/**
 * PakkaChittha Thermal & Bluetooth Printer Integration Service
 * Compatible with all subscription plans (Free Khata, Starter, Growth, Scale).
 * Supports ESC/POS Web Bluetooth printing and standard browser thermal print previews.
 */

export type PaperWidth = '58mm' | '80mm';

export interface PrinterConfig {
  paperWidth: PaperWidth;
  deviceName?: string;
  deviceId?: string;
  autoCut: boolean;
  copies: number;
  printLogo: boolean;
  printQr: boolean;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: '58mm',
  autoCut: true,
  copies: 1,
  printLogo: true,
  printQr: true,
};

const STORAGE_KEY = 'pakkachittha_printer_config';

/**
 * Common Bluetooth Service UUIDs used by standard ESC/POS Thermal Printers
 * (e.g., Everycom, TVS, Pegasus, Epson, Rongta, Xprinter, Bluebamboo)
 */
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Circular / Nordic POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial Port
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom ESC/POS Chinese POS
  '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat / Mini POS
];

export function getSavedPrinterConfig(): PrinterConfig {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINTER_CONFIG;
    return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
}

export function savePrinterConfig(config: Partial<PrinterConfig>): PrinterConfig {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  const current = getSavedPrinterConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function isWebBluetoothSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(
    'bluetooth' in navigator && typeof (navigator as any).bluetooth?.requestDevice === 'function'
  );
}

// Active Bluetooth connection state
class BluetoothThermalConnection {
  private device: any | null = null;
  private characteristic: any | null = null;
  private isConnecting = false;

  get connectedDeviceName(): string | null {
    return this.device?.name || null;
  }

  get isConnected(): boolean {
    return Boolean(this.device?.gatt?.connected && this.characteristic);
  }

  async connect(onDisconnect?: () => void): Promise<{ deviceName: string; deviceId: string }> {
    if (!isWebBluetoothSupported()) {
      throw new Error(
        'Web Bluetooth is not supported by your current browser. Please use Google Chrome, Microsoft Edge, or Chrome for Android over HTTPS, or use System Print.'
      );
    }

    if (this.isConnecting) {
      throw new Error('Connection already in progress...');
    }

    this.isConnecting = true;

    try {
      // Prompt user to select Bluetooth thermal printer
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error('No printer device selected.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        if (onDisconnect) onDisconnect();
      });

      const server = await device.gatt.connect();

      // Find suitable writable characteristic across known services
      let foundCharacteristic: any = null;

      for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();

          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundCharacteristic = char;
              break;
            }
          }
        } catch {
          // Continue scanning next service
        }
        if (foundCharacteristic) break;
      }

      // Fallback: search all primary services if not found in known list
      if (!foundCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  foundCharacteristic = char;
                  break;
                }
              }
            } catch {
              // Ignore
            }
            if (foundCharacteristic) break;
          }
        } catch {
          // Ignore
        }
      }

      if (!foundCharacteristic) {
        await device.gatt.disconnect();
        throw new Error(
          'Connected to device, but no writable printer channel was found. Ensure this device is an ESC/POS thermal printer.'
        );
      }

      this.device = device;
      this.characteristic = foundCharacteristic;

      savePrinterConfig({
        deviceName: device.name || 'Bluetooth Thermal Printer',
        deviceId: device.id,
      });

      return {
        deviceName: device.name || 'Bluetooth Thermal Printer',
        deviceId: device.id,
      };
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  async sendRaw(data: Uint8Array): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Printer is not connected. Please connect your Bluetooth printer first.');
    }

    // Thermal printers have small FIFO buffers (often 512 bytes).
    // Send in chunks of 128 bytes with 20ms pause for reliable transmission.
    const CHUNK_SIZE = 128;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small pause between chunks
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

export const bluetoothPrinter = new BluetoothThermalConnection();

// ============================================================================
// ESC/POS COMMAND BUILDER
// ============================================================================

export class EscPosBuilder {
  private buffer: number[] = [];
  private width: number; // 32 chars for 58mm, 48 chars for 80mm

  constructor(paperWidth: PaperWidth = '58mm') {
    this.width = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  init(): this {
    // ESC @ (Initialize printer)
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01);
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00);
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02);
    return this;
  }

  bold(enable = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable = true): this {
    // GS ! n
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  text(str: string): this {
    // Basic ASCII conversion with clean fallback for Unicode
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code === 8377) {
        // Indian Rupee Symbol ₹ -> replace with Rs. for POS thermal compatibility
        this.text('Rs.');
      } else if (code < 128) {
        this.buffer.push(code);
      } else {
        this.buffer.push(0x3f); // '?' for unprintable
      }
    }
    return this;
  }

  line(str = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  divider(char = '-'): this {
    this.alignLeft();
    this.line(char.repeat(this.width));
    return this;
  }

  twoColumns(left: string, right: string): this {
    const maxLeft = this.width - right.length - 1;
    let cleanLeft = left;
    if (cleanLeft.length > maxLeft) {
      cleanLeft = cleanLeft.slice(0, maxLeft - 1) + '…';
    }
    const spaces = Math.max(1, this.width - cleanLeft.length - right.length);
    this.alignLeft();
    this.line(cleanLeft + ' '.repeat(spaces) + right);
    return this;
  }

  feed(lines = 3): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  cut(): this {
    // GS V A 0 (Partial/full cut with feed)
    this.buffer.push(0x1d, 0x56, 0x41, 0x03);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Builds test receipt bytes for ESC/POS verification
 */
export function buildTestReceiptBytes(
  businessName = 'PakkaChittha Store',
  paperWidth: PaperWidth = '58mm'
): Uint8Array {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const builder = new EscPosBuilder(paperWidth);

  builder
    .alignCenter()
    .bold(true)
    .doubleSize(true)
    .line(businessName.slice(0, 24))
    .doubleSize(false)
    .bold(false)
    .line('TEST THERMAL RECEIPT')
    .line('PakkaChittha Bluetooth Printer')
    .divider('=')
    .alignLeft()
    .twoColumns('Date:', `${dateStr} ${timeStr}`)
    .twoColumns('Printer Mode:', `${paperWidth} Thermal ESC/POS`)
    .twoColumns('Status:', 'CONNECTED & VERIFIED')
    .divider('-')
    .alignLeft()
    .bold(true)
    .twoColumns('SAMPLE ITEM', 'AMOUNT')
    .bold(false)
    .divider('-')
    .twoColumns('Sample Product A (1x)', 'Rs.150.00')
    .twoColumns('Sample Product B (2x)', 'Rs.350.00')
    .divider('-')
    .twoColumns('Subtotal:', 'Rs.500.00')
    .twoColumns('CGST (9%):', 'Rs.45.00')
    .twoColumns('SGST (9%):', 'Rs.45.00')
    .divider('=')
    .bold(true)
    .twoColumns('GRAND TOTAL:', 'Rs.590.00')
    .bold(false)
    .divider('=')
    .alignCenter()
    .line('Printer Connection Successful!')
    .line('www.pakkachittha.com')
    .feed(3)
    .cut();

  return builder.build();
}
