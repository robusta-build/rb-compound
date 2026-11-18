import { err, ok, type Result } from './result.js'
import type { FileEdit, IoFailure } from './types.js'

export interface EditFs {
  writeFile(path: string, content: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  unlink(path: string): Promise<void>
  exists(path: string): boolean
  dirname(path: string): string
  join(...parts: string[]): string
  basename(path: string): string
}

export interface ApplyOptions {
  /** Names the temporary file. Injected so a test can make it predictable. */
  tempName?(basename: string, index: number): string
}

const defaultTempName = (basename: string, index: number): string =>
  `.${basename}.bulker-${process.pid}-${index}.tmp`

/**
 * R-BULKER-66. The edit set arrives fully computed; each file is written beside its target
 * and renamed over it, which is atomic for a same-directory rename on APFS and NTFS.
 * A failure reports the files already replaced rather than pretending nothing happened.
 */
export async function applyEdits(
  edits: FileEdit[],
  fs: EditFs,
  options: ApplyOptions = {}
): Promise<Result<string[], IoFailure>> {
  const tempName = options.tempName ?? defaultTempName
  const written: string[] = []
  for (const [index, edit] of edits.entries()) {
    try {
      if (edit.kind === 'delete') {
        if (fs.exists(edit.path)) await fs.unlink(edit.path)
        written.push(edit.path)
        continue
      }
      const temp = fs.join(fs.dirname(edit.path), tempName(fs.basename(edit.path), index))
      await fs.writeFile(temp, edit.content)
      await fs.rename(temp, edit.path)
      written.push(edit.path)
    } catch (cause) {
      return err({
        path: edit.path,
        message: cause instanceof Error ? cause.message : String(cause),
        written
      })
    }
  }
  return ok(written)
}
