import { describe, expect, it } from 'vitest';
import { canDeletePersonnel, canDeleteTraining } from './permissions';

describe('canDeletePersonnel', () => {
  it('izin listesindeki e-postalar için true döner', () => {
    expect(canDeletePersonnel('xechto@gmail.com')).toBe(true);
    expect(canDeletePersonnel('sethblackrose@gmail.com')).toBe(true);
  });

  it('izin listesinde olmayan bir e-posta için false döner', () => {
    expect(canDeletePersonnel('baska@gmail.com')).toBe(false);
    expect(canDeletePersonnel('')).toBe(false);
  });
});

describe('canDeleteTraining', () => {
  it('izin listesindeki e-postalar için true döner', () => {
    expect(canDeleteTraining('xechto@gmail.com')).toBe(true);
    expect(canDeleteTraining('sethblackrose@gmail.com')).toBe(true);
  });

  it('izin listesinde olmayan bir e-posta için false döner', () => {
    expect(canDeleteTraining('baska@gmail.com')).toBe(false);
  });
});
