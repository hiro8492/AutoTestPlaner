import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve(__dirname, '../../../docs/IR_SCHEMA.json');

let _schema: object | null = null;

export function getIRSchema(): object {
  if (!_schema) {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    _schema = JSON.parse(content);
  }
  return _schema!;
}
