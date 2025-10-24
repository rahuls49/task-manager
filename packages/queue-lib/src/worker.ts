import { Worker } from 'bullmq';
import connection from './redis';

console.log("Worker starting...");

const worker = new Worker('taskQueue', async job => {
  console.log(`Processing job: ${job.name} with data`, job.data);
  // Perform the actual task here
  console.log('Task completed in worker');
  const res = await sendWhatsappMessage(job);
  console.log({res})
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
      "message": `Completed the task: ${job.data.Title}`
    })
  })
}