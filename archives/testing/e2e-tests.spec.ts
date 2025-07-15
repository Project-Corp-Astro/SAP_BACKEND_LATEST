import { test, expect } from '@playwright/test';

// Configuration for E2E testing
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

test.describe('SAP Backend System E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Common setup for all tests
    await page.goto(BASE_URL);
  });

  test.describe('Authentication Flow', () => {
    test('should complete user registration and login', async ({ page, request }) => {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // Test user registration
      const registerResponse = await request.post(`${API_URL}/auth/register`, {
        data: testUser
      });
      expect(registerResponse.ok()).toBeTruthy();
      
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      expect(registerData.user.email).toBe(testUser.email);

      // Test user login
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });
      expect(loginResponse.ok()).toBeTruthy();
      
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.token).toBeDefined();
      expect(loginData.user.email).toBe(testUser.email);
    });

    test('should handle invalid credentials', async ({ request }) => {
      const invalidLogin = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      });
      
      expect(invalidLogin.status()).toBe(401);
      const data = await invalidLogin.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid credentials');
    });
  });

  test.describe('User Management', () => {
    let authToken: string;
    let userId: string;

    test.beforeEach(async ({ request }) => {
      // Login and get auth token
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        }
      });
      
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      userId = loginData.user.id;
    });

    test('should retrieve user profile', async ({ request }) => {
      const profileResponse = await request.get(`${API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(profileResponse.ok()).toBeTruthy();
      const profile = await profileResponse.json();
      expect(profile.email).toBe('admin@example.com');
    });

    test('should update user profile', async ({ request }) => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const updateResponse = await request.put(`${API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updatedProfile = await updateResponse.json();
      expect(updatedProfile.firstName).toBe('Updated');
      expect(updatedProfile.lastName).toBe('Name');
    });
  });

  test.describe('Content Management', () => {
    let authToken: string;

    test.beforeEach(async ({ request }) => {
      // Login as content admin
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: 'content-admin@example.com',
          password: 'ContentAdmin123!'
        }
      });
      
      const loginData = await loginResponse.json();
      authToken = loginData.token;
    });

    test('should create and retrieve content', async ({ request }) => {
      const contentData = {
        title: 'Test Content',
        description: 'This is test content',
        type: 'article',
        status: 'published'
      };
      
      // Create content
      const createResponse = await request.post(`${API_URL}/content`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: contentData
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createdContent = await createResponse.json();
      expect(createdContent.title).toBe(contentData.title);
      
      // Retrieve content
      const getResponse = await request.get(`${API_URL}/content/${createdContent.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(getResponse.ok()).toBeTruthy();
      const retrievedContent = await getResponse.json();
      expect(retrievedContent.id).toBe(createdContent.id);
      expect(retrievedContent.title).toBe(contentData.title);
    });
  });

  test.describe('Subscription Management', () => {
    let authToken: string;

    test.beforeEach(async ({ request }) => {
      // Login as subscription manager
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: 'subscription-admin@example.com',
          password: 'SubAdmin123!'
        }
      });
      
      const loginData = await loginResponse.json();
      authToken = loginData.token;
    });

    test('should manage subscription lifecycle', async ({ request }) => {
      // Create subscription plan
      const planData = {
        name: 'Premium Plan',
        description: 'Premium subscription with all features',
        price: 29.99,
        duration: 'monthly',
        features: ['feature1', 'feature2', 'feature3']
      };
      
      const createPlanResponse = await request.post(`${API_URL}/subscriptions/plans`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: planData
      });
      
      expect(createPlanResponse.ok()).toBeTruthy();
      const createdPlan = await createPlanResponse.json();
      expect(createdPlan.name).toBe(planData.name);
      
      // Subscribe user to plan
      const subscribeResponse = await request.post(`${API_URL}/subscriptions/subscribe`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          planId: createdPlan.id,
          paymentMethod: 'credit_card'
        }
      });
      
      expect(subscribeResponse.ok()).toBeTruthy();
      const subscription = await subscribeResponse.json();
      expect(subscription.planId).toBe(createdPlan.id);
      expect(subscription.status).toBe('active');
    });
  });

  test.describe('System Health and Monitoring', () => {
    test('should check service health endpoints', async ({ request }) => {
      const services = [
        '/health',
        '/health/auth',
        '/health/users',
        '/health/content',
        '/health/subscriptions'
      ];
      
      for (const endpoint of services) {
        const healthResponse = await request.get(`${API_URL}${endpoint}`);
        expect(healthResponse.ok()).toBeTruthy();
        
        const healthData = await healthResponse.json();
        expect(healthData.status).toBe('healthy');
        expect(healthData.timestamp).toBeDefined();
      }
    });

    test('should check system metrics', async ({ request }) => {
      const metricsResponse = await request.get(`${API_URL}/metrics`);
      expect(metricsResponse.ok()).toBeTruthy();
      
      const metricsText = await metricsResponse.text();
      expect(metricsText).toContain('http_requests_total');
      expect(metricsText).toContain('http_request_duration_ms');
      expect(metricsText).toContain('active_connections');
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle concurrent requests', async ({ request }) => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request.get(`${API_URL}/health`)
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
    });

    test('should respond within acceptable time limits', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${API_URL}/health`);
      const responseTime = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });
  });
});
