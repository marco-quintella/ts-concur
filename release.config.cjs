/**
 * semantic-release configuration for ts-concur.
 * Version and changelog are derived from conventional commits on the release branch.
 *
 * @see docs/RELEASING.md
 * @see https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md
 */
module.exports = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
};
