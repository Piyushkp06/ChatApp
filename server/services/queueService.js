import rabbitmq from '../config/rabbitmq.js';

class QueueService {
  // Queue AI request for background processing
  async queueAIRequest(data) {
    try {
      if (!rabbitmq.isConnected) {
        console.log('RabbitMQ not available - AI request not queued');
        return false;
      }
      
      const message = {
        userId: data.userId,
        content: data.content,
        timestamp: new Date().toISOString()
      };

      return await rabbitmq.publish('ai-queue', message);
    } catch (error) {
      console.error('Failed to queue AI request:', error.message);
      return false;
    }
  }

  // Queue notification for offline users
  async queueNotification(data) {
    try {
      if (!rabbitmq.isConnected) {
        // Silently skip if RabbitMQ is not available
        return false;
      }
      
      const message = {
        type: data.type || 'message', // 'message', 'channel-message'
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        content: data.content,
        messageType: data.messageType,
        channelId: data.channelId || null,
        channelName: data.channelName || null,
        timestamp: new Date().toISOString()
      };

      return await rabbitmq.publish('notification-queue', message);
    } catch (error) {
      console.error('Failed to queue notification:', error.message);
      return false;
    }
  }
}

export default new QueueService();
