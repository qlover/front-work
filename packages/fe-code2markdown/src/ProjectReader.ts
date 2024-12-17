import { Logger } from '@qlover/fe-core';
import fsExtra from 'fs-extra';
import {
  Application,
  JSONOutput,
  ProjectReflection,
  TSConfigReader,
  TypeDocReader
} from 'typedoc';
import { ReflectionGeneraterContext } from './type';

export class ProjectReader {
  private app?: Application;
  private project?: ProjectReflection;

  constructor(private context: ReflectionGeneraterContext) {}

  get logger(): Logger {
    return this.context.logger;
  }

  /**
   * 加载项目
   * @param {string} path
   * @returns {import('typedoc').ProjectReflection}
   */
  async load(path: string): Promise<ProjectReflection | undefined> {
    path = path || this.context.options.outputJSONFilePath;

    if (!path) {
      this.logger.warn('ProjectReader load Ouput path is empty!');
      return;
    }

    if (!fsExtra.existsSync(path)) {
      return;
    }
    const project = fsExtra.readJSONSync(
      path
    ) as unknown as JSONOutput.ProjectReflection;

    const app = await this.getApp();
    const reflections = app.deserializer.reviveProject(project);

    this.project = reflections;

    return this.project;
  }

  async writeTo(project: ProjectReflection, path?: string): Promise<void> {
    path = path || this.context.options.outputJSONFilePath;

    if (!path) {
      this.logger.warn('ProjectReader writeTo Ouput path is empty!');
      return;
    }

    const app = await this.getApp();

    this.writeJSON(app.serializer.projectToObject(project, './'), path);
    this.logger.info('Generate JSON file success', path);
  }

  writeJSON(value: unknown, path: string): void {
    if (!path) {
      this.logger.warn('ProjectReader writeJSON Ouput path is empty!');
      return;
    }

    // 删除文件
    fsExtra.removeSync(path);

    // 确保文件存在，不存在则创建
    fsExtra.ensureFileSync(path);

    fsExtra.writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
  }

  /**
   * 获取应用
   * @returns {Promise<Application>}
   */
  async getApp(): Promise<Application> {
    if (this.app) {
      return this.app;
    }

    const app = await Application.bootstrap(
      {
        // typedoc options here
        basePath: this.context.options.basePath,
        entryPoints: this.context.options.entryPoints,
        skipErrorChecking: true
      },
      [new TSConfigReader(), new TypeDocReader()]
    );

    this.app = app;
    return app;
  }
}
