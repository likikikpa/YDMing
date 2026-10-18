const [major, minor] = process.versions.node.split(".").map(Number);
if (!((major === 22 && minor >= 12) || major === 24 || major >= 26)) {
  console.error(
    `Atlasforge needs Node.js 22.12+, 24.x, or 26+. Found ${process.versions.node}. Use Node.js 24 LTS (see .nvmrc).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Node.js ${process.versions.node} (${process.platform}/${process.arch}) is supported.`,
  );
}
