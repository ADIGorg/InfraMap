import type { Request, Response } from 'express';

type GetPhotoUseCase = {
  execute(
    requester: { role: 'PUBLIC' | 'OWNER' | 'ADMIN'; userId?: string },
    occurrenceId: string,
    photoId: string
  ): Promise<unknown>;
};

export class PhotoAccessController {
  constructor(
    private readonly useCase: GetPhotoUseCase,
    private readonly defaultRole: 'PUBLIC' | 'OWNER' | 'ADMIN'
  ) {}

  async handle(req: Request, res: Response) {
    const occurrenceId = req.params.id as string;
    const photoId = req.params.photoId as string;

    const requester =
      this.defaultRole === 'OWNER'
        ? { role: 'OWNER' as const, userId: req.user!.id }
        : { role: this.defaultRole };

    const result = await this.useCase.execute(requester, occurrenceId, photoId);

    return res.status(200).json({ data: result });
  }
}