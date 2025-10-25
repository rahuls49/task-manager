module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      script: 'backend/dist/index.js',
      cwd: '~/task-manager',  // Replace with your actual project path
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MYSQL_HOST:"172.27.60.2",
        MYSQL_USER:"developer",
        MYSQL_PASSWORD:"dev@1234",
        JWT_SECRET:"e014e68503efee67394248e852ae1db8a0e5b1d58f0791ece5de724d93188b23",
        DUE_TIME_INTERVAL_VALUE:2,
        DUE_TIME_INTERVAL_UNIT:MINUTE,
        DUE_TASKS_WINDOW_VALUE:2,
        DUE_TASKS_WINDOW_UNIT:MINUTE,
        DUE_TASKS_BUFFER_VALUE:1,
        DUE_TASKS_BUFFER_UNIT:MINUTE
      },
      instances: 1,  // Single instance for backend
      autorestart: true,
      max_memory_restart: '1G',
    },
    // {
    //   name: 'task-manager-frontend',
    //   script: 'frontend/server.js',  // Next.js production build output
    //   cwd: '~/task-manager',
    //   env: {
    //     NODE_ENV: 'production',
    //     // Add frontend-specific env vars if any
    //   },
    //   instances: 1,
    //   autorestart: true,
    //   max_memory_restart: '1G',
    // },
    {
      name: 'task-manager-scheduler',
      script: 'packages/scheduler/dist/index.js',
      cwd: '~/task-manager',
      env: {
        NODE_ENV: 'production',
        BACKEND_API_BASE_URL:"http://localhost:5000",
        SCHEDULER_CRON:"*/2 * * * *",
        MAX_SCHEDULING_DELAY_MS:120000
        // Add scheduler env vars (e.g., from packages/scheduler)
      },
      instances: 1,
      autorestart: true,
    },
    {
      name: 'task-manager-queue-worker',
      script: 'packages/queue-lib/dist/worker.js',
      cwd: '~/task-manager',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST:"172.27.60.2",
        REDIS_PORT:6379,
        REDIS_USERNAME:"default",
        REDIS_PASSWORD:"LqI1r4jXse4GFuxxLltRsdw0BsvHMUTeXakAO9oohcWyTRFFovHTaulFzcQypvXX"
        // Add queue env vars (e.g., Redis config from packages/queue-lib/src/redis.ts)
      },
      instances: 1,  // Or more if you need multiple workers
      autorestart: true,
    },
  ],
};