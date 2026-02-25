import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve(__dirname, '../src');

const readFile = (relPath: string) =>
  fs.readFileSync(path.resolve(srcDir, relPath), 'utf-8');

describe('Güvenlik - Hardcoded secret kontrolü', () => {
  it('encryptionService btoa/atob içermez', () => {
    const content = readFile('services/encryptionService.ts');
    expect(content).not.toContain('btoa(');
    expect(content).not.toContain('atob(');
  });

  it('encryptionService Math.random() kullanmaz', () => {
    const content = readFile('services/encryptionService.ts');
    expect(content).not.toContain('Math.random()');
  });

  it('App.tsx Math.random crypto polyfill içermez', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');
    expect(content).not.toMatch(/getRandomValues.*Math\.random/s);
  });

  it('authService açık metin şifre kaydetmez', () => {
    const content = readFile('services/authService.ts');
    expect(content).not.toContain('rememberedUser');
    expect(content).not.toContain('saveCredentials');
    expect(content).not.toContain('autoLogin');
  });

  it('LoginScreen Beni Hatırla özelliği içermez', () => {
    const content = readFile('screens/LoginScreen.tsx');
    expect(content).not.toContain('saveCredentials');
    expect(content).not.toContain('rememberMe');
  });

  it('notificationService placeholder URL içermez', () => {
    const content = readFile('services/notificationService.ts');
    expect(content).not.toContain('YOUR_BACKEND_URL');
  });
});

describe('Güvenlik - console.log production kodu', () => {
  const getSourceFiles = (dir: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return getSourceFiles(fullPath);
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) return [fullPath];
      return [];
    });
  };

  it('hiçbir src dosyasında console.log/warn/error yoktur', () => {
    const files = getSourceFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/console\.(log|warn|error|debug|info)/.test(line) && !line.trim().startsWith('//')) {
          violations.push(`${path.relative(srcDir, file)}:${i + 1}`);
        }
      });
    }

    if (violations.length > 0) {
      fail(`console.log bulundu:\n${violations.join('\n')}`);
    }
    expect(violations).toHaveLength(0);
  });

  it('App.tsx console.log içermez', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');
    expect(content).not.toMatch(/console\.(log|warn|error)/);
  });
});

describe('Güvenlik - KVKK veri silme', () => {
  it('requestDataErasure writeBatch kullanır (gerçek silme)', () => {
    const content = readFile('services/kvkkService.ts');
    expect(content).toContain('writeBatch');
    expect(content).toContain('batch.commit');
    expect(content).toContain('batch.delete');
  });

  it('kvkkService users koleksiyonunu siler', () => {
    const content = readFile('services/kvkkService.ts');
    expect(content).toContain("'users'");
  });
});

describe('Güvenlik - Silinen dosyalar yok', () => {
  it('PatientHomeScreen.tsx (ölü kod) silindi', () => {
    expect(fs.existsSync(path.resolve(srcDir, 'screens/PatientHomeScreen.tsx'))).toBe(false);
  });

  it('TestMenuScreen.tsx (test kodu) silindi', () => {
    expect(fs.existsSync(path.resolve(srcDir, 'screens/TestMenuScreen.tsx'))).toBe(false);
  });

  it('healthKitService.ts (stub) silindi', () => {
    expect(fs.existsSync(path.resolve(srcDir, 'services/healthKitService.ts'))).toBe(false);
  });

  it('achievementService.ts (kullanılmayan) silindi', () => {
    expect(fs.existsSync(path.resolve(srcDir, 'services/achievementService.ts'))).toBe(false);
  });
});
