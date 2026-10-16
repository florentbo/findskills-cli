# Testing the MCP package

Run `npm install`, then `npm test` from `mcp/` to run the API, server, and
packaging tests. The packaging test requires npm registry access to install
the packed artifact and its dependencies in a temporary directory.

`npm run test:package` packs the current source, installs the tarball outside
the checkout, and connects to its declared CLI entry point using an MCP client.
It verifies initialization and tool discovery without making FindSkills API
requests or requiring an API key. Server startup errors are included in failures.
The temporary installation is removed after the test.

`npm publish` runs this check through `prepublishOnly`. Packing inside the test
uses `--ignore-scripts` to avoid recursively invoking lifecycle checks.

To check an already published artifact on Linux/macOS:

```sh
FINDSKILLS_PACKAGE_SPEC=findskills-mcp@0.1.25 npm run test:package
```

Version 0.1.25 fails this check because `api.js` imports `lib/auth-error.js`,
which is absent from the published tarball. The public source currently predates
that import; passing against this checkout does not demonstrate that the 0.1.25
release has been repaired. The same check must pass against the source used for
the next release.
