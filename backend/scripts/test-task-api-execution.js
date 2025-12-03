"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../src/lib/connection"));
const taskService = __importStar(require("../src/modules/task/task.service"));
const actionService = __importStar(require("../src/modules/action/action.service"));
const action_events_1 = require("../src/modules/action/action.events");
const task_constants_1 = require("../src/modules/task/task.constants");
async function testTaskApiExecution() {
    console.log('🧪 Starting Task API Execution Test...\n');
    try {
        // Step 1: Create a test API definition
        console.log('📝 Creating test API definition...');
        const apiDefinitionId = await actionService.createApiDefinition({
            name: 'Test API for Task Events',
            description: 'A test API to verify task event execution',
            endpoint: 'https://httpbin.org/post', // Simple test endpoint that echoes back
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { message: 'Task event triggered: {{Title}}', event: '{{event}}', taskId: '{{Id}}' }
        });
        console.log(`✅ Created API definition with ID: ${apiDefinitionId}\n`);
        // Step 2: Create a test task
        console.log('📋 Creating test task...');
        const taskId = await taskService.createTask({
            title: 'Test Task for API Execution',
            description: 'This is a test task to verify API execution on events',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
            dueTime: '10:00:00',
            priorityId: 2, // Medium priority
            taskTypeId: 1
        });
        console.log(`✅ Created task with ID: ${taskId}\n`);
        // Step 3: Link the API to the task for multiple events
        console.log('🔗 Linking API to task events...');
        const eventsToTest = [
            action_events_1.TaskActionEvent.TASK_CREATED,
            action_events_1.TaskActionEvent.TASK_UPDATED,
            action_events_1.TaskActionEvent.TASK_COMPLETED,
            action_events_1.TaskActionEvent.TASK_OVERDUE
        ];
        for (const event of eventsToTest) {
            await actionService.createTaskApiAction({
                taskId,
                apiDefinitionId,
                triggerEvent: event,
                isActive: true
            });
            console.log(`   ✅ Linked ${event} event`);
        }
        console.log('');
        // Step 4: Get initial API call count
        const initialCalls = await connection_1.default.apicalls.count({ where: { TaskId: taskId } });
        console.log(`📊 Initial API calls for task: ${initialCalls}\n`);
        // Step 5: Trigger TASK_CREATED event (should have been triggered during creation)
        console.log('🎯 Checking TASK_CREATED event (should already be triggered)...');
        await checkApiCalls(taskId, action_events_1.TaskActionEvent.TASK_CREATED, 1);
        // Step 6: Trigger TASK_UPDATED event
        console.log('🎯 Triggering TASK_UPDATED event...');
        await taskService.updateTask(taskId, {
            description: 'Updated description for testing'
        });
        await checkApiCalls(taskId, action_events_1.TaskActionEvent.TASK_UPDATED, 1);
        // Step 7: Trigger TASK_COMPLETED event
        console.log('🎯 Triggering TASK_COMPLETED event...');
        await taskService.updateTask(taskId, {
            statusId: task_constants_1.TASK_STATUS.COMPLETED
        });
        await checkApiCalls(taskId, action_events_1.TaskActionEvent.TASK_COMPLETED, 1);
        // Step 8: Manually trigger TASK_OVERDUE event (normally scheduled)
        console.log('🎯 Manually triggering TASK_OVERDUE event...');
        await actionService.triggerAllApiActionsForEvent(taskId, action_events_1.TaskActionEvent.TASK_OVERDUE, await taskService.getTaskById(taskId));
        await checkApiCalls(taskId, action_events_1.TaskActionEvent.TASK_OVERDUE, 1);
        // Step 9: Summary
        console.log('📊 Final API calls summary:');
        const finalCalls = await connection_1.default.apicalls.findMany({
            where: { TaskId: taskId },
            orderBy: { ExecutedAt: 'asc' }
        });
        console.log(`Total API calls: ${finalCalls.length}`);
        finalCalls.forEach(call => {
            console.log(`   - ${call.TriggerEvent}: ${call.IsSuccess ? '✅ Success' : '❌ Failed'} (${call.DurationMs}ms)`);
        });
        console.log('\n🎉 Test completed successfully!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}
async function checkApiCalls(taskId, event, expectedCount) {
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    const calls = await connection_1.default.apicalls.findMany({
        where: { TaskId: taskId, TriggerEvent: event },
        orderBy: { ExecutedAt: 'desc' }
    });
    if (calls.length >= expectedCount) {
        console.log(`   ✅ ${event}: ${calls.length} API call(s) found`);
        const latestCall = calls[0];
        console.log(`      Status: ${latestCall.IsSuccess ? 'Success' : 'Failed'}`);
        console.log(`      Duration: ${latestCall.DurationMs}ms`);
        if (latestCall.ErrorMessage) {
            console.log(`      Error: ${latestCall.ErrorMessage}`);
        }
    }
    else {
        console.log(`   ⚠️  ${event}: Expected ${expectedCount} call(s), found ${calls.length}`);
    }
    console.log('');
}
// Run the test
testTaskApiExecution()
    .then(() => {
    console.log('🏁 Test script finished');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
});
