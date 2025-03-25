# Emergency Recovery Script

This script is designed to automatically run when the production environment shuts down. It performs the following tasks:

1. Analyzes logs and reports to identify issues
2. Runs system checks to verify critical components
3. Attempts automatic repairs where possible
4. Generates a detailed recovery report

## Features

- Automatic log analysis
- Database connection checks
- API endpoint verification
- Dependency validation
- Configuration integrity checks
- Error tracking with Sentry integration
- Detailed recovery reporting

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Sentry DSN in the emergency.service file

3. Make the script executable:
```bash
chmod +x emergency.js
```

## Usage

The script can be run manually:
```bash
node emergency.js
```

Or it will run automatically when the production environment shuts down.

## Recovery Process

1. The script captures the error that caused the shutdown
2. Analyzes logs from multiple directories
3. Runs system checks:
   - Database Connection
   - API Endpoints
   - Dependencies
   - Configuration
4. Attempts repairs:
   - Database repair
   - Dependency repair
   - Configuration repair
5. Generates a recovery report in JSON format

## Monitoring

The script integrates with Sentry for error tracking. All errors and recovery attempts are logged for monitoring and analysis.

## Security

- Runs with minimal privileges
- Environment variables are used for sensitive configurations
- All operations are logged for audit purposes

## Notes

- Ensure proper permissions are set for the script and log directories
- Regularly update the Sentry DSN in the service file
- Monitor recovery reports for recurring issues
