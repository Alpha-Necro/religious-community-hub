# Test Automation System

This system automates the testing and emergency recovery process for the Religious Community Hub application. It runs a series of mock user tests to verify the application's functionality and triggers the emergency recovery script if any issues are found.

## Features

- Automated test scenarios covering key user flows:
  - User Registration
  - User Login
  - Profile Update
  - Event Creation
  - Language Switching
- Automatic emergency recovery when tests fail
- Continuous testing until all issues are resolved
- Detailed test reporting
- Integration with Puppeteer for browser automation

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Ensure the emergency script is properly configured:
```bash
cd ../emergency
yarn install
```

## Usage

Run the test automation:
```bash
yarn start
```

The script will:
1. Run all test scenarios
2. If any test fails, it will:
   - Run the emergency recovery script
   - Wait 30 seconds
   - Retry the tests
3. Continue testing until all tests pass
4. When all tests pass, it will indicate the system is ready for launch

## Test Scenarios

### User Registration
- Navigates to registration page
- Fills out registration form
- Submits form and waits for navigation

### User Login
- Navigates to login page
- Fills out login form
- Submits form and waits for navigation

### Profile Update
- Navigates to profile page
- Updates user profile
- Submits changes and waits for navigation

### Event Creation
- Navigates to event creation page
- Fills out event details
- Submits event and waits for navigation

### Language Switching
- Navigates to home page
- Switches language to Arabic
- Verifies navigation

## Emergency Recovery

When tests fail, the system automatically:
1. Runs the emergency recovery script
2. Analyzes logs and reports
3. Attempts automatic repairs
4. Generates a recovery report

## Requirements

- Node.js >= 16.0.0
- Yarn
- Chrome/Chromium browser
- Properly configured Sentry DSN for error tracking

## Notes

- The script runs in headless mode by default
- Test data is reset between cycles
- Emergency recovery attempts are logged
- The system will keep running until all tests pass
