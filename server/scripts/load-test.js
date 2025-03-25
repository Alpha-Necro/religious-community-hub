const k6 = require('k6');
const http = require('k6/http');
const { Rate } = require('k6/metrics');

const successRate = new Rate('success_rate');

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    success_rate: ['rate>0.95'],       // Success rate should be above 95%
  },
};

export default function () {
  const endpoints = [
    '/',
    '/api/events',
    '/api/announcements',
    '/api/members',
    '/api/resources',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`http://localhost:3000${endpoint}`);
  
  successRate.add(response.status === 200);
  
  if (response.status !== 200) {
    console.error(`Request failed: ${response.status} - ${response.statusText}`);
  }
}
