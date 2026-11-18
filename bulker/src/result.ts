export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

/** A successful Result carrying its value. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
/** A failed Result carrying its error. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
