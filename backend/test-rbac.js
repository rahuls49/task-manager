const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';

// Test data
let adminToken = '';
let managerToken = '';
let userToken = '';
let testUserId = '';
let testRoleId = '';

// Helper function to make API calls
async function apiCall(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testSignup() {
  console.log('\n=== Testing User Authentication ===');

  // Try to login admin user first, if fails then signup
  let adminResult = await apiCall('POST', '/auth/login', {
    emailOrPhone: 'admin@test.com',
    password: 'password123'
  });

  if (adminResult.success) {
    console.log('✅ Admin login successful');
    adminToken = adminResult.data.token;
    testUserId = adminResult.data.user.id;
  } else {
    // Try signup if login fails
    adminResult = await apiCall('POST', '/auth/signup', {
      name: 'Admin User',
      email: 'admin@test.com',
      phone: '+1234567890',
      password: 'password123'
    });

    if (adminResult.success) {
      console.log('✅ Admin signup successful');
      adminToken = adminResult.data.token;
      testUserId = adminResult.data.user.id;
    } else {
      console.log('❌ Admin authentication failed:', adminResult.error);
    }
  }

  // Try to login manager user first, if fails then signup
  let managerResult = await apiCall('POST', '/auth/login', {
    emailOrPhone: 'manager@test.com',
    password: 'password123'
  });

  if (managerResult.success) {
    console.log('✅ Manager login successful');
    managerToken = managerResult.data.token;
  } else {
    // Try signup if login fails
    managerResult = await apiCall('POST', '/auth/signup', {
      name: 'Manager User',
      email: 'manager@test.com',
      phone: '+1234567891',
      password: 'password123'
    });

    if (managerResult.success) {
      console.log('✅ Manager signup successful');
      managerToken = managerResult.data.token;
    } else {
      console.log('❌ Manager authentication failed:', managerResult.error);
    }
  }

  // Try to login regular user first, if fails then signup
  let userResult = await apiCall('POST', '/auth/login', {
    emailOrPhone: 'user@test.com',
    password: 'password123'
  });

  if (userResult.success) {
    console.log('✅ User login successful');
    userToken = userResult.data.token;
  } else {
    // Try signup if login fails
    userResult = await apiCall('POST', '/auth/signup', {
      name: 'Regular User',
      email: 'user@test.com',
      phone: '+1234567892',
      password: 'password123'
    });

    if (userResult.success) {
      console.log('✅ User signup successful');
      userToken = userResult.data.token;
    } else {
      console.log('❌ User authentication failed:', userResult.error);
    }
  }
}

async function testSystemInitialization() {
  console.log('\n=== Testing System Initialization ===');

  const result = await apiCall('POST', '/management/initialize', {}, adminToken);

  if (result.success) {
    console.log('✅ System initialization successful');
    
    // After initialization, assign admin role to admin user
    await assignAdminRoleToAdminUser();
  } else {
    console.log('❌ System initialization failed:', result.error);
  }
}

async function assignAdminRoleToAdminUser() {
  console.log('Assigning admin role to admin user...');
  
  try {
    // Get admin role
    const rolesResult = await apiCall('GET', '/rbac/roles', null, adminToken);
    if (rolesResult.success) {
      const adminRole = rolesResult.data.data.find(r => r.Name === 'Administrator');
      if (adminRole) {
        // Assign admin role to admin user
        const assignResult = await apiCall('POST', `/rbac/users/${testUserId}/roles/${adminRole.Id}`, {}, adminToken);
        if (assignResult.success) {
          console.log('✅ Admin role assigned to admin user');
        } else {
          console.log('❌ Failed to assign admin role:', assignResult.error);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error assigning admin role:', error.message);
  }
}

async function testRoleManagement() {
  console.log('\n=== Testing Role Management ===');

  // Get all roles
  const rolesResult = await apiCall('GET', '/rbac/roles', null, adminToken);
  if (rolesResult.success) {
    console.log('✅ Get roles successful');
    console.log('Roles:', rolesResult.data.data.map(r => r.Name));
  } else {
    console.log('❌ Get roles failed:', rolesResult.error);
  }

  // Create custom role
  const createRoleResult = await apiCall('POST', '/rbac/roles', {
    name: 'Custom Role',
    description: 'A custom test role'
  }, adminToken);

  if (createRoleResult.success) {
    console.log('✅ Create role successful');
    testRoleId = createRoleResult.data.data.Id;
  } else {
    console.log('❌ Create role failed:', createRoleResult.error);
  }
}

async function testPermissionManagement() {
  console.log('\n=== Testing Permission Management ===');

  // Get all permissions
  const permissionsResult = await apiCall('GET', '/rbac/permissions', null, adminToken);
  if (permissionsResult.success) {
    console.log('✅ Get permissions successful');
    console.log(`Found ${permissionsResult.data.data.length} permissions`);
  } else {
    console.log('❌ Get permissions failed:', permissionsResult.error);
  }

  // Create custom permission
  const createPermResult = await apiCall('POST', '/rbac/permissions', {
    name: 'custom:test',
    description: 'Custom test permission',
    resource: 'custom',
    action: 'test'
  }, adminToken);

  if (createPermResult.success) {
    console.log('✅ Create permission successful');
  } else {
    console.log('❌ Create permission failed:', createPermResult.error);
  }
}

async function testRoleAssignment() {
  console.log('\n=== Testing Role Assignment ===');

  // Get the User role for assignment test
  const rolesResult = await apiCall('GET', '/rbac/roles', null, adminToken);
  let userRole = null;
  if (rolesResult.success) {
    userRole = rolesResult.data.data.find(r => r.Name === 'User');
    testRoleId = userRole ? userRole.Id : testRoleId;
  }

  // Assign role to user (using User role for testing)
  const assignResult = await apiCall('POST', `/rbac/users/${testUserId}/roles/${testRoleId}`, {}, adminToken);
  if (assignResult.success) {
    console.log('✅ Role assignment successful');
  } else {
    console.log('❌ Role assignment failed:', assignResult.error);
  }

  // Get user roles
  const userRolesResult = await apiCall('GET', `/rbac/users/${testUserId}/roles`, null, adminToken);
  if (userRolesResult.success) {
    console.log('✅ Get user roles successful');
    console.log('User roles:', userRolesResult.data.data.map(ur => ur.Role.Name));
  } else {
    console.log('❌ Get user roles failed:', userRolesResult.error);
  }

  // Get user permissions
  const userPermsResult = await apiCall('GET', `/rbac/users/${testUserId}/permissions`, null, adminToken);
  if (userPermsResult.success) {
    console.log('✅ Get user permissions successful');
    console.log('User permissions:', userPermsResult.data.data);
  } else {
    console.log('❌ Get user permissions failed:', userPermsResult.error);
  }
}

async function testTaskPermissions() {
  console.log('\n=== Testing Task Permissions ===');

  // Try to create a task with admin (should work)
  const createTaskResult = await apiCall('POST', '/tasks', {
    title: 'Test Task',
    description: 'A test task for RBAC',
    dueDate: '2025-12-01T00:00:00.000Z',
    priorityId: 2
  }, adminToken);

  if (createTaskResult.success) {
    console.log('✅ Admin create task successful');
    const taskId = createTaskResult.data.data.Id;

    // Try to read the task with admin (should work)
    const readTaskResult = await apiCall('GET', `/tasks/${taskId}`, null, adminToken);
    if (readTaskResult.success) {
      console.log('✅ Admin read task successful');
    } else {
      console.log('❌ Admin read task failed:', readTaskResult.error);
    }

    // Try to update the task with admin (should work)
    const updateTaskResult = await apiCall('PUT', `/tasks/${taskId}`, {
      description: 'Updated description'
    }, adminToken);

    if (updateTaskResult.success) {
      console.log('✅ Admin update task successful');
    } else {
      console.log('❌ Admin update task failed:', updateTaskResult.error);
    }

  } else {
    console.log('❌ Admin create task failed:', createTaskResult.error);
  }
}

async function testPermissionDenied() {
  console.log('\n=== Testing Permission Denied Scenarios ===');

  // Try to access RBAC endpoints with regular user (should fail)
  const rbacResult = await apiCall('GET', '/rbac/roles', null, userToken);
  if (!rbacResult.success && rbacResult.status === 403) {
    console.log('✅ Permission denied for regular user accessing RBAC - correct');
  } else {
    console.log('❌ Permission check failed - user should not access RBAC');
  }

  // Try to create task with user who doesn't have permissions (should fail)
  const createTaskResult = await apiCall('POST', '/tasks', {
    title: 'Unauthorized Task',
    description: 'This should fail',
    dueDate: '2025-12-01T00:00:00.000Z'
  }, userToken);

  if (!createTaskResult.success && createTaskResult.status === 403) {
    console.log('✅ Permission denied for user creating task - correct');
  } else {
    console.log('❌ Permission check failed - user should not create tasks');
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting RBAC System Tests');

  try {
    await testSignup();
    await testSystemInitialization();
    await testRoleManagement();
    await testPermissionManagement();
    await testRoleAssignment();
    await testTaskPermissions();
    await testPermissionDenied();

    console.log('\n🎉 RBAC Tests Completed!');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run the tests
runTests();