# Contributing to Religious Community Hub

Thank you for considering contributing to the Religious Community Hub project! We welcome contributions from the community to help make this project better.

## How to Contribute

### Reporting Bugs

1. Search existing issues to ensure your bug hasn't already been reported
2. Create a new issue with:
   - A clear and descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Any relevant error messages

### Suggesting Enhancements

1. Search existing issues to ensure your enhancement hasn't already been suggested
2. Create a new issue with:
   - A clear and descriptive title
   - Detailed description of the enhancement
   - Benefits of the enhancement
   - Any relevant examples or references

### Submitting Code Changes

1. Fork the repository
2. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Add tests for your changes
5. Run the test suite:
   ```bash
   npm test
   ```
6. Commit your changes:
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Create a Pull Request (PR)

### Pull Request Guidelines

1. Include a clear description of what your PR does
2. Reference any related issues using `#issue_number`
3. Ensure all tests pass
4. Follow our coding standards
5. Update relevant documentation
6. Include necessary test cases

## Code Style and Standards

### JavaScript/TypeScript

1. Use 2-space indentation
2. Use single quotes for strings
3. Use ES6+ features where appropriate
4. Follow TypeScript type safety practices
5. Use async/await for asynchronous operations
6. Follow the Airbnb JavaScript Style Guide

### Commit Messages

1. Use the conventional commit format:
   ```
   type(scope): description
   ```
   Where type is one of:
   - feat: new feature
   - fix: bug fix
   - docs: documentation changes
   - style: formatting changes
   - refactor: code change that neither fixes a bug nor adds a feature
   - test: adding missing tests
   - chore: maintenance changes

2. Examples:
   ```
   feat: add user authentication
   fix: resolve memory leak in cache service
   docs: update API documentation
   ```

## Testing

1. Run tests before submitting PRs:
   ```bash
   npm test
   ```
2. Add new tests for your changes
3. Ensure test coverage is maintained
4. Run test coverage report:
   ```bash
   npm test:coverage
   ```

## Code Review Process

1. All PRs require at least one approval from a maintainer
2. PRs will be reviewed for:
   - Code quality
   - Performance impact
   - Security considerations
   - Documentation completeness
   - Test coverage
3. Be prepared to make requested changes
4. Maintain a professional and respectful communication style

## Security Issues

If you discover a security vulnerability, please do not open a public issue. Instead, please send an email to security@religiouscommunityhub.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Your contact information

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
