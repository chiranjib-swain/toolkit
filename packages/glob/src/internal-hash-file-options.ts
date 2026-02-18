/**
 * Options to control globbing behavior
 */
export interface HashFileOptions {
  /**
   * Indicates whether to follow symbolic links. Generally should set to false
   * when deleting files.
   *
   * @default true
   */
  followSymbolicLinks?: boolean

  /**
   * Allow hashing files outside the GITHUB_WORKSPACE directory.
   * By default, files outside the workspace are ignored for security reasons.
   * Set to true to explicitly allow hashing files outside the workspace.
   *
   * @default false
   */
  allowOutsideWorkspace?: boolean
}
