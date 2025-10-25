#!/usr/bin/env node
// Configuration management script for task scheduler

const fs = require('fs');
const path = require('path');

const CONFIG_FILES = {
  backend: path.join(__dirname, 'backend/.env'),
  scheduler: path.join(__dirname, 'packages/scheduler/.env')
};

function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
      console.log(`✅ Updated ${key}=${value} in ${path.basename(filePath)}`);
    } else {
      content += `\n${key}=${value}`;
      console.log(`✅ Added ${key}=${value} to ${path.basename(filePath)}`);
    }
  });

  fs.writeFileSync(filePath, content);
  return true;
}

function setConfig(timeValue, timeUnit = 'MINUTE', cronSchedule = '*/2 * * * *') {
  console.log(`🔧 Configuring scheduler for ${timeValue} ${timeUnit}(s)`);
  
  // Calculate max scheduling delay in milliseconds
  const unitMultipliers = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  };
  
  const maxDelayMs = timeValue * (unitMultipliers[timeUnit] || 60000);
  
  // Update backend configuration
  const backendUpdates = {
    DUE_TIME_INTERVAL_VALUE: timeValue,
    DUE_TIME_INTERVAL_UNIT: timeUnit,
    DUE_TASKS_WINDOW_VALUE: timeValue,
    DUE_TASKS_WINDOW_UNIT: timeUnit,
    DUE_TASKS_BUFFER_VALUE: 1,
    DUE_TASKS_BUFFER_UNIT: 'MINUTE'
  };
  
  // Update scheduler configuration
  const schedulerUpdates = {
    SCHEDULER_CRON: cronSchedule,
    MAX_SCHEDULING_DELAY_MS: maxDelayMs
  };

  const success = updateEnvFile(CONFIG_FILES.backend, backendUpdates) &&
                 updateEnvFile(CONFIG_FILES.scheduler, schedulerUpdates);

  if (success) {
    console.log(`\n🎉 Configuration updated successfully!`);
    console.log(`📋 Tasks will be fetched up to ${timeValue} ${timeUnit}(s) in advance`);
    console.log(`⏰ Scheduler runs: ${cronSchedule}`);
    console.log(`⚠️  Please restart your services for changes to take effect`);
  }
}

function showCurrentConfig() {
  console.log('📋 Current Configuration:');
  
  Object.entries(CONFIG_FILES).forEach(([service, filePath]) => {
    console.log(`\n${service.toUpperCase()}:`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const envVars = content.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .filter(line => line.includes('DUE_') || line.includes('SCHEDULER_') || line.includes('MAX_SCHEDULING_'));
      
      envVars.forEach(line => {
        console.log(`  ${line}`);
      });
    } else {
      console.log(`  ❌ File not found: ${filePath}`);
    }
  });
}

function showHelp() {
  console.log(`
📋 Task Scheduler Configuration Manager

Usage: node config-scheduler.js <command> [options]

Commands:
  show                          Show current configuration
  set <value> [unit] [cron]    Set timing configuration
  
Examples:
  node config-scheduler.js show
  node config-scheduler.js set 30                    # 30 minutes (default)
  node config-scheduler.js set 1 HOUR               # 1 hour
  node config-scheduler.js set 5 MINUTE "*/1 * * * *" # 5 minutes with 1-minute cron

Supported units: SECOND, MINUTE, HOUR, DAY
Default cron: */2 * * * * (every 2 minutes)

Environment Variables:
  Backend (.env):
    - DUE_TIME_INTERVAL_VALUE: How far to look ahead for overdue tasks
    - DUE_TIME_INTERVAL_UNIT: Time unit (SECOND, MINUTE, HOUR, DAY)
    - DUE_TASKS_WINDOW_VALUE: Window for due tasks endpoint
    - DUE_TASKS_WINDOW_UNIT: Time unit for window
    
  Scheduler (packages/scheduler/.env):
    - SCHEDULER_CRON: Cron schedule for scheduler
    - MAX_SCHEDULING_DELAY_MS: Maximum delay in milliseconds
`);
}

// Main execution
const [,, command, ...args] = process.argv;

switch (command) {
  case 'show':
    showCurrentConfig();
    break;
    
  case 'set':
    const [value, unit, cron] = args;
    if (!value || isNaN(value)) {
      console.error('❌ Please provide a valid numeric value');
      showHelp();
      process.exit(1);
    }
    setConfig(parseInt(value), unit, cron);
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    console.error('❌ Unknown command:', command || '(none)');
    showHelp();
    process.exit(1);
}