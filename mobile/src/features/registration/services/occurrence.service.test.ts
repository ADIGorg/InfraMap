import { buildTemporaryPhotoPath, occurrenceIdFromErrorMessage } from './occurrence.service';

describe('occurrence.service helpers', () => {
  it('constrói path temporário conforme contrato atual', () => {
    expect(buildTemporaryPhotoPath('user-1', 'analysis-1', 0, 'image/jpeg')).toBe('temporary/user-1/analysis-1/photo-1.jpg');
  });
  it('extrai occurrenceId de erro recuperável', () => {
    expect(occurrenceIdFromErrorMessage('Falha após commit occurrenceId=9b2f4d61-1a2b-4c5d-8e7f-0a1b2c3d4e5f')).toBe('9b2f4d61-1a2b-4c5d-8e7f-0a1b2c3d4e5f');
  });
});
