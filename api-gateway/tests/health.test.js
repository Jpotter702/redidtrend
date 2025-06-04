const request = require('supertest');
const express = require('express');
const mockAxios = require('jest-mock-axios').default;

// Mock axios
jest.mock('axios', () => require('jest-mock-axios'));

// Import the app
const app = require('../index');

describe('Health Check Endpoint', () => {
  afterEach(() => {
    mockAxios.reset();
  });

  test('should return 200 when all services are healthy', async () => {
    // Mock successful responses for all services
    const mockResponse = { data: { status: 'OK' } };
    mockAxios.get.mockImplementation(() => Promise.resolve(mockResponse));

    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    // Wait for all promises to resolve
    await new Promise(resolve => setImmediate(resolve));

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.gateway).toBe('OK');
    expect(response.body.services).toHaveLength(7);
    expect(response.body.services.every(service => service.status === 'OK')).toBe(true);
    expect(mockAxios.get).toHaveBeenCalledTimes(7);
  });

  test('should return 503 when some services are unhealthy', async () => {
    // Mock mixed responses (some healthy, some failing)
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('reddit-trends')) {
        return Promise.reject(new Error('Service unavailable'));
      }
      return Promise.resolve({ data: { status: 'OK' } });
    });

    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    // Wait for all promises to resolve
    await new Promise(resolve => setImmediate(resolve));

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe('Degraded');
    expect(response.body.gateway).toBe('OK');
    expect(response.body.services).toHaveLength(7);
    expect(response.body.services.some(service => 
      service.service === 'reddit-trends' && service.status === 'ERROR'
    )).toBe(true);
    expect(mockAxios.get).toHaveBeenCalledTimes(7);
  });

  test('should handle timeout scenarios', async () => {
    // Mock timeout for reddit-trends service
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('reddit-trends')) {
        return Promise.reject(new Error('timeout of 5000ms exceeded'));
      }
      return Promise.resolve({ data: { status: 'OK' } });
    });

    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    // Wait for all promises to resolve
    await new Promise(resolve => setImmediate(resolve));

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe('Degraded');
    expect(response.body.services.some(service => 
      service.service === 'reddit-trends' && service.status === 'ERROR'
    )).toBe(true);
    expect(mockAxios.get).toHaveBeenCalledTimes(7);
  });

  test('should handle non-OK status responses', async () => {
    // Mock a service returning a non-OK status
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('reddit-trends')) {
        return Promise.resolve({ data: { status: 'ERROR' } });
      }
      return Promise.resolve({ data: { status: 'OK' } });
    });

    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    // Wait for all promises to resolve
    await new Promise(resolve => setImmediate(resolve));

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe('Degraded');
    expect(response.body.services.some(service => 
      service.service === 'reddit-trends' && service.status === 'ERROR'
    )).toBe(true);
    expect(mockAxios.get).toHaveBeenCalledTimes(7);
  });
}); 