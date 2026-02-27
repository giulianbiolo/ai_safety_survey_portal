/* eslint-disable @typescript-eslint/no-explicit-any */

interface PyodideInterface {
  runPythonAsync(code: string): Promise<any>;
  FS: {
    writeFile(path: string, data: string): void;
    mkdirTree(path: string): void;
    readdir(path: string): string[];
    unlink(path: string): void;
  };
  loadPackage(names: string | string[]): Promise<void>;
  globals: {
    get(name: string): any;
    set(name: string, value: any): void;
  };
}

interface LoadPyodideOptions {
  indexURL?: string;
}

declare function loadPyodide(options?: LoadPyodideOptions): Promise<PyodideInterface>;

interface Window {
  loadPyodide: typeof loadPyodide;
}
