import { MAX_PHOTO_SIZE_BYTES, validatePhoto } from './camera.service';

jest.mock('expo-camera', () => ({}));

describe('validatePhoto', () => {
  it('aceita JPEG e PNG com até 5 MiB', () => {
    expect(() => validatePhoto('image/jpeg', MAX_PHOTO_SIZE_BYTES)).not.toThrow();
    expect(() => validatePhoto('image/png', 1024)).not.toThrow();
  });

  it('rejeita MIME inválido', () => {
    expect(() => validatePhoto('image/webp', 1024)).toThrow('JPEG ou PNG');
  });

  it('rejeita foto acima de 5 MiB', () => {
    expect(() => validatePhoto('image/jpeg', MAX_PHOTO_SIZE_BYTES + 1)).toThrow('5 MB');
  });
});
