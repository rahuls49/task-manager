import { Worker } from 'bullmq';
import connection from './redis';

console.log("Worker starting...");

const worker = new Worker('taskQueue', async job => {
  const task = job.data;
  const scheduledAt = task.__scheduledAt || 'unknown';
  const actualProcessingTime = new Date().toLocaleString();
  
  console.log(`🚀 Processing job: ${job.name} for task "${task.Title}" (ID: ${task.Id})`);
  console.log(`⏰ Scheduled at: ${new Date(scheduledAt).toLocaleString()}, Processing at: ${actualProcessingTime}`);
  console.log(`📋 Task details:`, { 
    Id: task.Id, 
    Title: task.Title, 
    DueDate: task.DueDate, 
    DueTime: task.DueTime 
  });
  
  try {
    const res = await sendWhatsappMessage(job);
    console.log('✅ WhatsApp message sent successfully:', res.status);
    return { success: true, processedAt: actualProcessingTime };
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    throw error;
  }
}, { connection });

console.log("Worker created");

worker.on('completed', job => {
  console.log(`Job ${job.id} completed, complete event recieved`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with ${err.message}`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});


async function sendWhatsappMessage(job: any) {
  return await fetch("https://wassraipur.apps.shreeshivam.net:9006/send/message", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "phone": "917999800869",
      "message": `This task is overdue: ${job.data.Title}`
    })
  })
}