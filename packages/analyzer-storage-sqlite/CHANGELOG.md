# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.2.2](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.2.1...@mgfx/analyzer-storage-sqlite@2.2.2) (2020-04-08)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [2.2.1](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.2.0...@mgfx/analyzer-storage-sqlite@2.2.1) (2020-04-07)


### Bug Fixes

* analyzer-storage-sqlite: add mgfx as dependency ([e745390](https://github.com/ai-labs-team/mgFx/commit/e745390))





# [2.2.0](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.1.2...@mgfx/analyzer-storage-sqlite@2.2.0) (2020-04-07)


### Features

* analyzer: add `buffer` mode for better throughput ([41a6564](https://github.com/ai-labs-team/mgFx/commit/41a6564))





## [2.1.2](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.1.1...@mgfx/analyzer-storage-sqlite@2.1.2) (2020-04-03)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [2.1.1](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.1.0...@mgfx/analyzer-storage-sqlite@2.1.1) (2020-04-02)


### Bug Fixes

* analyzer-storage-sqlite: add HAVING clause ([fdfce0b](https://github.com/ai-labs-team/mgFx/commit/fdfce0b))





# [2.1.0](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@2.0.0...@mgfx/analyzer-storage-sqlite@2.1.0) (2020-04-02)


### Features

* analyzer-*: support more query params ([e290e93](https://github.com/ai-labs-team/mgFx/commit/e290e93))





# [2.0.0](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.6...@mgfx/analyzer-storage-sqlite@2.0.0) (2020-04-02)


### Features

* analyzer-storage-sqlite: change Span storage format ([1e2946f](https://github.com/ai-labs-team/mgFx/commit/1e2946f))
* analyzer-storage-sqlite: support `distinct` operator ([d596f3b](https://github.com/ai-labs-team/mgFx/commit/d596f3b))


### BREAKING CHANGES

* When upgrading to this version, all pre-existing Spans will be lost.





## [1.0.6](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.5...@mgfx/analyzer-storage-sqlite@1.0.6) (2020-04-02)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [1.0.5](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.4...@mgfx/analyzer-storage-sqlite@1.0.5) (2020-04-02)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [1.0.4](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.3...@mgfx/analyzer-storage-sqlite@1.0.4) (2020-04-02)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [1.0.3](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.2...@mgfx/analyzer-storage-sqlite@1.0.3) (2020-04-01)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [1.0.2](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.1...@mgfx/analyzer-storage-sqlite@1.0.2) (2020-03-31)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [1.0.1](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@1.0.0...@mgfx/analyzer-storage-sqlite@1.0.1) (2020-03-31)


### Performance Improvements

* analyzer-storage-sqlite: tune pragmas ([04e7101](https://github.com/ai-labs-team/mgFx/commit/04e7101))





# [1.0.0](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@0.1.2...@mgfx/analyzer-storage-sqlite@1.0.0) (2020-03-26)


### Features

* analyzer*: add `compact` Span query parameter ([3b6fd95](https://github.com/ai-labs-team/mgFx/commit/3b6fd95))


### Performance Improvements

* analyzer-storage-sqlite: dedupe values ([4076585](https://github.com/ai-labs-team/mgFx/commit/4076585))
* analyzer-storage-sqlite: smarter value cache joins ([1078030](https://github.com/ai-labs-team/mgFx/commit/1078030))


### BREAKING CHANGES

* Any pre-existing stored analyzer data will be deleted when upgrading to this version.





## [0.1.2](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@0.1.1...@mgfx/analyzer-storage-sqlite@0.1.2) (2020-03-16)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





## [0.1.1](https://github.com/ai-labs-team/mgFx/compare/@mgfx/analyzer-storage-sqlite@0.1.0...@mgfx/analyzer-storage-sqlite@0.1.1) (2020-03-16)

**Note:** Version bump only for package @mgfx/analyzer-storage-sqlite





# 0.1.0 (2020-03-16)


### Features

* initial version of `@mgfx/analyzer-storage-sqlite` ([4fe6331](https://github.com/ai-labs-team/mgFx/commit/4fe6331))
