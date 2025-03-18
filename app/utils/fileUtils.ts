import ignore from 'ignore';

// Common patterns to ignore, similar to .gitignore
export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
];

export const MAX_FILES = 1000;
export const ig = ignore().add(IGNORE_PATTERNS);

export const generateId = () => Math.random().toString(36).substring(2, 15);

export const isBinaryFile = async (file: File): Promise<boolean> => {
  const chunkSize = 1024;
  const buffer = new Uint8Array(await file.slice(0, chunkSize).arrayBuffer());

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
      return true;
    }
  }

  return false;
};

export const shouldIncludeFile = (path: string): boolean => {
  return !ig.ignores(path);
};

const readPackageJson = async (files: File[]): Promise<{ scripts?: Record<string, string> } | null> => {
  const packageJsonFile = files.find((f) => f.webkitRelativePath.endsWith('package.json'));

  if (!packageJsonFile) {
    return null;
  }

  try {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(packageJsonFile);
    });

    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading package.json:', error);
    return null;
  }
};

export const detectProjectType = async (
  files: File[],
): Promise<{ type: string; setupCommand: string; followupMessage: string }> => {
  const hasFile = (name: string) => files.some((f) => f.webkitRelativePath.endsWith(name));

  if (hasFile('package.json')) {
    const packageJson = await readPackageJson(files);
    const scripts = packageJson?.scripts || {};

    // Check for preferred commands in priority order
    const preferredCommands = ['dev', 'start', 'preview'];
    const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);

    if (availableCommand) {
      return {
        type: 'Node.js',
        setupCommand: `npm install && npm run ${availableCommand}`,
        followupMessage: `Found "${availableCommand}" script in package.json. Running "npm run ${availableCommand}" after installation.`,
      };
    }

    return {
      type: 'Node.js',
      setupCommand: 'npm install',
      followupMessage:
        'Would you like me to inspect package.json to determine the available scripts for running this project?',
    };
  }

  if (hasFile('index.html')) {
    return {
      type: 'Static',
      setupCommand: 'npx --yes serve',
      followupMessage: '',
    };
  }

  return { type: '', setupCommand: '', followupMessage: '' };
};

export const filesToArtifacts = (files: { [path: string]: { content: string } }, id: string): string => {
  return `
<boltArtifact id="${id}" title="User Updated Files">
${Object.keys(files)
      .map(
        (filePath) => `
<boltAction type="file" filePath="${filePath}">
${files[filePath].content}
</boltAction>
`,
      )
      .join('\n')}
</boltArtifact>
  `;
};

export interface UrlFileLoadConfig {
  fileLoadRoot: string;
  files: string[];
  auth?: {
    token: string,
    role: string,
    database: string
  }
}

export const loadFilesFromUrls = async (config: UrlFileLoadConfig): Promise<{ [path: string]: { content: string } }> => {
 
  const files: { [path: string]: { content: string } } = {};
 
  await Promise.all(
    config.files.map(async (filePath) => {
      try {
        const url = new URL(filePath, config.fileLoadRoot).toString();
        
        let response;
        if (url.includes('api/')) {
          
          // Get data from yardi api  
          const headers = new Headers({
            'Content-Type': 'application/json'
          });
  
          if (config.auth?.token) {
            headers.append('Authorization', 'Bearer ' + config.auth?.token);
          }

          if (config.auth?.role) {
            headers.append('role', config.auth?.role);
          }
  
          if (config.auth?.database) {
            headers.append('database', config.auth?.database);
          }
  
          response = await fetch(url, {
            headers: headers,
          });
  
        } else {
          // Do normal fetch
          response = await fetch(url);
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const content = await response.text();
        files[filePath] = { content };
      } catch (error) {
        console.error(`Error loading file ${filePath}:`, error);
      }
    })
  );

  return files;
};
