import { readFile, writeFile } from 'fs';
import { scope, Task } from 'mgfx';
import { node, FutureInstance } from 'fluture';

export type ReadFileOptions = string
  | { encoding: string }
  & Partial<{
    flag: string
  }>;

export type ReadFileSpec = {
  path: string;
  options: ReadFileOptions;
}

@scope('@mgfx/fs')
export class ReadFile extends Task<ReadFileSpec> {

  static handler({ data: { path, options } }: ReadFile): FutureInstance<Error, string> {
    return node(done => { readFile(path, options || 'utf8', done); });
  }
}

export type WriteFileOptions = string
  | { encoding: string }
  & Partial<{
    mode: number;
    flag: string;
  }>;

export type WriteFileSpec = {
  path: string;
  data: string;
  options: WriteFileOptions;
};

@scope('@mgfx/fs')
export class WriteFile extends Task<WriteFileSpec> {

  static handler({ data: { path, data, options } }: WriteFile): FutureInstance<NodeJS.ErrnoException, null> {
    return node(done => { writeFile(path, data, options, done); });
  }
}
