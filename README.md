# Local Cache Action

An efficient local caching solution designed for self-hosted runners, eliminating the need for GitHub remote cache. Implemented in TypeScript, it maintains API compatibility with the official GitHub Actions cache action.

## Features

- **Pure Local Caching Strategy**: Directly uses runner local storage, avoiding network transfers
- **Performance Optimization**: Improves cache restoration and saving speed by reducing network transfers
- **Strong Compatibility**: Supports single-path and multi-path caching, compatible with various file types
- **Special Path Handling**: Provides customized processing for special directories (such as Go modules)
- **Simple and Intuitive**: Clear interface and workflow, easy to understand and use
- **Efficient Compression**: Uses zstd compression algorithm, balancing compression ratio and speed
- **API Compatible**: Maintains API compatibility with the official GitHub Actions cache action

## Implementation Technology

This project is implemented in TypeScript, fully utilizing GitHub Actions lifecycle events for logical processing:

- **Build**: Built using Node.js and TypeScript, and packaged with webpack
- **Compression**: Uses zstd compression algorithm, the same compression method as the official cache action
- **Testing**: Uses Jest for unit testing and integration testing

### Compression Method

Cache data uses the zstd compression algorithm, which has the following advantages:

- Fast compression: About 3-5 times faster than gzip
- Fast decompression: About 2-3 times faster than gzip
- High compression ratio: Better compression ratio than gzip at similar speeds
- Adjustable compression levels: Supports compression levels from -5 (fastest) to 22 (highest compression ratio)

Default compression level is 3, achieving a good balance between speed and compression ratio.

## Usage

### Basic Usage

```yaml
# Use a single action to restore and save cache
- name: Cache Dependencies
  id: cache-deps
  uses: ./.github/actions/local-cache
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# If cache miss, perform installation
- name: Install Dependencies
  if: steps.cache-deps.outputs.cache-hit != 'true'
  run: npm install
```

### Separate Restore and Save Operations

```yaml
# Restore cache
- name: Restore Cache
  id: cache-restore
  uses: ./.github/actions/local-cache/restore
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-

# If cache miss, perform installation
- name: Install Go Dependencies
  if: steps.cache-restore.outputs.cache-hit != 'true'
  run: go mod download

# Save cache
- name: Save Cache
  uses: ./.github/actions/local-cache/save
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ steps.cache-restore.outputs.cache-primary-key }}
```

## Input Parameters

| Parameter | Description | Required | Default |
|------|------|---------|-------|
| `path` | List of files, directories, or wildcard patterns to cache | Yes | - |
| `key` | Unique key for restoring and saving the cache | Yes | - |
| `restore-keys` | List of fallback keys for restoring the cache, ordered by priority | No | - |
| `upload-chunk-size` | Chunk size for chunked uploads (MB) | No | `32` |
| `enableCrossOsArchive` | Whether to enable cross-OS cache archives | No | `false` |
| `fail-on-cache-miss` | Whether to fail on cache miss | No | `false` |
| `lookup-only` | Only look up cache without restoring | No | `false` |
| `compression-level` | zstd compression level (-5 to 22) | No | `3` |

## Output Parameters

| Parameter | Description |
|------|------|
| `cache-hit` | String value indicating whether a cache hit occurred for the key. Will be 'true' or 'false' if a cache hit occurred; will be an empty string if no cache hit occurred. |
| `cache-primary-key` | Primary key used for saving the cache, typically used for separate restore and save operations |

## Cache Scope

Cache scope is limited to key, version, and branch. Caches from the default branch are available to other branches.

## How It Works

1. **Local Cache Check**: Checks if a matching cache exists in the specified local cache directory
2. **Local Cache Restoration**: If a local cache is found, directly restores to the target path
3. **Automatic Cache Saving**: If no matching cache is found, automatically creates a new cache after the workflow completes
4. **Compression and Decompression**: Uses the zstd algorithm for compression and decompression operations

## Project Structure

The project follows the standard structure for TypeScript Actions:

```
├── __tests__/              # Test files directory
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data and mocks
├── src/                    # Source code directory
│   ├── cache/              # Core cache logic
│   │   ├── compression.ts  # Compression-related processing
│   │   ├── localCache.ts   # Local cache implementation
│   │   └── utils.ts        # Utility functions
│   ├── restore.ts          # Cache restoration entry point
│   ├── save.ts             # Cache saving entry point
│   └── main.ts             # Main entry point
├── action.yml              # Main Action definition
├── restore/action.yml      # Restore Action definition
├── save/action.yml         # Save Action definition
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest test configuration
└── package.json            # Project dependencies
```

## Caching Strategies

With the introduction of `restore` and `save` operations, various caching use cases can be implemented. Here are some common caching strategies:

### Skip Steps Based on Cache Hit

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./.github/actions/local-cache
    id: cache
    with:
      path: path/to/dependencies
      key: ${{ runner.os }}-${{ hashFiles('**/lockfiles') }}

  - name: Install Dependencies
    if: steps.cache.outputs.cache-hit != 'true'
    run: /install.sh
```

### Creating Cache Keys

```yaml
  - uses: ./.github/actions/local-cache
    with:
      path: |
        path/to/dependencies
        some/other/dependencies
      key: ${{ runner.os }}-${{ hashFiles('**/lockfiles') }}
```

You can also use arbitrary command outputs in your cache keys, such as dates or software versions:

```yaml
  # Get date
  - name: Get Date
    id: get-date
    run: |
      echo "date=$(/bin/date -u "+%Y%m%d")" >> $GITHUB_OUTPUT
    shell: bash

  - uses: ./.github/actions/local-cache
    with:
      path: path/to/dependencies
      key: ${{ runner.os }}-${{ steps.get-date.outputs.date }}-${{ hashFiles('**/lockfiles') }}
```

## Testing

This project uses Jest for testing, with test files located in the `__tests__` directory:

- **Unit Tests**: Test the independent functionality of each component
- **Integration Tests**: Test interactions between components
- **Mock Tests**: Simulate the GitHub Actions environment

Run tests:

```bash
npm test
```

## Limitations and Considerations

- This action is designed for self-hosted runners and is not suitable for GitHub-hosted runners
- Local caching requires persistent storage; ensure the cache location remains unchanged between workflow runs
- For permission-sensitive directories (such as Go modules), the action automatically handles permission issues
- A repository can have a maximum of 10GB of cache
- Windows environment variables (such as `%LocalAppData%`) will not be expanded by this operation; use `~` instead, which will expand to the HOME directory

## Example Scenarios

### Node.js Projects

```yaml
- name: Cache Node Modules
  id: cache-node
  uses: ./.github/actions/local-cache
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Install Dependencies
  if: steps.cache-node.outputs.cache-hit != 'true'
  run: npm install
```

### Go Projects

```yaml
- name: Cache Go Dependencies
  id: cache-go
  uses: ./.github/actions/local-cache
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-

- name: Install Go Dependencies
  if: steps.cache-go.outputs.cache-hit != 'true'
  run: go mod download
```

### Python - pip

```yaml
- name: Cache pip packages
  uses: ./.github/actions/local-cache
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-

- name: Install dependencies
  run: pip install -r requirements.txt
```

### Rust - Cargo

```yaml
- name: Cache cargo registry
  uses: ./.github/actions/local-cache
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
    restore-keys: |
      ${{ runner.os }}-cargo-
```
