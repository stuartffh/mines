# Contributing to GameHub Pro

First off, thank you for considering contributing to GameHub Pro! It's people like you that make GameHub Pro such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead**.
* **Explain why this enhancement would be useful** to most GameHub Pro users.

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the Python and JavaScript styleguides
* Include thoughtfully-worded, well-structured tests
* Document new code based on the Documentation Styleguide
* End all files with a newline

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### Python Styleguide

* Use [Black](https://github.com/psf/black) for code formatting
* Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
* Use [isort](https://github.com/PyCQA/isort) for import sorting

### JavaScript Styleguide

* Use [Prettier](https://prettier.io/) for code formatting
* Use [ESLint](https://eslint.org/) for linting
* Prefer `const` over `let` and `let` over `var`
* Use meaningful variable names

### Documentation Styleguide

* Use [Markdown](https://daringfireball.net/projects/markdown/)
* Reference functions and classes in backticks

## Development Environment Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/gamehub-pro.git`
3. Install dependencies: `./scripts/install.sh`
4. Create a branch: `git checkout -b my-feature-branch`
5. Make your changes
6. Run tests: `docker-compose exec backend pytest`
7. Commit your changes: `git commit -am 'Add some feature'`
8. Push to the branch: `git push origin my-feature-branch`
9. Submit a pull request

## Project Structure

```
gamehub-pro/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── docker/          # Docker configurations
├── scripts/         # Utility scripts
├── docs/           # Documentation
└── tests/          # Test files
```

## Testing

* Write tests for all new features
* Ensure all tests pass before submitting PR
* Include both unit tests and integration tests

### Running Tests

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend yarn test

# Full test suite
./scripts/test.sh
```

## Questions?

Feel free to contact the project maintainers if you have any questions about contributing!