import * as net from 'net';

export class MikrotikTcpClient {
  private socket: net.Socket | null = null;
  private responseBuffer = Buffer.alloc(0);
  private resolveCommand: ((value: string[]) => void) | null = null;
  private rejectCommand: ((err: Error) => void) | null = null;
  private currentResults: string[] = [];

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setTimeout(8000);

      this.socket.on('data', (data) => {
        this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
        this.processBuffer();
      });

      this.socket.on('timeout', () => {
        this.close();
        reject(new Error('Connection timeout to MikroTik'));
      });

      this.socket.on('error', (err) => {
        this.close();
        if (this.rejectCommand) this.rejectCommand(err);
        else reject(err);
      });

      this.socket.connect(this.port, this.host, () => {
        resolve();
      });
    });
  }

  close() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  private writeWord(word: string) {
    if (!this.socket) throw new Error('Not connected');
    const wordBuf = Buffer.from(word, 'utf8');
    const lenBuf = this.encodeLength(wordBuf.length);
    this.socket.write(Buffer.concat([lenBuf, wordBuf]));
  }

  writeCommand(words: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.resolveCommand = resolve;
      this.rejectCommand = reject;
      this.currentResults = [];
      this.responseBuffer = Buffer.alloc(0);

      try {
        for (const w of words) {
          this.writeWord(w);
        }
        this.socket?.write(Buffer.from([0])); // End of sentence marker
      } catch (err) {
        reject(err);
      }
    });
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x4000) return Buffer.from([((len >> 8) & 0xFF) | 0x80, len & 0xFF]);
    if (len < 0x200000) return Buffer.from([((len >> 16) & 0xFF) | 0xC0, (len >> 8) & 0xFF, len & 0xFF]);
    if (len < 0x10000000) return Buffer.from([((len >> 24) & 0xFF) | 0xE0, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF]);
    const b = Buffer.alloc(5);
    b[0] = 0xF0;
    b.writeUInt32BE(len, 1);
    return b;
  }

  private processBuffer() {
    while (this.responseBuffer.length > 0) {
      const lenResult = this.decodeLength(this.responseBuffer);
      if (!lenResult) return;
      const { length, bytesRead } = lenResult;

      if (this.responseBuffer.length < bytesRead + length) {
        return; // Incomplete
      }

      const word = this.responseBuffer.subarray(bytesRead, bytesRead + length).toString('utf8');
      this.responseBuffer = this.responseBuffer.subarray(bytesRead + length);

      this.handleWord(word);
    }
  }

  private decodeLength(buf: Buffer): { length: number; bytesRead: number } | null {
    if (buf.length === 0) return null;
    const b1 = buf[0];
    if (b1 < 0x80) {
      return { length: b1, bytesRead: 1 };
    }
    if (b1 < 0xC0) {
      if (buf.length < 2) return null;
      return { length: ((b1 & 0x3F) << 8) + buf[1], bytesRead: 2 };
    }
    if (b1 < 0xE0) {
      if (buf.length < 3) return null;
      return { length: ((b1 & 0x1F) << 16) + (buf[1] << 8) + buf[2], bytesRead: 3 };
    }
    if (b1 < 0xF0) {
      if (buf.length < 4) return null;
      return { length: ((b1 & 0x0F) << 24) + (buf[1] << 16) + (buf[2] << 8) + buf[3], bytesRead: 4 };
    }
    if (b1 === 0xF0) {
      if (buf.length < 5) return null;
      return { length: buf.readUInt32BE(1), bytesRead: 5 };
    }
    return null;
  }

  private handleWord(word: string) {
    if (word === '') {
      return;
    }
    if (word.startsWith('!done')) {
      if (this.resolveCommand) this.resolveCommand(this.currentResults);
    } else if (word.startsWith('!trap')) {
      if (this.rejectCommand) this.rejectCommand(new Error(`MikroTik Trap Error: ${word}`));
    } else if (word.startsWith('!fatal')) {
      this.close();
      if (this.rejectCommand) this.rejectCommand(new Error(`MikroTik Fatal Error: ${word}`));
    } else {
      this.currentResults.push(word);
    }
  }
}
