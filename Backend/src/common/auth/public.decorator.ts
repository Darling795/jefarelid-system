import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marks a route as not requiring a session (e.g. login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
