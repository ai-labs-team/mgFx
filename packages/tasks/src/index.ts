import * as fs from 'fs';
import { Task } from 'mgfx';

export type ReadFileOptions = string
  | { encoding: string }
  & Partial<{
    flag: string
  }>;

export class ReadFile extends Task<string> {
  run(path: string, options: ReadFileOptions) {
    fs.readFile(path, options, (err, data) => {
      err ? this.reject(err as any) : this.resolve(data);
    });
  }
}

export type WriteFileOptions = string
  | { encoding: string }
  & Partial<{
    mode: number;
    flag: string;
  }>;

export class WriteFile extends Task {
  run(path: string, data: string, options: WriteFileOptions) {
    fs.writeFile(path, data, options, (err) => {
      err ? this.reject(err as any) : this.resolve();
    });
  }
}
