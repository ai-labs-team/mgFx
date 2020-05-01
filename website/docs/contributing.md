---
title: Contributing
---

## Developing Locally

1. Clone the monorepo:

```bash
git clone https://github.com/ai-labs-team/mgFx.git
```

2. Install dependencies for the monorepo (and all packages) via yarn:

```bash
cd mgFx
yarn
```

3. Build all packages in topographical order:

```bash
yarn clean
yarn build
```

:::caution TODO
Ensure you `yarn clean` before each `yarn build` or you'll get an error.
:::

4. Running tests:

   - Some of the integration tests depend on a running Redis server. We recommend using Docker for this:

     ```bash
     docker run --rm -p 6379 redis
     ```

   - Then, test all packages in topographical order:

     ```bash
     yarn test
     ```

## Committing & Pull Requests

Commit messages are automatically linted using [Husky](https://github.com/typicode/husky) to ensure that they follow the [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/#summary) convention.

Please ensure that your commit messages are clean and informative as they will be used to construct the CHANGELOG for affected packages.

Pull Requests are keenly welcomed, on the basis that:

- They are in keeping with the [Design Principles](design-principles.md).
- New or changed functionality should include adequate test converage.
- New or changed functionality should include accurate documentation.

## Release Process

Packages are published **automatically** to NPM and GitHub Releases via our [CI Workflow](https://github.com/ai-labs-team/mgfx/actions). The following conventions are used:

- **For Pull Requests**

  - Build & Test all packages against the LTS versions of Node.JS (currently v10.x, v12.x and v14.x) across Ubuntu
    18.04 and MacOS 10.15.
  - Package the `analyzer-gui` Electron app. as a Debian-compatible `.deb` and a MacOS-compatible `.dmg` and store
    them as artifacts on each build.
  - _No further publishing takes place_

- **For commits on the `beta` branch**

  - Build & Test all packages against the LTS versions of Node.JS (currently v10.x, v12.x and v14.x) across Ubuntu
    18.04 and MacOS 10.15.
  - Publish packages to NPM and GitHub releases on the `-beta` distribution tag.
  - Upload `analyzer-gui` packages to GitHub releases with the `-beta` version suffix.

- **For commits on the `master` branch**
  - Build & Test all packages against the LTS versions of Node.JS (currently v10.x, v12.x and v14.x) across Ubuntu
    18.04 and MacOS 10.15.
  - Publish packages to NPM and GitHub releases with an automatically computed version number, based on commit
    messages.
  - Upload `analyzer-gui` packages to GitHub releases with the computed version number from above.

## Documentation

The public-facing website is generated by [Docusaurus](https://v2.docusaurus.io), with the majority of the content written in Markdown. You may edit this content and submit a Pull Request via the GitHub UI, but if you want to get a live preview of changes, you'll need to clone, install the dependencies and start the dev. server locally:

```bash
git clone https://github.com/ai-labs-team/mgFx.git
cd mgFx/website
yarn
yarn start
```

From there, you should be able to preview changes via [localhost](http://localhost:3000/mgFx). For basic Markdown guidance, refer to the [style guide](./docs-style-guide.md). For more advanced usage, please refer to the [Docusaurus Guides](https://v2.docusaurus.io/docs/creating-pages).

Like the code itself, GitHub Actions will take care of building and deploying static content upon merge to `master`.

:::caution TODO
There should be another build that deploys docs changes on the `beta` branch to https://ai-labs-team.github.io/mgFx/beta or similar.
:::