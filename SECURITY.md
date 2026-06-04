# Security Policy

## Supported Versions

This project is pre-1.0. Security fixes target the latest `main` branch unless a release branch exists.

## Reporting a Vulnerability

Please do not open public issues for vulnerabilities.

Until a dedicated security contact exists, create a private advisory in the GitHub repository or contact the repository owner directly. Include:

- affected version or commit
- reproduction steps
- impact
- suggested fix, if known

## Local Execution Notes

This project runs local commands from `visual.config.json`, including the configured app command. Review configuration changes before running checks from untrusted pull requests.
