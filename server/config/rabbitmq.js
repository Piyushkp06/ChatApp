import amqp from 'amqplib';

class RabbitMQ {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      console.log('✅ RabbitMQ connected successfully');

      this.connection.on('close', () => {
        console.log('❌ RabbitMQ connection closed');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ error:', err.message);
        this.isConnected = false;
      });

      // Setup queues
      await this.channel.assertQueue('ai-queue', { durable: true });
      await this.channel.assertQueue('notification-queue', { durable: true });
      console.log('📬 Queues "ai-queue", "notification-queue" are ready');

      return this.channel;
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error.message);
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000);
      return null;
    }
  }

  async publish(queue, message) {
    if (!this.isConnected || !this.channel) {
      console.error('RabbitMQ not connected');
      return false;
    }

    const msgBuffer = Buffer.from(JSON.stringify(message));
    this.channel.sendToQueue(queue, msgBuffer, { persistent: true });
    console.log(`📤 Message published to "${queue}"`);
    return true;
  }

  async consume(queue, callback) {
    if (!this.isConnected || !this.channel) {
      console.error('RabbitMQ not connected');
      return;
    }

    await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel.ack(msg);
        } catch (error) {
          console.error(`Error processing message:`, error.message);
          this.channel.nack(msg, false, true);
        }
      }
    });

    console.log(`👂 Listening to "${queue}"`);
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log('🔌 RabbitMQ closed');
  }

  getStatus() {
    return { connected: this.isConnected };
  }
}

export default new RabbitMQ();
