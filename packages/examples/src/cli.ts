import { join } from 'path';
import { singleProcess, Task } from 'mgfx';
import { Serializable } from 'mgfx/dist/Task';
import { ReadFile } from '@mgfx/tasks';

class ReadPackageJsonField extends Task<Serializable> {
  run(field: string) {
    this.exec(ReadFile, join(__dirname, '..', 'package.json'), 'utf8')
      .then(JSON.parse)
      .then((json: any) => json[field])
      .then(this.resolve)
      .catch(this.reject)
  }
}

const { scheduler } = singleProcess({
  tasks: [
    ReadPackageJsonField,
    ReadFile
  ]
});

Promise.all([
  scheduler.exec(ReadPackageJsonField, 'name'),
  scheduler.exec(ReadPackageJsonField, 'description')
])
  .then(([name, description]) => {
    console.log(`Package Name: ${name}`);
    console.log(`Description: ${description}`);
  })
