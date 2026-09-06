import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const asset = "fixture-appimage.AppImage";
const contents = "a realistic release fixture";
const checksum = createHash("sha256").update(contents).digest("hex");

async function writeExecutable(path: string, content: string): Promise<void> {
  await writeFile(path, content, { mode: 0o755 });
  await chmod(path, 0o755);
}

async function runInstaller(
  root: string,
  suppliedChecksum: string,
): Promise<{ stdout: string; stderr: string }> {
  const bin = join(root, "bin");
  await mkdir(bin);
  await writeExecutable(join(bin, "uname"), '#!/bin/sh\nprintf "Linux\\n"\n');
  await writeExecutable(join(bin, "mkdir"), "#!/bin/sh\nexit 0\n");
  await writeExecutable(
    join(bin, "install"),
    '#!/bin/sh\nprintf "INSTALL_CALLED\\n"\n',
  );
  await writeExecutable(
    join(bin, "curl"),
    `#!/bin/sh
set -eu
url=''
output=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
case "$url" in
  */releases/latest)
    printf '%s\\n' '{' '  "assets": [' '    {"browser_download_url": "https://fixture.test/${asset}"},' '    {"browser_download_url": "https://fixture.test/SHA256SUMS"}' '  ]' '}'
    ;;
  *${asset}) printf '%s' '${contents}' > "$output" ;;
  *SHA256SUMS) printf '%s  %s\\n' "$EPUB_BRIDGE_TEST_CHECKSUM" '${asset}' > "$output" ;;
esac
`,
  );
  return execute("sh", ["public/install.sh"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      EPUB_BRIDGE_TEST_CHECKSUM: suppliedChecksum,
    },
  });
}

describe("release installer", () => {
  it("@claim:installer-checksum installs a matching AppImage and refuses a changed one", async () => {
    const root = await mkdtemp(join(tmpdir(), "epub-bridge-installer-"));
    const failureRoot = await mkdtemp(join(tmpdir(), "epub-bridge-installer-"));
    try {
      const matching = await runInstaller(root, checksum);
      expect(matching.stdout).toContain("INSTALL_CALLED");
      await expect(
        runInstaller(failureRoot, "0".repeat(64)),
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("failed its SHA-256 check"),
      });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(failureRoot, { recursive: true, force: true });
    }
  });
});
