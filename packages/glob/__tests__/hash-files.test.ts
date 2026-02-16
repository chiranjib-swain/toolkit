import * as io from '../../io/src/io.js'
import * as path from 'path'
import {hashFiles} from '../src/glob.js'
import {promises as fs} from 'fs'

const IS_WINDOWS = process.platform === 'win32'
const ORIGINAL_GITHUB_WORKSPACE = process.env['GITHUB_WORKSPACE']

/**
 * These test focus on the ability of globber to find files
 * and not on the pattern matching aspect
 */
describe('globber', () => {
  beforeAll(async () => {
    await io.rmRF(getTestTemp())
    process.env['GITHUB_WORKSPACE'] = __dirname
  })

  afterAll(async () => {
    if (ORIGINAL_GITHUB_WORKSPACE) {
      process.env['GITHUB_WORKSPACE'] = ORIGINAL_GITHUB_WORKSPACE
    } else {
      delete process.env['GITHUB_WORKSPACE']
    }
    await io.rmRF(getTestTemp())
  })

  it('basic hashfiles test', async () => {
    const root = path.join(getTestTemp(), 'basic-hashfiles')
    await fs.mkdir(path.join(root), {recursive: true})
    await fs.writeFile(path.join(root, 'test.txt'), 'test file content')
    const hash = await hashFiles(`${root}/*`)
    expect(hash).toEqual(
      'd8a411e8f8643821bed189e627ff57151918aa554c00c10b31c693ab2dded273'
    )
  })

  it('basic hashfiles no match should return empty string', async () => {
    const root = path.join(getTestTemp(), 'empty-hashfiles')
    const hash = await hashFiles(`${root}/*`)
    expect(hash).toEqual('')
  })

  it('followSymbolicLinks defaults to true', async () => {
    const root = path.join(
      getTestTemp(),
      'defaults-to-follow-symbolic-links-true'
    )
    await fs.mkdir(path.join(root, 'realdir'), {recursive: true})
    await fs.writeFile(
      path.join(root, 'realdir', 'file.txt'),
      'test file content'
    )
    await createSymlinkDir(
      path.join(root, 'realdir'),
      path.join(root, 'symDir')
    )
    const testPath = path.join(root, `symDir`)
    const hash = await hashFiles(testPath)
    expect(hash).toEqual(
      'd8a411e8f8643821bed189e627ff57151918aa554c00c10b31c693ab2dded273'
    )
  })

  const emptyDirectory = ''
  it('followSymbolicLinks set to true', async () => {
    const root = path.join(getTestTemp(), 'set-to-true')
    await fs.mkdir(path.join(root, 'realdir'), {recursive: true})
    await fs.writeFile(path.join(root, 'realdir', 'file'), 'test file content')
    await createSymlinkDir(
      path.join(root, 'realdir'),
      path.join(root, 'symDir')
    )
    const testPath = path.join(root, `symDir`)
    const hash = await hashFiles(testPath, emptyDirectory, {
      followSymbolicLinks: true
    })
    expect(hash).toEqual(
      'd8a411e8f8643821bed189e627ff57151918aa554c00c10b31c693ab2dded273'
    )
  })

  it('followSymbolicLinks set to false', async () => {
    // Create the following layout:
    //   <root>
    //   <root>/folder-a
    //   <root>/folder-a/file
    //   <root>/symDir -> <root>/folder-a
    const root = path.join(getTestTemp(), 'set-to-false')
    await fs.mkdir(path.join(root, 'realdir'), {recursive: true})
    await fs.writeFile(path.join(root, 'realdir', 'file'), 'test file content')
    await createSymlinkDir(
      path.join(root, 'realdir'),
      path.join(root, 'symDir')
    )
    const testPath = path.join(root, 'symdir')
    const hash = await hashFiles(testPath, emptyDirectory, {
      followSymbolicLinks: false
    })
    expect(hash).toEqual('')
  })

  it('multipath test basic', async () => {
    // Create the following layout:
    //   <root>
    //   <root>/folder-a
    //   <root>/folder-a/file
    //   <root>/symDir -> <root>/folder-a
    const root = path.join(getTestTemp(), 'set-to-false')
    await fs.mkdir(path.join(root, 'dir1'), {recursive: true})
    await fs.mkdir(path.join(root, 'dir2'), {recursive: true})
    await fs.writeFile(
      path.join(root, 'dir1', 'testfile1.txt'),
      'test file content'
    )
    await fs.writeFile(
      path.join(root, 'dir2', 'testfile2.txt'),
      'test file content'
    )
    const testPath = `${path.join(root, 'dir1')}\n${path.join(root, 'dir2')}`
    const hash = await hashFiles(testPath)
    expect(hash).toEqual(
      '4e911ea5824830b6a3ec096c7833d5af8381c189ffaa825c3503a5333a73eadc'
    )
  })

  it('should ignore files outside workspace by default', async () => {
    // Create a file outside the workspace
    const outsideDir = path.join('/tmp', 'outside-workspace-test')
    await fs.mkdir(outsideDir, {recursive: true})
    await fs.writeFile(
      path.join(outsideDir, 'outside.txt'),
      'outside file content'
    )

    // Try to hash the file without allowOutsideWorkspace
    const hash = await hashFiles(`${outsideDir}/*`)

    // Should return empty string since file is outside workspace
    expect(hash).toEqual('')

    // Clean up
    await io.rmRF(outsideDir)
  })

  it('should hash files outside workspace when allowOutsideWorkspace is true', async () => {
    // Create a file outside the workspace
    const outsideDir = path.join('/tmp', 'outside-workspace-test-allowed')
    await fs.mkdir(outsideDir, {recursive: true})
    await fs.writeFile(
      path.join(outsideDir, 'outside.txt'),
      'outside file content'
    )

    // Try to hash the file with allowOutsideWorkspace: true
    const hash = await hashFiles(`${outsideDir}/*`, '', {
      allowOutsideWorkspace: true
    })

    // Should return a valid hash since we allowed outside workspace
    expect(hash).toBeTruthy()
    expect(hash.length).toBeGreaterThan(0)

    // Clean up
    await io.rmRF(outsideDir)
  })

  it('should still respect workspace when allowOutsideWorkspace is false', async () => {
    // Create a file outside the workspace
    const outsideDir = path.join('/tmp', 'outside-workspace-test-explicit')
    await fs.mkdir(outsideDir, {recursive: true})
    await fs.writeFile(
      path.join(outsideDir, 'outside.txt'),
      'outside file content'
    )

    // Explicitly set allowOutsideWorkspace to false
    const hash = await hashFiles(`${outsideDir}/*`, '', {
      allowOutsideWorkspace: false
    })

    // Should return empty string since file is outside workspace
    expect(hash).toEqual('')

    // Clean up
    await io.rmRF(outsideDir)
  })

  it('should allow hashing action files with custom workspace', async () => {
    // Simulate GITHUB_ACTION_PATH scenario
    const actionDir = path.join('/tmp', 'action-path-test')
    await fs.mkdir(actionDir, {recursive: true})
    await fs.writeFile(
      path.join(actionDir, 'action.yml'),
      'action file content'
    )

    // Hash files using action directory as currentWorkspace
    const hash = await hashFiles(`${actionDir}/*`, actionDir)

    // Should return a valid hash
    expect(hash).toBeTruthy()
    expect(hash.length).toBeGreaterThan(0)

    // Clean up
    await io.rmRF(actionDir)
  })
})

function getTestTemp(): string {
  return path.join(__dirname, '_temp', 'hash_files')
}

/**
 * Creates a symlink directory on OSX/Linux, and a junction point directory on Windows.
 * A symlink directory is not created on Windows since it requires an elevated context.
 */
async function createSymlinkDir(real: string, link: string): Promise<void> {
  if (IS_WINDOWS) {
    await fs.symlink(real, link, 'junction')
  } else {
    await fs.symlink(real, link)
  }
}
