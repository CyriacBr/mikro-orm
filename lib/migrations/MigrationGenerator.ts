import { ensureDir, writeFile } from 'fs-extra';
import { CodeBlockWriter, IndentationText, Project, QuoteKind } from 'ts-morph';

import { AbstractSqlDriver } from '../drivers';
import { MigrationsOptions, Utils } from '../utils';

export class MigrationGenerator {

  private readonly project = new Project();

  constructor(protected readonly driver: AbstractSqlDriver,
              protected readonly options: MigrationsOptions) {
    this.project.manipulationSettings.set({ quoteKind: QuoteKind.Single, indentationText: IndentationText.TwoSpaces });
  }

  async generate(diff: string[], path?: string): Promise<[string, string]> {
    path = Utils.normalizePath(path || this.options.path!);
    await ensureDir(path);
    const time = new Date().toISOString().replace(/[-T:]|\.\d{3}z$/ig, '');
    const name = `Migration${time}.ts`;
    const migration = this.project.createSourceFile(path + '/' + name, writer => {
      writer.writeLine(`import { Migration } from 'mikro-orm';`);
      writer.blankLine();
      writer.write(`export class Migration${time} extends Migration`);
      writer.block(() => {
        writer.blankLine();
        writer.write('async up(): Promise<void>');
        writer.block(() => diff.forEach(sql => this.createStatement(writer, sql)));
        writer.blankLine();
      });
      writer.write('');
    });

    const ret = migration.getFullText();
    await writeFile(migration.getFilePath(), ret);

    return [ret, name];
  }

  createStatement(writer: CodeBlockWriter, sql: string): void {
    if (sql) {
      writer.writeLine(`this.addSql('${sql.replace(/'/g, '\\\'')}');`); // lgtm [js/incomplete-sanitization]
    } else {
      writer.blankLine();
    }
  }

}
