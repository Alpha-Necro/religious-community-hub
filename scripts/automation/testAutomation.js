#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');

// Test scenarios
const TEST_SCENARIOS = [
    {
        name: 'User Registration',
        steps: [
            { action: 'navigate', url: '/register' },
            { action: 'fillForm', fields: {
                name: 'Test User',
                email: 'testuser@example.com',
                password: 'Test123!',
                confirmPassword: 'Test123!'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'User Login',
        steps: [
            { action: 'navigate', url: '/login' },
            { action: 'fillForm', fields: {
                email: 'testuser@example.com',
                password: 'Test123!'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Profile Update',
        steps: [
            { action: 'navigate', url: '/profile' },
            { action: 'fillForm', fields: {
                name: 'Updated Test User',
                bio: 'Test bio'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Event Creation',
        steps: [
            { action: 'navigate', url: '/events/create' },
            { action: 'fillForm', fields: {
                title: 'Test Event',
                description: 'Test event description',
                date: '2025-03-25',
                time: '10:00'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Language Switching',
        steps: [
            { action: 'navigate', url: '/' },
            { action: 'click', selector: 'button[aria-label="language-selector"]' },
            { action: 'click', selector: 'button[value="ar"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Community Group Creation',
        steps: [
            { action: 'navigate', url: '/groups/create' },
            { action: 'fillForm', fields: {
                name: 'Test Group',
                description: 'Test group description',
                category: 'education'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Event Registration',
        steps: [
            { action: 'navigate', url: '/events' },
            { action: 'click', selector: 'a[href$="/test-event"]' },
            { action: 'click', selector: 'button[aria-label="register"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Accessibility Settings',
        steps: [
            { action: 'navigate', url: '/settings/accessibility' },
            { action: 'click', selector: 'input[name="highContrast"]' },
            { action: 'click', selector: 'input[name="colorBlindMode"]' },
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Resource Upload',
        steps: [
            { action: 'navigate', url: '/resources/upload' },
            { action: 'fillForm', fields: {
                title: 'Test Resource',
                description: 'Test resource description',
                category: 'Islamic Studies'
            }},
            { action: 'click', selector: 'input[type="file"]' },
            { action: 'fillForm', fields: {
                file: 'test.pdf'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Donation Process',
        steps: [
            { action: 'navigate', url: '/donate' },
            { action: 'fillForm', fields: {
                amount: '100',
                paymentMethod: 'creditCard'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Volunteer Signup',
        steps: [
            { action: 'navigate', url: '/volunteer' },
            { action: 'fillForm', fields: {
                name: 'Test Volunteer',
                email: 'volunteer@example.com',
                skills: 'teaching,organization',
                availability: 'weekends'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    },
    {
        name: 'Message Board Posting',
        steps: [
            { action: 'navigate', url: '/community/messages' },
            { action: 'click', selector: 'button[aria-label="new-message"]' },
            { action: 'fillForm', fields: {
                title: 'Test Message',
                content: 'This is a test message'
            }},
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForNavigation' }
        ]
    }
];

async function runTests() {
    console.log('\nStarting Test Automation...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            slowMo: 250
        });

        const results = [];
        
        for (const scenario of TEST_SCENARIOS) {
            console.log(`\nRunning test: ${scenario.name}`);
            const result = await runTestScenario(browser, scenario);
            results.push(result);
            
            if (!result.pass) {
                console.log(`Test failed: ${result.error}`);
                break;
            }
        }

        await browser.close();
        
        return results;
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

async function runTestScenario(browser, scenario) {
    const page = await browser.newPage();
    
    try {
        for (const step of scenario.steps) {
            switch (step.action) {
                case 'navigate':
                    await page.goto(`http://localhost:3000${step.url}`, {
                        waitUntil: 'networkidle0',
                        timeout: 30000
                    });
                    break;
                case 'fillForm':
                    for (const [field, value] of Object.entries(step.fields)) {
                        await page.fill(`input[name="${field}"]`, value);
                    }
                    break;
                case 'click':
                    await page.click(step.selector, {
                        timeout: 10000
                    });
                    break;
                case 'waitForNavigation':
                    await page.waitForNavigation({
                        waitUntil: 'networkidle0',
                        timeout: 30000
                    });
                    break;
            }
        }
        
        return { pass: true, scenario: scenario.name };
    } catch (error) {
        return { pass: false, scenario: scenario.name, error: error.message };
    } finally {
        await page.close();
    }
}

async function runEmergencyScript() {
    console.log('\nRunning Emergency Script...');
    
    try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec('yarn emergency', { cwd: '../emergency' }, (error, stdout, stderr) => {
                if (error) reject(error);
                resolve({ stdout, stderr });
            });
        });

        console.log('Emergency Script Output:');
        console.log(stdout);
        
        if (stderr) {
            console.log('Emergency Script Errors:');
            console.log(stderr);
        }
    } catch (error) {
        console.error('Emergency Script Failed:', error);
        throw error;
    }
}

async function main() {
    let testCount = 1;
    let lastResults = [];
    
    while (true) {
        console.log(`\n=== Test Cycle ${testCount} ===`);
        
        try {
            const results = await runTests();
            
            // Check if all tests passed
            const allPassed = results.every(result => result.pass);
            
            if (allPassed) {
                console.log('\nAll tests passed!');
                console.log('System is ready for launch!');
                break;
            }

            // If tests failed and results changed, run emergency script
            if (!allPassed && JSON.stringify(results) !== JSON.stringify(lastResults)) {
                console.log('\nTests failed. Running emergency script...');
                await runEmergencyScript();
            }

            lastResults = results;
            testCount++;
            
            // Wait before next test cycle
            console.log('\nWaiting 30 seconds before next test cycle...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            
        } catch (error) {
            console.error('Test Automation Error:', error);
            console.log('\nWaiting 60 seconds before retrying...');
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }
}

// Run the main function
main();
