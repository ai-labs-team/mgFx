export type Message = {
  hostname: string;
  pid: number;
  name: string;
  time: string;
  msg: string;
  data?: any;
}

type Options = {
  storeMessage: (message: Message) => void;
  storeEntity: (message: Message) => void;
}

export const processor = ({ storeMessage, storeEntity }: Options) => {
  const processLine = (line: string) => {
    const parsed = parseMessage(line);

    if (parsed) {
      storeMessage(parsed);

      if (parsed.data && parsed.data.id) {
        storeEntity(parsed);
      }

      return;
    }

    return process.stdout.write(line + '\n');
  }

  let partialLine = '';

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  console.log('mgFx Recorder: Starting to record stdin messages...');

  process.stdin.on('data', (chunk: string) => {
    const lines = chunk.split(/\r\n|\n/);

    if (lines.length === 1) {
      partialLine += lines[0];
      return;
    }

    if (lines.length > 1) {
      processLine(partialLine + lines[0]);
    }

    partialLine = lines.pop()!;

    for (let i = 1; i < lines.length; i += 1) {
      processLine(lines[i]);
    }
  });

  process.stdin.on('end', () => {
    console.log('mgFx Recorder: End of standard output, recorder should now terminate.');

    if (partialLine) {
      processLine(partialLine);
      partialLine = '';
    }
  });
}

const parseMessage = (line: string): Message | void => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line);
  } catch (e) {
    return;
  }

  if (!(parsed instanceof Object)) {
    return;
  }

  if (!('name' in parsed) || parsed['name'] !== 'mgfx-instrumenter') {
    return;
  }

  return parsed as Message;
}
