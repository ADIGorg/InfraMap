import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  GetPhotoSignedUrlUseCase,
} from '../../../../src/modules/occurrences/application/use-cases/get-photo-signed-url.use-case.js';
import {
  GetPublicOccurrenceUseCase,
} from '../../../../src/modules/occurrences/application/use-cases/get-public-occurrence.use-case.js';

import type {
  IPhotoAccessRepository,
  PhotoAccessInfo,
} from '../../../../src/modules/occurrences/domain/repositories/photo-access.repository.js';
import type {
  IPhotoUrlService,
} from '../../../../src/modules/occurrences/domain/services/photo-url.service.js';
import type {
  IOccurrenceQueryRepository,
  OccurrenceStatus,
} from '../../../../src/modules/occurrences/domain/repositories/occurrence-query.repository.js';

const occurrenceId = '10000000-0000-4000-8000-000000009001';
const authorId = '10000000-0000-4000-8000-000000009002';
const anotherUserId = '10000000-0000-4000-8000-000000009003';

const signed = {
  url: 'https://signed.example.invalid/token',
  expiresAt: '2026-11-12T18:00:00Z',
  expiresInSeconds: 300,
};

const photo: PhotoAccessInfo = {
  photoId: '10000000-0000-4000-8000-000000009004',
  occurrenceId,
  storagePath: `occurrences/${occurrenceId}/photo-1.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1200,
  position: 1,
  isPublic: true,
  occurrenceStatus: 'CONFIRMED',
  occurrenceAuthorId: authorId,
  occurrencePublicVisible: true,
};

function setup(
  status: OccurrenceStatus = photo.occurrenceStatus,
) {
  const repo = {
    getPhotoInfo: vi.fn().mockResolvedValue({
      ...photo,
      occurrenceStatus: status,
    }),
  };

  const urls = {
    generate: vi.fn().mockResolvedValue(signed),
    generateBatch: vi.fn().mockResolvedValue({
      [photo.storagePath]: signed,
    }),
  };

  const useCase = new GetPhotoSignedUrlUseCase(
    repo as unknown as IPhotoAccessRepository,
    urls as unknown as IPhotoUrlService,
  );

  return {
    repo,
    urls,
    useCase,
  };
}

describe(
  'OCC-03 / RN017, RN022: foto privada e URL assinada',
  () => {
    it(
      'público pode ver foto pública CONFIRMED',
      async () => {
        const {
          useCase,
          urls,
        } = setup();

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).resolves.toEqual(signed);

        expect(
          urls.generate,
        ).toHaveBeenCalledWith(photo.storagePath);
      },
    );

    it(
      'público pode ver foto pública IN_SERVICE',
      async () => {
        const {
          useCase,
        } = setup('IN_SERVICE');

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).resolves.toEqual(signed);
      },
    );

    it.each<OccurrenceStatus>([
      'RECEIVED',
      'UNDER_ANALYSIS',
      'REJECTED',
      'RESOLVED',
    ])(
      'público não pode acessar foto em %s',
      async (status) => {
        const {
          useCase,
          urls,
        } = setup(status);

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          403,
        );

        expect(
          urls.generate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'público não recebe URL de foto privada mesmo em CONFIRMED',
      async () => {
        const {
          useCase,
          repo,
          urls,
        } = setup('CONFIRMED');

        repo.getPhotoInfo
          .mockResolvedValueOnce({
            ...photo,
            occurrenceStatus: 'CONFIRMED',
            occurrencePublicVisible: true,
            isPublic: false,
          });

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          403,
        );

        expect(
          urls.generate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'público não recebe URL de ocorrência oculta mesmo com foto pública e status CONFIRMED',
      async () => {
        const {
          useCase,
          repo,
          urls,
        } = setup('CONFIRMED');

        repo.getPhotoInfo
          .mockResolvedValueOnce({
            ...photo,
            occurrenceStatus: 'CONFIRMED',
            isPublic: true,
            occurrencePublicVisible: false,
          });

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          403,
        );

        expect(
          urls.generate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'autor vê a própria foto pública independentemente do status',
      async () => {
        const {
          useCase,
        } = setup('RECEIVED');

        await expect(
          useCase.execute(
            {
              role: 'OWNER',
              userId: authorId,
            },
            occurrenceId,
            photo.photoId,
          ),
        ).resolves.toEqual(signed);
      },
    );

    it(
      'autor vê a própria foto privada',
      async () => {
        const {
          useCase,
          repo,
          urls,
        } = setup('RECEIVED');

        repo.getPhotoInfo
          .mockResolvedValueOnce({
            ...photo,
            occurrenceStatus: 'RECEIVED',
            isPublic: false,
          });

        await expect(
          useCase.execute(
            {
              role: 'OWNER',
              userId: authorId,
            },
            occurrenceId,
            photo.photoId,
          ),
        ).resolves.toEqual(signed);

        expect(
          urls.generate,
        ).toHaveBeenCalledWith(photo.storagePath);
      },
    );

    it(
      'outro cidadão não vê foto privada',
      async () => {
        const {
          useCase,
          repo,
          urls,
        } = setup('RECEIVED');

        repo.getPhotoInfo
          .mockResolvedValueOnce({
            ...photo,
            occurrenceStatus: 'RECEIVED',
            isPublic: false,
          });

        await expect(
          useCase.execute(
            {
              role: 'OWNER',
              userId: anotherUserId,
            },
            occurrenceId,
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          403,
        );

        expect(
          urls.generate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'admin vê evidência privada necessária para moderação',
      async () => {
        const {
          useCase,
          repo,
        } = setup('REJECTED');

        repo.getPhotoInfo
          .mockResolvedValueOnce({
            ...photo,
            occurrenceStatus: 'REJECTED',
            isPublic: false,
          });

        await expect(
          useCase.execute(
            {
              role: 'ADMIN',
            },
            occurrenceId,
            photo.photoId,
          ),
        ).resolves.toEqual(signed);
      },
    );

    it(
      'vínculo incorreto entre ocorrência e foto retorna 400',
      async () => {
        const {
          useCase,
        } = setup();

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            '10000000-0000-4000-8000-000000009999',
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          400,
        );
      },
    );

    it(
      'foto inexistente retorna 404',
      async () => {
        const {
          useCase,
          repo,
        } = setup();

        repo.getPhotoInfo
          .mockResolvedValueOnce(null);

        await expect(
          useCase.execute(
            {
              role: 'PUBLIC',
            },
            occurrenceId,
            '10000000-0000-4000-8000-000000009998',
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          404,
        );
      },
    );

    it(
      'perfil inesperado não consegue gerar URL',
      async () => {
        const {
          useCase,
        } = setup();

        await expect(
          useCase.execute(
            {
              role: 'HACKER' as never,
            },
            occurrenceId,
            photo.photoId,
          ),
        ).rejects.toHaveProperty(
          'statusCode',
          400,
        );
      },
    );
  },
);

describe(
  'OCC-03: DTO público nunca expõe storagePath',
  () => {
    const mockDetail = {
      id: occurrenceId,
      category: {
        id: '10000000-0000-4000-8000-000000009005',
        code: 'CAT01',
        name: 'Saneamento',
      },
      description: 'Esgoto',
      status: 'CONFIRMED' as const,
      location: {
        lat: -12.27,
        lng: -38.98,
      },
      votesCount: 2,
      createdAt: '2026-11-12T10:00:00Z',
      photoPublicConsent: true,
      photos: [
        {
          storagePath: photo.storagePath,
          mimeType: 'image/jpeg',
          sizeBytes: 1200,
          position: 1,
        },
      ],
    };

    it(
      'retorna somente URL assinada, sem path interno',
      async () => {
        const {
          urls,
        } = setup();

        const repository = {
          getPublic: vi.fn()
            .mockResolvedValue(mockDetail),
        };

        const result = await new GetPublicOccurrenceUseCase(
          repository as unknown as IOccurrenceQueryRepository,
          urls as unknown as IPhotoUrlService,
        ).execute(occurrenceId);

        expect(
          result.photoUrls,
        ).toEqual([
          {
            mimeType: 'image/jpeg',
            sizeBytes: 1200,
            position: 1,
            ...signed,
          },
        ]);

        expect(
          JSON.stringify(result),
        ).not.toContain(photo.storagePath);
      },
    );

    it(
      'não gera URL de foto se ocorrência não é pública',
      async () => {
        const {
          urls,
        } = setup();

        const repository = {
          getPublic: vi.fn()
            .mockResolvedValue({
              ...mockDetail,
              status: 'RECEIVED',
            }),
        };

        const result = await new GetPublicOccurrenceUseCase(
          repository as unknown as IOccurrenceQueryRepository,
          urls as unknown as IPhotoUrlService,
        ).execute(occurrenceId);

        expect(
          result.photoUrls,
        ).toEqual([]);

        expect(
          urls.generateBatch,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'sem detalhe retorna 404',
      async () => {
        const {
          urls,
        } = setup();

        const repository = {
          getPublic: vi.fn()
            .mockResolvedValue(null),
        };

        await expect(
          new GetPublicOccurrenceUseCase(
            repository as unknown as IOccurrenceQueryRepository,
            urls as unknown as IPhotoUrlService,
          ).execute(occurrenceId),
        ).rejects.toHaveProperty(
          'statusCode',
          404,
        );
      },
    );
  },
);
