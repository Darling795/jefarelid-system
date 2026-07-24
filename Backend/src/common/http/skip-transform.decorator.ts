import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM = 'skipTransform';

/** Mark a handler so its response is NOT wrapped in the { data } envelope. */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);
