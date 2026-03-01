declare module "adm-zip" {
  class AdmZip {
    constructor(input?: string | Buffer);
    getEntries(): Array<{ entryName: string; isDirectory: boolean; getData(): Buffer }>;
  }
  export = AdmZip;
}
