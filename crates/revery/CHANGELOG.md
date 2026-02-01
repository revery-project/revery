# Changelog

## [0.1.3](https://github.com/revery-project/revery/compare/revery-v0.1.2...revery-v0.1.3) (2026-02-01)


### Bug Fixes

* **revery:** add bincode deserialization size limit ([ec7cde6](https://github.com/revery-project/revery/commit/ec7cde6d19b6e75437ef6f9c448a86fbb58bf484))
* **revery:** add overflow check for Unix timestamp conversion ([1b3cd9e](https://github.com/revery-project/revery/commit/1b3cd9e2dc4097ebfc75e3284ff232bdba80c9cd))
* **revery:** return error if payload ever exceeds u32::MAX ([0c3c0ef](https://github.com/revery-project/revery/commit/0c3c0ef4e39cd82b6a84a50e8bb0cca6a9cea53c))
* **revery:** use constant-time checks for hmac verification ([5824fc6](https://github.com/revery-project/revery/commit/5824fc616f44c5d87b84169f13bd441498c73388))
* **revery:** use little-endian ([a4690f3](https://github.com/revery-project/revery/commit/a4690f31814e31179e3980d93be64c6ae1055aa8))
* **revery:** zeroize SPAKE2 shared secret after key derivation ([7b364e8](https://github.com/revery-project/revery/commit/7b364e865e3d3b48cdeedadf7dfee564a5376add))

## [0.1.2](https://github.com/revery-project/revery/compare/revery-v0.1.1...revery-v0.1.2) (2025-07-27)


### Bug Fixes

* **revery,app:** fix key deriving ([1abc4ff](https://github.com/revery-project/revery/commit/1abc4ff7f6f8fd5fa0651c60ddcc1b66b2aedc7a))

## [0.1.1](https://github.com/revery-project/revery/compare/revery-v0.1.0...revery-v0.1.1) (2025-07-27)


### Bug Fixes

* **revery,app:** allow network instability ([#4](https://github.com/revery-project/revery/issues/4)) ([0f049f6](https://github.com/revery-project/revery/commit/0f049f6eedd5b1f094c970710fd4980b59984441))

## 0.1.0 (2025-07-27)


### Features

* initial proof of concept ([0d8f4aa](https://github.com/revery-project/revery/commit/0d8f4aa7e7fb1cdddce3ae549b2b45d3ccd332b7))
