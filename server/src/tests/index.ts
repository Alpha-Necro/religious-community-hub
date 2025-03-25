import 'source-map-support/register';
import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

// Import test files
import './emergencySystemSimulation';
import './redisFailureTest';
import './securityEventTest';
